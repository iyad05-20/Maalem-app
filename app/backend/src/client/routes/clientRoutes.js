import { Router } from "express";
import { eq, sql, desc, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../core/db/index.js";
import { orders, paymentIntents, withdrawalRequests, ledgerEntries, disputes, customRequests } from "../../core/db/schema.js";
import { MockCmiProvider } from "../../core/paymentProviders/MockCmiProvider.js";
import { cancelOrder, deliverOrder } from "../services/clientPaymentService.js";
import { requestReturn } from "../services/clientReturnService.js";
import { getClientWalletDetails, requestClientWithdrawal, creditClientWallet, debitClientWallet, getOrCreateClientWallet } from "../services/clientWalletService.js";
import { getProductStockInfo } from "../../db/products.repository.js";
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
  productId: z.string().optional(),
  quantity: z.number().int().positive().optional(),
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
 * [CLIENT API] Récupérer la liste des commandes du client (incluant les demandes sur-mesure de l'Atelier).
 */
router.get("/orders", async (req, res) => {
  const clientRef = req.userId || (req.query.clientRef ? String(req.query.clientRef) : "client-me");
  console.log(`\n[VORK-API] 📥 GET /orders - Fetching for client: ${clientRef}`);

  try {
    // 1. Récupérer les commandes fermes
    const orderCondition = clientRef === "client-me"
      ? or(eq(orders.clientRef, "client-me"), eq(orders.clientRef, clientRef))
      : eq(orders.clientRef, clientRef);

    const rawList = await db.select().from(orders).where(orderCondition).orderBy(desc(orders.createdAt));
    // Élimination des commandes annulées avant acceptation de la vue active client (Décision 28)
    const list = rawList.filter(o => o.status !== "annule_avant_acceptation");

    // 2. Récupérer les demandes sur-mesure de l'Atelier
    const customCondition = clientRef === "client-me"
      ? or(eq(customRequests.clientRef, "client-me"), eq(customRequests.clientRef, clientRef))
      : eq(customRequests.clientRef, clientRef);

    const rawCustoms = await db.select().from(customRequests)
      .where(customCondition)
      .orderBy(desc(customRequests.createdAt));

    const pendingCustoms = rawCustoms
      .filter(cr => cr.status !== "annulee")
      .map(cr => {
        let tags = {};
        try {
          tags = typeof cr.customizationTags === "string" ? JSON.parse(cr.customizationTags) : (cr.customizationTags || {});
        } catch (e) {}
        const quotes = Array.isArray(tags.quotes) ? tags.quotes : [];
        const hasQuotes = quotes.length > 0;
        const title = tags.summary ? tags.summary.split("\n")[0].replace(/^[•\s*]+/, "") : (tags.title || "Création sur-mesure");

        // Si la demande a déjà été acceptée et convertie en commande, ne pas faire de doublon
        const alreadyConverted = list.some(o => o.id.includes(cr.id.replace(/^req_/, '')) || o.id === cr.id);
        if (alreadyConverted) return null;

        return {
          id: cr.id,
          clientRef: cr.clientRef,
          artisanRef: quotes[0]?.artisanRef || cr.artisanRef,
          artisanName: quotes[0]?.artisanName || (cr.artisanRef === "artisan-open" ? "Marché Public (En attente)" : "Maâlem Assigné"),
          totalPrice: quotes[0]?.proposedPrice || Number(cr.totalPrice) || 0,
          productType: cr.productType || "sur_commande",
          productTitle: title,
          productImage: cr.proofImage || tags.anchorProduct?.imageUrl || "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
          transportProvider: cr.transportProvider || "vendeur",
          status: hasQuotes ? "devis_recu" : (cr.status || "en_attente_artisan"),
          quotes: quotes,
          customizationTags: tags,
          isCustomRequest: true,
          createdAt: cr.createdAt,
          updatedAt: cr.updatedAt,
        };
      })
      .filter(Boolean);

    const combined = [...pendingCustoms, ...list];
    console.log(`[VORK-API] ✅ Found ${list.length} orders + ${pendingCustoms.length} active custom requests (Total: ${combined.length})`);
    return res.json(combined);
  } catch (err) {
    console.warn("[VORK-API] ⚠️ Error in /orders:", err.message);
    const fallbackList = await db.select().from(orders).where(eq(orders.clientRef, clientRef));
    return res.json(fallbackList);
  }
});

/**
 * [CLIENT API] Accepter un devis d'artisan pour une création sur-mesure de l'Atelier.
 * Transforme le projet en commande ferme dans 'orders' et notifie l'artisan.
 */
/**
 * [CLIENT API] Accepter un devis d'artisan pour une création sur-mesure (Décision 38).
 * Le client choisit UNE SEULE offre à la fois et la paie (in-app séquestre).
 * Possibilité d'utiliser le solde portefeuille (wallet) pour payer le delta.
 * La commande reste en attente de validation par l'artisan (acceptedAt = null)
 * afin de permettre au client d'annuler son choix tant que l'artisan n'a pas validé.
 */
router.post("/custom-requests/:id/accept-quote", async (req, res) => {
  const { id } = req.params;
  const { quoteIndex = 0, artisanRef, useWallet = true } = req.body;
  console.log(`\n[VORK-API] 📥 POST /custom-requests/${id}/accept-quote - QuoteIndex: ${quoteIndex}, ArtisanRef: ${artisanRef}`);

  try {
    const [request] = await db.select().from(customRequests).where(eq(customRequests.id, id));
    if (!request) {
      return res.status(404).json({ success: false, error: "Demande sur-mesure introuvable." });
    }

    let tags = {};
    try {
      tags = typeof request.customizationTags === "string" ? JSON.parse(request.customizationTags) : (request.customizationTags || {});
    } catch (e) {}

    // Vérifier si une offre est déjà active (Décision 38 : une seule offre à la fois)
    if (tags.chosenQuote && tags.chosenQuote.orderId) {
      const [existingOrder] = await db.select().from(orders).where(eq(orders.id, tags.chosenQuote.orderId));
      if (existingOrder && (existingOrder.acceptedAt || existingOrder.status === "en_preparation")) {
        return res.status(409).json({
          success: false,
          error: "L'artisan sélectionné a déjà commencé la fabrication. Vous ne pouvez plus changer d'offre.",
          error_ar: "بدأ الحرفي المختار في التصنيع بالفعل. لا يمكنك تغيير العرض الآن."
        });
      }
      if (existingOrder && existingOrder.status === "acompte_verse") {
        return res.status(409).json({
          success: false,
          error: "Vous avez déjà une offre sélectionnée. Veuillez d'abord annuler votre choix précédent pour en choisir une autre.",
          error_ar: "لديك بالفعل عرض محدد. يرجى إلغاء اختيارك السابق أولاً لاختيار عرض آخر."
        });
      }
    }

    const quotes = Array.isArray(tags.quotes) ? tags.quotes : [];
    if (quotes.length === 0) {
      return res.status(400).json({ success: false, error: "Aucun devis disponible pour cette demande." });
    }

    const targetQuote = artisanRef 
      ? quotes.find(q => q.artisanRef === artisanRef) || quotes[quoteIndex] || quotes[0]
      : (quotes[quoteIndex] || quotes[0]);

    const quotePrice = Number(targetQuote.proposedPrice);
    const clientRef = req.userId || request.clientRef || "client-me";
    const now = new Date().toISOString();
    const orderId = `ord_${request.id.replace(/^req_/, '')}_${Date.now().toString(36).slice(-4)}`;
    const title = tags.summary ? tags.summary.split("\n")[0].replace(/^[•\s*]+/, "") : (tags.title || "Création sur-mesure");

    // Gestion du paiement et du delta via Wallet (Décision 38)
    const wallet = await getOrCreateClientWallet(clientRef);
    const currentBalance = Number(wallet.balance || 0);
    const paidFromWallet = (useWallet && currentBalance > 0) ? Math.min(currentBalance, quotePrice) : 0;
    const deltaCardAmount = Math.max(0, Math.round((quotePrice - paidFromWallet) * 100) / 100);

    if (paidFromWallet > 0) {
      await debitClientWallet(clientRef, paidFromWallet, orderId, "custom_quote_payment", {
        customRequestId: id,
        artisanRef: targetQuote.artisanRef,
      });
    }

    // Création de la commande liée (acceptedAt = null tant que l'artisan n'a pas confirmé)
    const newOrder = {
      id: orderId,
      clientRef,
      artisanRef: targetQuote.artisanRef,
      artisanName: targetQuote.artisanName || "Maâlem",
      totalPrice: quotePrice,
      productType: request.productType || "sur_commande",
      productTitle: title,
      productImage: request.proofImage || tags.anchorProduct?.imageUrl || null,
      transportProvider: "vendeur",
      status: "acompte_verse",
      acceptedAt: null, // Décision 38 : En attente d'acceptation artisan, permet au client d'annuler son choix
      estimatedTransportDays: Number(targetQuote.confectionDays) || 14,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(orders).values(newOrder);

    // Mettre à jour la custom_request avec l'offre choisie
    tags.chosenQuote = {
      orderId,
      artisanRef: targetQuote.artisanRef,
      artisanName: targetQuote.artisanName || "Maâlem",
      proposedPrice: quotePrice,
      paidFromWallet,
      deltaCardAmount,
      chosenAt: now,
    };

    await db.update(customRequests)
      .set({
        status: "offre_choisie",
        artisanRef: targetQuote.artisanRef,
        totalPrice: quotePrice,
        customizationTags: JSON.stringify(tags),
        updatedAt: now,
      })
      .where(eq(customRequests.id, id));

    console.log(`[VORK-API] ✅ Quote accepted! Order ${orderId} placed (Wallet: ${paidFromWallet} MAD, Delta: ${deltaCardAmount} MAD)`);

    return res.json({
      success: true,
      message: `Offre de ${targetQuote.artisanName} (${quotePrice} MAD) sélectionnée ! La demande reste modifiable tant que l'artisan n'a pas commencé.`,
      message_ar: `تم اختيار عرض ${targetQuote.artisanName} (${quotePrice} درهم)! يمكنك إلغاء اختيارك طالما لم يبدأ الحرفي العمل.`,
      orderId,
      order: newOrder,
      financials: {
        totalPrice: quotePrice,
        paidFromWallet,
        deltaCardAmount,
      },
    });
  } catch (err) {
    console.error("[VORK-API] ❌ Error accepting quote:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * [CLIENT API] Annuler le choix d'une offre avant validation par l'artisan (Décision 38).
 * Le client est immédiatement remboursé dans son Wallet interne Vork.
 * La demande sur-mesure est rouverte sur la place de marché des artisans.
 */
router.post("/custom-requests/:id/cancel-quote-selection", async (req, res) => {
  const { id } = req.params;
  const clientRef = req.userId || "client-me";
  console.log(`\n[VORK-API] 📥 POST /custom-requests/${id}/cancel-quote-selection`);

  try {
    const [request] = await db.select().from(customRequests).where(eq(customRequests.id, id));
    if (!request) {
      return res.status(404).json({ success: false, error: "Demande sur-mesure introuvable." });
    }

    let tags = {};
    try {
      tags = typeof request.customizationTags === "string" ? JSON.parse(request.customizationTags) : (request.customizationTags || {});
    } catch (e) {}

    const chosen = tags.chosenQuote;
    if (!chosen || !chosen.orderId) {
      return res.status(400).json({ success: false, error: "Aucun choix d'offre actif à annuler." });
    }

    // Vérifier l'état de la commande chez l'artisan
    const [order] = await db.select().from(orders).where(eq(orders.id, chosen.orderId));
    if (order && (order.acceptedAt || order.status === "en_preparation")) {
      return res.status(409).json({
        success: false,
        error: "L'artisan a déjà validé votre commande et commencé la fabrication. Annulation impossible.",
        error_ar: "قام الحرفي بالمصادقة على طلبك وبدأ العمل. لا يمكن الإلغاء الآن."
      });
    }

    const now = new Date().toISOString();
    const refundAmount = Number(order ? order.totalPrice : chosen.proposedPrice);

    // 1. Annulation de la commande liée
    if (order) {
      await db.update(orders)
        .set({
          status: "annule_avant_acceptation",
          updatedAt: now,
        })
        .where(eq(orders.id, chosen.orderId));
    }

    // 2. Remboursement automatique 100% au Wallet Client (Décision 28 & 38)
    const refundRes = await creditClientWallet(
      clientRef,
      refundAmount,
      chosen.orderId,
      "refund_quote_canceled",
      { customRequestId: id, reason: "annulation_choix_offre" }
    );

    // 3. Réouverture de la demande sur le marché des artisans
    tags.previousChoices = tags.previousChoices || [];
    tags.previousChoices.push({ ...chosen, canceledAt: now });
    delete tags.chosenQuote;

    await db.update(customRequests)
      .set({
        status: "en_attente_artisan", // Reste affichée pour que les artisans continuent à proposer/ajuster (Décision 38)
        artisanRef: "artisan-open",
        customizationTags: JSON.stringify(tags),
        updatedAt: now,
      })
      .where(eq(customRequests.id, id));

    console.log(`[VORK-API] ✅ Quote choice canceled! ${refundAmount} MAD refunded to wallet for ${clientRef}`);

    return res.json({
      success: true,
      message: "Choix d'offre annulé avec succès. Les fonds ont été restitués dans votre portefeuille Vork. Vous pouvez choisir un autre devis.",
      message_ar: "تم إلغاء اختيار العرض بنجاح وإرجاع المبلغ لمحفظتك في ڤورك. يمكنك الآن اختيار عرض آخر.",
      refundedAmount: refundAmount,
      walletBalance: refundRes.balance,
      customRequestStatus: "en_attente_artisan",
    });
  } catch (err) {
    console.error("[VORK-API] ❌ Error canceling quote choice:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * [CLIENT API] Récupérer toutes les demandes sur-mesure du client.
 */
router.get("/custom-requests", async (req, res) => {
  const clientRef = req.userId || (req.query.clientRef ? String(req.query.clientRef) : "client-me");
  try {
    const list = await db.select().from(customRequests)
      .where(or(eq(customRequests.clientRef, clientRef), eq(customRequests.clientRef, "client-me")))
      .orderBy(desc(customRequests.createdAt));
    return res.json({ success: true, count: list.length, customRequests: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * [CLIENT API] Créer une nouvelle commande.
 */
router.post("/orders", async (req, res) => {
  console.log(`\n[VORK-API] 📥 POST /orders - Payload:`, req.body);
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error(`[VORK-API] ❌ Validation error:`, parsed.error.format());
    return res.status(422).json({ error: parsed.error.flatten() });
  }

  // ─── Vérification de la disponibilité du post / stock (Décision 7 & 36) ─────
  if (parsed.data.productId) {
    const stockInfo = await getProductStockInfo(parsed.data.productId);
    if (stockInfo) {
      // Décision 7 : Si post désactivé / masqué
      if (stockInfo.isHidden) {
        console.warn(`[VORK-API] ⚠️ Commande rejetée : Produit ${parsed.data.productId} masqué par le vendeur (Décision 7).`);
        return res.status(400).json({
          success: false,
          error: "Le vendeur a déclaré son refus de toute commande de ce produit pour le moment.",
          error_ar: "أعلن البائع رفضه لأي طلبية لهذا المنتج في الوقت الحالي.",
          code: "PRODUCT_HIDDEN_BY_SELLER"
        });
      }
      // Décision 36 : Si hors-stock et dépassement non autorisé par le vendeur
      const orderQty = parsed.data.quantity || 1;
      const allowExceed = stockInfo.stockPolicy?.allowOrderExceedingStock ?? stockInfo.stockPolicy?.allow_order_exceeding_stock ?? true;
      if (stockInfo.isOutOfStock && !allowExceed) {
        console.warn(`[VORK-API] ⚠️ Commande rejetée : Produit ${parsed.data.productId} hors stock (Décision 36).`);
        return res.status(400).json({
          success: false,
          error: "Le produit est actuellement hors stock et le vendeur ne prend pas de commande sur ce produit pour le moment.",
          error_ar: "المنتج غير متوفر حالياً في المخزون ولا يستقبل البائع طلبات لهذا المنتج في الوقت الحالي.",
          code: "PRODUCT_OUT_OF_STOCK"
        });
      }
    }
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const productType = parsed.data.productType ?? "standard";
  // Si Produit Personnalisé ou Sur Commande -> transport exclusivement Vendeur (Art. 8, 9, 10)
  const transportProvider = productType === "standard" ? (parsed.data.transportProvider ?? "sendit") : "vendeur";

  await db.insert(orders)
    .values({
      id,
      clientRef: req.userId || parsed.data.clientRef,
      artisanRef: parsed.data.artisanRef ?? "artisan-1",
      artisanName: parsed.data.artisanName || "Maâlem Abdelkader",
      totalPrice: parsed.data.totalPrice,
      productType,
      productTitle: parsed.data.productTitle || "Création Artisanale",
      productImage: parsed.data.productImage || null,
      productId: parsed.data.productId || null,
      quantity: String(parsed.data.quantity || 1),
      transportProvider,
      clientSignature: parsed.data.clientSignature || null,
      status: "en_attente_paiement",
      createdAt: now,
      updatedAt: now,
    });

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  console.log(`[VORK-API] ✅ Order created successfully (ID: ${id}, Type: ${productType}, Transport: ${transportProvider})`);
  res.json(order);
});

/**
 * [CLIENT API] Initier le paiement (CMI / Acompte 50%).
 */
router.post("/orders/:id/pay", async (req, res) => {
  console.log(`\n[VORK-API] 📥 POST /orders/${req.params.id}/pay - Initiating payment`);
  let [order] = await db.select().from(orders).where(eq(orders.id, req.params.id));
  if (!order) {
    console.warn(`[VORK-API] ⚠️ Order not found: ${req.params.id}. Auto-creating for demo testing.`);
    const now = new Date().toISOString();
    await db.insert(orders)
      .values({
        id: req.params.id,
        clientRef: "767f1271-a560-491c-8225-91bcb06e8930",
        artisanRef: "artisan-1",
        totalPrice: 1500,
        productType: "standard",
        status: "en_attente_paiement",
        createdAt: now,
        updatedAt: now,
      });
    const [newOrder] = await db.select().from(orders).where(eq(orders.id, req.params.id));
    order = newOrder;
  }

  const choice = req.body?.choice || "deposit"; // "deposit" or "total"
  let montant = Number(order.totalPrice);
  let tranche = "total_100";

  if (Number(order.totalPrice) >= 1000 && choice === "deposit") {
    montant = Math.round(Number(order.totalPrice) * 0.5 * 100) / 100;
    tranche = "acompte_50";
  }
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const intentId = crypto.randomUUID();

  await db.insert(paymentIntents)
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
    });

  await db.update(orders)
    .set({ status: "paiement_initie", updatedAt: now })
    .where(eq(orders.id, order.id));

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
router.post("/orders/:id/cancel", async (req, res) => {
  console.log(`\n[VORK-API] 📥 POST /orders/${req.params.id}/cancel - Requesting cancellation`);
  try {
    const cancelTime = req.body?.cancelTime ? String(req.body.cancelTime) : undefined;
    const result = await cancelOrder(db, req.params.id, cancelTime);
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
router.post("/orders/:id/deliver", async (req, res) => {
  console.log(`\n[VORK-API] 📥 POST /orders/${req.params.id}/deliver - Confirming receipt`);
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, req.params.id));
    if (!order) return res.status(404).json({ error: "Commande introuvable" });

    const now = new Date().toISOString();

    // Libération immédiate des fonds dans le wallet du vendeur (Décision 1 & 30)
    await db.update(orders)
      .set({
        status: "valide",
        deliveredAt: order.deliveredAt || now,
        receptionValidatedBy: "client",
        clientApprovalStatus: "approved",
        escrowReleasedAt: now,
        escrowActionChoice: "released_to_wallet",
        updatedAt: now,
      })
      .where(eq(orders.id, req.params.id));

    console.log(`[VORK-API] ✅ Order confirmed & escrow released by client (ID: ${order.id})`);
    res.json({ 
      success: true, 
      status: "valide",
      clientApprovalStatus: "approved", 
      escrowReleasedAt: now,
      message: "Réception confirmée et fonds débloqués à l'artisan."
    });
  } catch (e) {
    console.error(`[VORK-API] ❌ Receipt confirmation failed:`, e.message);
    res.status(400).json({ error: e.message });
  }
});

/**
 * [CLIENT API] Demande de retour (Rétractation 7j).
 */
router.post("/orders/:id/return", async (req, res) => {
  console.log(`\n[VORK-API] 📥 POST /orders/${req.params.id}/return - Requesting return`);
  const parsed = returnSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error(`[VORK-API] ❌ Return validation error:`, parsed.error.format());
    return res.status(422).json({ error: parsed.error.flatten() });
  }

  try {
    const returnId = await requestReturn(
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
router.get("/wallet/:userId/balance", async (req, res) => {
  const userId = req.params.userId;
  console.log(`\n[VORK-API] 📥 GET /wallet/${userId}/balance - Fetching balance`);
  const compteClient = `wallet[${userId}]`;

  const [creditsResult] = await db
    .select({ total: sql`COALESCE(SUM(montant), 0)` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.compteCredit, compteClient));

  const [debitsResult] = await db
    .select({ total: sql`COALESCE(SUM(montant), 0)` })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.compteDebit, compteClient));

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
router.post("/wallet/:userId/withdraw", async (req, res) => {
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
    await db.transaction(async (tx) => {
      await tx.insert(withdrawalRequests)
        .values({
          id: withdrawalId,
          userId,
          amount: parsed.data.amount,
          rib: parsed.data.rib,
          status: "pending",
          createdAt: now,
        });

      await tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId: null,
          compteDebit: `wallet[${userId}]`,
          compteCredit: "pending_withdrawals",
          montant: parsed.data.amount,
          type: "retrait_demande_rib",
          metadata: JSON.stringify({ rib: parsed.data.rib }),
          createdAt: now,
        });
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
router.post("/orders/:id/extend-deadline", async (req, res) => {
  const { id } = req.params;
  const { hours } = req.body;
  console.log(`\n[VORK-API] 📥 POST /orders/${id}/extend-deadline - Hours: ${hours}`);

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  const validHours = [24, 48, 72];
  if (!validHours.includes(Number(hours))) {
    return res.status(400).json({ error: "Choix de prolongation invalide (24h, 48h ou 72h)." });
  }

  const now = new Date().toISOString();
  await db.update(orders)
    .set({
      updatedAt: now,
    })
    .where(eq(orders.id, id));

  console.log(`[VORK-API] ✅ Seller deadline extended by ${hours}h for order ${id}`);
  res.json({ success: true, extendedHours: Number(hours) });
});

/**
 * [CLIENT API] Déclaration de non-réception du colis (Art. 13.3).
 */
router.post("/orders/:id/claim-non-reception", async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  console.log(`\n[VORK-API] 📥 POST /orders/${id}/claim-non-reception - Reason: ${reason}`);

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  const now = new Date().toISOString();
  const disputeId = `dispute-${Date.now()}`;

  await db.update(orders)
    .set({
      status: "en_reclamation",
      nonReceptionClaimedAt: now,
      nonReceptionReason: reason || "Colis non reçu par le client (Contestation de livraison)",
      updatedAt: now,
    })
    .where(eq(orders.id, id));

  try {
    await db.insert(disputes).values({
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
    });
  } catch (err) {
    console.error(`[VORK-API] ⚠️ Error creating dispute record:`, err.message);
  }

  console.log(`[VORK-API] ⚠️ Non-reception dispute opened for order ${id} (DisputeID: ${disputeId})`);
  res.json({ success: true, disputeId, status: "en_reclamation" });
});

/**
 * [CLIENT API] Signaler un défaut / Vice caché / Non-conformité (Art. 12.5 & 16.9).
 */
router.post("/orders/:id/dispute", async (req, res) => {
  const { id } = req.params;
  const { type = "vice_cache_3mois", reason, clientEvidencePhotos = [] } = req.body;
  console.log(`\n[VORK-API] 📥 POST /orders/${id}/dispute - Type: ${type}, Reason: ${reason}`);

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  const now = new Date().toISOString();
  const disputeId = `dispute-${Date.now()}`;

  await db.update(orders)
    .set({
      status: "en_reclamation",
      updatedAt: now,
    })
    .where(eq(orders.id, id));

  try {
    await db.insert(disputes).values({
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
    });
  } catch (err) {
    console.error(`[VORK-API] ⚠️ Error creating dispute record:`, err.message);
  }

  console.log(`[VORK-API] ⚠️ Defect dispute opened for order ${id} (DisputeID: ${disputeId})`);
  res.json({ success: true, disputeId, status: "en_reclamation" });
});

/**
 * [CLIENT API] Annuler une demande de retour (Art 9.5 bis).
 */
router.post("/orders/:id/cancel-return", async (req, res) => {
  const { id } = req.params;
  console.log(`\n[VORK-API] 📥 POST /orders/${id}/cancel-return`);

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  if (order.status !== "retour_initie") {
    return res.status(400).json({ error: "Impossible d'annuler le retour : le colis est déjà en cours de transport." });
  }

  const now = new Date().toISOString();
  await db.update(orders)
    .set({
      status: "livre",
      updatedAt: now,
    })
    .where(eq(orders.id, id));

  console.log(`[VORK-API] ✅ Return request canceled for order ${id}`);
  res.json({ success: true, orderId: id });
});

/**
 * [CLIENT API] Validation manuelle de la réception par le client (Décision 1 & C02).
 * Le client confirme avoir reçu et inspecté son colis.
 * Libération immédiate des fonds du séquestre vers le solde disponible de l'artisan (C02).
 */
router.post("/orders/:id/validate-delivery", async (req, res) => {
  const { id } = req.params;
  console.log(`\n[VORK-API] 📥 POST /orders/${id}/validate-delivery`);

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  if (!["livre", "en_cours_de_transport"].includes(order.status)) {
    return res.status(400).json({ error: "La commande n'est pas dans un état permettant la validation de réception." });
  }

  const now = new Date().toISOString();
  await db.update(orders)
    .set({
      status: "valide",
      clientApprovalStatus: "approved",
      escrowReleasedAt: now,
      escrowActionChoice: "released_to_wallet",
      updatedAt: now,
    })
    .where(eq(orders.id, id));

  console.log(`[VORK-API] ✅ Delivery validated by client for order ${id} -> Funds liberated to artisan wallet! (C02)`);
  res.json({ 
    success: true, 
    orderId: id, 
    status: "valide", 
    escrowReleasedAt: now,
    message: "Réception validée avec succès. Les fonds ont été libérés pour le Maâlem.",
    message_ar: "تمت المصادقة على الاستلام بنجاح. تم تحويل المستحقات للصانع." 
  });
});

/**
 * [CLIENT API] Déclaration de non-réception après délai estimé + 48h de tolérance (C08).
 * Le client ne peut signaler la non-réception qu'une fois la date estimée + 48h écoulée.
 */
router.post("/orders/:id/declare-not-received", async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body || {};
  console.log(`\n[VORK-API] 📥 POST /orders/${id}/declare-not-received`);

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return res.status(404).json({ error: "Commande introuvable" });

  if (!["en_cours_de_transport", "livre"].includes(order.status)) {
    return res.status(400).json({ 
      error: "Déclaration non recevable : la commande doit être en cours d'acheminement ou déclarée livrée." 
    });
  }

  // C08 : Vérifier la tolérance de 48h après la date estimée de livraison
  const shippedDate = order.shippedAt ? new Date(order.shippedAt) : new Date(order.createdAt);
  const estimatedDays = Number(order.estimatedTransportDays || 7);
  const expectedDeliveryTime = shippedDate.getTime() + (estimatedDays * 24 * 60 * 60 * 1000);
  const tolerance48hTime = expectedDeliveryTime + (48 * 60 * 60 * 1000); // Date estimée + 48h
  const nowMs = Date.now();

  if (nowMs < tolerance48hTime) {
    const remainingHours = Math.max(1, Math.ceil((tolerance48hTime - nowMs) / (1000 * 60 * 60)));
    return res.status(400).json({ 
      success: false,
      error: "delai_tolerance_48h_non_atteint",
      message: `Conformément à la charte Vork, le signalement de non-réception est accessible 48 heures après la date estimée de livraison (déblocage dans environ ${remainingHours}h). Merci de patienter ou de contacter directement l'artisan via la messagerie.`,
      message_ar: `وفقاً لميثاق Vork، يُتاح الإبلاغ عن عدم الاستلام بعد 48 ساعة من تاريخ التسليم المتوقع (متبقي حوالي ${remainingHours} ساعة). يرجى التحلي بالصبر أو التواصل مع الصانع مباشرة.`,
      expectedDeliveryDate: new Date(expectedDeliveryTime).toISOString(),
      unlocksAt: new Date(tolerance48hTime).toISOString(),
    });
  }

  const now = new Date().toISOString();
  await db.update(orders)
    .set({
      status: "en_reclamation",
      notReceivedReportedAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, id));

  // Enregistrer l'avertissement vendeur traçable (non bloquant sans décision admin)
  try {
    const { recordVendorWarning } = await import("../services/artisanOrderService.js");
    await recordVendorWarning(
      order.artisanRef, 
      `Signalement non-réception client après dépassement délai + 48h (${reason || 'colis_non_recu'})`, 
      id
    );
  } catch (err) {
    console.warn(`[VORK-API] Warning record non-fatal:`, err.message);
  }

  console.log(`[VORK-API] ⚠️ Non-receipt declared by client for order ${id} post-48h tolerance (C08)`);
  res.json({ 
    success: true, 
    orderId: id, 
    status: "en_reclamation",
    message: "Signalement de non-réception enregistré. L'artisan et l'administration Vork ont été notifiés.",
    message_ar: "تم تسجيل إشعار عدم الاستلام. تم إبلاغ الصانع وإدارة Vork للمتابعة."
  });
});

/**
 * [CLIENT API] Consultation du solde et historique du Wallet Client (Décision 28)
 */
router.get("/wallet/:userId/balance", async (req, res) => {
  const userId = req.params.userId || req.userId || "client-me";
  try {
    const wallet = await getClientWalletDetails(userId);
    return res.json({ success: true, ...wallet });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * [CLIENT API] Demande de virement bancaire du Wallet vers RIB (Décision 28)
 */
router.post("/wallet/:userId/withdraw", async (req, res) => {
  const userId = req.params.userId || req.userId || "client-me";
  const { amount, rib } = req.body;
  try {
    const result = await requestClientWithdrawal(userId, amount, rib);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
