-- ==============================================================================
-- ⚠️ VORK PLATFORM — SCRIPT DE ROLLBACK DU NOUVEAU FLUX ('new_flow')
-- Description : Supprime les ajouts spécifiques à la branche 'new_flow'
--               pour restaurer l'état exact de la base tel qu'il était
--               au commit 3f9c316a.
-- Attention   : Ce script est fourni pour conservation et retour arrière d'urgence.
-- ==============================================================================

-- 1. Suppression des 3 tables introduites par new_flow
DROP TABLE IF EXISTS public.formal_requests CASCADE;
DROP TABLE IF EXISTS public.client_wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.client_wallets CASCADE;

-- 2. Suppression des colonnes ajoutées à la table orders
ALTER TABLE public.orders DROP COLUMN IF EXISTS product_id;
ALTER TABLE public.orders DROP COLUMN IF EXISTS quantity;
ALTER TABLE public.orders DROP COLUMN IF EXISTS in_app_amount;
ALTER TABLE public.orders DROP COLUMN IF EXISTS cash_on_delivery_amount;
ALTER TABLE public.orders DROP COLUMN IF EXISTS platform_commission;
ALTER TABLE public.orders DROP COLUMN IF EXISTS artisan_in_app_net;
ALTER TABLE public.orders DROP COLUMN IF EXISTS refusal_reason_category;
ALTER TABLE public.orders DROP COLUMN IF EXISTS refusal_reason_text;
ALTER TABLE public.orders DROP COLUMN IF EXISTS carrier_name;
ALTER TABLE public.orders DROP COLUMN IF EXISTS carrier_tracking_number;
ALTER TABLE public.orders DROP COLUMN IF EXISTS shipping_proof_photo;
ALTER TABLE public.orders DROP COLUMN IF EXISTS not_received_reported_at;

-- 3. Suppression des colonnes de stock ajoutées à la table products
ALTER TABLE public.products DROP COLUMN IF EXISTS stock;
ALTER TABLE public.products DROP COLUMN IF EXISTS initial_stock;
ALTER TABLE public.products DROP COLUMN IF EXISTS is_out_of_stock;
ALTER TABLE public.products DROP COLUMN IF EXISTS is_hidden;
ALTER TABLE public.products DROP COLUMN IF EXISTS stock_policy;
