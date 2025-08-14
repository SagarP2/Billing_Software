import { CrudField } from "@/components/admin/CrudFormModal";

export interface TableSchema {
  table: string;
  title: string;
  fields: CrudField[];
  listColumns: Array<{ key: string; label: string; sortable?: boolean }>;
}

export const schemas: Record<string, TableSchema> = {
  customers: {
    table: "customers",
    title: "Customers",
    fields: [
      { name: "full_name", label: "Full Name", type: "text", required: true },
      { name: "billing_address", label: "Billing Address", type: "textarea" },
      { name: "city", label: "City", type: "text" },
      { name: "state", label: "State", type: "text" },
      { name: "pin_code", label: "PIN Code", type: "text" },
      { name: "country", label: "Country", type: "text" },
      { name: "email_id", label: "Email", type: "text" },
      { name: "contact_no", label: "Contact No", type: "text" },
      { name: "created_at", label: "Created At", type: "datetime" },
    ],
    listColumns: [
      { key: "full_name", label: "Full Name", sortable: true },
      { key: "email_id", label: "Email", sortable: true },
      { key: "contact_no", label: "Contact" },
      { key: "city", label: "City" },
      { key: "created_at", label: "Created" },
    ],
  },
  customer_tax_details: {
    table: "customer_tax_details",
    title: "Customer Tax Details",
    fields: [
      { name: "customer_id", label: "Customer", type: "select", required: true, relation: { table: "customers", valueField: "id", labelField: "full_name" } },
      { name: "pan_no", label: "PAN No", type: "text", required: true },
      { name: "gst_no", label: "GST No", type: "text", required: true },
      { name: "gst_type", label: "GST Type", type: "enum", required: true, enumValues: [
        "Regular",
        "Composition",
        "Casual",
        "Non-Resident",
        "UN Body",
        "SEZ"
      ] },
    ],
    listColumns: [
      { key: "customer_id", label: "Customer" },
      { key: "pan_no", label: "PAN" },
      { key: "gst_no", label: "GST" },
      { key: "gst_type", label: "GST Type" },
    ],
  },
  card_details: {
    table: "card_details",
    title: "Card Details",
    fields: [
      { name: "customer_id", label: "Customer", type: "select", required: true, relation: { table: "customers", valueField: "id", labelField: "full_name" } },
      { name: "bank_name", label: "Bank Name", type: "enum", required: true, enumValues: [
        "State Bank of India",
        "HDFC Bank",
        "ICICI Bank",
        "Punjab National Bank",
        "Bank of Baroda",
        "Canara Bank",
        "Union Bank of India",
        "Axis Bank",
        "Kotak Mahindra Bank",
        "IndusInd Bank",
        "Yes Bank",
        "Federal Bank",
        "IDBI Bank",
        "RBL Bank"
      ] },
      { name: "card_type", label: "Card Type", type: "enum", required: true, enumValues: ["Credit Card", "Debit Card"] },
      { name: "card_name", label: "Card Name", type: "enum", required: true, enumValues: [
        // Credit Cards
        "SBI SimplySAVE Credit Card",
        "SBI SimplyCLICK Credit Card",
        "HDFC Moneyback Credit Card",
        "HDFC Regalia Credit Card",
        "ICICI Coral Credit Card",
        "ICICI Platinum Credit Card",
        "Axis Neo Credit Card",
        "Axis Magnus Credit Card",
        "Kotak Royale Credit Card",
        "Kotak Urbane Credit Card",
        // Debit Cards
        "SBI Classic Debit Card",
        "SBI Global Debit Card",
        "HDFC Premium Debit Card",
        "HDFC International Debit Card",
        "ICICI Coral Debit Card",
        "ICICI Sapphiro Debit Card",
        "Axis Visa Platinum Debit Card",
        "Axis RuPay Platinum Debit Card",
        "Kotak Classic Debit Card",
        "Kotak Premium Debit Card"
      ] },
      { name: "card_number", label: "Card Number", type: "text", required: true },
    ],
    listColumns: [
      { key: "customer_id", label: "Customer" },
      { key: "bank_name", label: "Bank" },
      { key: "card_type", label: "Type" },
      { key: "card_name", label: "Name on Card" },
      { key: "card_number", label: "Card Number" },
    ],
  },
  identity_documents: {
    table: "identity_documents",
    title: "Identity Documents",
    fields: [
      { name: "customer_id", label: "Customer", type: "select", required: true, relation: { table: "customers", valueField: "id", labelField: "full_name" } },
      { name: "document_type", label: "Type", type: "enum", required: true, enumValues: ["Aadhaar Card", "PAN Card", "Voter ID"] },
      { name: "document_number", label: "Number", type: "text" },
      { name: "document_image", label: "Image URL", type: "text" },
    ],
    listColumns: [
      { key: "customer_id", label: "Customer" },
      { key: "document_type", label: "Type" },
      { key: "document_number", label: "Number" },
    ],
  },
  accounts: {
    table: "accounts",
    title: "Accounts",
    fields: [
      { name: "customer_id", label: "Customer", type: "select", required: true, relation: { table: "customers", valueField: "id", labelField: "full_name" } },
      { name: "opening_balance", label: "Opening Balance", type: "number" },
      { name: "credit_allowed", label: "Credit Allowed", type: "boolean" },
      { name: "credit_limit", label: "Credit Limit", type: "number" },
      { name: "price_category", label: "Price Category", type: "text" },
      { name: "remark", label: "Remark", type: "textarea" },
      { name: "received", label: "Received", type: "number" },
      { name: "pending_amount", label: "Pending Amount", type: "number" },
    ],
    listColumns: [
      { key: "customer_id", label: "Customer" },
      { key: "opening_balance", label: "Opening" },
      { key: "credit_allowed", label: "Credit Allowed" },
      { key: "pending_amount", label: "Pending" },
    ],
  },
  transactions: {
    table: "transactions",
    title: "Transactions",
    fields: [
      { name: "customer_id", label: "Customer", type: "select", required: true, relation: { table: "customers", valueField: "id", labelField: "full_name" } },
      { name: "account_id", label: "Account", type: "select", required: true, relation: { table: "accounts", valueField: "id", labelField: "id" } },
      { name: "card_name", label: "Card Name", type: "text" },
      { name: "transaction_type", label: "Type", type: "enum", required: true, enumValues: ["credit", "debit"] },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "pos_type", label: "POS Type", type: "enum", required: true, enumValues: ["MP", "MOS", "INJ"] },
      { name: "tax", label: "Tax", type: "number" },
      { name: "charges", label: "Charges", type: "number" },
      { name: "mdr", label: "MDR", type: "number" },
      { name: "profit", label: "Profit", type: "number" },
      { name: "transaction_date", label: "Transaction Date", type: "datetime" },
    ],
    listColumns: [
      { key: "transaction_date", label: "Date", sortable: true },
      { key: "customer_id", label: "Customer" },
      { key: "transaction_type", label: "Type" },
      { key: "amount", label: "Amount", sortable: true },
      { key: "pos_type", label: "POS Type" },
      { key: "tax", label: "Tax (₹)", sortable: true },
      { key: "mdr", label: "MDR (₹)", sortable: true },
      { key: "charges", label: "Charges (₹)", sortable: true },
      { key: "profit", label: "Profit (₹)", sortable: true },
    ],
  },
  customer_credits: {
    table: "customer_credits",
    title: "Customer Credits",
    fields: [
      { name: "customer_id", label: "Customer", type: "select", required: true, relation: { table: "customers", valueField: "id", labelField: "full_name" } },
      { name: "account_id", label: "Account", type: "select", required: true, relation: { table: "accounts", valueField: "id", labelField: "id" } },
      { name: "type", label: "Type", type: "enum", required: true, enumValues: ["credit_given", "repayment"] },
      { name: "amount", label: "Amount", type: "number", required: true },
      { name: "date", label: "Date", type: "datetime" },
      { name: "note", label: "Note", type: "textarea" },
    ],
    listColumns: [
      { key: "date", label: "Date", sortable: true },
      { key: "customer_id", label: "Customer" },
      { key: "type", label: "Type" },
      { key: "amount", label: "Amount", sortable: true },
    ],
  },
  payment_alerts: {
    table: "payment_alerts",
    title: "Payment Alerts",
    fields: [
      { name: "customer_id", label: "Customer", type: "select", required: true, relation: { table: "customers", valueField: "id", labelField: "full_name" } },
      { name: "account_id", label: "Account", type: "select", required: true, relation: { table: "accounts", valueField: "id", labelField: "id" } },
      { name: "alert_message", label: "Message", type: "textarea" },
      { name: "due_date", label: "Due Date", type: "datetime" },
      { name: "is_paid", label: "Is Paid", type: "boolean" },
    ],
    listColumns: [
      { key: "due_date", label: "Due", sortable: true },
      { key: "customer_id", label: "Customer" },
      { key: "alert_message", label: "Message" },
      { key: "is_paid", label: "Paid?" },
    ],
  },
};


