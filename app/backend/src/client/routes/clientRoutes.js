import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../core/db/index.js";
import { orders, paymentIntents, withdrawalRequests, ledgerEntries, disputes } from "../../core/db/schema.js";
import { montantAPayer } from "../../core/types.js";
import { MockCmiProvider } from "../../core/paymentProviders/MockCmiProvider.js";
import { cancelOrder, deliverOrder } from "../services/clientPaymentService.js";
import { requestReturn } from "../services/clientReturnService.js";
import { optionalAuthMiddleware } from "../../middleware/auth.middleware.js";

const router = Router();
router.use(optionalAuthMiddleware);
const provider = new MockCmiProvider();

const createOrderSchema = z.object({
  clientRef: z.string().min(1),
  artisanRef: z.string().min(1).optional(),
  artisanName: z.string().optional(),
  totalPrice: z.number().positive(),
  productType: z.enum(["standard", "personnalise", "sur_commande"]).optional(),
  productTitle: z.string().optional(),
  productImage: z.string().optional(),
  transportProvider: z.enum(["sendit", "vendeur"]).optional(),
  clientSignature: z.string().optional(),
});

const returnSchema = z.object({
  mode: z.enum(["sendit", "propres_moyens"]),
  returnShippingFee: z.number().nonnegative().optional(),
});

const withdrawSchema = z.object({
  amount: z.number().positive(),
  rib: z.string().length(24),
});

/**
 * [CLIENT API] Récupérer la liste des commandes du client.
 */
router.get("/orders", (req, res) => {
  const clientRef = req.userId || (req.query.clientRef ? String(req.query.clientRef) : "client-me");
  console.log(`\n[VORK-API] 📥 GET /orders - Fetching for client: ${clientRef}`);
  const list = db.select().from(orders).where(eq(orders.clientRef, clientRef)).all();
  console.log(`[VORK-API] ✅ Found ${list.length} orders`);
  res.json(list);
});

/**
 * [CLIENT API] Créer une nouvelle commande.
 */
router.post("/orders", (req, res) => {
  console.log(`\n[VORK-API] 📥 POST /orders - Payload:`, req.body);
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error(`[VORK-API] ❌ Validation error:`, parsed.error.format());
    return res.status(422).json({ error: parsed.error.flatten() });
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const productType = parsed.data.productType ?? "standard";
  // Si Produit Personnalisé ou Sur Commande -> transport exclusivement Vendeur (Art. 8, 9, 10)
  const transportProvider = productType === "standard" ? (parsed.data.transportProvider ?? "sendit") : "vendeur";

    db.insert(orders)
      .values({
        id,
        clientRef: req.userId || parsed.data.clientRef,
        artisanRef: parsed.data.artisanRef ?? "artisan-1",
        artisanName: parsed.data.artisanName || "Maâlem Abdelkader",
        totalPrice: parsed.data.totalPrice,
        productType,
        productTitle: parsed.data.productTitle || "Création Artisanale",
        productImage: parsed.data.productImage || null,
        transportProvider,
        clientSignature: parsed.data.clientSignature || null,
        status: "en_attente_paiement",
        createdAt: now,
        updatedAt: now,
      })
      .run();

  const order = db.select().from(orders).where(eq(orders.id, id)).get();
  console.log(`[VORK-API] ✅ Order created successfully (ID: ${id}, Type: ${productType}, Transport: ${transportProvider})`);
  res.json(order);
});

/**
 * [CLIENT API] Initier le paiement (CMI / Acompte 50%).
 */
