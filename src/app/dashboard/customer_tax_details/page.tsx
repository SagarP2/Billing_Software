"use client";
import { useCallback, useEffect, useState } from "react";
// Use our API backed by PostgreSQL
import DataTable from "@/components/admin/DataTable";
import CrudFormModal from "@/components/admin/CrudFormModal";
import { schemas } from "@/lib/tableSchemas";

const schema = schemas.customer_tax_details;

export default function CustomerTaxDetailsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [existingTaxDetails, setExistingTaxDetails] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/${schema.table}`);
    const data = await res.json();
    
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
  }, []);

  // Function to check existing tax details for a customer
  const checkExistingTaxDetails = useCallback(async (customerId: string) => {
    try {
      // First get customer details
      const customerRes = await fetch(`/api/customers/${customerId}`);
      const customer = await customerRes.json();
      setSelectedCustomer(customer);

      // Then check for existing tax details
      const res = await fetch(`/api/${schema.table}`);
      const allTaxDetails = await res.json();
      const existing = allTaxDetails.find((detail: any) => detail.customer_id === customerId);
      
      if (existing) {
        setExistingTaxDetails(existing);
        return true;
      } else {
        setExistingTaxDetails(null);
        return false;
      }
    } catch (err) {
      console.error('Error checking existing tax details:', err);
      return false;
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Validate PAN number format
  const validatePAN = (pan: string): boolean => {
    // PAN format: AAAAA1234A (5 letters + 4 numbers + 1 letter)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  // Validate GST number format
  const validateGST = (gst: string): boolean => {
    // GST format: 22AAAAA1234A1Z5
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst);
  };

  // Load customer details for PAN validation
  const loadCustomerDetails = async (customerId: string) => {
    try {
      const res = await fetch(`/api/customers/${customerId}`);
      if (!res.ok) throw new Error('Failed to load customer details');
      return await res.json();
    } catch (err) {
      console.error('Error loading customer details:', err);
      return null;
    }
  };

  const onSubmit = async (values: Record<string, any>) => {
    try {
      // Check for existing tax details when customer is selected
      if (!editing && values.customer_id) {
        const hasExisting = await checkExistingTaxDetails(values.customer_id);
        if (hasExisting) {
          const proceed = confirm(
            `Tax details already exist for this customer:\n\n` +
            `PAN: ${existingTaxDetails.pan_no}\n` +
            `GST: ${existingTaxDetails.gst_no}\n` +
            `Type: ${existingTaxDetails.gst_type}\n\n` +
            `Would you like to edit the existing details instead?`
          );
          if (proceed) {
            setEditing(existingTaxDetails);
            return;
          }
        }
      }

      // Validate required fields
      if (!values.customer_id || !values.pan_no || !values.gst_no || !values.gst_type) {
        alert('All fields are required');
        return;
      }

      // Validate PAN format
      if (!validatePAN(values.pan_no)) {
        alert('Invalid PAN number format. Format should be: AAAAA1234A');
        return;
      }

      // Validate GST format
      if (!validateGST(values.gst_no)) {
        alert('Invalid GST number format. Format should be: 22AAAAA1234A1Z5');
        return;
      }

      // Validate PAN matches with GST
      const panFromGST = values.gst_no.substring(2, 12);
      if (panFromGST !== values.pan_no) {
        alert('PAN number in GST does not match with provided PAN');
        return;
      }

      // Load customer details to verify name
      if (selectedCustomer) {
        // Extract first letters of each word in customer name
        const nameInitials = selectedCustomer.full_name
          .split(' ')
          .map((word: string) => word[0])
          .join('')
          .substring(0, 3);

        // Check if PAN starts with customer name initials (optional validation)
        if (!values.pan_no.startsWith(nameInitials)) {
          const proceed = confirm(
            `Warning: PAN number initials do not match customer name initials.\n\n` +
            `Customer Name: ${selectedCustomer.full_name}\n` +
            `Expected Initials: ${nameInitials}\n` +
            `PAN Number: ${values.pan_no}\n\n` +
            `Proceed anyway?`
          );
          if (!proceed) return;
        }
      }

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
      setOpen(false);
      setExistingTaxDetails(null);
      setSelectedCustomer(null);
    } catch (err) {
      console.error('Error saving tax details:', err);
      alert('Error saving tax details. Please try again.');
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


