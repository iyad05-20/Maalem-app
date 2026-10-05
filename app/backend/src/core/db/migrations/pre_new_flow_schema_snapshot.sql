-- ==============================================================================
-- 🏛️ VORK PLATFORM — SNAPSHOT COMPLET DE LA BASE DE DONNÉES (PRÉ-NEW_FLOW)
-- Version figée : 19 Septembre 2026 (Commit: 3f9c316a)
-- Base de données : PostgreSQL / Supabase
-- Description : Cet instantané représente l'état exact du schéma de base de données
--               avant l'introduction de la branche 'new_flow' (avant l'abandon
--               de Sendit, avant les tables de wallets et de formal_requests).
-- ==============================================================================

-- 1. Table des Utilisateurs & Authentification Locale (App Users)
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'client', -- 'client' | 'artisan' | 'admin'
    phone TEXT,
    city TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'suspended' | 'locked'
    failed_login_attempts NUMERIC DEFAULT 0,
    locked_until TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. Profils Vendeurs / Maâlems (Vendor Profiles)
CREATE TABLE IF NOT EXISTS public.vendor_profiles (
    id TEXT PRIMARY KEY, -- ex: 'artisan-1' ou UUID utilisateur
    artisan_name TEXT DEFAULT 'Maâlem Abdelkader',
    specialty TEXT DEFAULT 'Céramique & Cuir',
    bio TEXT,
    phone TEXT,
    pickup_address TEXT,
    pickup_district_id NUMERIC DEFAULT 2,
    default_rib TEXT,
    is_vacation_mode BOOLEAN DEFAULT FALSE,
    years_of_experience NUMERIC DEFAULT 10,
    warning_count_current_month NUMERIC DEFAULT 0,
    warning_count_14d NUMERIC DEFAULT 0,
    suspension_count NUMERIC DEFAULT 0,
    suspension_status TEXT DEFAULT 'active', -- 'active' | 'paused' | 'suspended_7d' | 'suspended_14d' | 'blocked'
    suspended_until TEXT,
    updated_at TEXT NOT NULL
);

-- 3. Table des Commandes (Orders - Schéma Sendit Legacy)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    client_ref TEXT NOT NULL,
    artisan_ref TEXT NOT NULL DEFAULT 'artisan-1',
    total_price NUMERIC NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'standard', -- 'standard' | 'personnalise'
    transport_provider TEXT NOT NULL DEFAULT 'sendit',
    status TEXT NOT NULL DEFAULT 'en_attente_paiement',
    created_at TEXT NOT NULL,
    accepted_at TEXT,
    ready_to_ship_at TEXT,
    shipped_at TEXT,
    delivered_at TEXT,
    updated_at TEXT NOT NULL,

    -- Signature numérique client
    client_signature TEXT,

    -- Photos préparation & livraison
    prep_photos TEXT, -- JSON array
    sendit_waybill_url TEXT,
    sendit_waybill_photo TEXT,
    vendeur_delivery_signature_photo TEXT,

    -- Séquestre & Cycle de validation Sendit
    escrow_released_at TEXT,
    withdrawal_expires_at TEXT,
    reception_validated_by TEXT,
    non_reception_claimed_at TEXT,
    non_reception_reason TEXT,
    refused_by_artisan NUMERIC DEFAULT 0,
    refusal_reason TEXT,

    -- Relance automatique J+2
    j2_relance_sent_at TEXT,

    -- Intégration Sendit Logistique
    sendit_delivery_code TEXT,
    sendit_pickup_code TEXT,
    pickup_district_id NUMERIC,
    delivery_district_id NUMERIC,
    allow_open NUMERIC DEFAULT 1,
    allow_try NUMERIC DEFAULT 0,
    counter_unreachable NUMERIC DEFAULT 0,
    proof_image TEXT,

    -- Paramètres CGV v23 (11/09/2026)
    estimated_transport_days NUMERIC,
    escrow_action_choice TEXT DEFAULT 'pending', -- 'pending' | 'pending_artisan_choice' | 'released_to_wallet' | 'extended_by_artisan'
    shipping_parcel_fee NUMERIC,
    package_dimensions TEXT, -- JSON string: { length, width, height }
    client_approval_status TEXT DEFAULT 'pending', -- 'pending' | 'approved'
    client_approval_requested_at TEXT
);

