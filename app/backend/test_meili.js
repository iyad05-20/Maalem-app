import { Meilisearch } from 'meilisearch';

const client = new Meilisearch({
  host: 'http://127.0.0.1:7700',
  apiKey: 'dev_only_key_change_in_prod',
});

const productsIndex = client.index('products');

async function run() {
  console.log('Checking health...');
  const health = await client.health();
  console.log('Health:', health);

  console.log('Adding document test-1...');
  await productsIndex.addDocuments([{
    id: 'test-1',
    title: 'Table basse zellige',
    category: 'coffee-table',
    category_group: 'seating',
    price: 1200,
    in_stock: true,
  }]);

  console.log('Waiting 2 seconds for indexing...');
  await new Promise(r => setTimeout(r, 2000));

  console.log('Searching for "zellige"...');
  const results = await productsIndex.search('zellige');
  console.log('Search Results:', JSON.stringify(results.hits, null, 2));
}

run().catch(console.error);