router.post("/orders/:id/pay", (req, res) => {
  console.log(`\n[VORK-API] 📥 POST /orders/${req.params.id}/pay - Initiating payment`);
  let order = db.select().from(orders).where(eq(orders.id, req.params.id)).get();
  if (!order) {
    console.warn(`[VORK-API] ⚠️ Order not found: ${req.params.id}. Auto-creating for demo testing.`);
    const now = new Date().toISOString();
    db.insert(orders)
      .values({
        id: req.params.id,
        clientRef: "767f1271-a560-491c-8225-91bcb06e8930",
        artisanRef: "artisan-1",
        totalPrice: 1500,
        productType: "standard",
        status: "en_attente_paiement",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    order = db.select().from(orders).where(eq(orders.id, req.params.id)).get();
  }

  const choice = req.body?.choice || "deposit"; // "deposit" or "total"
  let montant = order.totalPrice;
  let tranche = "total_100";

  if (order.totalPrice >= 1000 && choice === "deposit") {
    montant = Math.round(order.totalPrice * 0.5 * 100) / 100;
    tranche = "acompte_50";
  }
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const intentId = crypto.randomUUID();

  db.insert(paymentIntents)
    .values({
      id: intentId,
      orderId: order.id,
      montant,
      tranche,
      provider: "mock_cmi",
      statut: "cree",
      createdAt: now,
      updatedAt: now,
      expiresAt,
    })
    .run();

  db.update(orders)
    .set({ status: "paiement_initie", updatedAt: now })
    .where(eq(orders.id, order.id))
    .run();

  const hostHeader = req.get("host") || "localhost:3001";
  const protocol = req.protocol === "https" || req.get("x-forwarded-proto") === "https" ? "https" : "http";
  
  // URL publique du serveur backend (Heroku ou Docker Local)
  const backendPublicUrl = process.env.PUBLIC_BACKEND_URL 
    || `${protocol}://${hostHeader}`;

  const requete = provider.construireRequete(
    { id: intentId, montant },
    `${backendPublicUrl}/mock-cmi`
  );

  console.log(`[VORK-API] ✅ Payment intent created (IntentID: ${intentId}, Amount: ${montant} MAD, Tranche: ${tranche})`);
  res.json({
    success: true,
    paymentIntentId: intentId,
    redirectUrl: requete.redirectUrl,
    amount: montant,
    tranche,
  });
});

/**
 * [CLIENT API] Annulation de la commande par le client.
 */
router.post("/orders/:id/cancel", (req, res) => {
  console.log(`\n[VORK-API] 📥 POST /orders/${req.params.id}/cancel - Requesting cancellation`);
  try {
    const cancelTime = req.body?.cancelTime ? String(req.body.cancelTime) : undefined;
    const result = cancelOrder(db, req.params.id, cancelTime);
    console.log(`[VORK-API] ✅ Order cancelled successfully:`, result);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error(`[VORK-API] ❌ Cancellation failed:`, e.message);
    res.status(400).json({ error: e.message });
  }
});

/**
 * [CLIENT API] Validation de la réception / Livraison de la commande.
 */
router.post("/orders/:id/deliver", (req, res) => {
  console.log(`\n[VORK-API] 📥 POST /orders/${req.params.id}/deliver - Confirming receipt`);
  try {
    const deliveryTime = req.body?.deliveryTime ? String(req.body.deliveryTime) : undefined;
    deliverOrder(db, req.params.id, deliveryTime);
    console.log(`[VORK-API] ✅ Order marked as delivered successfully.`);
    res.json({ success: true });
  } catch (e) {
    console.error(`[VORK-API] ❌ Receipt confirmation failed:`, e.message);
    res.status(400).json({ error: e.message });
  }
});

/**
 * [CLIENT API] Demande de retour (Rétractation 7j).
 */
router.post("/orders/:id/return", (req, res) => {
  console.log(`\n[VORK-API] 📥 POST /orders/${req.params.id}/return - Requesting return`);
  const parsed = returnSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error(`[VORK-API] ❌ Return validation error:`, parsed.error.format());
    return res.status(422).json({ error: parsed.error.flatten() });
  }

  try {
    const returnId = requestReturn(
      db,
      req.params.id,
      parsed.data.mode,
      parsed.data.returnShippingFee
    );
    console.log(`[VORK-API] ✅ Return request registered (ReturnID: ${returnId})`);
    res.json({ success: true, returnId });
  } catch (e) {
    console.error(`[VORK-API] ❌ Return request failed:`, e.message);
    res.status(400).json({ error: e.message });
  }
});

/**
 * [CLIENT API] Consulter le solde du Wallet Client.
 */
router.get("/wallet/:userId/balance", (req, res) => {
  const userId = req.params.userId;
  console.log(`\n[VORK-API] 📥 GET /wallet/${userId}/balance - Fetching balance`);
  const compteClient = `wallet[${userId}]`;

  const creditsResult = db
    .select({ total: sql`COALESCE(SUM(montant), 0)` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.compteCredit, compteClient))
    .get();

  const debitsResult = db
    .select({ total: sql`COALESCE(SUM(montant), 0)` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.compteDebit, compteClient))
    .get();

  const credits = Number(creditsResult?.total ?? 0);
  const debits = Number(debitsResult?.total ?? 0);
  const balance = Math.max(0, Math.round((credits - debits) * 100) / 100);

  console.log(`[VORK-API] ✅ Balance for user ${userId} calculated: ${balance} MAD`);
  res.json({
    userId,
    balance,
  });
});

/**
 * [CLIENT API] Demande de virement sur RIB Bancaire Client.
 */
router.post("/wallet/:userId/withdraw", (req, res) => {
  const userId = req.params.userId;
  console.log(`\n[VORK-API] 📥 POST /wallet/${userId}/withdraw - Requesting payout`);
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error(`[VORK-API] ❌ Withdrawal validation error:`, parsed.error.format());
    return res.status(422).json({ error: parsed.error.flatten() });
  }

  const now = new Date().toISOString();
  const withdrawalId = crypto.randomUUID();

  try {
    db.transaction((tx) => {
      tx.insert(withdrawalRequests)
        .values({
          id: withdrawalId,
          userId,
          amount: parsed.data.amount,
          rib: parsed.data.rib,
          status: "pending",
          createdAt: now,
        })
        .run();

      tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId: null,
          compteDebit: `wallet[${userId}]`,
          compteCredit: "pending_withdrawals",
          montant: parsed.data.amount,
          type: "retrait_demande_rib",
          metadata: JSON.stringify({ rib: parsed.data.rib }),
          createdAt: now,
        })
        .run();
    });

    console.log(`[VORK-API] ✅ Withdrawal request registered (RequestID: ${withdrawalId}, Amount: ${parsed.data.amount} MAD)`);
    res.json({ success: true, withdrawalId });
  } catch (e) {
    console.error(`[VORK-API] ❌ Withdrawal request failed:`, e.message);
    res.status(400).json({ error: e.message });
  }
});

