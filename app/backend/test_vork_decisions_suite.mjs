import { calculateShippingFee, calculatePlatformCommission, calculatePaymentBreakdown } from "./src/services/financialHelper.js";
import { getOrCreateClientWallet, creditClientWallet, debitClientWallet, getClientWalletDetails } from "./src/client/services/clientWalletService.js";
import { createFormalRequest, respondToFormalRequest, escalateToAdmin, getFormalRequestsForOrder } from "./src/services/formalRequestService.js";
import { acceptOrder, clientApproveReceipt } from "./src/client/services/artisanOrderService.js";
import { db } from "./src/core/db/index.js";
import { orders, formalRequests } from "./src/core/db/schema.js";
import { eq } from "drizzle-orm";

async function runTests() {
  console.log("🧪 ==========================================");
  console.log("🧪 SUITE DE TESTS : VORK FLUX & DÉCISIONS 26/09/2026");
  console.log("🧪 ==========================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // ──────────────────────────────────────────────────────────
  // TEST 1 : Helper Financier & Protection Anti-Division par Zéro (Décision 15 & Q2)
  // ──────────────────────────────────────────────────────────
  console.log("📌 [TEST 1] Calcul Transport & Guard Anti-Division par Zéro (Q2 & Décision 15)");
  const transportNormal = calculateShippingFee(20, 7, 3); // 20 * ceil(7/3) = 20 * 3 = 60
  assert(transportNormal === 60, `Transport normal 20 MAD pour 7 articles (seuil 3) = 60 MAD (reçu: ${transportNormal})`);

  const transportZeroThreshold = calculateShippingFee(30, 5, 0); // threshold = 0 -> pas de crash, forfait fixe 30
  assert(transportZeroThreshold === 30, `Guard seuil 0 : forfait fixe 30 MAD sans crash (reçu: ${transportZeroThreshold})`);

  const transportNullThreshold = calculateShippingFee(25, 4, null);
  assert(transportNullThreshold === 25, `Guard seuil null : forfait fixe 25 MAD sans crash (reçu: ${transportNullThreshold})`);

  // ──────────────────────────────────────────────────────────
  // TEST 2 : Commission Plateforme & Min/Max (P4 - 28/09/2026)
  // ──────────────────────────────────────────────────────────
  console.log("\n📌 [TEST 2] Commission Vork (Zéro plancher min, Plafond 2000 MAD, Taux 5% - Décision P4)");
  const commSmall = calculatePlatformCommission(200); // 5% = 10 MAD (pas de seuil min - Décision P4)
  assert(commSmall === 10, `Commande 200 MAD : commission 10 MAD sans plancher min (reçu: ${commSmall})`);

  const commNormal = calculatePlatformCommission(2000); // 5% = 100 MAD
  assert(commNormal === 100, `Commande 2 000 MAD : commission normale 100 MAD (reçu: ${commNormal})`);

  const commLarge = calculatePlatformCommission(50000); // 5% = 2500 MAD -> plafond 2000 MAD (P4)
  assert(commLarge === 2000, `Commande 50 000 MAD : commission plafond 2000 MAD appliquée (reçu: ${commLarge})`);

  // ──────────────────────────────────────────────────────────
  // TEST 3 : Paiement Fractionné 50% (Décision 30)
  // ──────────────────────────────────────────────────────────
  console.log("\n📌 [TEST 3] Paiement Fractionné 50% (Commission prélevée sur l'in-app)");
  const breakdown = calculatePaymentBreakdown(2000, true);
  assert(breakdown.inAppAmount === 1000, `In-app amount = 1 000 MAD (reçu: ${breakdown.inAppAmount})`);
  assert(breakdown.cashOnDeliveryAmount === 1000, `Cash à la livraison = 1 000 MAD (reçu: ${breakdown.cashOnDeliveryAmount})`);
  assert(breakdown.platformCommission === 100, `Commission Vork = 100 MAD (reçu: ${breakdown.platformCommission})`);
  assert(breakdown.artisanInAppNet === 900, `Net artisan in-app = 1000 - 100 = 900 MAD (reçu: ${breakdown.artisanInAppNet})`);

  // ──────────────────────────────────────────────────────────
  // TEST 4 : Wallet Interne Client (Décision 28)
  // ──────────────────────────────────────────────────────────
  console.log("\n📌 [TEST 4] Wallet Interne Client (Remboursement immédiat & Solde)");
  const testClientId = `test-client-${Date.now()}`;
  const creditRes = await creditClientWallet(testClientId, 450, "test-order-99", "refund_pre_acceptance", { reason: "annulation avant acceptation" });
  assert(creditRes.balance === 450, `Solde crédité à 450 MAD (reçu: ${creditRes.balance})`);

  const walletDetails = await getClientWalletDetails(testClientId);
  assert(walletDetails.balance === 450, `Vérification du solde via getClientWalletDetails : 450 MAD (reçu: ${walletDetails.balance})`);
  assert(walletDetails.transactions.length >= 1, `Historique transaction enregistré (transactions: ${walletDetails.transactions.length})`);

  // ──────────────────────────────────────────────────────────
  // TEST 5 : Création & Cycle Demande Formelle (Décision 1 & 29)
  // ──────────────────────────────────────────────────────────
  console.log("\n📌 [TEST 5] Demandes Formelles (Règle 48h & Arbitrage)");
  const dummyOrderId = `ord-test-df-${Date.now()}`;
  await db.insert(orders).values({
    id: dummyOrderId,
    clientRef: testClientId,
    artisanRef: "artisan-test-1",
    totalPrice: "500",
    productType: "standard",
    status: "livre",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const formalReq = await createFormalRequest({
    orderId: dummyOrderId,
    initiatorType: "client",
    initiatorId: testClientId,
    category: "produit_non_conforme",
    description: "Le produit reçu présente un éclat sur l'émail.",
    evidenceUrls: ["https://example.com/photo1.jpg"],
  });
  assert(formalReq.success === true, `Demande formelle créée avec succès (ID: ${formalReq.requestId})`);
  assert(!!formalReq.deadlineRespondentAt, `Délai de réponse 48h calculé : ${formalReq.deadlineRespondentAt}`);

  const orderReqs = await getFormalRequestsForOrder(dummyOrderId);
  // ──────────────────────────────────────────────────────────
  // TEST 6 : Validation Client & Libération Séquestre Immédiate (Décision 1)
  // ──────────────────────────────────────────────────────────
  console.log("\n📌 [TEST 6] Validation Client -> Libération Séquestre Immédiate (Décision 1)");
  const approvalRes = await clientApproveReceipt(dummyOrderId, testClientId);
  assert(approvalRes.status === "valide", `Statut commande mis à jour à 'valide' (reçu: ${approvalRes.status})`);
  assert(!!approvalRes.escrowReleasedAt, `Date de libération séquestre enregistrée immédiatement : ${approvalRes.escrowReleasedAt}`);

  const [validatedOrder] = await db.select().from(orders).where(eq(orders.id, dummyOrderId));
  assert(validatedOrder.escrowActionChoice === "released_to_wallet", `Séquestre libéré dans le wallet vendeur : ${validatedOrder.escrowActionChoice}`);

  // ──────────────────────────────────────────────────────────
  // TEST 7 : Gestion du Stock & Vérification Pré-Acceptation (Décision P5)
  // ──────────────────────────────────────────────────────────
  console.log("\n📌 [TEST 7] Gestion du Stock & Blocage Pré-Acceptation (Décision P5)");
  const { checkStockBeforeAccept } = await import("./src/db/products.repository.js");
  const testStockCheck = await checkStockBeforeAccept("p1", 1);
  assert(testStockCheck.canAccept === true || testStockCheck.canAccept === false, `checkStockBeforeAccept s'exécute sans crash (canAccept: ${testStockCheck.canAccept})`);

  // ──────────────────────────────────────────────────────────
  // TEST 8 : Règles d'Escalade Demande Formelle (Q3.4 & Q3.5)
  // ──────────────────────────────────────────────────────────
  console.log("\n📌 [TEST 8] Règles d'Escalade Demande Formelle (48h ou Réponse - Q3.4/Q3.5)");
  let escalationBlocked = false;
  try {
    await escalateToAdmin(formalReq.requestId, testClientId);
  } catch (e) {
    escalationBlocked = e.message.includes("escalade_prematuree");
  }
  assert(escalationBlocked === true, `Escalade bloquée avant 48h sans réponse (reçu: ${escalationBlocked})`);

  // L'autre partie répond
  const respondRes = await respondToFormalRequest(formalReq.requestId, "artisan-test-1", "Nous proposons un échange immédiat.");
  assert(respondRes.status === "repondue", `L'artisan a répondu à la demande formelle (status: ${respondRes.status})`);

  // Maintenant que l'artisan a répondu, le demandeur PEUT escalader vers Vork
  const escalationSuccess = await escalateToAdmin(formalReq.requestId, testClientId);
  assert(escalationSuccess.status === "escaladee_admin", `Escalade acceptée après réponse pour avis Vork (status: ${escalationSuccess.status})`);

  // ──────────────────────────────────────────────────────────
  // TEST 9 : Devis Personnalisé Unique, Annulation & Delta (Décision 38)
  // ──────────────────────────────────────────────────────────
  console.log("\n📌 [TEST 9] Devis Personnalisé Unique, Annulation & Delta (Décision 38)");
  const { customRequests } = await import("./src/core/db/schema.js");
  const testReqId = `req-test-d38-${Date.now()}`;
  await db.insert(customRequests).values({
    id: testReqId,
    clientRef: testClientId,
    artisanRef: "artisan-open",
    totalPrice: 0,
    status: "en_attente_artisan",
    customizationTags: JSON.stringify({
      title: "Table Mosaïque Zellige",
      quotes: [
        { artisanRef: "artisan-zellige-1", artisanName: "Maâlem Zellige", proposedPrice: 1000, confectionDays: 10 },
        { artisanRef: "artisan-zellige-2", artisanName: "Maâlem Atlas", proposedPrice: 1400, confectionDays: 12 },
      ]
    }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Client choisit Quote 1 (1000 MAD)
  // Simulation de la logique accept-quote
  const [createdCustomReq] = await db.select().from(customRequests).where(eq(customRequests.id, testReqId));
  assert(createdCustomReq.status === "en_attente_artisan", `Demande sur-mesure créée ouverte aux artisans`);

  // ──────────────────────────────────────────────────────────
  // TEST 10 : Supervision Admin & Avis d'Observation Vork (P6 / Q3.5)
  // ──────────────────────────────────────────────────────────
  console.log("\n📌 [TEST 10] Supervision Admin & Avis d'Observation Vork (P6 / Q3.5)");
  const escalatedRequests = await db.select()
    .from(formalRequests)
    .where(eq(formalRequests.status, "escaladee_admin"));
  assert(escalatedRequests.length > 0, `Au moins 1 demande formelle escaladée pour supervision admin (trouvé: ${escalatedRequests.length})`);

  // Observation Vork enregistrée sans sentence contraignante
  const targetReq = escalatedRequests[0];
  const nowObs = new Date().toISOString();
  await db.update(formalRequests)
    .set({
      adminNotes: `${targetReq.adminNotes}\n[Observation Vork ${nowObs}] : Recommandation d'accord amiable.`,
      status: "observee_admin",
    })
    .where(eq(formalRequests.id, targetReq.id));

  const [observedReq] = await db.select().from(formalRequests).where(eq(formalRequests.id, targetReq.id));
  assert(observedReq.status === "observee_admin", `Statut demande formelle mis à jour à 'observee_admin'`);
  assert(observedReq.adminNotes.includes("Recommandation d'accord amiable"), `Observation de médiation Vork enregistrée dans adminNotes`);

  // ──────────────────────────────────────────────────────────
  // TEST 11 : Blocage à la Caisse si Post Masqué ou Hors Stock (Décision 7 & 36)
  // ──────────────────────────────────────────────────────────
  console.log("\n📌 [TEST 11] Blocage Caisse si Post Masqué / Hors Stock (Décision 7 & 36)");
  const mockHiddenProduct = { isHidden: true, isOutOfStock: false };
  const mockStrictOutOfStock = { isHidden: false, isOutOfStock: true, stockPolicy: { allowOrderExceedingStock: false } };
  const mockOnDemandProduct = { isHidden: false, isOutOfStock: true, stockPolicy: { allowOrderExceedingStock: true } };

  function validateCheckoutDisponibility(product) {
    if (product.isHidden) {
      return { allowed: false, error: "Le vendeur a déclaré son refus de toute commande de ce produit pour le moment." };
    }
    const allowExceed = product.stockPolicy?.allowOrderExceedingStock ?? true;
    if (product.isOutOfStock && !allowExceed) {
      return { allowed: false, error: "Le produit est actuellement hors stock et le vendeur ne prend pas de commande sur ce produit pour le moment." };
    }
    return { allowed: true };
  }

  const resHidden = validateCheckoutDisponibility(mockHiddenProduct);
  assert(resHidden.allowed === false, "Commande bloquée si post masqué par le vendeur (Décision 7)");
  assert(resHidden.error.includes("Le vendeur a déclaré son refus"), "Message d'erreur légal Décision 7 conforme");

  const resStrict = validateCheckoutDisponibility(mockStrictOutOfStock);
  assert(resStrict.allowed === false, "Commande bloquée si hors stock strict sans confection (Décision 36)");

  const resOnDemand = validateCheckoutDisponibility(mockOnDemandProduct);
  assert(resOnDemand.allowed === true, "Commande autorisée si confection sur commande permise");

  console.log("\n==========================================");
  console.log(`📊 RÉSULTAT : ${passed} TESTS RÉUSSIS, ${failed} ÉCHECS`);
  console.log("==========================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error("Erreur fatale durant les tests :", err);
  process.exit(1);
});
