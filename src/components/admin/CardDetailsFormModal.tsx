"use client";

import { useEffect, useState } from "react";
import { CrudField } from "./CrudFormModal";
import { schemas } from "@/lib/tableSchemas";

interface CardDetailsFormModalProps {
  open: boolean;
  onClose: () => void;
  initial: any | null;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  title: string;
}

export default function CardDetailsFormModal({
  open,
  onClose,
  initial,
  onSubmit,
  title,
}: CardDetailsFormModalProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<Record<string, Array<{ value: any; label: string }>>>({});
  const [availableCards, setAvailableCards] = useState<string[]>([]);
  
  const schema = schemas.card_details;
  const fields = schema.fields;

  // Run migration when component mounts
  useEffect(() => {
    async function runMigration() {
      try {
        await fetch('/api/migrate-card-details');
      } catch (error) {
        console.error('Migration error:', error);
      }
    }
    runMigration();
  }, []);

  // Initialize form values when the modal opens or when editing
  useEffect(() => {
    const v: Record<string, any> = {};
    fields.forEach((f) => {
      const initialValue = initial?.[f.name];
      if (initialValue !== undefined && initialValue !== null) {
        v[f.name] = initialValue;
      } else {
        v[f.name] = f.type === "boolean" ? false : "";
      }
    });
    console.log('Setting form values:', v);
    setValues(v);
    
    // Update available cards if bank and type are set
    if (v.bank_name && v.card_type) {
      updateAvailableCards(v.bank_name, v.card_type);
    }
  }, [initial, open, fields]);

  // Load customer options
  useEffect(() => {
    let active = true;
    async function loadRelations() {
      const relationFields = fields.filter((f) => f.relation);
      if (relationFields.length === 0) return;
      const loaded: Record<string, Array<{ value: any; label: string }>> = {};
      for (const f of relationFields) {
        try {
          const res = await fetch(`/api/rel/${f.relation!.table}`);
          const list = (await res.json()) as Array<Record<string, any>>;
          loaded[f.name] = list.map((r) => ({ value: r[f.relation!.valueField], label: r[f.relation!.labelField] }));
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
  }, [fields]);

  // Update available card names based on selected bank and type
  const updateAvailableCards = (bankName: string, cardType: string) => {
    if (!bankName || !cardType) {
      setAvailableCards([]);
      return;
    }
    
    const cardOptions = schema.fields.find(f => f.name === 'card_name')?.enumValues || [];
    const filtered = cardOptions.filter(card => 
      card.startsWith(bankName.split(' ')[0]) && // Match bank prefix
      card.includes(cardType.split(' ')[0]) // Match card type (Credit/Debit)
    );
    
    setAvailableCards(filtered);
    
    // If current card name is not in filtered list, reset it
    if (values.card_name && !filtered.includes(values.card_name)) {
      setValues({...values, card_name: ""});
    }
  };

  // Handle field change
  const handleChange = (name: string, value: any) => {
    const newValues = { ...values, [name]: value };
    setValues(newValues);
    
    // Update available cards when bank or type changes
    if (name === 'bank_name' || name === 'card_type') {
      updateAvailableCards(
        name === 'bank_name' ? value : values.bank_name,
        name === 'card_type' ? value : values.card_type
      );
    }
  };

  // Validate form
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    
    // Check required fields
    if (!values.customer_id) {
      e.customer_id = "Customer is required";
    }
    
    if (!values.bank_name) {
      e.bank_name = "Bank Name is required";
    }
    
    if (!values.card_type) {
      e.card_type = "Card Type is required";
    }
    
    if (!values.card_name) {
      e.card_name = "Card Name is required";
    } else if (availableCards.length > 0 && !availableCards.includes(values.card_name)) {
      e.card_name = "Selected card is not valid for the chosen bank and type";
    }
    
    // Validate card number format if provided
    if (values.card_number) {
      // Remove spaces and check if it's a valid card number format
      const cardNumber = values.card_number.replace(/\s+/g, '');
      
      // Basic validation: Check if it's between 13-19 digits (standard card number lengths)
      if (!/^\d{13,19}$/.test(cardNumber)) {
        e.card_number = "Card number should be between 13 and 19 digits";
      }
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Submit form
  const submit = async () => {
    console.log('Form values before validation:', values);
    if (!validate()) {
      console.log('Validation failed:', errors);
      return;
    }
    
    setLoading(true);
    try {
      // Format card number with spaces for better readability if provided
      if (values.card_number) {
        const cardNumber = values.card_number.replace(/\s+/g, '');
        values.card_number = cardNumber.replace(/(\d{4})/g, '$1 ').trim();
      }
      
      console.log('Submitting values:', values);
      
      // Create a copy of values to avoid reference issues
      const valuesToSubmit = { ...values };
      
      // Log the exact payload being sent
      console.log('Final payload to submit:', JSON.stringify(valuesToSubmit, null, 2));
      
      try {
        await onSubmit(valuesToSubmit);
        onClose();
      } catch (submitError) {
        console.error('Submit error details:', submitError);
        throw submitError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.error('Submit error:', error);
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        alert(`Error: ${error.message}`);
      } else {
        console.error('Unknown error type:', typeof error);
        alert('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-gray-900 text-gray-100 rounded-lg border border-gray-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Customer *</label>
            <select
              value={values.customer_id ?? ""}
              onChange={(e) => handleChange('customer_id', e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
            >
              <option value="">Select Customer...</option>
              {options.customer_id?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <span className="text-xs text-red-400">{errors.customer_id}</span>
            )}
          </div>

          {/* Bank Name Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Bank Name *</label>
            <select
              value={values.bank_name ?? ""}
              onChange={(e) => handleChange('bank_name', e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
            >
              <option value="">Select Bank...</option>
              {fields.find(f => f.name === 'bank_name')?.enumValues?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {errors.bank_name && (
              <span className="text-xs text-red-400">{errors.bank_name}</span>
            )}
          </div>

          {/* Card Type Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Card Type *</label>
            <select
              value={values.card_type ?? ""}
              onChange={(e) => handleChange('card_type', e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
            >
              <option value="">Select Card Type...</option>
              {fields.find(f => f.name === 'card_type')?.enumValues?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {errors.card_type && (
              <span className="text-xs text-red-400">{errors.card_type}</span>
            )}
          </div>

          {/* Card Name Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Card Name *</label>
            <select
              value={values.card_name ?? ""}
              onChange={(e) => handleChange('card_name', e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
              disabled={availableCards.length === 0}
            >
              <option value="">Select Card Name...</option>
              {availableCards.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {errors.card_name && (
              <span className="text-xs text-red-400">{errors.card_name}</span>
            )}
            {availableCards.length === 0 && values.bank_name && values.card_type && (
              <span className="text-xs text-yellow-400">No cards available for selected bank and type</span>
            )}
          </div>

          {/* Card Number Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Card Number</label>
            <input
              type="text"
              value={values.card_number ?? ""}
              onChange={(e) => handleChange('card_number', e.target.value)}
              placeholder="XXXX XXXX XXXX XXXX"
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
            />
            {errors.card_number && (
              <span className="text-xs text-red-400">{errors.card_number}</span>
            )}
          </div>

          {/* Due Date Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Due Date</label>
            <input
              type="date"
              value={values.due_date ?? ""}
              onChange={(e) => handleChange('due_date', e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-800 border border-gray-700">Cancel</button>
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
