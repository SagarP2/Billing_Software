-- Update transactions table to add tax_rate and replace account_id with card_number
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS card_number VARCHAR(20);

-- Make account_id nullable since we're replacing it with card_number
ALTER TABLE public.transactions ALTER COLUMN account_id DROP NOT NULL;