/**
 * [CLIENT API] Prolonger le délai de réponse du Vendeur (24h, 48h, 72h - Art 4.3).
 */
router.post("/orders/:id/extend-deadline", (req, res) => {
  const { id } = req.params;
  const { hours } = req.body;
  console.log(`\n[VORK-API] 📥 POST /orders/${id}/extend-deadline - Hours: ${hours}`);

  const order = db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  const validHours = [24, 48, 72];
  if (!validHours.includes(Number(hours))) {
    return res.status(400).json({ error: "Choix de prolongation invalide (24h, 48h ou 72h)." });
  }

  const now = new Date().toISOString();
  db.update(orders)
    .set({
      updatedAt: now,
      // Record extension flag
    })
    .where(eq(orders.id, id))
    .run();

  console.log(`[VORK-API] ✅ Seller deadline extended by ${hours}h for order ${id}`);
  res.json({ success: true, extendedHours: Number(hours) });
});


/**
 * [CLIENT API] Annulation de la commande par le client.
 */
router.post("/orders/:id/cancel", (req, res) => {
  console.log(`\n[VORK-API] 📥 POST /orders/${req.params.id}/cancel - Requesting cancellation`);
  try {
    const cancelTime = req.body?.cancelTime ? String(req.body.cancelTime) : undefined;
    const result = cancelOrder(db, req.params.id, cancelTime);
    console.log(`[VORK-API] ✅ Order cancelled successfully:`, result);
    res.json({ success: true, ...result });
  } catch (e) {
    console.error(`[VORK-API] ❌ Cancellation failed:`, e.message);
    res.status(400).json({ error: e.message });
  }
});

