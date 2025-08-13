-- PostgreSQL schema for Billing System (local dev)

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    billing_address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pin_code VARCHAR(10),
    country VARCHAR(50),
    email_id VARCHAR(100),
    contact_no VARCHAR(15),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Tax Details
CREATE TABLE IF NOT EXISTS public.customer_tax_details (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    pan_no VARCHAR(20),
    gst_no VARCHAR(30),
    gst_type VARCHAR(50)
);

-- Card Details
CREATE TABLE IF NOT EXISTS public.card_details (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    bank_name VARCHAR(100),
    card_type VARCHAR(50),
    card_name VARCHAR(100)
);

-- Identity Documents
CREATE TABLE IF NOT EXISTS public.identity_documents (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    document_type VARCHAR(50),
    document_number VARCHAR(50),
    document_image TEXT
);

-- Accounts
CREATE TABLE IF NOT EXISTS public.accounts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    opening_balance DECIMAL(10,2) DEFAULT 0.00,
    credit_allowed BOOLEAN DEFAULT TRUE,
    credit_limit DECIMAL(10,2),
    price_category VARCHAR(50),
    remark TEXT,
    received DECIMAL(10,2),
    pending_amount DECIMAL(10,2)
);

-- Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    card_name VARCHAR(100),
    transaction_type VARCHAR(10) CHECK (transaction_type IN ('credit', 'debit')) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    pos_type VARCHAR(50),
    tax DECIMAL(10,2) DEFAULT 0.00,
    charges DECIMAL(10,2) DEFAULT 0.00,
    mdr DECIMAL(10,2) DEFAULT 0.00,
    profit DECIMAL(10,2),
    transaction_date TIMESTAMPTZ DEFAULT NOW()
);

-- Customer Credits
CREATE TABLE IF NOT EXISTS public.customer_credits (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    type VARCHAR(20) CHECK (type IN ('credit_given', 'repayment')) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    note TEXT
);

-- Payment Alerts
CREATE TABLE IF NOT EXISTS public.payment_alerts (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    alert_message TEXT,
    due_date DATE,
    is_paid BOOLEAN DEFAULT FALSE
);





