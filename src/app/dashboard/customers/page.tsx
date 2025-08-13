"use client";

import { useCallback, useEffect, useState } from "react";
// Now use our own API backed by PostgreSQL
import DataTable from "@/components/admin/DataTable";
import CrudFormModal from "@/components/admin/CrudFormModal";
import { schemas } from "@/lib/tableSchemas";

const schema = schemas.customers;

export default function CustomersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${schema.table}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) { setRows([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (values: Record<string, any>) => {
    try {
      console.log('Saving values:', values);
      
      // Clean up values - remove empty strings for non-required fields
      const cleanValues = Object.fromEntries(
        Object.entries(values).map(([key, value]) => {
          if (value === "" && !schema.fields.find(f => f.name === key)?.required) {
            return [key, null];
          }
          return [key, value];
        })
      );
      
      console.log('Clean values:', cleanValues);
      
      if (editing) {
        const res = await fetch(`/api/${schema.table}/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cleanValues) });
        if (!res.ok) { const j = await res.json().catch(()=>({})); throw new Error(j.error || 'Update failed'); }
        await load();
      } else {
        const res = await fetch(`/api/${schema.table}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cleanValues) });
        if (!res.ok) { const j = await res.json().catch(()=>({})); throw new Error(j.error || 'Create failed'); }
        await load();
      }
      setEditing(null);
    } catch (err) {
      console.error('Save error:', err);
      alert('Error saving record');
    }
  };

  const handleDelete = async (row: any) => {
    if (!confirm("Delete this record?")) return;
    const res = await fetch(`/api/${schema.table}/${row.id}`, { method: 'DELETE' });
    if (res.ok) await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{schema.title}</h1>
        <button
          className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Add New
        </button>
      </div>

      <DataTable
        data={rows}
        columns={schema.listColumns as any}
        onEdit={(row) => {
          setEditing(row);
          setOpen(true);
        }}
        onDelete={handleDelete}
      />

      <CrudFormModal
        open={open}
        onClose={() => setOpen(false)}
        fields={schema.fields}
        initial={editing}
        onSubmit={handleSave}
        title={editing ? `Edit ${schema.title}` : `Add ${schema.title}`}
      />
    </div>
  );
}


