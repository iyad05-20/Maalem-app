import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../db/supabase.client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  const DB_PATHS = [
    path.resolve(__dirname, '../../../..', 'real_db2.json'),       // workspace root
    path.resolve(__dirname, '../../../../..', 'real_db2.json'),    // one level up
    'c:/Users/lenovo/OneDrive/Desktop/BC/vork/vork-test/antigravity/maalem/real_db2.json' // hard fallback
  ];

  let raw = null;
  for (const p of DB_PATHS) {
    if (fs.existsSync(p)) {
      raw = fs.readFileSync(p, 'utf8');
      console.log(`Found real_db2.json at: ${p}`);
      break;
    }
  }

  if (!raw) {
    console.error('real_db2.json not found!');
    process.exit(1);
  }

  const products = JSON.parse(raw);

  const rows = products.map(p => ({
    id: p.id,
    title: p.title,
    category: p.identity.category,
    category_group: p.identity.category_group,
    price: p.price ?? null,
    in_stock: p.in_stock ?? true,
    artisan_name: p.artisanName ?? null,
    image_url: p.imageUrl ?? null,
    identity: p.identity,
    rec_tags: p.rec_tags,
    facets: p.facets,
  }));

  const { error } = await supabase.from('products').upsert(rows);
  
  if (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }

  console.log(`Seeded ${rows.length} products into Supabase.`);
  process.exit(0);
}

seed();
