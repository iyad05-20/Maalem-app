import express from 'express';
import { client, productsIndex, intentsIndex, seedSearchIndexOnce } from '../services/search/meilisearch.service.js';

const router = express.Router();
let cachedResolvedKey = null;

/**
 * Résolution dynamique de la clé de recherche publique
 * Interroge l'instance Meilisearch pour extraire la vraie clé 'search' sans dépendre d'une variable statique
 */
async function resolveSearchKey() {
  if (process.env.MEILI_SEARCH_KEY) {
    return process.env.MEILI_SEARCH_KEY;
  }
  if (cachedResolvedKey) return cachedResolvedKey;

  try {
    const keys = await client.getKeys();
    if (keys && Array.isArray(keys.results)) {
      const searchKeyObj = keys.results.find(k => k.actions.includes('search') && !k.actions.includes('*'));
      if (searchKeyObj?.key) {
        cachedResolvedKey = searchKeyObj.key;
        console.log(`[SEARCH-ROUTE] 🔑 Clé de recherche publique résolue dynamiquement depuis Meilisearch.`);
        return cachedResolvedKey;
      }
    }
  } catch (err) {
    console.warn('[SEARCH-ROUTE] ⚠️ Impossible de récupérer la clé de recherche dynamique depuis Meilisearch:', err.message);
  }

  return process.env.MEILI_MASTER_KEY || 'dev_only_key_change_in_prod';
}

/**
 * Route GET /api/search/key (and /api/search/search-key)
 * Retourne la clé de recherche au frontend et déclenche la vérification d'index en arrière-plan.
 */
const keyHandler = async (req, res) => {
  const searchKey = await resolveSearchKey();
  res.json({ searchKey });

  seedSearchIndexOnce().catch(err => {
    console.error('⚠️ On-demand search engine background seeding failed:', err.message);
  });
};

router.get('/key', keyHandler);
router.get('/search-key', keyHandler);

/**
 * Proxy de recherche de produits (contourne 100% des erreurs 403 / CORS côté navigateur)
 * POST /api/search/indexes/products/search ou POST /api/search/products
 */
const productsSearchProxy = async (req, res) => {
  try {
    const { q = '', ...options } = req.body || {};
    const results = await productsIndex.search(q, options);
    res.json(results);
  } catch (err) {
    console.error('[SEARCH-PROXY] ❌ Erreur recherche produits:', err.message);
    res.status(500).json({ error: 'Search proxy error', details: err.message });
  }
};

router.post('/indexes/products/search', productsSearchProxy);
router.post('/products', productsSearchProxy);
router.post('/', productsSearchProxy);

/**
 * Proxy de recherche d'intentions de recherche
 * POST /api/search/indexes/search_intents/search ou POST /api/search/intents
 */
const intentsSearchProxy = async (req, res) => {
  try {
    const { q = '', ...options } = req.body || {};
    const results = await intentsIndex.search(q, options);
    res.json(results);
  } catch (err) {
    console.error('[SEARCH-PROXY] ❌ Erreur recherche intentions:', err.message);
    res.status(500).json({ error: 'Intent search proxy error', details: err.message });
  }
};

router.post('/indexes/search_intents/search', intentsSearchProxy);
router.post('/intents', intentsSearchProxy);

export default router;
