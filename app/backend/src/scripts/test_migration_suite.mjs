import 'dotenv/config';
import http from 'http';
import { app } from '../server.js';
import { sql } from '../core/db/index.js';

let passed = 0;
let failed = 0;

async function runStep(name, fn) {
  process.stdout.write(`⏳ ${name} ... `);
  try {
    await fn();
    console.log('✅ SUCCÈS');
    passed++;
  } catch (err) {
    console.log(`❌ ÉCHEC: ${err.message}`);
    failed++;
  }
}

async function main() {
  console.log('================================================================');
  console.log('🧪 VALIDATION SUITE : BACKEND MIGRÉ VERS SUPABASE POSTGRESQL');
  console.log('================================================================\n');

  // Start an isolated server on port 3099 for standalone test execution
  const TEST_PORT = 3099;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  const BASE_URL = `http://localhost:${TEST_PORT}`;

  let artisanToken = '';
  let clientToken = '';
  let adminToken = '';
  let createdOrderId = '';

  try {
    // 1. Health check
    await runStep('1. Health check (/health)', async () => {
      const res = await fetch(`${BASE_URL}/health`);
      const data = await res.json();
      if (res.status !== 200 || data.status !== 'ok') {
        throw new Error(`Health check failed: ${JSON.stringify(data)}`);
      }
    });

    // 2. Login artisan par défaut (seeded dans Supabase PostgreSQL)
    await runStep('2. Login artisan par défaut (artisan@vork.ma)', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'artisan@vork.ma', password: 'Maalem2026!' }),
      });
      const data = await res.json();
      if (res.status !== 200 || !data.token) {
        throw new Error(`Login artisan failed: ${JSON.stringify(data)}`);
      }
      artisanToken = data.token;
      if (data.user.role !== 'artisan') {
        throw new Error(`Expected role artisan, got: ${data.user.role}`);
      }
    });

    // 3. Login client par défaut (client@vork.ma)
    await runStep('3. Login client par défaut (client@vork.ma)', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'client@vork.ma', password: 'Client2026!' }),
      });
      const data = await res.json();
      if (res.status !== 200 || !data.token) {
        throw new Error(`Login client failed: ${JSON.stringify(data)}`);
      }
      clientToken = data.token;
      if (data.user.role !== 'client') {
        throw new Error(`Expected role client, got: ${data.user.role}`);
      }
    });

    // 4. Login admin par défaut (admin@vork.ma)
    await runStep('4. Login admin par défaut (admin@vork.ma)', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@vork.ma', password: 'AdminVork2026!' }),
      });
      const data = await res.json();
      if (res.status !== 200 || !data.token) {
        throw new Error(`Login admin failed: ${JSON.stringify(data)}`);
      }
      adminToken = data.token;
      if (data.user.role !== 'admin') {
        throw new Error(`Expected role admin, got: ${data.user.role}`);
      }
    });

    // 5. Inscription d'un nouvel artisan dans Supabase PG
    const uniqueArtisanEmail = `artisan_${Date.now()}@vork.ma`;
    await runStep(`5. Inscription nouvel artisan (${uniqueArtisanEmail})`, async () => {
      const res = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: uniqueArtisanEmail,
          password: 'Password123!',
          fullName: 'Maalem Rachid Test',
          role: 'artisan',
          phone: '0612345678',
          city: 'Marrakech',
        }),
      });
      const data = await res.json();
      if (res.status !== 201 || !data.token) {
        throw new Error(`Signup failed: ${JSON.stringify(data)}`);
      }
      if (data.user.email !== uniqueArtisanEmail) {
        throw new Error(`User email mismatch: ${data.user.email}`);
      }
    });

    // 6. Test GET /api/auth/me avec token
    await runStep('6. Vérification /api/auth/me avec JWT', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${artisanToken}` },
      });
      const data = await res.json();
      if (res.status !== 200 || data.user.email !== 'artisan@vork.ma') {
        throw new Error(`/api/auth/me failed: ${JSON.stringify(data)}`);
      }
    });

    // 7. Création de commande client
    await runStep('7. Création commande client (POST /api/client/orders)', async () => {
      const res = await fetch(`${BASE_URL}/api/client/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clientToken}`,
        },
        body: JSON.stringify({
          clientRef: 'client_karim',
          artisanRef: 'artisan_abdelkader',
          artisanName: 'Maâlem Abdelkader',
          totalPrice: 1200,
          productType: 'standard',
          productTitle: 'Tajine Artisanal Fassi',
          transportProvider: 'sendit',
        }),
      });
      const data = await res.json();
      if (res.status !== 200 || !data.id) {
        throw new Error(`Create order failed: ${JSON.stringify(data)}`);
      }
      createdOrderId = data.id;
      if (Number(data.totalPrice) !== 1200) {
        throw new Error(`Price mismatch: ${data.totalPrice}`);
      }
    });

    // 8. Consultation des commandes côté artisan (isolation Anti-IDOR)
    await runStep('8. Consultation commandes artisan (GET /api/artisan/orders)', async () => {
      const res = await fetch(`${BASE_URL}/api/artisan/orders`, {
        headers: { Authorization: `Bearer ${artisanToken}` },
      });
      const data = await res.json();
      if (res.status !== 200 || !data.success) {
        throw new Error(`Get artisan orders failed: ${JSON.stringify(data)}`);
      }
      const found = data.orders.some(o => o.id === createdOrderId);
      if (!found) {
        throw new Error(`Created order ${createdOrderId} not found in artisan orders list`);
      }
    });

    // 9. Initialisation du paiement CMI
    let paymentIntentId = '';
    await runStep('9. Initier le paiement CMI (POST /api/client/orders/:id/pay)', async () => {
      const res = await fetch(`${BASE_URL}/api/client/orders/${createdOrderId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${clientToken}`,
        },
        body: JSON.stringify({ choice: 'deposit' }),
      });
      const data = await res.json();
      if (res.status !== 200 || !data.paymentIntentId) {
        throw new Error(`Pay intent failed: ${JSON.stringify(data)}`);
      }
      paymentIntentId = data.paymentIntentId;
      if (data.tranche !== 'acompte_50' || Number(data.amount) !== 600) {
        throw new Error(`Tranche/Amount error: ${JSON.stringify(data)}`);
      }
    });

    // 10. Simulation du paiement CMI réussi
    await runStep('10. Simulation paiement réussi CMI (POST /mock-cmi/simulate)', async () => {
      const res = await fetch(`${BASE_URL}/mock-cmi/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent_id: paymentIntentId,
          amount: 600,
          resultat: 'succes',
        }),
      });
      const data = await res.json();
      if (res.status !== 200 || data.statut !== 'confirme') {
        throw new Error(`Simulate payment failed: ${JSON.stringify(data)}`);
      }
    });

    // 11. Acceptation de commande par l'artisan
    await runStep('11. Acceptation commande par artisan (POST /api/artisan/orders/:id/accept)', async () => {
      const res = await fetch(`${BASE_URL}/api/artisan/orders/${createdOrderId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${artisanToken}` },
      });
      const data = await res.json();
      if (res.status !== 200 || !data.success) {
        throw new Error(`Accept order failed: ${JSON.stringify(data)}`);
      }
      if (data.order.status !== 'en_preparation') {
        throw new Error(`Expected status en_preparation, got: ${data.order.status}`);
      }
    });

    // 12. Consultation des stats Admin avec Master Key
    await runStep('12. Consultation KPIs Admin (GET /api/admin/stats)', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/stats`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'X-Admin-Master-Key': process.env.ADMIN_MASTER_KEY || 'vork_admin_master_passkey_2026',
        },
      });
      const data = await res.json();
      if (res.status !== 200 || !data.success) {
        throw new Error(`Admin stats failed: ${JSON.stringify(data)}`);
      }
      if (data.stats.totalOrdersCount < 1) {
        throw new Error(`Orders count expected >= 1, got: ${data.stats.totalOrdersCount}`);
      }
    });

    // 13. Exécution d'un job de cron
    await runStep('13. Exécution Job Cron (POST /api/cron/run/relance-j2)', async () => {
      const res = await fetch(`${BASE_URL}/api/cron/run/relance-j2`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.status !== 200 || !data.success) {
        throw new Error(`Cron run failed: ${JSON.stringify(data)}`);
      }
    });

    // 14. Catalogue produits Supabase REST inchangé
    await runStep('14. Consultation catalogue produits Supabase REST (/api/products)', async () => {
      const res = await fetch(`${BASE_URL}/api/products`);
      const data = await res.json();
      const products = Array.isArray(data) ? data : (data.data || []);
      if (res.status !== 200 || !Array.isArray(products)) {
        throw new Error(`Products catalog failed: ${JSON.stringify(data).slice(0, 100)}`);
      }
      if (products.length < 10) {
        throw new Error(`Products count suspiciously low: ${products.length}`);
      }
    });
  } finally {
    server.close();
    await sql.end();
  }

  console.log('\n================================================================');
  console.log(`📊 RÉSULTAT FINAL : ${passed} TESTS RÉUSSIS, ${failed} ÉCHECS`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
