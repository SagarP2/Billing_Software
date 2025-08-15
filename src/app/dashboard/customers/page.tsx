"use client";

import { useCallback, useEffect, useState } from "react";
// Now use our own API backed by PostgreSQL
import DataTable from "@/components/admin/DataTable";
import CombinedCustomerForm from "@/components/admin/CombinedCustomerForm";
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
      
      if (values.id || editing) {
        // Use the ID from values if available, otherwise from editing state
        const id = values.id || editing?.id;
        console.log(`Updating customer with ID: ${id}`);
        
        const res = await fetch(`/api/${schema.table}/${id}`, { 
          method: 'PATCH', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(cleanValues) 
        });
        
        if (!res.ok) { 
          const j = await res.json().catch(() => ({})); 
          throw new Error(j.error || 'Update failed'); 
        }
        
        const updatedData = await res.json().catch(() => ({ id }));
        await load();
        return updatedData || { id };
      } else {
        console.log('Creating new customer');
        const res = await fetch(`/api/${schema.table}`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(cleanValues) 
        });
        
        if (!res.ok) { 
          const j = await res.json().catch(() => ({})); 
          throw new Error(j.error || 'Create failed'); 
        }
        
        const data = await res.json();
        console.log('Created customer:', data);
        await load();
        return data;
      }
    } catch (err) {
      console.error('Save error:', err);
      if (err instanceof Error) {
        alert(`Error saving record: ${err.message}`);
      } else {
        alert('Error saving record');
      }
      throw err;
    }
  };

  const handleDelete = async (row: any) => {
    if (!confirm("Delete this customer and all related records (tax details, identity documents, accounts, card details, transactions)?")) return;
    
    try {
      // Delete all related records in the correct order to maintain referential integrity
      const relatedTables = [
        'transactions',
        'card_details',
        'customer_credits',
        'payment_alerts',
        'accounts',
        'customer_tax_details',
        'identity_documents'
      ];

      // Delete all related records from each table
      for (const table of relatedTables) {
        try {
          console.log(`Fetching ${table} for customer ${row.id}`);
          const res = await fetch(`/api/${table}?customer_id=${row.id}`);
          if (!res.ok) {
            console.error(`Failed to fetch ${table}:`, await res.text());
            continue;
          }
          
          const data = await res.json();
          const customerRecords = Array.isArray(data) ? data : [];
          console.log(`Found ${customerRecords.length} ${table} records for customer ${row.id}`);
          
          for (const record of customerRecords) {
            try {
              console.log(`Deleting ${table} record ${record.id}`);
              const deleteRes = await fetch(`/api/${table}/${record.id}`, { 
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
              });
              
              if (!deleteRes.ok) {
                const errorText = await deleteRes.text();
                console.error(`Failed to delete ${table} record ${record.id}:`, errorText);
              } else {
                console.log(`Successfully deleted ${table} record ${record.id}`);
              }
            } catch (deleteError) {
              console.error(`Error deleting ${table} record ${record.id}:`, deleteError);
            }
          }
        } catch (tableError) {
          console.error(`Error processing ${table}:`, tableError);
        }
      }
      
      // Finally delete the customer
      console.log(`Attempting to delete customer ${row.id}`);
      const res = await fetch(`/api/${schema.table}/${row.id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to delete customer:', errorText);
        throw new Error(`Failed to delete customer: ${errorText}`);
      }
      
      console.log('Customer deleted successfully');
      await load();
    } catch (error) {
      console.error('Delete error:', error);
      if (error instanceof Error) {
        alert(`Error deleting customer: ${error.message}`);
      } else {
        alert('Error deleting customer. Please check console for details.');
      }
    }
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

      <CombinedCustomerForm
        open={open}
        onClose={() => setOpen(false)}
        initialCustomer={editing}
        onSubmit={handleSave}
        title={editing ? `Edit ${schema.title}` : `Add ${schema.title}`}
      />
    </div>
  );
}

