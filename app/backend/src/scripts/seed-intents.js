import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../db/supabase.client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedIntents() {
  const intentPath = path.resolve(__dirname, '../data/search_intent.json');
  
  if (!fs.existsSync(intentPath)) {
    console.error('search_intent.json not found at:', intentPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(intentPath, 'utf8');
  const intents = JSON.parse(raw);

  const rows = intents.map(i => ({
    id: i.id,
    query: i.query,
    category_groups: i.category_groups,
    tags: i.tags || [],
    price_max: i.price_max || null
  }));

  const { error } = await supabase.from('search_intents').upsert(rows);
  
  if (error) {
    console.error('Failed to seed search_intents:', error);
    process.exit(1);
  }

  console.log(`✅ Seeded ${rows.length} search intents into Supabase table 'search_intents'.`);
  process.exit(0);
}

seedIntents();
