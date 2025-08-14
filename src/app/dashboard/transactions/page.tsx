"use client";
import { useCallback, useEffect, useState } from "react";
// Use our API backed by PostgreSQL
import DataTable from "@/components/admin/DataTable";
import CrudFormModal from "@/components/admin/CrudFormModal";
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
    const res = await fetch(`/api/${schema.table}`);
    const data = await res.json() ?? [];
    setRows(data);
    setTotals(calculateTotals(data));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Calculate tax, MDR, and charges based on POS type and amount
  const calculateTransactionFees = (posType: string, amount: number) => {
    let tax = 0;
    let mdr = 0;
    let charges = 0;

    // Tax rates based on POS type (CC)
    const taxRates: Record<string, number> = {
      'MP': 2.80,
      'MOS': 2.50,
      'INJ': 3.50
    };

    // MDR rates based on POS type
    const mdrRates: Record<string, number> = {
      'MP': 2.00,
      'MOS': 1.80,
      'INJ': 2.50
    };

    // Calculate tax
    tax = (amount * taxRates[posType]) / 100;

    // Calculate MDR
    mdr = (amount * mdrRates[posType]) / 100;

    // Calculate charges (fixed for now, could be made variable)
    charges = amount > 0 ? 50 : 0; // Example: ₹50 fixed charge for non-zero transactions

    // Calculate profit (MDR + charges - tax)
    const profit = mdr + charges - tax;

    return {
      tax: Number(tax.toFixed(2)),
      mdr: Number(mdr.toFixed(2)),
      charges: Number(charges.toFixed(2)),
      profit: Number(profit.toFixed(2))
    };
  };

  const onSubmit = async (values: Record<string, any>) => {
    try {
      // Validate required fields
      if (!values.pos_type || !values.amount) {
        alert('POS Type and Amount are required');
        return;
      }

      // Calculate fees
      const fees = calculateTransactionFees(values.pos_type, Number(values.amount));

      // Add calculated values
      const updatedValues = {
        ...values,
        tax: fees.tax,
        mdr: fees.mdr,
        charges: fees.charges,
        profit: fees.profit,
        transaction_date: values.transaction_date || new Date().toISOString()
      };

      if (editing) {
        await fetch(`/api/${schema.table}/${editing.id}`, { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(updatedValues) 
        });
      } else {
        await fetch(`/api/${schema.table}`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(updatedValues) 
        });
      }
      await load();
    } catch (err) {
      console.error('Error saving transaction:', err);
      alert('Error saving transaction. Please try again.');
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
      <CrudFormModal open={open} onClose={()=>setOpen(false)} fields={schema.fields} initial={editing} onSubmit={onSubmit} title={editing?`Edit ${schema.title}`:`Add ${schema.title}`} />
    </div>
  );
}


