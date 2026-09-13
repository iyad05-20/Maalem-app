import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes           from './routes/auth.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';
import searchRoutes         from './routes/search.routes.js';
import productsRoutes       from './routes/products.routes.js';
import favoritesRoutes      from './routes/favorites.routes.js';
import reviewsRoutes        from './routes/reviews.routes.js';
import clientRoutes         from './client/routes/clientRoutes.js';
import atelierRoutes        from './routes/atelier.routes.js';
import mockCmiRouter        from './core/paymentProviders/mockCmi.js';
import { cronRouter }       from './routes/cronRoutes.js';
import { adminRouter }      from './routes/admin.routes.js';
import { artisanRouter }    from './routes/artisan.routes.js';
import { startCronScheduler } from './services/cronService.js';
import { loadProducts }       from './services/recommendation.service.js';
import { initSearchIndex }  from './services/search/meilisearch.service.js';
import { initAtelierVocab } from './services/llm/atelierPromptComposer.js';
import { initSchema }       from './core/db/index.js';
import { senditWebhookHandler } from './services/sendit/senditWebhookHandler.js';
import { senditClient } from './services/sendit/senditClient.js';
import { 
  shipOrder, 
  acceptOrder, 
  uploadPrepPhotos, 
  prepareSenditShipping, 
  confirmSenditPickupReady, 
  shipVendeurSelf, 
  completeVendeurDelivery, 
  recordVendorWarning 
} from './client/services/artisanOrderService.js';
import { db } from './core/db/index.js';
import { vendorProfiles, vendorWarnings } from './core/db/schema.js';
import { eq } from 'drizzle-orm';

dotenv.config();

(async () => {
  try {
    initSchema();
    await loadProducts();
    await initSearchIndex();
    initAtelierVocab();
  } catch (err) {
    console.error('Initialization failed (non-fatal):', err.message);
  }
})();

const app = express();
app.set('trust proxy', 1);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',   // Vite dev client
  'http://127.0.0.1:5173',
  'http://localhost:5174',   // Vite dev admin
  'http://127.0.0.1:5174',
  'http://localhost:5175',   // Vite dev artisan
  'http://127.0.0.1:5175',
  'http://localhost:4173',   // Vite preview
  'http://localhost:3000',   // Frontend Client Docker compose
  'http://localhost:3002',   // Admin Dashboard Docker compose
  'http://localhost:3003',   // Artisan App Docker compose
  process.env.FRONTEND_URL,
  process.env.ADMIN_URL,
  process.env.ARTISAN_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (
      !origin || 
      allowedOrigins.includes(origin) || 
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('herokuapp.com')
    ) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes (MVC — controllers live in routes/) ───────────────────────────
