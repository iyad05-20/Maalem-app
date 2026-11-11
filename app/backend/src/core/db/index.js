import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL is not defined in environment variables!");
}

const isRemoteOrProd =
  process.env.NODE_ENV === "production" ||
  connectionString?.includes("supabase.com") ||
  connectionString?.includes("pooler.supabase.com");

export const sql = postgres(connectionString, {
  ssl: isRemoteOrProd ? { rejectUnauthorized: false } : false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 15,
  types: {
    numeric: {
      to: 0,
      from: [1700],
      serialize: (x) => String(x),
      parse: (x) => parseFloat(x),
    },
  },
});

export const db = drizzle(sql, { schema });

/**
 * Ensures lightweight idempotent column additions on existing PostgreSQL tables.
 */
export async function initSchema() {
  try {
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_metadata text`;
    await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS idempotency_key text`;
    await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_status text`;
    await sql`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at text`;
    return true;
  } catch (err) {
    console.warn("[DB-INIT] ⚠️ Idempotent schema check warning:", err.message);
    return false;
  }
}
