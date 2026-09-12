-- ==============================================================================
-- VORK PLATFORM — SUPABASE PROD DATABASE SCHEMA MIGRATION
-- Compatible PostgreSQL / Supabase
-- ==============================================================================

-- 1. Table des commandes (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    client_ref TEXT NOT NULL,
    artisan_ref TEXT NOT NULL DEFAULT 'artisan-1',
    total_price NUMERIC(12, 2) NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'standard', -- 'standard' | 'personnalise' | 'sur_commande'
    transport_provider TEXT NOT NULL DEFAULT 'sendit', -- 'sendit' | 'vendeur'
    status TEXT NOT NULL DEFAULT 'en_attente_paiement',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    ready_to_ship_at TIMESTAMPTZ,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Client signature & photos
    client_signature TEXT,
    prep_photos JSONB DEFAULT '[]'::jsonb,
    sendit_waybill_url TEXT,
    sendit_waybill_photo TEXT,
    vendeur_delivery_signature_photo TEXT,

    -- Escrow & Validation
    escrow_released_at TIMESTAMPTZ,
    withdrawal_expires_at TIMESTAMPTZ,
    reception_validated_by TEXT,
    non_reception_claimed_at TIMESTAMPTZ,
    non_reception_reason TEXT,
    j2_relance_sent_at TIMESTAMPTZ,

    -- Sendit integration
    sendit_delivery_code TEXT,
    sendit_pickup_code TEXT,
    pickup_district_id INTEGER,
    delivery_district_id INTEGER,
    allow_open SMALLINT DEFAULT 1,
    allow_try SMALLINT DEFAULT 0,
    counter_unreachable INTEGER DEFAULT 0,
    proof_image TEXT,

    -- CGV v23 & Arbitrages Prioritaires Ziad (11/09/2026)
    estimated_transport_days INTEGER,
    escrow_action_choice TEXT DEFAULT 'pending', -- 'pending' | 'pending_artisan_choice' | 'released_to_wallet' | 'extended_by_artisan'
    shipping_parcel_fee NUMERIC(10, 2),
    package_dimensions TEXT,
    client_approval_status TEXT DEFAULT 'pending',
    client_approval_requested_at TIMESTAMPTZ
);

-- 2. Profils Vendeurs / Maâlems (Vendor Profiles)
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
    id TEXT PRIMARY KEY, -- ex: 'artisan-1' ou UUID Supabase Auth
    artisan_name TEXT DEFAULT 'Maâlem Abdelkader',
    specialty TEXT DEFAULT 'Céramique & Cuir',
    bio TEXT,
    phone TEXT,
    pickup_address TEXT,
    pickup_district_id INTEGER DEFAULT 2,
    default_rib TEXT,
    is_vacation_mode BOOLEAN DEFAULT FALSE,
    years_of_experience INTEGER DEFAULT 10,
    warning_count_current_month INTEGER DEFAULT 0,
    warning_count_14d INTEGER DEFAULT 0,
    suspension_count INTEGER DEFAULT 0,
    suspension_status TEXT DEFAULT 'active', -- 'active' | 'paused' | 'suspended_7d' | 'suspended_14d' | 'blocked'
    suspended_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Avertissements Vendeurs (Vendor Warnings)
CREATE TABLE IF NOT EXISTS public.vendor_warnings (
    id TEXT PRIMARY KEY,
    vendor_ref TEXT NOT NULL,
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    month_year TEXT NOT NULL, -- ex: '2026-08'
    is_dismissed SMALLINT DEFAULT 0,
    dismiss_reason TEXT,
    dismissed_at TIMESTAMPTZ,
    proof_doc_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Demandes de Virement Bancaire (Withdrawals)
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    rib TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'en_attente_lot_vendredi', -- 'en_attente_lot_vendredi' | 'processed' | 'rejected'
    batch_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 5. Grand Livre Comptable (Ledger Entries)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
    compte_debit TEXT NOT NULL,
    compte_credit TEXT NOT NULL,
    montant NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Demandes de Retour (Return Requests)
CREATE TABLE IF NOT EXISTS public.return_requests (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    mode TEXT NOT NULL,
    return_shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'initie', -- 'initie' | 'resolu_conforme' | 'refuse'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 7. Litiges et Réclamations (Disputes)
CREATE TABLE IF NOT EXISTS public.disputes (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'non_reception',
    claimant_ref TEXT NOT NULL DEFAULT 'client-1',
    reason TEXT NOT NULL,
    client_evidence_photos JSONB DEFAULT '[]'::jsonb,
    artisan_response TEXT,
    artisan_evidence_photos JSONB DEFAULT '[]'::jsonb,
    resolution TEXT,
    status TEXT NOT NULL DEFAULT 'en_arbitrage_admin', -- 'en_attente_artisan' | 'en_arbitrage_admin' | 'resolu_remboursement_total' | 'resolu_remplacement' | 'rejete'
    escrow_status_at_dispute TEXT NOT NULL DEFAULT 'locked',
    arbitration_decision TEXT,
    arbitration_amount NUMERIC(12, 2),
    arbitrated_by TEXT DEFAULT 'admin-vork',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 8. Journal des Tâches Planifiées (Cron Executions)
CREATE TABLE IF NOT EXISTS public.cron_executions (
    id TEXT PRIMARY KEY,
    job_name TEXT NOT NULL,
    status TEXT NOT NULL,
    items_processed INTEGER DEFAULT 0,
    details TEXT,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Marché Sur-Mesure : Annonces & Devis (Custom Requests & Quotes)
CREATE TABLE IF NOT EXISTS public.custom_order_requests (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    budget TEXT NOT NULL,
    delivery_city TEXT NOT NULL,
    image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.custom_quotes (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES public.custom_order_requests(id) ON DELETE CASCADE,
    artisan_name TEXT NOT NULL,
    artisan_ref TEXT NOT NULL DEFAULT 'artisan-1',
    proposed_price NUMERIC(12, 2) NOT NULL,
    confection_days INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index recommandés pour la performance
CREATE INDEX IF NOT EXISTS idx_orders_artisan_ref ON public.orders(artisan_ref);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON public.disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawal_requests(user_id);