app.use('/api/auth',            authRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/search',          searchRoutes);
app.use('/api/products',        productsRoutes);
app.use('/api/favorites',       favoritesRoutes);
app.use('/api/reviews',         reviewsRoutes);
app.use('/api/client',          clientRoutes);
app.use('/api/atelier',         atelierRoutes);
app.use('/api/artisan',         artisanRouter);
app.use('/api/cron',            cronRouter);
app.use('/api/admin',           adminRouter);
app.use('/mock-cmi',            mockCmiRouter);

// Start Cron Scheduler (every 60 minutes)
startCronScheduler(60);

// Sendit Webhooks
app.post('/api/webhooks/sendit', senditWebhookHandler);

const MOCK_DISTRICTS = [
  { id: 46, name: "Casablanca" },
  { id: 1, name: "Rabat" },
  { id: 2, name: "Marrakech" },
  { id: 3, name: "Fès" },
  { id: 4, name: "Tanger" },
  { id: 5, name: "Salé" },
  { id: 6, name: "Meknès" },
  { id: 7, name: "Agadir" },
  { id: 8, name: "Oujda" },
  { id: 9, name: "Kenitra" },
  { id: 10, name: "Tétouan" },
  { id: 11, name: "Temara" },
  { id: 12, name: "Safi" },
  { id: 13, name: "Mohammedia" },
  { id: 14, name: "Khouribga" },
  { id: 15, name: "El Jadida" },
  { id: 16, name: "Beni Mellal" },
  { id: 17, name: "Nador" },
  { id: 18, name: "Dar Bouazza" },
  { id: 19, name: "Taza" },
  { id: 20, name: "Settat" },
  { id: 21, name: "Berrechid" },
  { id: 22, name: "Khemisset" },
  { id: 23, name: "Guelmim" },
  { id: 24, name: "Larache" },
  { id: 25, name: "Ksar El Kebir" },
  { id: 26, name: "Berkane" },
  { id: 27, name: "Errachidia" },
  { id: 28, name: "Bouskoura" },
  { id: 29, name: "Fkih Ben Salah" },
  { id: 30, name: "Oued Zem" },
  { id: 31, name: "Sidi Slimane" },
  { id: 32, name: "Taroudant" },
  { id: 33, name: "Kelaat Sraghna" },
  { id: 34, name: "Benguerir" },
  { id: 35, name: "Essaouira" },
  { id: 36, name: "Tiznit" },
  { id: 37, name: "Azrou" },
  { id: 38, name: "Midelt" },
  { id: 39, name: "Ouarzazate" },
  { id: 40, name: "Al Hoceima" },
  { id: 41, name: "Chefchaouen" },
  { id: 42, name: "Dakhla" },
  { id: 43, name: "Laâyoune" }
];

// Districts API
app.get('/api/districts', async (req, res) => {
  const querystring = req.query.querystring;
  try {
    const result = await senditClient.getDistricts(querystring);
    res.json(result);
  } catch (e) {
    console.warn(`[VORK-API] ⚠️ Failed to fetch districts from Sendit API (${e.message}). Using local fallback.`);
    let data = MOCK_DISTRICTS;
    if (querystring) {
      data = MOCK_DISTRICTS.filter(d => d.name.toLowerCase().includes(querystring.toLowerCase()));
    }
    res.json({ success: true, message: "Liste des villes (Local Fallback).", data });
  }
});

// Artisan Ship Route (Legacy & Step 1 wrapper)
app.post('/api/artisan/orders/:id/ship', async (req, res) => {
  try {
    const result = await shipOrder(req.params.id, req.body);
    res.json({ success: true, status: "en_preparation", ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Artisan Accept Route
app.post('/api/artisan/orders/:id/accept', async (req, res) => {
  try {
    await acceptOrder(req.params.id);
    res.json({ success: true, status: "en_preparation" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Artisan Upload Preparation Photos (Art. 8.1, 9.2, 10.2)
app.post('/api/artisan/orders/:id/prep-photos', async (req, res) => {
  try {
    const result = await uploadPrepPhotos(req.params.id, req.body.photos || []);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Artisan Sendit Étape 1 : Génération du Bon de Livraison (BL) (Art. 8.3)
app.post('/api/artisan/orders/:id/ship-sendit-step1', async (req, res) => {
  try {
    const result = await prepareSenditShipping(req.params.id, req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Artisan Sendit Étape 2 : Colis Prêt pour Ramassage avec Photo du BL collé (Art. 8.3)
app.post('/api/artisan/orders/:id/ship-sendit-step2', async (req, res) => {
  try {
    const result = await confirmSenditPickupReady(req.params.id, req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Artisan Transport Assuré par le Vendeur (Art. 8.2, 9.3, 10.3)
app.post('/api/artisan/orders/:id/ship-vendeur', async (req, res) => {
  try {
    const result = await shipVendeurSelf(req.params.id, req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Artisan Validation de Fin de Transport avec Signature Manuscrite (Art. 11.5)
app.post('/api/artisan/orders/:id/complete-vendeur-delivery', async (req, res) => {
  try {
    const result = await completeVendeurDelivery(req.params.id, req.body);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Vendor Profile & Warnings Info (Art. 6.4, 19, 22)
app.get('/api/artisan/vendor/:vendorRef/profile', (req, res) => {
  const vendorRef = req.params.vendorRef;
  const profile = db.select().from(vendorProfiles).where(eq(vendorProfiles.id, vendorRef)).get() || {
    id: vendorRef,
    warningCountCurrentMonth: 0,
    suspensionStatus: "active",
    suspendedUntil: null,
  };
  const warnings = db.select().from(vendorWarnings).where(eq(vendorWarnings.vendorRef, vendorRef)).all();
  res.json({ success: true, profile, warnings });
});

// Artisan Label Route
app.get('/api/artisan/orders/:id/label', async (req, res) => {
  try {
    const result = await senditClient.getLabels(req.query.code || "");
    res.json(result);
  } catch (e) {
    console.warn(`[VORK-API] ⚠️ Failed to fetch label from Sendit API (${e.message}). Using local fallback.`);
    res.json({ success: true, labelUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" });
  }
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Endpoint not found: ${req.method} ${req.path}` });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 MAALEM Backend running on http://localhost:${PORT}`);
  console.log(`   GET  /health`);
  console.log(`   GET  /api/products`);
  console.log(`   GET  /api/recommendations?userId=x`);
  console.log(`   GET  /api/search?q=zellige`);
  console.log(`   POST /api/client/orders`);
  console.log(`   POST /api/client/orders/:id/pay`);
  console.log(`   GET  /api/client/wallet/:userId/balance\n`);
});

export { app };
