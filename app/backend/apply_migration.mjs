import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  console.log('🔄 Aligning database schema with Drizzle schema.js...');

  // 1. Orders table columns
  console.log('1. Adding missing columns to orders...');
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_transport_days NUMERIC;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_action_choice TEXT DEFAULT 'pending';`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_parcel_fee NUMERIC;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS package_dimensions TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_approval_status TEXT DEFAULT 'pending';`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS client_approval_requested_at TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS artisan_name TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refused_by_artisan NUMERIC DEFAULT 0;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refusal_reason TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS allow_open NUMERIC DEFAULT 1;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS allow_try NUMERIC DEFAULT 0;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS counter_unreachable NUMERIC DEFAULT 0;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS proof_image TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS j2_relance_sent_at TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sendit_delivery_code TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sendit_pickup_code TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_district_id NUMERIC;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_district_id NUMERIC;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS prep_photos TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sendit_waybill_url TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS sendit_waybill_photo TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vendeur_delivery_signature_photo TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS escrow_released_at TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS withdrawal_expires_at TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reception_validated_by TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS non_reception_claimed_at TEXT;`;
  await sql`ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS non_reception_reason TEXT;`;

  // 2. Vendor profiles columns
  console.log('2. Adding missing columns to vendor_profiles...');
  await sql`ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS warning_count_current_month NUMERIC DEFAULT 0;`;
  await sql`ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS warning_count_14d NUMERIC DEFAULT 0;`;
  await sql`ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS suspension_count NUMERIC DEFAULT 0;`;
  await sql`ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS suspension_status TEXT DEFAULT 'active';`;
  await sql`ALTER TABLE public.vendor_profiles ADD COLUMN IF NOT EXISTS suspended_until TEXT;`;

  // 3. Vendor warnings columns
  console.log('3. Adding missing columns to vendor_warnings...');
  await sql`ALTER TABLE public.vendor_warnings ADD COLUMN IF NOT EXISTS is_dismissed NUMERIC DEFAULT 0;`;
  await sql`ALTER TABLE public.vendor_warnings ADD COLUMN IF NOT EXISTS dismiss_reason TEXT;`;
  await sql`ALTER TABLE public.vendor_warnings ADD COLUMN IF NOT EXISTS dismissed_at TEXT;`;
  await sql`ALTER TABLE public.vendor_warnings ADD COLUMN IF NOT EXISTS proof_doc_url TEXT;`;

  // 4. Disputes columns
  console.log('4. Adding missing columns to disputes...');
  await sql`ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'non_reception';`;
  await sql`ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS claimant_ref TEXT DEFAULT 'client-1';`;
  await sql`ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS client_evidence_photos TEXT;`;
  await sql`ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS artisan_response TEXT;`;
  await sql`ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS artisan_evidence_photos TEXT;`;
  await sql`ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS escrow_status_at_dispute TEXT DEFAULT 'locked';`;
  await sql`ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS arbitration_decision TEXT;`;
  await sql`ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS arbitration_amount NUMERIC;`;
  await sql`ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS arbitrated_by TEXT DEFAULT 'admin-vork';`;

  // 5. Custom Requests & Market
  console.log('5. Ensuring custom_requests table exists...');
  await sql`
    CREATE TABLE IF NOT EXISTS public.custom_requests (
      id TEXT PRIMARY KEY,
      client_ref TEXT NOT NULL,
      artisan_ref TEXT NOT NULL DEFAULT 'artisan-open',
      total_price NUMERIC NOT NULL DEFAULT 0,
      product_type TEXT NOT NULL DEFAULT 'personnalise',
      transport_provider TEXT NOT NULL DEFAULT 'vendeur',
      status TEXT NOT NULL DEFAULT 'en_attente_artisan',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      proof_image TEXT,
      customization_tags TEXT
    );
  `;

  console.log('✅ All schema alterations applied successfully!');
  process.exit(0);
}

run().catch(e => {
  console.error('❌ Migration failed:', e);
  process.exit(1);
});
