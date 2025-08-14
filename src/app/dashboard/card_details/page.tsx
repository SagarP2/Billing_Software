"use client";
import { useCallback, useEffect, useState } from "react";
// Use our API backed by PostgreSQL
import DataTable from "@/components/admin/DataTable";
import CrudFormModal from "@/components/admin/CrudFormModal";
import { schemas } from "@/lib/tableSchemas";

const schema = schemas.card_details;

export default function CardDetailsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/${schema.table}`);
    setRows((await res.json()) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Get available card names based on selected bank and type
  const getAvailableCards = (bankName: string, cardType: string) => {
    const cardOptions = schema.fields.find(f => f.name === 'card_name')?.enumValues || [];
    return cardOptions.filter(card => 
      card.startsWith(bankName.split(' ')[0]) && // Match bank prefix
      card.includes(cardType.split(' ')[0]) // Match card type (Credit/Debit)
    );
  };

  const onSubmit = async (values: Record<string, any>) => {
    try {
      // Validate required fields
      if (!values.bank_name || !values.card_type) {
        alert('Bank Name and Card Type are required');
        return;
      }

      // Validate card name matches bank and type
      const availableCards = getAvailableCards(values.bank_name, values.card_type);
      if (!availableCards.includes(values.card_name)) {
        alert('Selected card is not valid for the chosen bank and type');
        return;
      }

      // Validate card number
      if (!values.card_number || values.card_number.length < 12 || values.card_number.length > 19) {
        alert('Please enter a valid card number (12-19 digits)');
        return;
      }

      // Remove any spaces or special characters from card number
      values.card_number = values.card_number.replace(/[^0-9]/g, '');

      if (editing) {
        await fetch(`/api/${schema.table}/${editing.id}`, { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(values) 
        });
      } else {
        await fetch(`/api/${schema.table}`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(values) 
        });
      }
      await load();
    } catch (err) {
      console.error('Error saving card details:', err);
      alert('Error saving card details. Please try again.');
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