/**
 * [CLIENT API] Validation de la réception / Livraison de la commande.
 */
router.post("/orders/:id/deliver", (req, res) => {
  console.log(`\n[VORK-API] 📥 POST /orders/${req.params.id}/deliver - Confirming receipt`);
  try {
    const order = db.select().from(orders).where(eq(orders.id, req.params.id)).get();
    if (!order) return res.status(404).json({ error: "Commande introuvable" });

    const now = new Date().toISOString();
    const isCustom = ["personnalise", "sur_commande"].includes(order.productType);
    const withdrawalExpiresAt = isCustom
      ? null
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const escrowReleasedAt = isCustom ? now : null;

    db.update(orders)
      .set({
        status: "livre",
        deliveredAt: now,
        receptionValidatedBy: "client",
        withdrawalExpiresAt,
        escrowReleasedAt,
        updatedAt: now,
      })
      .where(eq(orders.id, req.params.id))
      .run();

    console.log(`[VORK-API] ✅ Order marked as delivered by client (Type: ${order.productType}, Escrow released: ${!!escrowReleasedAt})`);
    res.json({ success: true, escrowReleasedAt, withdrawalExpiresAt });
  } catch (e) {
    console.error(`[VORK-API] ❌ Receipt confirmation failed:`, e.message);
    res.status(400).json({ error: e.message });
  }
});

/**
 * [CLIENT API] Déclaration de non-réception du colis (Art. 13.3).
 */
router.post("/orders/:id/claim-non-reception", (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  console.log(`\n[VORK-API] 📥 POST /orders/${id}/claim-non-reception - Reason: ${reason}`);

  const order = db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  const now = new Date().toISOString();
  const disputeId = `dispute-${Date.now()}`;

  db.update(orders)
    .set({
      status: "en_reclamation",
      nonReceptionClaimedAt: now,
      nonReceptionReason: reason || "Colis non reçu par le client (Contestation de livraison)",
      updatedAt: now,
    })
    .where(eq(orders.id, id))
    .run();

  try {
    db.insert(disputes).values({
      id: disputeId,
      orderId: id,
      type: "non_reception",
      claimantRef: order.clientRef || "client-1",
      reason: reason || "Contestation de réception de colis et signature à la livraison (Art. 11.6 & 13.3)",
      clientEvidencePhotos: JSON.stringify([]),
      artisanResponse: null,
      artisanEvidencePhotos: JSON.stringify([]),
      status: "en_arbitrage_admin",
      escrowStatusAtDispute: order.escrowReleasedAt ? "already_released" : "locked",
      arbitrationDecision: null,
      arbitrationAmount: null,
      arbitratedBy: "admin-vork",
      createdAt: now,
    }).run();
  } catch (err) {
    console.error(`[VORK-API] ⚠️ Error creating dispute record:`, err.message);
  }

  console.log(`[VORK-API] ⚠️ Non-reception dispute opened for order ${id} (DisputeID: ${disputeId})`);
  res.json({ success: true, disputeId, status: "en_reclamation" });
});

/**
 * [CLIENT API] Signaler un défaut / Vice caché / Non-conformité (Art. 12.5 & 16.9).
 */
router.post("/orders/:id/dispute", (req, res) => {
  const { id } = req.params;
  const { type = "vice_cache_3mois", reason, clientEvidencePhotos = [] } = req.body;
  console.log(`\n[VORK-API] 📥 POST /orders/${id}/dispute - Type: ${type}, Reason: ${reason}`);

  const order = db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  const now = new Date().toISOString();
  const disputeId = `dispute-${Date.now()}`;

  db.update(orders)
    .set({
      status: "en_reclamation",
      updatedAt: now,
    })
    .where(eq(orders.id, id))
    .run();

  try {
    db.insert(disputes).values({
      id: disputeId,
      orderId: id,
      type: type || "vice_cache_3mois",
      claimantRef: order.clientRef || "client-1",
      reason: reason || "Défaut de matière ou de matériau signalé par le client (Art. 12.5 & 16.9)",
      clientEvidencePhotos: JSON.stringify(clientEvidencePhotos || []),
      artisanResponse: null,
      artisanEvidencePhotos: JSON.stringify([]),
      status: "en_arbitrage_admin",
      escrowStatusAtDispute: order.escrowReleasedAt ? "already_released" : "locked",
      arbitrationDecision: null,
      arbitrationAmount: null,
      arbitratedBy: "admin-vork",
      createdAt: now,
    }).run();
  } catch (err) {
    console.error(`[VORK-API] ⚠️ Error creating dispute record:`, err.message);
  }

  console.log(`[VORK-API] ⚠️ Defect dispute opened for order ${id} (DisputeID: ${disputeId})`);
  res.json({ success: true, disputeId, status: "en_reclamation" });
});

