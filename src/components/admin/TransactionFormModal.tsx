"use client";

import { useEffect, useState } from "react";
import { schemas } from "@/lib/tableSchemas";

interface TransactionFormModalProps {
  open: boolean;
  onClose: () => void;
  initial: any | null;
  onSubmit: (values: Record<string, any>) => Promise<void>;
  title: string;
}

// Define the tax and MDR rates structure
const TAX_MDR_RATES = {
  MP: [
    { tax: "3.50", mdr: "1.50" },
    { tax: "3.00", mdr: "2.00" },
    { tax: "2.80", mdr: "2.00" },
    { tax: "2.00", mdr: "1.50" }
  ],
  PH: [
    { tax: "3.50", mdr: "1.50" },
    { tax: "2.80", mdr: "2.00" },
    { tax: "1.90", mdr: "1.50" }
  ],
  MOS: [
    { tax: "2.80", mdr: "2.00" },
    { tax: "2.50", mdr: "2.00" },
    { tax: "2.00", mdr: "1.50" },
    { tax: "1.80", mdr: "1.50" }
  ]
};

export default function TransactionFormModal({
  open,
  onClose,
  initial,
  onSubmit,
  title,
}: TransactionFormModalProps) {
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customers, setCustomers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [cardOptions, setCardOptions] = useState<Array<{ card_number: string; card_name: string }>>([]);
  const [availableTaxRates, setAvailableTaxRates] = useState<string[]>([]);
  
  const schema = schemas.transactions;
  const fields = schema.fields;

  // Initialize form values
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
    
    // For new transactions, set the transaction date to current date/time
    if (!initial) {
      v.transaction_date = new Date().toISOString().slice(0, 16); // Format for datetime-local input
    }
    
    console.log('Setting initial form values:', v);
    setValues(v);
    
    // Update available tax rates if POS type is already set
    if (v.pos_type) {
      updateAvailableTaxRates(v.pos_type);
    }
  }, [initial, fields, open]);

  // Load customers
  useEffect(() => {
    async function loadCustomers() {
      try {
        const res = await fetch('/api/customers');
        const data = await res.json();
        setCustomers(data || []);
      } catch (err) {
        console.error('Error loading customers:', err);
        setCustomers([]);
      }
    }
    
    if (open) {
      loadCustomers();
    }
  }, [open]);

  // Load card options when customer changes
  useEffect(() => {
    async function loadCardOptions() {
      if (!values.customer_id) {
        setCardOptions([]);
        return;
      }
      
      try {
        console.log('Loading cards for customer ID:', values.customer_id);
        
        // Use the dedicated API endpoint to get cards for this customer
        const res = await fetch(`/api/customer-cards/${values.customer_id}`);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch cards: ${res.status}`);
        }
        
        const customerCards = await res.json();
        console.log('Customer cards from API:', customerCards);
        
        // Filter out cards without card numbers
        const validCards = customerCards.filter((card: any) => card.card_number);
        setCardOptions(validCards);
        
        // If we have cards and no card is selected yet, select the first one
        if (validCards.length > 0 && !values.card_number) {
          handleChange('card_number', validCards[0].card_number);
          handleChange('card_name', validCards[0].card_name);
        }
      } catch (err) {
        console.error('Error loading card options:', err);
        setCardOptions([]);
      }
    }
    
    if (values.customer_id) {
      loadCardOptions();
    }
  }, [values.customer_id]);

  // Update available tax rates when POS type changes
  const updateAvailableTaxRates = (posType: string) => {
    if (!posType || !TAX_MDR_RATES[posType as keyof typeof TAX_MDR_RATES]) {
      setAvailableTaxRates([]);
      return;
    }
    
    const rates = TAX_MDR_RATES[posType as keyof typeof TAX_MDR_RATES];
    const taxRates = rates.map(rate => rate.tax);
    setAvailableTaxRates(taxRates);
    
    // Reset tax rate if current selection is not valid for new POS type
    if (values.tax_rate && !taxRates.includes(values.tax_rate)) {
      handleChange('tax_rate', '');
    }
  };

  // Get MDR rate based on POS type and tax rate
  const getMdrRate = (posType: string, taxRate: string): string => {
    if (!posType || !taxRate) return '';
    
    const rates = TAX_MDR_RATES[posType as keyof typeof TAX_MDR_RATES];
    if (!rates) return '';
    
    const rateObj = rates.find(rate => rate.tax === taxRate);
    return rateObj ? rateObj.mdr : '';
  };

  // Handle field change
  const handleChange = (name: string, value: any) => {
    const newValues = { ...values, [name]: value };
    
    // If transaction_type changes to 'credit', clear all debit-related fields
    if (name === 'transaction_type' && value === 'credit') {
      newValues.pos_type = '';
      newValues.tax_rate = '';
      newValues.tax = '';
      newValues.mdr = '';
      newValues.charges = '';
      newValues.profit = '';
      setAvailableTaxRates([]);
    }
    
    // If card_number changes, update card_name if we have that card
    if (name === 'card_number') {
      const selectedCard = cardOptions.find(card => card.card_number === value);
      if (selectedCard) {
        newValues.card_name = selectedCard.card_name;
      }
    }
    
    // If POS type changes and transaction type is debit, update available tax rates
    if (name === 'pos_type' && newValues.transaction_type === 'debit') {
      updateAvailableTaxRates(value);
    }
    
    // If tax rate changes or is set, update MDR rate (only for debit transactions)
    if ((name === 'tax_rate' || name === 'pos_type') && 
        newValues.transaction_type === 'debit' && 
        newValues.pos_type && 
        newValues.tax_rate) {
      const mdrRate = getMdrRate(newValues.pos_type, newValues.tax_rate);
      if (mdrRate) {
        newValues.mdr = mdrRate;
      }
    }
    
    // Calculate fees when amount, tax_rate, or mdr changes (only for debit transactions)
    if ((name === 'amount' || name === 'tax_rate' || name === 'mdr') && 
        newValues.transaction_type === 'debit' &&
        newValues.amount && 
        newValues.tax_rate && 
        newValues.mdr) {
      const fees = calculateTransactionFees(
        Number(newValues.amount), 
        Number(newValues.tax_rate), 
        Number(newValues.mdr)
      );
      newValues.tax = fees.tax;
      newValues.charges = fees.charges;
      newValues.profit = fees.profit;
    }
    
    setValues(newValues);
  };

  // Calculate transaction fees
  const calculateTransactionFees = (amount: number, taxRate: number, mdrRate: number) => {
    // Calculate tax
    const tax = (amount * taxRate) / 100;
    
    // Calculate MDR
    const mdr = (amount * mdrRate) / 100;
    
    // Calculate MDR charges (MDR % of amount)
    const charges = mdr;
    
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

  // Validate form
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    
    // Check required fields
    if (!values.customer_id) {
      e.customer_id = "Customer is required";
    }
    
    if (!values.transaction_type) {
      e.transaction_type = "Transaction Type is required";
    }
    
    if (!values.amount) {
      e.amount = "Amount is required";
    } else if (isNaN(Number(values.amount))) {
      e.amount = "Amount must be a number";
    }
    
    if (values.transaction_type === 'debit') {
      if (!values.pos_type) {
        e.pos_type = "POS Type is required";
      }
      
      if (!values.tax_rate) {
        e.tax_rate = "Tax Rate is required";
      }
    }
    
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Submit form
  const submit = async () => {
    if (!validate()) {
      console.log('Form validation failed:', errors);
      return;
    }
    
    setLoading(true);
    try {
      // Make sure transaction_date is set for new transactions
      if (!values.transaction_date) {
        values.transaction_date = new Date().toISOString();
      }
      
      // Log the final values being submitted
      console.log('Submitting transaction with values:', JSON.stringify(values, null, 2));
      
      // Ensure all required fields have values
      const requiredFields = ['customer_id', 'transaction_type', 'amount', 'pos_type', 'tax_rate'];
      const missingFields = requiredFields.filter(field => !values[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Ensure numeric fields are properly formatted
      const numericFields = ['amount', 'tax_rate', 'mdr', 'tax', 'charges', 'profit'];
      numericFields.forEach(field => {
        if (values[field] !== undefined && values[field] !== '') {
          values[field] = Number(values[field]);
        }
      });
      
      const result = await onSubmit(values);
      console.log('Transaction submit result:', result);
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
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
      <div className="relative w-full max-w-2xl bg-gray-900 text-gray-100 rounded-lg border border-gray-800 p-6 max-h-[90vh] overflow-y-auto">
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
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name}
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <span className="text-xs text-red-400">{errors.customer_id}</span>
            )}
          </div>

          {/* Card Number Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Card Number</label>
            <select
              value={values.card_number ?? ""}
              onChange={(e) => handleChange('card_number', e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
              disabled={!values.customer_id}
            >
              <option value="">Select Card...</option>
              {cardOptions.map((card) => (
                <option key={card.card_number} value={card.card_number}>
                  {card.card_number || 'No number'} - {card.card_name}
                </option>
              ))}
            </select>
            {cardOptions.length === 0 && values.customer_id && (
              <div className="mt-1">
                <span className="text-xs text-yellow-400">No cards available for this customer. Please add card details first.</span>
              </div>
            )}
          </div>

          {/* Card Name Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Card Name</label>
            <input
              type="text"
              value={values.card_name ?? ""}
              onChange={(e) => handleChange('card_name', e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
              readOnly={!!values.card_number}
            />
          </div>

          {/* Transaction Type Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Transaction Type *</label>
            <select
              value={values.transaction_type ?? ""}
              onChange={(e) => handleChange('transaction_type', e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
            >
              <option value="">Select Type...</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
            {errors.transaction_type && (
              <span className="text-xs text-red-400">{errors.transaction_type}</span>
            )}
          </div>

          {/* Amount Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Amount *</label>
            <input
              type="number"
              value={values.amount ?? ""}
              onChange={(e) => handleChange('amount', e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
            />
            {errors.amount && (
              <span className="text-xs text-red-400">{errors.amount}</span>
            )}
          </div>

          {/* POS Type Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">POS Type *</label>
            <select
              value={values.pos_type ?? ""}
              onChange={(e) => handleChange('pos_type', e.target.value)}
              className={`bg-gray-800 border border-gray-700 rounded px-3 py-2 ${values.transaction_type !== 'debit' ? 'opacity-50' : ''}`}
              disabled={values.transaction_type !== 'debit'}
            >
              <option value="">Select POS Type...</option>
              <option value="MP">MP</option>
              <option value="PH">PH</option>
              <option value="MOS">MOS</option>
            </select>
            {errors.pos_type && values.transaction_type === 'debit' && (
              <span className="text-xs text-red-400">{errors.pos_type}</span>
            )}
          </div>

          {/* Tax Rate Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Tax Rate (%) *</label>
            <select
              value={values.tax_rate ?? ""}
              onChange={(e) => handleChange('tax_rate', e.target.value)}
              className={`bg-gray-800 border border-gray-700 rounded px-3 py-2 ${values.transaction_type !== 'debit' ? 'opacity-50' : ''}`}
              disabled={!values.pos_type || availableTaxRates.length === 0 || values.transaction_type !== 'debit'}
            >
              <option value="">Select Tax Rate...</option>
              {availableTaxRates.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}%
                </option>
              ))}
            </select>
            {errors.tax_rate && values.transaction_type === 'debit' && (
              <span className="text-xs text-red-400">{errors.tax_rate}</span>
            )}
            {values.pos_type && availableTaxRates.length === 0 && values.transaction_type === 'debit' && (
              <span className="text-xs text-yellow-400">Select a valid POS Type first</span>
            )}
          </div>

          {/* Tax Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Charges</label>
            <input
              type="number"
              value={values.transaction_type === 'debit' ? (values.tax ?? "") : ""}
              onChange={(e) => handleChange('tax', e.target.value)}
              className={`bg-gray-800 border border-gray-700 rounded px-3 py-2 ${values.transaction_type !== 'debit' ? 'opacity-50' : ''}`}
              readOnly={true}
              disabled={values.transaction_type !== 'debit'}
            />
          </div>

          {/* MDR Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">MDR</label>
            <input
              type="number"
              value={values.transaction_type === 'debit' ? (values.mdr ?? "") : ""}
              onChange={(e) => handleChange('mdr', e.target.value)}
              className={`bg-gray-800 border border-gray-700 rounded px-3 py-2 ${values.transaction_type !== 'debit' ? 'opacity-50' : ''}`}
              readOnly={true}
              disabled={values.transaction_type !== 'debit'}
            />
          </div>

          {/* Charges Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">MDR Charge</label>
            <input
              type="number"
              value={values.transaction_type === 'debit' ? (values.charges ?? "") : ""}
              onChange={(e) => handleChange('charges', e.target.value)}
              className={`bg-gray-800 border border-gray-700 rounded px-3 py-2 ${values.transaction_type !== 'debit' ? 'opacity-50' : ''}`}
              readOnly={true}
              disabled={values.transaction_type !== 'debit'}
            />
          </div>

          {/* Profit Field */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400">Profit</label>
            <input
              type="number"
              value={values.transaction_type === 'debit' ? (values.profit ?? "") : ""}
              onChange={(e) => handleChange('profit', e.target.value)}
              className={`bg-gray-800 border border-gray-700 rounded px-3 py-2 ${values.transaction_type !== 'debit' ? 'opacity-50' : ''}`}
              readOnly={true}
              disabled={values.transaction_type !== 'debit'}
            />
          </div>

            {/* Transaction Date Field - hidden for new transactions, shown for editing */}
            {initial && (
              <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400">Transaction Date</label>
              <input
                type="datetime-local"
                value={values.transaction_date ? values.transaction_date.slice(0, 16) : ""}
                onChange={(e) => handleChange('transaction_date', e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2"
              />
            </div>
          )}
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