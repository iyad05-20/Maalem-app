import crypto from 'crypto';

const BASE_URL = 'http://localhost:3001';
const ADMIN_MASTER_KEY = 'vork_admin_master_passkey_2026';
const SENDIT_SECRET_KEY = 'vork_sendit_webhook_secret_key_2026';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL [Test ${totalTests}]: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`✅ PASS [Test ${totalTests}]: ${message}`);
}

async function runSecurityTests() {
  console.log("==================================================================");
  console.log("🛡️  SUITE DE TESTS DE SÉCURITÉ & DE PRODUCTION — VORK / MAÂLEM");
  console.log("==================================================================\n");

  // 1. Health check & Headers de sécurité (Helmet)
  console.log("--- 1. Health & Security Headers (Helmet) ---");
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert(healthRes.status === 200, "Le serveur backend répond HTTP 200 sur /health");
  assert(healthRes.headers.get("x-content-type-options") === "nosniff", "En-tête X-Content-Type-Options: nosniff est actif");

  // 2. Authentification locale autonome
  console.log("\n--- 2. Authentification Locale Autonome ---");
  const loginClientRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'client@vork.ma', password: 'Client2026!' }),
  });
  const clientAuth = await loginClientRes.json();
  assert(loginClientRes.status === 200, "Connexion client locale réussie (HTTP 200)");
  assert(Boolean(clientAuth.token), "Jeton JWT Bearer généré pour le client");
  assert(clientAuth.user.role === 'client', "Rôle utilisateur 'client' validé");

  const loginArtisanRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'artisan@vork.ma', password: 'Maalem2026!' }),
  });
  const artisanAuth = await loginArtisanRes.json();
  assert(loginArtisanRes.status === 200, "Connexion artisan locale réussie (HTTP 200)");
  assert(Boolean(artisanAuth.token), "Jeton JWT Bearer généré pour l'artisan");
  assert(artisanAuth.user.role === 'artisan', "Rôle utilisateur 'artisan' validé");

  const loginAdminRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@vork.ma', password: 'AdminVork2026!' }),
  });
  const adminAuth = await loginAdminRes.json();
  assert(loginAdminRes.status === 200, "Connexion administrateur locale réussie (HTTP 200)");
  assert(Boolean(adminAuth.token), "Jeton JWT Bearer généré pour l'administrateur");
  assert(adminAuth.user.role === 'admin', "Rôle utilisateur 'admin' validé");

  // 3. Protection Anti-Bruteforce & Verrouillage Temporisé
  console.log("\n--- 3. Protection Anti-Bruteforce & Verrouillage Temporisé ---");
  // Créer un compte de test spécifique pour le test bruteforce
  const testUserEmail = `test_lockout_${Date.now()}@vork.ma`;
  await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUserEmail, password: 'Password123!', fullName: 'Test Lockout User' }),
  });

  // 5 tentatives erronées
  for (let i = 1; i <= 5; i++) {
    await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail, password: 'WrongPassword!' }),
    });
  }

  // La 6ème tentative doit être verrouillée
  const lockCheckRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUserEmail, password: 'Password123!' }),
  });
  const lockData = await lockCheckRes.json();
  assert(
    lockCheckRes.status === 429 || lockCheckRes.status === 401,
    "Le compte est verrouillé après 5 tentatives échouées consécutives"
  );
  assert(
    lockData.error && lockData.error.includes("verrouillé"),
    `Message explicite de temporisation anti-attaque : "${lockData.error}"`
  );

  // 4. Cloisonnement Strict des Rôles (RBAC) & Double Verrouillage Admin
  console.log("\n--- 4. Cloisonnement des Rôles & Double Verrouillage Admin ---");
  // A. Sans token
  const noTokenAdminRes = await fetch(`${BASE_URL}/api/admin/stats`);
  assert(noTokenAdminRes.status === 401, "Accès Admin sans jeton rejeté en HTTP 401");

  // B. Avec token client (mauvais rôle)
  const clientTokenAdminRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: {
      Authorization: `Bearer ${clientAuth.token}`,
      'X-Admin-Master-Key': ADMIN_MASTER_KEY,
    },
  });
  assert(clientTokenAdminRes.status === 403, "Accès Admin avec jeton 'client' rejeté en HTTP 403 (Cloisonnement rôle)");

  // C. Avec token admin mais sans Master Passkey
  const noPasskeyAdminRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: {
      Authorization: `Bearer ${adminAuth.token}`,
    },
  });
  assert(noPasskeyAdminRes.status === 403, "Accès Admin sans Master Passkey rejeté en HTTP 403");

  // D. Avec token admin et fausse Master Passkey
  const badPasskeyAdminRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: {
      Authorization: `Bearer ${adminAuth.token}`,
      'X-Admin-Master-Key': 'fake_master_key_9999',
    },
  });
  assert(badPasskeyAdminRes.status === 403, "Accès Admin avec Master Passkey erronée rejeté en HTTP 403");

  // E. Avec token admin ET Master Passkey légitime
  const validAdminRes = await fetch(`${BASE_URL}/api/admin/stats`, {
    headers: {
      Authorization: `Bearer ${adminAuth.token}`,
      'X-Admin-Master-Key': ADMIN_MASTER_KEY,
    },
  });
  assert(validAdminRes.status === 200, "Accès Admin avec Token Admin + Master Passkey autorisé (HTTP 200)");

  // 5. Journal d'Audit Administrateur (Audit Logging)
  console.log("\n--- 5. Traçabilité & Journal d'Audit Administrateur ---");
  const auditLogsRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
    headers: {
      Authorization: `Bearer ${adminAuth.token}`,
      'X-Admin-Master-Key': ADMIN_MASTER_KEY,
    },
  });
  assert(auditLogsRes.status === 200, "Consultation du journal d'audit autorisée en HTTP 200");
  const auditData = await auditLogsRes.json();
  assert(Array.isArray(auditData.logs), "Format du journal d'audit SQLite conforme");

  // 6. Sécurité Financière : Solvabilité Atomique du Portefeuille Artisan
  console.log("\n--- 6. Sécurité Financière & Contrôle Atomique de Solvabilité ---");
  // Tentative de retrait d'un montant astronomique (Overdraft attack)
  const overdraftRes = await fetch(`${BASE_URL}/api/artisan/wallet/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${artisanAuth.token}`,
    },
    body: JSON.stringify({
      amount: 99999999, // Montant très supérieur au solde
      rib: '123456789012345678901234', // RIB 24 chiffres valide
    }),
  });
  const overdraftData = await overdraftRes.json();
  assert(overdraftRes.status === 422, "Tentative de retrait à découvert rejetée en HTTP 422");
  assert(
    overdraftData.error && overdraftData.error.includes("Solde retirable insuffisant"),
    `Message d'erreur de solvabilité net : "${overdraftData.error}"`
  );

  // RIB invalide (moins de 24 chiffres)
  const badRibRes = await fetch(`${BASE_URL}/api/artisan/wallet/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${artisanAuth.token}`,
    },
    body: JSON.stringify({
      amount: 100,
      rib: '1234', // Faux RIB
    }),
  });
  assert(badRibRes.status === 400, "RIB bancaire non conforme (différent de 24 chiffres) rejeté en HTTP 400");

  // 7. Sécurité Webhook Sendit (HMAC SHA-256)
  console.log("\n--- 7. Intégrité des Webhooks Partenaires (Sendit HMAC) ---");
  // A. Sans signature
  const noSigRes = await fetch(`${BASE_URL}/api/webhooks/sendit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'delivery.status.update' }),
  });
  assert(noSigRes.status === 401, "Webhook Sendit sans signature rejeté en HTTP 401");

  // B. Avec signature HMAC erronée
  const badSigRes = await fetch(`${BASE_URL}/api/webhooks/sendit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sendit-signature': '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
    },
    body: JSON.stringify({ event: 'delivery.status.update' }),
  });
  assert(badSigRes.status === 401, "Webhook Sendit avec HMAC forgé rejeté en HTTP 401");

  // C. Avec HMAC authentique calculé
  const samplePayload = JSON.stringify({
    event: 'delivery.status.update',
    code: 'SND-NON-EXISTENT-TEST',
    status: 'TRANSIT',
  });
  const validHmac = crypto.createHmac('sha256', SENDIT_SECRET_KEY).update(samplePayload).digest('hex');

  const validWebhookRes = await fetch(`${BASE_URL}/api/webhooks/sendit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-sendit-signature': validHmac,
    },
    body: samplePayload,
  });
  // La signature est validée avec succès ; la commande n'existe pas donc 404 (pas 401)
  assert(validWebhookRes.status === 404 || validWebhookRes.status === 200, "Signature HMAC authentique validée avec succès par le serveur");

  console.log("\n==================================================================");
  console.log(`🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS : ${passedTests}/${totalTests} TESTS VALIDES`);
  console.log("==================================================================");
}

runSecurityTests().catch((err) => {
  console.error("\n💥 ÉCHEC DU TEST DE SÉCURITÉ :", err.message);
  process.exit(1);
});