/**
 * [CLIENT API] Demande de retour (Rétractation 7j).
 */
router.post("/orders/:id/return", (req, res) => {
  console.log(`\n[VORK-API] 📥 POST /orders/${req.params.id}/return - Requesting return`);
  const parsed = returnSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error(`[VORK-API] ❌ Return validation error:`, parsed.error.format());
    return res.status(422).json({ error: parsed.error.flatten() });
  }

  try {
    const returnId = requestReturn(
      db,
      req.params.id,
      parsed.data.mode,
      parsed.data.returnShippingFee
    );
    console.log(`[VORK-API] ✅ Return request registered (ReturnID: ${returnId})`);
    res.json({ success: true, returnId });
  } catch (e) {
    console.error(`[VORK-API] ❌ Return request failed:`, e.message);
    res.status(400).json({ error: e.message });
  }
});

/**
 * [CLIENT API] Consulter le solde du Wallet Client.
 */
router.get("/wallet/:userId/balance", (req, res) => {
  const userId = req.params.userId;
  console.log(`\n[VORK-API] 📥 GET /wallet/${userId}/balance - Fetching balance`);
  const compteClient = `wallet[${userId}]`;

  const creditsResult = db
    .select({ total: sql`COALESCE(SUM(montant), 0)` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.compteCredit, compteClient))
    .get();

  const debitsResult = db
    .select({ total: sql`COALESCE(SUM(montant), 0)` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.compteDebit, compteClient))
    .get();

  const credits = Number(creditsResult?.total ?? 0);
  const debits = Number(debitsResult?.total ?? 0);
  const balance = Math.max(0, Math.round((credits - debits) * 100) / 100);

  console.log(`[VORK-API] ✅ Balance for user ${userId} calculated: ${balance} MAD`);
  res.json({
    userId,
    balance,
  });
});

/**
 * [CLIENT API] Demande de virement sur RIB Bancaire Client.
 */
router.post("/wallet/:userId/withdraw", (req, res) => {
  const userId = req.params.userId;
  console.log(`\n[VORK-API] 📥 POST /wallet/${userId}/withdraw - Requesting payout`);
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error(`[VORK-API] ❌ Withdrawal validation error:`, parsed.error.format());
    return res.status(422).json({ error: parsed.error.flatten() });
  }

  const now = new Date().toISOString();
  const withdrawalId = crypto.randomUUID();

  try {
    db.transaction((tx) => {
      tx.insert(withdrawalRequests)
        .values({
          id: withdrawalId,
          userId,
          amount: parsed.data.amount,
          rib: parsed.data.rib,
          status: "pending",
          createdAt: now,
        })
        .run();

      tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId: null,
          compteDebit: `wallet[${userId}]`,
          compteCredit: "pending_withdrawals",
          montant: parsed.data.amount,
          type: "retrait_demande_rib",
          metadata: JSON.stringify({ rib: parsed.data.rib }),
          createdAt: now,
        })
        .run();
    });

    console.log(`[VORK-API] ✅ Withdrawal request registered (RequestID: ${withdrawalId}, Amount: ${parsed.data.amount} MAD)`);
    res.json({ success: true, withdrawalId });
  } catch (e) {
    console.error(`[VORK-API] ❌ Withdrawal request failed:`, e.message);
    res.status(400).json({ error: e.message });
  }
});

