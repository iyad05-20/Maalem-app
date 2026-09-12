import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes           from './routes/auth.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';
import searchRoutes         from './routes/search.routes.js';
import productsRoutes       from './routes/products.routes.js';
import favoritesRoutes      from './routes/favorites.routes.js';
import reviewsRoutes        from './routes/reviews.routes.js';
import clientRoutes         from './client/routes/clientRoutes.js';
import mockCmiRouter        from './core/paymentProviders/mockCmi.js';
import { cronRouter }       from './routes/cronRoutes.js';
import { adminRouter }      from './routes/admin.routes.js';
import { artisanRouter }    from './routes/artisan.routes.js';
import { startCronScheduler } from './services/cronService.js';
import { loadProducts }       from './services/recommendation.service.js';
import { initSearchIndex }  from './services/search/meilisearch.service.js';
import { initSchema }       from './core/db/index.js';
import { seedDefaultAccounts } from './services/localAuth.service.js';
import { senditWebhookHandler } from './services/sendit/senditWebhookHandler.js';
import { senditClient } from './services/sendit/senditClient.js';

(async () => {
  try {
    initSchema();
    await seedDefaultAccounts();
    await loadProducts();
    await initSearchIndex();
  } catch (err) {
    console.error('Initialization failed (non-fatal):', err.message);
  }
})();

const app = express();
app.set('trust proxy', 1);

// ─── Sécurité HTTP Headers (Helmet) ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

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

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting Anti-Bruteforce ────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requêtes par fenêtre par IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Trop de tentatives de connexion depuis cette adresse IP. Veuillez patienter 15 minutes avant de réessayer.",
    code: "RATE_LIMIT_EXCEEDED",
  }
});
app.use('/api/auth/login', loginLimiter);

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
