"use client";

import { useCallback, useEffect, useState } from "react";
import { schemas } from "@/lib/tableSchemas";
import { CrudField } from "./CrudFormModal";

interface CombinedCustomerFormProps {
  open: boolean;
  onClose: () => void;
  initialCustomer?: any;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  title: string;
}

export default function CombinedCustomerForm({
  open,
  onClose,
  initialCustomer,
  onSubmit,
  title,
}: CombinedCustomerFormProps) {
  // Form values for each section
  const [customerValues, setCustomerValues] = useState<Record<string, any>>({});
  const [taxValues, setTaxValues] = useState<Record<string, any>>({});
  const [docValues, setDocValues] = useState<Record<string, any>>({});
  const [accountValues, setAccountValues] = useState<Record<string, any>>({});
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Options for dropdowns (relations)
  const [options, setOptions] = useState<Record<string, Array<{ value: any; label: string }>>>({});
  
  // Schemas for each form section
  const customerSchema = schemas.customers;
  const taxSchema = schemas.customer_tax_details;
  const docSchema = schemas.identity_documents;
  const accountSchema = schemas.accounts;

  // Initialize form values when the modal opens or when editing an existing customer
  useEffect(() => {
    // Initialize customer values
    const cv: Record<string, any> = {};
    customerSchema.fields.forEach((f) => {
      const initialValue = initialCustomer?.[f.name];
      if (initialValue !== undefined && initialValue !== null) {
        cv[f.name] = initialValue;
      } else {
        cv[f.name] = f.type === "boolean" ? false : "";
      }
    });
    setCustomerValues(cv);

    // Initialize tax values with empty fields
    const tv: Record<string, any> = {};
    taxSchema.fields.forEach((f) => {
      tv[f.name] = f.type === "boolean" ? false : "";
    });
    setTaxValues(tv);

    // Initialize document values with empty fields
    const dv: Record<string, any> = {};
    docSchema.fields.forEach((f) => {
      dv[f.name] = f.type === "boolean" ? false : "";
    });
    setDocValues(dv);
    
    // Initialize account values with empty fields
    const av: Record<string, any> = {};
    accountSchema.fields.forEach((f) => {
      // Skip received and pending_amount fields as requested
      if (f.name !== "received" && f.name !== "pending_amount") {
        av[f.name] = f.type === "boolean" ? false : "";
      }
    });
    setAccountValues(av);

    // If editing, fetch related tax details, documents, and account info
    if (initialCustomer?.id) {
      fetchRelatedData(initialCustomer.id);
    }
  }, [initialCustomer, open]);

  // Fetch tax details, documents, and account info for an existing customer
  const fetchRelatedData = async (customerId: string) => {
    try {
      // Fetch tax details
      const taxRes = await fetch(`/api/${taxSchema.table}`);
      const taxData = await taxRes.json();
      const customerTax = taxData.find((item: any) => item.customer_id === customerId);
      
      if (customerTax) {
        setTaxValues({
          id: customerTax.id, // Store the ID for PATCH operations
          customer_id: customerId,
          pan_no: customerTax.pan_no || "",
          gst_no: customerTax.gst_no || "",
          gst_type: customerTax.gst_type || "",
        });
      }

      // Fetch documents
      const docRes = await fetch(`/api/${docSchema.table}`);
      const docData = await docRes.json();
      const customerDoc = docData.find((item: any) => item.customer_id === customerId);
      
      if (customerDoc) {
        setDocValues({
          id: customerDoc.id, // Store the ID for PATCH operations
          customer_id: customerId,
          document_type: customerDoc.document_type || "",
          document_number: customerDoc.document_number || "",
          document_image: customerDoc.document_image || "",
        });
      }
      
      // Fetch account info
      const accountRes = await fetch(`/api/${accountSchema.table}`);
      const accountData = await accountRes.json();
      const customerAccount = accountData.find((item: any) => item.customer_id === customerId);
      
      if (customerAccount) {
        setAccountValues({
          id: customerAccount.id, // Store the ID for PATCH operations
          customer_id: customerId,
          opening_balance: customerAccount.opening_balance || "",
          credit_allowed: customerAccount.credit_allowed || false,
          credit_limit: customerAccount.credit_limit || "",
          price_category: customerAccount.price_category || "",
          remark: customerAccount.remark || "",
          // Exclude received and pending_amount as requested
        });
      }
    } catch (err) {
      console.error("Error fetching related data:", err);
    }
  };

  // Load relation options (for dropdowns)
  useEffect(() => {
    let active = true;
    async function loadRelations() {
      const allFields = [...customerSchema.fields, ...taxSchema.fields, ...docSchema.fields];
      const relationFields = allFields.filter((f) => f.relation);
      
      if (relationFields.length === 0) return;
      
      const loaded: Record<string, Array<{ value: any; label: string }>> = {};
      for (const f of relationFields) {
        try {
          const res = await fetch(`/api/rel/${f.relation!.table}`);
          const list = (await res.json()) as Array<Record<string, any>>;
          loaded[f.name] = list.map((r) => ({ 
            value: r[f.relation!.valueField], 
            label: r[f.relation!.labelField] 
          }));
        } catch (e) {
          loaded[f.name] = [];
        }
      }
      
      if (active) setOptions(loaded);
    }
    
    loadRelations();
    return () => {
      active = false;
    };
  }, []);

  // Validate all form sections
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    
    // Validate customer fields
    for (const f of customerSchema.fields) {
      const v = customerValues[f.name];
      if (f.required && (v === "" || v === undefined || v === null)) {
        e[f.name] = `${f.label} is required`;
      }
    }
    
    // Only validate tax fields if any of them are filled
    const hasTaxData = taxValues.pan_no || taxValues.gst_no || taxValues.gst_type;
    if (hasTaxData) {
      for (const f of taxSchema.fields) {
        // Skip customer_id as it will be set automatically
        if (f.name === "customer_id") continue;
        
        const v = taxValues[f.name];
        if (f.required && (v === "" || v === undefined || v === null)) {
          e[`tax_${f.name}`] = `${f.label} is required`;
        }
      }
      
      // Validate PAN format
      if (taxValues.pan_no && !validatePAN(taxValues.pan_no)) {
        e.tax_pan_no = "Invalid PAN number format. Format should be: AAAAA1234A";
      }
      
      // Validate GST format
      if (taxValues.gst_no && !validateGST(taxValues.gst_no)) {
        e.tax_gst_no = "Invalid GST number format. Format should be: 22AAAAA1234A1Z5";
      }
      
      // Validate PAN matches with GST
      if (taxValues.pan_no && taxValues.gst_no) {
        const panFromGST = taxValues.gst_no.substring(2, 12);
        if (panFromGST !== taxValues.pan_no) {
          e.tax_gst_no = "PAN number in GST does not match with provided PAN";
        }
      }
    }
    
    // Only validate document fields if any of them are filled
    const hasDocData = docValues.document_type || docValues.document_number || docValues.document_image;
    if (hasDocData) {
      for (const f of docSchema.fields) {
        // Skip customer_id as it will be set automatically
        if (f.name === "customer_id") continue;
        
        const v = docValues[f.name];
        if (f.required && (v === "" || v === undefined || v === null)) {
          e[`doc_${f.name}`] = `${f.label} is required`;
        }
      }
      
      // Validate document number based on type
      if (docValues.document_type && docValues.document_number) {
        const docType = docValues.document_type;
        const docNumber = docValues.document_number;
        
        if (docType === "Aadhaar Card" && !/^\d{12}$/.test(docNumber)) {
          e.doc_document_number = "Aadhaar number must be 12 digits";
        } else if (docType === "PAN Card" && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(docNumber)) {
          e.doc_document_number = "Invalid PAN number format (e.g., ABCDE1234F)";
        } else if (docType === "Voter ID" && !/^[A-Z]{3}\d{7}$/.test(docNumber)) {
          e.doc_document_number = "Invalid Voter ID format (e.g., ABC1234567)";
        }
      }
    }
    
    // Only validate account fields if any of them are filled
    const hasAccountData = accountValues.opening_balance || 
                          accountValues.credit_limit || 
                          accountValues.price_category || 
                          accountValues.remark || 
                          accountValues.credit_allowed;
    if (hasAccountData) {
      for (const f of accountSchema.fields) {
        // Skip customer_id as it will be set automatically
        // Also skip received and pending_amount as requested
        if (f.name === "customer_id" || f.name === "received" || f.name === "pending_amount") continue;
        
        const v = accountValues[f.name];
        if (f.required && (v === "" || v === undefined || v === null)) {
          e[`account_${f.name}`] = `${f.label} is required`;
        }
      }
      
      // Validate numeric fields
      if (accountValues.opening_balance && isNaN(Number(accountValues.opening_balance))) {
        e.account_opening_balance = "Opening Balance must be a number";
      }
      
      if (accountValues.credit_limit && isNaN(Number(accountValues.credit_limit))) {
        e.account_credit_limit = "Credit Limit must be a number";
      }
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

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

  // Handle file upload for identity documents
  const handleFileUpload = async (file: File, customerId: string, docType: string) => {
    // Check file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('File size exceeds 10MB limit');
    }

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('customerId', customerId);
    formData.append('docType', docType);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();
    return data.path;
  };

  // Submit all forms
  const submit = async () => {
    if (!validate()) {
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Initial customer data:', initialCustomer);
      
      // Make sure we have the ID in the customer values for editing
      if (initialCustomer?.id) {
        customerValues.id = initialCustomer.id;
      }
      
      // Set created_at timestamp if it's a new customer
      if (!initialCustomer) {
        customerValues.created_at = new Date().toISOString();
      }
      
      console.log('Submitting customer values:', customerValues);
      
      // First save customer data
      const customerResult = await onSubmit(customerValues);
      console.log('Customer save result:', customerResult);
      const customerId = initialCustomer?.id || customerResult?.id;
      
      if (!customerId) {
        throw new Error("Failed to get customer ID after save");
      }
      
      // Check if tax details should be saved
      const hasTaxData = taxValues.pan_no || taxValues.gst_no || taxValues.gst_type;
      if (hasTaxData) {
        // Set customer ID for tax details
        const taxDataToSave = {
          ...taxValues,
          customer_id: customerId
        };
        
        console.log('Tax data to save:', taxDataToSave);
        
        // If we're editing an existing customer, check if tax details already exist
        let existingTaxId = taxValues.id;
        
        if (!existingTaxId && initialCustomer?.id) {
          try {
            // Check for existing tax details
            const taxRes = await fetch(`/api/${taxSchema.table}`);
            const allTaxDetails = await taxRes.json();
            const existing = allTaxDetails.find((detail: any) => detail.customer_id === customerId);
            
            if (existing) {
              existingTaxId = existing.id;
              console.log('Found existing tax details:', existing);
            }
          } catch (err) {
            console.error('Error checking existing tax details:', err);
          }
        }
        
        // Save tax details - use PATCH if we have an ID, otherwise POST
        if (existingTaxId) {
          console.log(`Updating tax details with ID: ${existingTaxId}`);
          const res = await fetch(`/api/${taxSchema.table}/${existingTaxId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taxDataToSave)
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Error updating tax details:', errorData);
            throw new Error(errorData.error || 'Failed to update tax details');
          }
        } else {
          console.log('Creating new tax details');
          const res = await fetch(`/api/${taxSchema.table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taxDataToSave)
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Error creating tax details:', errorData);
            throw new Error(errorData.error || 'Failed to create tax details');
          }
        }
      }
      
      // Check if document details should be saved
      const hasDocData = docValues.document_type || docValues.document_number || docValues.document_image instanceof File;
      if (hasDocData) {
        // Handle file upload if there's a file
        let imageUrl = docValues.document_image;
        if (docValues.document_image instanceof File) {
          imageUrl = await handleFileUpload(
            docValues.document_image,
            customerId,
            docValues.document_type
          );
        }
        
        // Set customer ID and image URL for document
        const docDataToSave = {
          ...docValues,
          customer_id: customerId,
          document_image: imageUrl
        };
        
        console.log('Document data to save:', docDataToSave);
        
        // If we're editing an existing customer, check if document details already exist
        let existingDocId = docValues.id;
        
        if (!existingDocId && initialCustomer?.id) {
          try {
            // Check for existing document details
            const docRes = await fetch(`/api/${docSchema.table}`);
            const allDocDetails = await docRes.json();
            const existing = allDocDetails.find((detail: any) => 
              detail.customer_id === customerId && detail.document_type === docValues.document_type
            );
            
            if (existing) {
              existingDocId = existing.id;
              console.log('Found existing document details:', existing);
            }
          } catch (err) {
            console.error('Error checking existing document details:', err);
          }
        }
        
        // Save document details - use PATCH if we have an ID, otherwise POST
        if (existingDocId) {
          console.log(`Updating document details with ID: ${existingDocId}`);
          const res = await fetch(`/api/${docSchema.table}/${existingDocId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(docDataToSave)
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Error updating document details:', errorData);
            throw new Error(errorData.error || 'Failed to update document details');
          }
        } else {
          console.log('Creating new document details');
          const res = await fetch(`/api/${docSchema.table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(docDataToSave)
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Error creating document details:', errorData);
            throw new Error(errorData.error || 'Failed to create document details');
          }
        }
      }
      
      // Check if account details should be saved
      const hasAccountData = accountValues.opening_balance || 
                            accountValues.credit_limit || 
                            accountValues.price_category || 
                            accountValues.remark || 
                            accountValues.credit_allowed;
      if (hasAccountData) {
        // Set customer ID for account
        const accountDataToSave = {
          ...accountValues,
          customer_id: customerId,
          // Initialize received and pending_amount to 0 for new accounts
          received: 0,
          pending_amount: 0
        };
        
        console.log('Account data to save:', accountDataToSave);
        
        // If we're editing an existing customer, check if account already exists
        let existingAccountId = accountValues.id;
        
        if (!existingAccountId && initialCustomer?.id) {
          try {
            // Check for existing account
            const accountRes = await fetch(`/api/${accountSchema.table}`);
            const allAccounts = await accountRes.json();
            const existing = allAccounts.find((account: any) => account.customer_id === customerId);
            
            if (existing) {
              existingAccountId = existing.id;
              console.log('Found existing account:', existing);
            }
          } catch (err) {
            console.error('Error checking existing account:', err);
          }
        }
        
        // Save account details - use PATCH if we have an ID, otherwise POST
        if (existingAccountId) {
          console.log(`Updating account with ID: ${existingAccountId}`);
          const res = await fetch(`/api/${accountSchema.table}/${existingAccountId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(accountDataToSave)
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Error updating account:', errorData);
            throw new Error(errorData.error || 'Failed to update account');
          }
        } else {
          console.log('Creating new account');
          const res = await fetch(`/api/${accountSchema.table}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(accountDataToSave)
          });
          
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            console.error('Error creating account:', errorData);
            throw new Error(errorData.error || 'Failed to create account');
          }
        }
      }
      
      // Reset form and close modal
      setCustomerValues({});
      setTaxValues({});
      setDocValues({});
      setAccountValues({});
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
      // Show more detailed error message
      if (error instanceof Error) {
        alert(`Error saving data: ${error.message}`);
      } else {
        alert('Error saving data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Render form field based on its type
  const renderField = (
    field: CrudField, 
    values: Record<string, any>,
    setValues: React.Dispatch<React.SetStateAction<Record<string, any>>>,
    errorPrefix: string = ""
  ) => {
    return (
      <div key={field.name} className="flex flex-col gap-1">
        <label className="text-xs text-gray-400">
          {field.label}{field.required ? " *" : ""}
        </label>
        
        {field.type === "textarea" && (
          <textarea
            value={values[field.name] ?? ""}
            onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
            placeholder={field.placeholder}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 h-24"
          />
        )}
        
        {(field.type === "text" || field.type === "number" || field.type === "datetime") && (
          <>
            {field.name === "document_image" ? (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setValues({ ...values, [field.name]: file });
                  }
                }}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500"
              />
            ) : (
              <input
                type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                value={values[field.name] ?? ""}
                onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
                placeholder={field.placeholder}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
              />
            )}
          </>
        )}
        
        {field.type === "boolean" && (
          <select
            value={String(values[field.name] ?? false)}
            onChange={(e) => setValues({ ...values, [field.name]: e.target.value === "true" })}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
          >
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        )}
        
        {(field.type === "enum" || field.type === "select") && (
          <select
            value={values[field.name] ?? ""}
            onChange={(e) => setValues({ ...values, [field.name]: e.target.value })}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
          >
            <option value="">Select...</option>
            {field.enumValues?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
            {field.relation && options[field.name]?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        
        {errors[`${errorPrefix}${field.name}`] && (
          <span className="text-xs text-red-400">{errors[`${errorPrefix}${field.name}`]}</span>
        )}
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-gray-900 text-gray-100 rounded-lg border border-gray-800 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Customer Information Section */}
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3">Customer Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerSchema.fields.map((field) => 
              field.name !== "created_at" && renderField(field, customerValues, setCustomerValues)
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-700 my-6"></div>

        {/* Tax Details Section */}
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3">Customer Tax Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {taxSchema.fields.map((field) => 
              field.name !== "customer_id" && renderField(field, taxValues, setTaxValues, "tax_")
            )}
          </div>
        </div>

        {/* Separator */}
        <div className="border-t border-gray-700 my-6"></div>

        {/* Identity Documents Section */}
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3">Identity Documents</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {docSchema.fields.map((field) => 
              field.name !== "customer_id" && renderField(field, docValues, setDocValues, "doc_")
            )}
          </div>
        </div>
        
        {/* Separator */}
        <div className="border-t border-gray-700 my-6"></div>
        
        {/* Accounts Section */}
        <div className="mb-6">
          <h4 className="text-md font-medium mb-3">Account Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accountSchema.fields.map((field) => 
              // Skip customer_id, received and pending_amount fields
              field.name !== "customer_id" && 
              field.name !== "received" && 
              field.name !== "pending_amount" && 
              renderField(field, accountValues, setAccountValues, "account_")
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded bg-gray-800 border border-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
