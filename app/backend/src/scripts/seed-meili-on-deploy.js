import dotenv from 'dotenv';
import { loadProducts } from '../services/recommendation.service.js';
import { initSearchIndex } from '../services/search/meilisearch.service.js';
import { initSchema } from '../core/db/index.js';

dotenv.config();

async function runSeeding() {
  console.log('🏁 Release Phase: Starting Meilisearch Seeding process...');
  try {
    initSchema();
    await loadProducts(); // recommendation service must load products into memory first
    await initSearchIndex();
    console.log('🏁 Release Phase: Meilisearch Seeding finished successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Release Phase: Seeding failed:', err.message);
    process.exit(1);
  }
}

runSeeding();
