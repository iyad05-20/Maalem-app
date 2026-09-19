import { Meilisearch } from 'meilisearch';

const client = new Meilisearch({
  host: 'http://127.0.0.1:7700',
  apiKey: 'dev_only_key_change_in_prod',
});

const productsIndex = client.index('products');

async function runTests() {
  try {
    console.log('--- 1. Testing Health ---');
    console.log(await client.health());

    console.log('\n--- 2. Checking Index Stats ---');
    const stats = await productsIndex.getStats();
    console.log(stats);

    console.log('\n--- 3. Testing Suggestion Query (q="zel") ---');
    const suggestRes = await productsIndex.search('zel', {
      limit: 8,
      attributesToHighlight: ['title'],
      attributesToRetrieve: ['title', 'category_group'],
    });
    console.log('Hits found:', suggestRes.hits.length);
    console.log(suggestRes.hits);

    console.log('\n--- 4. Testing Empty Query with Facets ---');
    const emptyRes = await productsIndex.search('', {
      limit: 5,
      facets: ['category_group', 'rec_tags.style', 'price'],
    });
    console.log('Total Hits:', emptyRes.estimatedTotalHits);
    console.log('Facets:', emptyRes.facetDistribution);

    console.log('\n--- 5. Testing Filter (category_group = "seating") ---');
    const filterRes = await productsIndex.search('', {
      filter: 'category_group = "seating"',
    });
    console.log('Hits with category_group="seating":', filterRes.hits.length);

  } catch (err) {
    console.error('Error during testing:', err);
  }
}

runTests();
