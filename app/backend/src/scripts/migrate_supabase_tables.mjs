import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function runMigration() {
  console.log('🚀 Démarrage de la migration du schéma Supabase PostgreSQL...');

  try {
    // 1. Défaire les contraintes FK qui pointent vers orders
    console.log('1. Nettoyage des anciennes tables métier vides...');
    await sql`ALTER TABLE IF EXISTS reviews DROP CONSTRAINT IF EXISTS reviews_order_id_fkey`;
    await sql`ALTER TABLE IF EXISTS reviews ALTER COLUMN order_id TYPE text USING order_id::text`;

    await sql`DROP TABLE IF EXISTS order_items CASCADE`;
    await sql`DROP TABLE IF EXISTS payments_received CASCADE`;
    await sql`DROP TABLE IF EXISTS payment_intents CASCADE`;
    await sql`DROP TABLE IF EXISTS ledger_entries CASCADE`;
    await sql`DROP TABLE IF EXISTS return_requests CASCADE`;
    await sql`DROP TABLE IF EXISTS disputes CASCADE`;
    await sql`DROP TABLE IF EXISTS withdrawal_requests CASCADE`;
    await sql`DROP TABLE IF EXISTS orders CASCADE`;
    await sql`DROP TABLE IF EXISTS vendor_warnings CASCADE`;
    await sql`DROP TABLE IF EXISTS vendor_profiles CASCADE`;
    await sql`DROP TABLE IF EXISTS cron_executions CASCADE`;

    // 2. Création de orders
    console.log('2. Création de la table orders...');
    await sql`
      CREATE TABLE orders (
        id TEXT PRIMARY KEY,
        client_ref TEXT NOT NULL,
        artisan_ref TEXT NOT NULL DEFAULT 'artisan-1',
        artisan_name TEXT,
        total_price NUMERIC(12, 2) NOT NULL,
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
        updated_at TEXT NOT NULL,
        client_signature TEXT,
        prep_photos TEXT,
        sendit_waybill_url TEXT,
        sendit_waybill_photo TEXT,
        vendeur_delivery_signature_photo TEXT,
        escrow_released_at TEXT,
        withdrawal_expires_at TEXT,
        reception_validated_by TEXT,
        non_reception_claimed_at TEXT,
        non_reception_reason TEXT,
        refused_by_artisan NUMERIC DEFAULT 0,
        refusal_reason TEXT,
        j2_relance_sent_at TEXT,
        sendit_delivery_code TEXT,
        sendit_pickup_code TEXT,
        pickup_district_id NUMERIC,
        delivery_district_id NUMERIC,
        allow_open NUMERIC DEFAULT 1,
        allow_try NUMERIC DEFAULT 0,
        counter_unreachable NUMERIC DEFAULT 0,
        proof_image TEXT
      )
    `;

    // 3. Création de app_users (auth custom)
    console.log('3. Création de la table app_users...');
    await sql`
      CREATE TABLE IF NOT EXISTS app_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        role TEXT NOT NULL DEFAULT 'client',
        phone TEXT,
        city TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        failed_login_attempts NUMERIC DEFAULT 0,
        locked_until TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `;

    // 4. Création de admin_audit_logs
    console.log('4. Création de la table admin_audit_logs...');
    await sql`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id TEXT PRIMARY KEY,
        operator_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target_id TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL
      )
    `;

    // 5. Création de cron_executions
    console.log('5. Création de la table cron_executions...');
    await sql`
      CREATE TABLE IF NOT EXISTS cron_executions (
        id TEXT PRIMARY KEY,
        job_name TEXT NOT NULL,
        status TEXT NOT NULL,
        items_processed NUMERIC DEFAULT 0,
        details TEXT,
        executed_at TEXT NOT NULL
      )
    `;

    // 6. Création de withdrawal_requests
    console.log('6. Création de la table withdrawal_requests...');
    await sql`
      CREATE TABLE withdrawal_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        rib TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        processed_at TEXT
      )
    `;

    // 7. Création de payment_intents
    console.log('7. Création de la table payment_intents...');
    await sql`
      CREATE TABLE payment_intents (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        montant NUMERIC(12, 2) NOT NULL,
        tranche TEXT NOT NULL,
        provider TEXT NOT NULL DEFAULT 'mock_cmi',
        statut TEXT NOT NULL DEFAULT 'cree',
        provider_ref TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      )
    `;

    // 8. Création de ledger_entries
    console.log('8. Création de la table ledger_entries...');
    await sql`
      CREATE TABLE ledger_entries (
        id TEXT PRIMARY KEY,
        order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
        compte_debit TEXT NOT NULL,
        compte_credit TEXT NOT NULL,
        montant NUMERIC(12, 2) NOT NULL,
        type TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL
      )
    `;

    // 9. Création de payments_received
    console.log('9. Création de la table payments_received...');
    await sql`
      CREATE TABLE payments_received (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        payment_intent_id TEXT UNIQUE,
        source TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        tranche TEXT NOT NULL,
        confirmed_at TEXT NOT NULL
      )
    `;

    // 10. Création de return_requests
    console.log('10. Création de la table return_requests...');
    await sql`
      CREATE TABLE return_requests (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        mode TEXT NOT NULL,
        return_shipping_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'initie',
        created_at TEXT NOT NULL,
        resolved_at TEXT
      )
    `;

    // 11. Création de disputes
    console.log('11. Création de la table disputes...');
    await sql`
      CREATE TABLE disputes (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        type TEXT NOT NULL DEFAULT 'non_reception',
        claimant_ref TEXT NOT NULL DEFAULT 'client-1',
        reason TEXT NOT NULL,
        client_evidence_photos TEXT,
        artisan_response TEXT,
        artisan_evidence_photos TEXT,
        resolution TEXT,
        status TEXT NOT NULL DEFAULT 'en_arbitrage_admin',
        escrow_status_at_dispute TEXT NOT NULL DEFAULT 'locked',
        arbitration_decision TEXT,
        arbitration_amount NUMERIC(12, 2),
        arbitrated_by TEXT DEFAULT 'admin-vork',
        created_at TEXT NOT NULL,
        resolved_at TEXT
      )
    `;

    // 12. Création de vendor_warnings
    console.log('12. Création de la table vendor_warnings...');
    await sql`
      CREATE TABLE vendor_warnings (
        id TEXT PRIMARY KEY,
        vendor_ref TEXT NOT NULL,
        order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
        reason TEXT NOT NULL,
        month_year TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `;

    // 13. Création de vendor_profiles
    console.log('13. Création de la table vendor_profiles...');
    await sql`
      CREATE TABLE vendor_profiles (
        id TEXT PRIMARY KEY,
        warning_count_current_month NUMERIC DEFAULT 0,
        suspension_status TEXT DEFAULT 'active',
        suspended_until TEXT,
        updated_at TEXT NOT NULL
      )
    `;

    // 14. Création des indexes
    console.log('14. Création des indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_artisan_ref ON orders(artisan_ref)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_client_ref ON orders(client_ref)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON disputes(order_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawal_requests(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email)`;

    console.log('✅ Migration terminée avec succès !');

    // Vérification finale des tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('\nListe finale des tables dans Supabase:');
    for (const t of tables) {
      console.log(` - ${t.table_name}`);
    }
  } catch (err) {
    console.error('❌ Erreur lors de la migration:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
