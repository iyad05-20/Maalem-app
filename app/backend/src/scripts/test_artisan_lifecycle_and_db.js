/**
 * Test Automatisé Complet : Cycle de Vie Artisan, Calculs Financiers, Sendit Simulation & Switch BDD
 * Usage: node src/scripts/test_artisan_lifecycle_and_db.js
 */

const BASE_URL = process.env.TEST_API_URL || "http://localhost:3001/api";

async function runTests() {
  console.log("================================================================================");
  console.log("🧪 DÉMARRAGE DE LA SUITE DE TESTS : APPS MAÂLEM & PROD READINESS");
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  async function assertTest(name, fn) {
    try {
      process.stdout.write(`⏳ [TEST] ${name} ... `);
      await fn();
      console.log("✅ SUCCÈS");
      passed++;
    } catch (err) {
      console.log(`❌ ÉCHEC: ${err.message}`);
      failed++;
    }
  }

  // ── TEST 1 : Vérification et Switch de BDD (Admin) ──────────────────────────
  await assertTest("1. Switch BDD Admin (GET & POST /api/admin/config/db-mode)", async () => {
    const resGet = await fetch(`${BASE_URL}/admin/config/db-mode`);
    const dataGet = await resGet.json();
    if (!dataGet.success) throw new Error("GET db-mode failed");
    if (!["dev", "prod"].includes(dataGet.activeMode)) throw new Error("Mode invalide: " + dataGet.activeMode);

    // Toggle to prod then back to dev
    const resPost = await fetch(`${BASE_URL}/admin/config/db-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "dev" }),
    });
    const dataPost = await resPost.json();
    if (!dataPost.success || dataPost.activeMode !== "dev") {
      throw new Error("Basculement vers mode dev échoué");
    }
  });

  // ── TEST 2 : Création de Produit & Calcul de Prix ───────────────────────────
  await assertTest("2. Création Produit Catalogue & Formule Prix Vork (+5% HT + 20% TVA)", async () => {
    const netPrice = 1000;
    const res = await fetch(`${BASE_URL}/artisan/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Table Basse Zellige Test Auto",
        description: "Table ronde 80cm artisanale",
        price: netPrice,
        category: "Céramique & Poterie",
        productType: "standard",
        manufacturingDays: 4,
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Échec création produit");

    const expectedCommissionHt = 50; // 5% de 1000
    const expectedTva = 10;          // 20% de 50
    const expectedClientPrice = 1060; // 1000 + 50 + 10

    if (data.product.clientPrice !== expectedClientPrice) {
      throw new Error(`Prix client calculé incorrect: attendu ${expectedClientPrice}, reçu ${data.product.clientPrice}`);
    }
  });

  // ── TEST 3 : Récupération du Catalogue Artisan ──────────────────────────────
  await assertTest("3. Récupération du Catalogue Artisan (GET /api/artisan/products)", async () => {
    const res = await fetch(`${BASE_URL}/artisan/products`);
    const data = await res.json();
    if (!data.success || !Array.isArray(data.products)) throw new Error("Réponse catalogue invalide");
    if (data.products.length === 0) throw new Error("Le catalogue ne doit pas être vide");
  });

  // ── TEST 4 : Portefeuille & Demande de Virement du Vendredi ───────────────────
  await assertTest("4. Portefeuille & Demande de Virement Hebdomadaire (Vendredi 10h)", async () => {
    const resWallet = await fetch(`${BASE_URL}/artisan/wallet?artisanRef=artisan-1`);
    const dataWallet = await resWallet.json();
    if (!dataWallet.success) throw new Error(dataWallet.error || "Échec récupération wallet");

    // Envoi d'une demande de retrait de 500 MAD
    const ribValide24 = "230780000123456789012345";
    const resWithdraw = await fetch(`${BASE_URL}/artisan/wallet/withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artisanRef: "artisan-1",
        amount: 500,
        rib: ribValide24,
      }),
    });
    const dataWithdraw = await resWithdraw.json();
    if (!dataWithdraw.success) throw new Error(dataWithdraw.error || "Échec demande de retrait");
    if (!dataWithdraw.message.includes("Vendredi à 10h00")) {
      throw new Error("Le message doit mentionner le lot automatique du vendredi à 10h00");
    }
  });

  // ── TEST 5 : Cycle de Commande Artisan & Simulation Sendit ───────────────────
  const testOrderId = `order-test-${Date.now()}`;

  await assertTest("5. Acceptation de commande par l'artisan (/accept)", async () => {
    const res = await fetch(`${BASE_URL}/artisan/orders/${testOrderId}/accept`, { method: "POST" });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Échec acceptation commande");
  });

  await assertTest("6. Dépôt des 4 photos de préparation obligatoires (Art. 8.1)", async () => {
    const samplePhotos = [
      "https://images.unsplash.com/photo-1.jpg",
      "https://images.unsplash.com/photo-2.jpg",
      "https://images.unsplash.com/photo-3.jpg",
      "https://images.unsplash.com/photo-4.jpg"
    ];
    const res = await fetch(`${BASE_URL}/artisan/orders/${testOrderId}/prep-photos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photos: samplePhotos }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Échec upload prep-photos");
  });

  let generatedSenditCode = "";
  await assertTest("7. Sendit Étape 1 : Bon de livraison en mode simulation (SENDIT_SIMULATION=true)", async () => {
    const res = await fetch(`${BASE_URL}/artisan/orders/${testOrderId}/ship-sendit-step1`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickup_district_id: 2,
        district_id: 1,
        address: "Boulevard Zerktouni, Casablanca",
        name: "Client Test",
        phone: "0661000000",
      }),
    });
    const data = await res.json();
    if (!data.success || !data.senditDeliveryCode) throw new Error("Échec génération code Sendit");
    if (!data.senditDeliveryCode.startsWith("SND-")) throw new Error("Format code Sendit invalide: " + data.senditDeliveryCode);
    generatedSenditCode = data.senditDeliveryCode;
  });

  await assertTest("8. Sendit Étape 2 : Confirmation colis prêt pour ramassage", async () => {
    const res = await fetch(`${BASE_URL}/artisan/orders/${testOrderId}/ship-sendit-step2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blAttachedPhoto: "https://images.unsplash.com/bl-carton.jpg",
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Échec confirmation ramassage");
  });

  // ── TEST 9 : Webhook Transporteur Sendit (DELIVERED) ──────────────────────────
  await assertTest("9. Webhook Sendit Livré (DELIVERED) & Mise à jour commande", async () => {
    const res = await fetch(`${BASE_URL}/webhooks/sendit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sendit-signature": "dummy_signature",
      },
      body: JSON.stringify({
        event: "delivery.status.update",
        code: generatedSenditCode,
        reference: testOrderId,
        status: "DELIVERED",
        updated_at: new Date().toISOString(),
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Échec traitement webhook Sendit");
  });

  // ── TEST 10 : Exécution du Cron Job Virement Vendredi 10h ────────────────────
  await assertTest("10. Exécution Cron Job Virement Hebdomadaire (virements-vendredi)", async () => {
    const res = await fetch(`${BASE_URL}/cron/run/virements-vendredi`, { method: "POST" });
    const data = await res.json();
    if (!data.success || data.jobName !== "virements-vendredi") {
      throw new Error("Échec exécution cron virements-vendredi");
    }
  });

  console.log("\n================================================================================");
  console.log(`📊 RÉSULTAT FINAL : ${passed} passés, ${failed} échoués sur ${passed + failed} tests`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
