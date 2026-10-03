-- Migration Vork Flux, Escrow, Wallet & Stock (29/09/2026)
-- Conforme aux 38 décisions validées

-- 1. Table client_wallets (Portefeuille interne client)
CREATE TABLE IF NOT EXISTS client_wallets (
  id text PRIMARY KEY,
  balance numeric NOT NULL DEFAULT '0',
  currency text NOT NULL DEFAULT 'MAD',
  updated_at text NOT NULL
);

-- 2. Table client_wallet_transactions (Historique des transactions portefeuille)
CREATE TABLE IF NOT EXISTS client_wallet_transactions (
  id text PRIMARY KEY,
  client_ref text NOT NULL,
  order_id text,
  type text NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  metadata text,
  created_at text NOT NULL
);

-- 3. Table formal_requests (Demandes formelles d'intervention)
CREATE TABLE IF NOT EXISTS formal_requests (
  id text PRIMARY KEY,
  order_id text NOT NULL,
  initiator_type text NOT NULL,
  initiator_id text NOT NULL,
  respondent_id text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  evidence_urls text,
  status text NOT NULL DEFAULT 'ouverte',
  response_message text,
  admin_notes text,
  created_at text NOT NULL,
  deadline_respondent_at text,
  resolved_at text
);

-- 4. Nouvelles colonnes sur la table orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity numeric DEFAULT '1';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS in_app_amount numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_on_delivery_amount numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_commission numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS artisan_in_app_net numeric;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refusal_reason_category text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refusal_reason_text text;

-- 5. Colonnes de gestion de stock sur la table products (Postgres / Supabase)
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock integer DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS initial_stock integer DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_out_of_stock boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_policy jsonb DEFAULT '{}'::jsonb;