/**
 * [CLIENT API] Prolonger le délai de réponse du Vendeur (24h, 48h, 72h - Art 4.3).
 */
router.post("/orders/:id/extend-deadline", (req, res) => {
  const { id } = req.params;
  const { hours } = req.body;
  console.log(`\n[VORK-API] 📥 POST /orders/${id}/extend-deadline - Hours: ${hours}`);

  const order = db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  const validHours = [24, 48, 72];
  if (!validHours.includes(Number(hours))) {
    return res.status(400).json({ error: "Choix de prolongation invalide (24h, 48h ou 72h)." });
  }

  const now = new Date().toISOString();
  db.update(orders)
    .set({
      updatedAt: now,
      // Record extension flag
    })
    .where(eq(orders.id, id))
    .run();

  console.log(`[VORK-API] ✅ Seller deadline extended by ${hours}h for order ${id}`);
  res.json({ success: true, extendedHours: Number(hours) });
});

/**
 * [CLIENT API] Annuler une demande de retour (Art 9.5 bis).
 */
router.post("/orders/:id/cancel-return", (req, res) => {
  const { id } = req.params;
  console.log(`\n[VORK-API] 📥 POST /orders/${id}/cancel-return`);

  const order = db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  if (order.status !== "retour_initie") {
    return res.status(400).json({ error: "Impossible d'annuler le retour : le colis est déjà en cours de transport." });
  }

  const now = new Date().toISOString();
  db.update(orders)
    .set({
      status: "livre",
      updatedAt: now,
    })
    .where(eq(orders.id, id))
    .run();

  console.log(`[VORK-API] ✅ Return request canceled for order ${id}`);
  res.json({ success: true, orderId: id });
});

/**
 * [CLIENT API] Validation manuelle de la réception par le client (Art. 4.3 C).
 * Le client confirme avoir bien reçu son colis dans la fenêtre de 24h post-livraison.
 */
router.post("/orders/:id/validate-delivery", (req, res) => {
  const { id } = req.params;
  console.log(`\n[VORK-API] 📥 POST /orders/${id}/validate-delivery`);

  const order = db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  if (!["livre", "auto_valide"].includes(order.status)) {
    return res.status(400).json({ error: "La commande n'est pas dans un état permettant la validation de réception." });
  }

  const now = new Date().toISOString();
  db.update(orders)
    .set({
      status: "complete",
      updatedAt: now,
    })
    .where(eq(orders.id, id))
    .run();

  console.log(`[VORK-API] ✅ Delivery manually validated by client for order ${id}`);
  res.json({ success: true, orderId: id });
});

/**
 * [CLIENT API] Déclaration de non-réception 24h post-validation automatique (Art. 4.3 D).
 * Disponible uniquement si la réception a été validée automatiquement et dans les 24h suivantes.
 */
router.post("/orders/:id/declare-not-received", (req, res) => {
  const { id } = req.params;
  console.log(`\n[VORK-API] 📥 POST /orders/${id}/declare-not-received`);

  const order = db.select().from(orders).where(eq(orders.id, id)).get();
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  if (order.status !== "auto_valide") {
    return res.status(400).json({ error: "Déclaration irrecevable : la réception n'a pas été validée automatiquement ou le délai de 24h est dépassé." });
  }

  // Vérifier que la déclaration intervient dans les 24h post-validation automatique
  if (order.autoValidatedAt) {
    const hoursElapsed = (Date.now() - new Date(order.autoValidatedAt).getTime()) / (1000 * 60 * 60);
    if (hoursElapsed >= 24) {
      return res.status(400).json({ error: "Le délai de 24h pour déclarer la non-réception est dépassé (Art. 4.3 D)." });
    }
  }

  const now = new Date().toISOString();
  db.update(orders)
    .set({
      status: "en_reclamation",
      updatedAt: now,
    })
    .where(eq(orders.id, id))
    .run();

  console.log(`[VORK-API] ✅ Non-receipt declared by client for order ${id} (Art. 4.3 D)`);
  res.json({ success: true, orderId: id });
});

export default router;
