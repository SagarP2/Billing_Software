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

  const load = useCallback(async () => {
    const res = await fetch(`/api/${schema.table}`);
    setRows((await res.json()) ?? []);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{schema.title}</h1>
        <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={() => { setEditing(null); setOpen(true); }}>Add New</button>
      </div>
      <DataTable data={rows} columns={schema.listColumns as any} onEdit={(r)=>{setEditing(r); setOpen(true);}} onDelete={onDelete} />
      <CrudFormModal open={open} onClose={()=>setOpen(false)} fields={schema.fields} initial={editing} onSubmit={onSubmit} title={editing?`Edit ${schema.title}`:`Add ${schema.title}`} />
    </div>
  );
}


