import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const DB_PATH = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");

export const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

/**
 * Initialisation du schéma, idempotente. Suffisant pour dev/CI.
 */
export function initSchema(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      client_ref TEXT NOT NULL,
      artisan_ref TEXT NOT NULL DEFAULT 'artisan-1',
      total_price REAL NOT NULL,
      product_type TEXT NOT NULL DEFAULT 'standard',
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
  `);

  const alterColumns = [
    "ALTER TABLE orders ADD COLUMN artisan_ref TEXT NOT NULL DEFAULT 'artisan-1'",
    "ALTER TABLE orders ADD COLUMN product_type TEXT NOT NULL DEFAULT 'standard'",
    "ALTER TABLE orders ADD COLUMN accepted_at TEXT",
    "ALTER TABLE orders ADD COLUMN ready_to_ship_at TEXT",
    "ALTER TABLE orders ADD COLUMN shipped_at TEXT",
    "ALTER TABLE orders ADD COLUMN delivered_at TEXT",
    "ALTER TABLE orders ADD COLUMN sendit_delivery_code TEXT",
    "ALTER TABLE orders ADD COLUMN sendit_pickup_code TEXT",
    "ALTER TABLE orders ADD COLUMN pickup_district_id REAL",
    "ALTER TABLE orders ADD COLUMN delivery_district_id REAL",
    "ALTER TABLE orders ADD COLUMN allow_open REAL DEFAULT 1",
    "ALTER TABLE orders ADD COLUMN allow_try REAL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN counter_unreachable REAL DEFAULT 0",
    "ALTER TABLE orders ADD COLUMN proof_image TEXT"
  ];
  for (const sql of alterColumns) {
    try {
      sqlite.exec(sql);
    } catch (e) {
      // Ignorer si la colonne existe déjà
    }
  }
}
