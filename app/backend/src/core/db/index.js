import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

const DB_PATH = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");

export const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function initSchema() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      client_ref TEXT NOT NULL,
      artisan_ref TEXT NOT NULL DEFAULT 'artisan-1',
      total_price REAL NOT NULL,
      product_type TEXT NOT NULL DEFAULT 'standard',
      product_title TEXT,
      product_image TEXT,
      transport_provider TEXT NOT NULL DEFAULT 'sendit',
      status TEXT NOT NULL DEFAULT 'en_attente_paiement',
      created_at TEXT NOT NULL,
      accepted_at TEXT,
      ready_to_ship_at TEXT,
      shipped_at TEXT,
      delivered_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS withdrawal_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      rib TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      processed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS payment_intents (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      montant REAL NOT NULL,
      tranche TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'mock_cmi',
      statut TEXT NOT NULL DEFAULT 'cree',
      provider_ref TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES orders(id),
      compte_debit TEXT NOT NULL,
      compte_credit TEXT NOT NULL,
      montant REAL NOT NULL,
      type TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments_received (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      payment_intent_id TEXT UNIQUE,
      source TEXT NOT NULL,
      amount REAL NOT NULL,
      tranche TEXT NOT NULL,
      confirmed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS return_requests (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      mode TEXT NOT NULL,
      return_shipping_fee REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'initie',
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      reason TEXT NOT NULL,
      resolution TEXT,
      status TEXT NOT NULL DEFAULT 'ouvert',
      created_at TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS vendor_warnings (
      id TEXT PRIMARY KEY,
      vendor_ref TEXT NOT NULL,
      order_id TEXT,
      reason TEXT NOT NULL,
      month_year TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vendor_profiles (
      id TEXT PRIMARY KEY,
      warning_count_current_month REAL DEFAULT 0,
      suspension_status TEXT DEFAULT 'active',
      suspended_until TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cron_executions (
      id TEXT PRIMARY KEY,
      job_name TEXT NOT NULL,
      status TEXT NOT NULL,
      items_processed REAL DEFAULT 0,
      details TEXT,
      executed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT NOT NULL DEFAULT 'client',
      phone TEXT,
      city TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      failed_login_attempts REAL DEFAULT 0,
      locked_until TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      operator_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_id TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  const alterColumns = [
    "ALTER TABLE orders ADD COLUMN artisan_ref TEXT NOT NULL DEFAULT 'artisan-1'",
    "ALTER TABLE orders ADD COLUMN product_type TEXT NOT NULL DEFAULT 'standard'",
    "ALTER TABLE orders ADD COLUMN product_title TEXT",
    "ALTER TABLE orders ADD COLUMN product_image TEXT",
    "ALTER TABLE orders ADD COLUMN transport_provider TEXT NOT NULL DEFAULT 'sendit'",
    "ALTER TABLE orders ADD COLUMN accepted_at TEXT",
    "ALTER TABLE orders ADD COLUMN ready_to_ship_at TEXT",
    "ALTER TABLE orders ADD COLUMN shipped_at TEXT",
    "ALTER TABLE orders ADD COLUMN delivered_at TEXT",
    "ALTER TABLE orders ADD COLUMN client_signature TEXT",
    "ALTER TABLE orders ADD COLUMN prep_photos TEXT",
    "ALTER TABLE orders ADD COLUMN sendit_waybill_url TEXT",
    "ALTER TABLE orders ADD COLUMN sendit_waybill_photo TEXT",
    "ALTER TABLE orders ADD COLUMN vendeur_delivery_signature_photo TEXT",
    "ALTER TABLE orders ADD COLUMN escrow_released_at TEXT",
    "ALTER TABLE orders ADD COLUMN withdrawal_expires_at TEXT",
    "ALTER TABLE orders ADD COLUMN reception_validated_by TEXT",
    "ALTER TABLE orders ADD COLUMN non_reception_claimed_at TEXT",
    "ALTER TABLE orders ADD COLUMN non_reception_reason TEXT",
    "ALTER TABLE orders ADD COLUMN j2_relance_sent_at TEXT",
    "ALTER TABLE orders ADD COLUMN sendit_delivery_code TEXT",
    "ALTER TABLE orders ADD COLUMN sendit_pickup_code TEXT",
    "ALTER TABLE orders ADD COLUMN pickup_district_id REAL",
    "ALTER TABLE orders ADD COLUMN delivery_district_id REAL",
    "ALTER TABLE orders ADD COLUMN allow_open REAL DEFAULT 1",
    "ALTER TABLE orders ADD COLUMN allow_try REAL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN counter_unreachable REAL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN proof_image TEXT",
    "ALTER TABLE orders ADD COLUMN artisan_name TEXT",
    "ALTER TABLE orders ADD COLUMN refused_by_artisan REAL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN refusal_reason TEXT",
    "ALTER TABLE disputes ADD COLUMN type TEXT NOT NULL DEFAULT 'non_reception'",
    "ALTER TABLE disputes ADD COLUMN claimant_ref TEXT NOT NULL DEFAULT 'client-1'",
    "ALTER TABLE disputes ADD COLUMN client_evidence_photos TEXT",
    "ALTER TABLE disputes ADD COLUMN artisan_response TEXT",
    "ALTER TABLE disputes ADD COLUMN artisan_evidence_photos TEXT",
    "ALTER TABLE disputes ADD COLUMN escrow_status_at_dispute TEXT NOT NULL DEFAULT 'locked'",
    "ALTER TABLE disputes ADD COLUMN arbitration_decision TEXT",
    "ALTER TABLE disputes ADD COLUMN arbitration_amount REAL",
    "ALTER TABLE disputes ADD COLUMN arbitrated_by TEXT DEFAULT 'admin-vork'"
  ];
  for (const sql of alterColumns) {
    try {
      sqlite.exec(sql);
    } catch {
      // Ignorer si la colonne existe déjà
    }
  }
}
