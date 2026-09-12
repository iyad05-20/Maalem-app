import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL is not defined in environment variables!");
}

export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
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
 * No-op helper for backward compatibility with existing server bootstrap.
 * PostgreSQL schema is managed via Supabase / migrations.
 */
export async function initSchema() {
  return true;
}