-- 4. Avertissements Vendeurs (Vendor Warnings)
CREATE TABLE IF NOT EXISTS public.vendor_warnings (
    id TEXT PRIMARY KEY,
    vendor_ref TEXT NOT NULL,
    order_id TEXT,
    reason TEXT NOT NULL,
    month_year TEXT NOT NULL, -- ex: '2026-08'
    is_dismissed NUMERIC DEFAULT 0,
    dismiss_reason TEXT,
    dismissed_at TEXT,
    proof_doc_url TEXT,
    created_at TEXT NOT NULL
);

-- 5. Demandes de Retrait Vendeur (Withdrawal Requests)
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    rib TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processed' | 'rejected'
    created_at TEXT NOT NULL,
    processed_at TEXT
);

-- 6. Intentions de Paiement CMI (Payment Intents)
CREATE TABLE IF NOT EXISTS public.payment_intents (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    montant NUMERIC NOT NULL,
    tranche TEXT NOT NULL, -- 'total_100' | 'acompte_50'
    provider TEXT NOT NULL DEFAULT 'mock_cmi',
    statut TEXT NOT NULL DEFAULT 'cree',
    provider_ref TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
);

-- 7. Journal Comptable Immuable (Ledger Entries - Grand Livre)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
    id TEXT PRIMARY KEY,
    order_id TEXT,
    compte_debit TEXT NOT NULL,
    compte_credit TEXT NOT NULL,
    montant NUMERIC NOT NULL,
    type TEXT NOT NULL,
    metadata TEXT, -- JSON string
    created_at TEXT NOT NULL
);

-- 8. Paiements Encaissés (Payments Received)
CREATE TABLE IF NOT EXISTS public.payments_received (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    payment_intent_id TEXT UNIQUE,
    source TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    tranche TEXT NOT NULL,
    confirmed_at TEXT NOT NULL
);

-- 9. Demandes de Retour (Return Requests Legacy)
CREATE TABLE IF NOT EXISTS public.return_requests (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    mode TEXT NOT NULL, -- 'sendit' | 'propres_moyens'
    return_shipping_fee NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'initie', -- 'initie' | 'valide' | 'refuse'
    created_at TEXT NOT NULL,
    resolved_at TEXT
);

-- 10. Litiges & Médiation (Disputes)
CREATE TABLE IF NOT EXISTS public.disputes (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'non_reception',
    claimant_ref TEXT NOT NULL DEFAULT 'client-1',
    reason TEXT NOT NULL,
    client_evidence_photos TEXT, -- JSON array
    artisan_response TEXT,
    artisan_evidence_photos TEXT, -- JSON array
    resolution TEXT,
    status TEXT NOT NULL DEFAULT 'en_arbitrage_admin',
    escrow_status_at_dispute TEXT NOT NULL DEFAULT 'locked',
    arbitration_decision TEXT,
    arbitration_amount NUMERIC,
    arbitrated_by TEXT DEFAULT 'admin-vork',
    createdAt TEXT NOT NULL,
    resolvedAt TEXT
);

-- 11. Tâches Automatisées (Cron Executions)
CREATE TABLE IF NOT EXISTS public.cron_executions (
    id TEXT PRIMARY KEY,
    job_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success' | 'failed'
    items_processed NUMERIC DEFAULT 0,
    details TEXT,
    executed_at TEXT NOT NULL
);

-- 12. Demandes Sur-Mesure Atelier (Custom Requests)
CREATE TABLE IF NOT EXISTS public.custom_requests (
    id TEXT PRIMARY KEY,
    client_ref TEXT NOT NULL,
    artisan_ref TEXT NOT NULL DEFAULT 'artisan-open',
    total_price NUMERIC NOT NULL DEFAULT 0,
    product_type TEXT NOT NULL DEFAULT 'personnalise',
    transport_provider TEXT NOT NULL DEFAULT 'sendit',
    status TEXT NOT NULL DEFAULT 'en_attente_artisan',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    proof_image TEXT,
    customization_tags TEXT
);

-- 13. Audit Logs Administrateur (Admin Audit Logs)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id TEXT PRIMARY KEY,
    operator_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
);

-- Index de performance pré-new_flow
CREATE INDEX IF NOT EXISTS idx_orders_artisan_ref_pre ON public.orders(artisan_ref);
CREATE INDEX IF NOT EXISTS idx_orders_status_pre ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_disputes_order_id_pre ON public.disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id_pre ON public.withdrawal_requests(user_id);
