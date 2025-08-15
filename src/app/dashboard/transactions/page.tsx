"use client";
import { useCallback, useEffect, useState } from "react";
// Use our API backed by PostgreSQL
import DataTable from "@/components/admin/DataTable";
import TransactionFormModal from "@/components/admin/TransactionFormModal";
import { schemas } from "@/lib/tableSchemas";

const schema = schemas.transactions;

export default function TransactionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [totals, setTotals] = useState({
    totalAmount: 0,
    totalTax: 0,
    totalMDR: 0,
    totalCharges: 0,
    totalProfit: 0,
    creditCount: 0,
    debitCount: 0,
    mpCount: 0,
    mosCount: 0,
    injCount: 0
  });

  // Calculate totals from transaction rows
  const calculateTotals = (transactions: any[]) => {
    return transactions.reduce((acc, transaction) => {
      const amount = Number(transaction.amount) || 0;
      const tax = Number(transaction.tax) || 0;
      const mdr = Number(transaction.mdr) || 0;
      const charges = Number(transaction.charges) || 0;
      const profit = Number(transaction.profit) || 0;

      // Update totals
      acc.totalAmount += amount;
      acc.totalTax += tax;
      acc.totalMDR += mdr;
      acc.totalCharges += charges;
      acc.totalProfit += profit;

      // Update transaction type counts
      if (transaction.transaction_type === 'credit') {
        acc.creditCount++;
      } else if (transaction.transaction_type === 'debit') {
        acc.debitCount++;
      }

      // Update POS type counts
      switch (transaction.pos_type) {
        case 'MP':
          acc.mpCount++;
          break;
        case 'MOS':
          acc.mosCount++;
          break;
        case 'INJ':
          acc.injCount++;
          break;
      }

      return acc;
    }, {
      totalAmount: 0,
      totalTax: 0,
      totalMDR: 0,
      totalCharges: 0,
      totalProfit: 0,
      creditCount: 0,
      debitCount: 0,
      mpCount: 0,
      mosCount: 0,
      injCount: 0
    });
  };

  const load = useCallback(async () => {
    try {
      // First ensure the transactions table has the required columns
      console.log('Running transactions table migration...');
      const migrateRes = await fetch('/api/migrate-transactions');
      if (!migrateRes.ok) {
        console.error('Migration failed:', await migrateRes.text());
      } else {
        console.log('Migration successful:', await migrateRes.json());
      }
      
      // Now fetch transactions
      const res = await fetch(`/api/${schema.table}`);
      const data = await res.json() ?? [];
      
      // Transform the data to include customer names
      const transformedData = await Promise.all((data ?? []).map(async (row: any) => {
        try {
          const customerRes = await fetch(`/api/customers/${row.customer_id}`);
          const customer = await customerRes.json();
          return {
            ...row,
            customer_name: customer.full_name
          };
        } catch (err) {
          console.error('Error fetching customer:', err);
          return row;
        }
      }));
      
      setRows(transformedData);
      setTotals(calculateTotals(transformedData));
    } catch (err) {
      console.error('Error loading transactions:', err);
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Calculate tax, MDR, and charges based on tax rate, mdr rate and amount
  const calculateTransactionFees = (amount: number, taxRate: number, mdrRate: number) => {
    // Calculate tax
    const tax = (amount * taxRate) / 100;
    
    // Calculate MDR
    const mdr = (amount * mdrRate) / 100;
    
    // Calculate charges (fixed for now)
    const charges = amount > 0 ? 50 : 0; // Example: ₹50 fixed charge for non-zero transactions
    
    // Calculate profit (Tax - MDR) as specified
    // For example: Amount 4000, Tax Rate 3.5% (140), MDR 1.5% (60), Profit = 140 - 60 = 80
    const profit = tax - mdr;
    
    return {
      tax: Number(tax.toFixed(2)),
      mdr: Number(mdr.toFixed(2)),
      charges: Number(charges.toFixed(2)),
      profit: Number(profit.toFixed(2))
    };
  };

  const onSubmit = async (values: Record<string, any>) => {
    try {
      console.log('Transaction onSubmit received values:', JSON.stringify(values, null, 2));
      
      // Validate required fields
      if (!values.customer_id || !values.transaction_type || !values.pos_type || !values.amount || !values.tax_rate) {
        const message = 'Customer, Transaction Type, POS Type, Amount, and Tax Rate are required';
        console.error(message, values);
        alert(message);
        return;
      }

      // Calculate fees
      const fees = calculateTransactionFees(
        Number(values.amount), 
        Number(values.tax_rate), 
        Number(values.mdr)
      );

      // Always use current date/time for new transactions
      const currentDateTime = new Date().toISOString();
      
      // Add calculated values
      const updatedValues = {
        ...values,
        tax: fees.tax,
        mdr: Number(values.mdr), // Use the MDR value from the form (already set based on tax rate)
        charges: fees.charges,
        profit: fees.profit,
        transaction_date: editing ? values.transaction_date : currentDateTime // Only use current date for new transactions
      };
      
      console.log('Final transaction values to submit:', JSON.stringify(updatedValues, null, 2));
      
      // Remove any fields that aren't in the database schema
      const cleanValues = Object.fromEntries(
        Object.entries(updatedValues).filter(([key]) => {
          // Get the field names from the schema
          const fieldNames = schema.fields.map(f => f.name);
          return fieldNames.includes(key);
        })
      );
      
      console.log('Cleaned transaction values:', JSON.stringify(cleanValues, null, 2));

      let response;
      if (editing) {
        console.log(`Updating transaction with ID: ${editing.id}`);
        response = await fetch(`/api/${schema.table}/${editing.id}`, { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(cleanValues) 
        });
      } else {
        console.log('Creating new transaction');
        response = await fetch(`/api/${schema.table}`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(cleanValues) 
        });
      }
      
      // Check if the request was successful
      if (!response.ok) {
        const responseText = await response.text();
        console.error('Error response status:', response.status);
        console.error('Error response text:', responseText);
        
        let errorMessage = 'Failed to save transaction';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }
      
      // Successfully saved
      console.log('Transaction saved successfully');
      await load();
      setOpen(false);
      return await response.json();
    } catch (err) {
      console.error('Error saving transaction:', err);
      if (err instanceof Error) {
        alert(`Error saving transaction: ${err.message}`);
      } else {
        alert('Error saving transaction. Please try again.');
      }
      throw err;
    }
  };

  const onDelete = async (row: any) => {
    if (!confirm("Delete this record?")) return;
    await fetch(`/api/${schema.table}/${row.id}`, { method: 'DELETE' });
    await load();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{schema.title}</h1>
        <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => { setEditing(null); setOpen(true); }}>Add New</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium">Total Amount</h3>
          <p className="text-2xl font-bold text-white">{formatCurrency(totals.totalAmount)}</p>
          <div className="mt-2 text-sm text-gray-400">
            Credit: {totals.creditCount} | Debit: {totals.debitCount}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium">Total Tax</h3>
          <p className="text-2xl font-bold text-white">{formatCurrency(totals.totalTax)}</p>
          <div className="mt-2 text-sm text-gray-400">
            Avg: {formatCurrency(totals.totalTax / (rows.length || 1))}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium">Total MDR</h3>
          <p className="text-2xl font-bold text-white">{formatCurrency(totals.totalMDR)}</p>
          <div className="mt-2 text-sm text-gray-400">
            Avg: {formatCurrency(totals.totalMDR / (rows.length || 1))}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium">Total Charges</h3>
          <p className="text-2xl font-bold text-white">{formatCurrency(totals.totalCharges)}</p>
          <div className="mt-2 text-sm text-gray-400">
            Avg: {formatCurrency(totals.totalCharges / (rows.length || 1))}
          </div>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium">Total Profit</h3>
          <p className="text-2xl font-bold text-white">{formatCurrency(totals.totalProfit)}</p>
          <div className="mt-2 text-sm text-gray-400">
            Avg: {formatCurrency(totals.totalProfit / (rows.length || 1))}
          </div>
        </div>
      </div>

      {/* POS Type Distribution */}
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h3 className="text-gray-400 text-sm font-medium mb-2">POS Type Distribution</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-gray-300">MP:</span>
            <span className="ml-2 text-white font-medium">{totals.mpCount}</span>
            <div className="text-sm text-gray-400">
              {((totals.mpCount / (rows.length || 1)) * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <span className="text-gray-300">MOS:</span>
            <span className="ml-2 text-white font-medium">{totals.mosCount}</span>
            <div className="text-sm text-gray-400">
              {((totals.mosCount / (rows.length || 1)) * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <span className="text-gray-300">INJ:</span>
            <span className="ml-2 text-white font-medium">{totals.injCount}</span>
            <div className="text-sm text-gray-400">
              {((totals.injCount / (rows.length || 1)) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <DataTable data={rows} columns={schema.listColumns as any} onEdit={(r)=>{setEditing(r); setOpen(true);}} onDelete={onDelete} />
      <TransactionFormModal 
        open={open} 
        onClose={()=>setOpen(false)} 
        initial={editing} 
        onSubmit={onSubmit} 
        title={editing?`Edit ${schema.title}`:`Add ${schema.title}`} 
      />
    </div>
  );
}


