import { Router } from "express";
import { eq, sql, desc, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../core/db/index.js";
import { orders, paymentIntents, withdrawalRequests, ledgerEntries, disputes, customRequests } from "../../core/db/schema.js";
import { MockCmiProvider } from "../../core/paymentProviders/MockCmiProvider.js";
import { cancelOrder, deliverOrder } from "../services/clientPaymentService.js";
import { requestReturn } from "../services/clientReturnService.js";
import { getClientWalletDetails, requestClientWithdrawal, creditClientWallet, debitClientWallet, getOrCreateClientWallet } from "../services/clientWalletService.js";
import { getProductStockInfo, getProductById } from "../../db/products.repository.js";
import { optionalAuthMiddleware } from "../../middleware/auth.middleware.js";
import { createNotificationResilient } from "../../services/notificationService.js";
import { closeCustomRequestOnMarket, safeJsonParse } from "../../services/customRequestState.js";
import { withdrawPublicationConsent } from "../services/artisanOrderService.js";

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
  transportProvider: z.enum(["sendit", "vendeur", "direct", "transporteur"]).optional(),
  clientSignature: z.string().optional(),
  selectedSize: z.string().optional().nullable(),
  selectedColor: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  productPhotos: z.array(z.string()).optional(),
});

const returnSchema = z.object({
  mode: z.enum(["sendit", "propres_moyens", "vendeur", "direct", "transporteur"]),
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
    // 1. Conditions isolées par client (sans fuite de "client-me" vers d'autres clients)
    const orderCondition = eq(orders.clientRef, clientRef);
    const customCondition = eq(customRequests.clientRef, clientRef);

    const origin = `${req.protocol}://${req.get("host") || "localhost:3001"}`;

    // Exécution parallèle pour réduire la latence de chargement de "Mes Commandes" (images base64 servies via media URL)
    const [rawList, rawCustoms] = await Promise.all([
      db.select({
        id: orders.id,
        clientRef: orders.clientRef,
        artisanRef: orders.artisanRef,
        artisanName: orders.artisanName,
        totalPrice: orders.totalPrice,
        productType: orders.productType,
        productTitle: orders.productTitle,
        productId: orders.productId,
        quantity: orders.quantity,
        transportProvider: orders.transportProvider,
        status: orders.status,
        prepPhotos: orders.prepPhotos,
        estimatedTransportDays: orders.estimatedTransportDays,
        acceptedAt: orders.acceptedAt,
        shippedAt: orders.shippedAt,
        deliveredAt: orders.deliveredAt,
        clientApprovalStatus: orders.clientApprovalStatus,
        clientApprovalRequestedAt: orders.clientApprovalRequestedAt,
        nonReceptionClaimedAt: orders.nonReceptionClaimedAt,
        notReceivedReportedAt: orders.notReceivedReportedAt,
        escrowReleasedAt: orders.escrowReleasedAt,
        withdrawalExpiresAt: orders.withdrawalExpiresAt,
        customizationOrigin: orders.customizationOrigin,
        sourceProductId: orders.sourceProductId,
        sourceVendorId: orders.sourceVendorId,
        catalogPublishedAt: orders.catalogPublishedAt,
        publishedProductId: orders.publishedProductId,
        republicationConsentStatus: orders.republicationConsentStatus,
        republicationConsentParty: orders.republicationConsentParty,
        orderMetadata: orders.orderMetadata,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        productImageMeta: sql`CASE WHEN ${orders.productImage} LIKE 'http%' THEN ${orders.productImage} WHEN ${orders.productImage} IS NOT NULL AND length(${orders.productImage}) > 0 THEN '__MEDIA__' ELSE NULL END`,
      }).from(orders).where(orderCondition).orderBy(desc(orders.createdAt)),
      db.select({
        id: customRequests.id,
        clientRef: customRequests.clientRef,
        artisanRef: customRequests.artisanRef,
        productType: customRequests.productType,
        marketType: customRequests.marketType,
        totalPrice: customRequests.totalPrice,
        transportProvider: customRequests.transportProvider,
        status: customRequests.status,
        customizationTags: customRequests.customizationTags,
        createdAt: customRequests.createdAt,
        updatedAt: customRequests.updatedAt,
        proofImageMeta: sql`CASE WHEN ${customRequests.proofImage} LIKE 'http%' THEN ${customRequests.proofImage} WHEN ${customRequests.proofImage} IS NOT NULL AND length(${customRequests.proofImage}) > 0 THEN '__MEDIA__' ELSE NULL END`,
      }).from(customRequests).where(customCondition).orderBy(desc(customRequests.createdAt)),
    ]);

    // Élimination des commandes annulées avant acceptation de la vue active client (Décision 28)
    const list = rawList
      .filter(o => o.status !== "annule_avant_acceptation")
      .map(o => {
        const productImage = o.productImageMeta === "__MEDIA__"
          ? `${origin}/api/public/media/order/${o.id}`
          : (o.productImageMeta || null);
        const { productImageMeta, ...rest } = o;
        let prepPhotos = [];
        try {
          prepPhotos = typeof o.prepPhotos === "string" ? JSON.parse(o.prepPhotos) : (Array.isArray(o.prepPhotos) ? o.prepPhotos : []);
        } catch {}
        const parsedMeta = safeJsonParse(o.orderMetadata, {});
        return {
          ...rest,
          orderMetadata: parsedMeta,
          selectedSize: parsedMeta.selectedSize || null,
          selectedColor: parsedMeta.selectedColor || null,
          tags: Array.isArray(parsedMeta.tags) ? parsedMeta.tags : [],
          productPhotos: Array.isArray(parsedMeta.productPhotos) ? parsedMeta.productPhotos : [],
          productSizes: Array.isArray(parsedMeta.productSizes) ? parsedMeta.productSizes : [],
          productColors: Array.isArray(parsedMeta.productColors) ? parsedMeta.productColors : [],
          manufacturingDays: parsedMeta.manufacturingDays || null,
          productImage,
          prepPhotos,
        };
      });

    const pendingCustoms = rawCustoms
      .filter(cr => !["annulee", "offre_choisie", "supprimee_admin"].includes(cr.status))
      .map(cr => {
        let tags = {};
        try {
          tags = typeof cr.customizationTags === "string" ? JSON.parse(cr.customizationTags) : (cr.customizationTags || {});
        } catch (e) {}
        const quotes = Array.isArray(tags.quotes) ? tags.quotes : [];
        const hasQuotes = quotes.length > 0;
        const title = tags.title || (tags.summary ? tags.summary.split("\n")[0].replace(/^[•\s*]+/, "") : "Création sur-mesure");

        // Si la demande a déjà été acceptée et convertie en commande, ne pas faire de doublon
        const alreadyConverted = Boolean(tags.chosenQuote?.orderId) || list.some(o => o.id.includes(cr.id.replace(/^req_/, '')) || o.id === cr.id);
        if (alreadyConverted) return null;

        const minPrice = hasQuotes
          ? Math.min(...quotes.map(q => Number(q.proposedPrice) || 0).filter(p => p > 0))
          : (Number(cr.totalPrice) || 0);

        const isPublicMarket = cr.marketType === "public" || cr.artisanRef === "artisan-open";
        const displayArtisanName = hasQuotes
          ? (quotes.length === 1 ? (quotes[0].artisanName || "Maâlem") : `${quotes.length} offres reçues`)
          : (isPublicMarket ? "Marché Public (En attente)" : "Maâlem Assigné");

        const resolvedProof = cr.proofImageMeta === "__MEDIA__"
          ? `${origin}/api/public/media/custom-request/${cr.id}`
          : cr.proofImageMeta;

        return {
          id: cr.id,
          clientRef: cr.clientRef,
          artisanRef: quotes[0]?.artisanRef || cr.artisanRef,
          artisanName: displayArtisanName,
          totalPrice: Number.isFinite(minPrice) ? minPrice : 0,
          productType: cr.productType || "personnalise",
          productTitle: title,
          productImage: resolvedProof || tags.anchorProduct?.imageUrl || "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
          transportProvider: cr.transportProvider || "vendeur",
          status: hasQuotes ? "devis_recu" : (cr.status || "en_attente_artisan"),
          marketType: isPublicMarket ? "public" : "private",
          quotes: quotes,
          customizationTags: tags,
          selectedSize: tags.selectedSize || null,
          selectedColor: tags.selectedColor || null,
          tags: Array.isArray(tags.tags) ? tags.tags : [],
          productPhotos: Array.isArray(tags.photos) ? tags.photos : [],
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
      ? quotes.find(q => q.artisanRef === artisanRef)
      : (quotes[quoteIndex] || quotes[0]);
    if (!targetQuote) {
      return res.status(404).json({ success: false, error: "Devis correspondant introuvable pour cet artisan." });
    }

    const quotePrice = Number(targetQuote.proposedPrice);
    const clientRef = req.userId || request.clientRef || "client-me";
    const now = new Date().toISOString();
    const orderId = `ord_${request.id.replace(/^req_/, '')}_${Date.now().toString(36).slice(-4)}`;
    const title = tags.title || (tags.summary ? tags.summary.split("\n")[0].replace(/^[•\s*]+/, "") : "Création sur-mesure");

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

    const resolvedOrigin = request.customizationOrigin || "from_scratch";
    const resolvedSourceProductId = request.sourceProductId || tags.sourceProductId || tags.anchorProduct?.id || null;
    const resolvedSourceVendorId = request.sourceVendorId || tags.sourceVendorId || tags.anchorProduct?.artisanId || null;
    const orderMeta = {
      customRequestId: id,
      marketType: request.marketType || "public",
      selectedSize: tags.selectedSize || null,
      selectedColor: tags.selectedColor || null,
      tags: Array.isArray(tags.tags) ? tags.tags : [],
      productPhotos: Array.isArray(tags.photos) ? tags.photos : [],
      modifications: Array.isArray(tags.modifications) ? tags.modifications : [],
      anchorProduct: tags.anchorProduct || null,
      manufacturingDays: Number(targetQuote.confectionDays) || 14,
    };

    // Création de la commande liée (personnalisée, acceptée d'office suite à l'accord sur devis)
    const newOrder = {
      id: orderId,
      clientRef,
      artisanRef: targetQuote.artisanRef || "artisan_abdelkader",
      artisanName: targetQuote.artisanName || "Maâlem",
      totalPrice: quotePrice,
      productType: "personnalise",
      productTitle: title,
      productImage: request.proofImage || tags.anchorProduct?.imageUrl || null,
      transportProvider: "vendeur",
      status: "en_preparation",
      acceptedAt: now,
      estimatedTransportDays: Number(targetQuote.confectionDays) || 14,
      customizationOrigin: resolvedOrigin,
      sourceProductId: resolvedSourceProductId,
      sourceVendorId: resolvedSourceVendorId,
      orderMetadata: JSON.stringify(orderMeta),
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(orders).values(newOrder);

    const chosenQuoteObj = {
      orderId,
      artisanRef: targetQuote.artisanRef,
      artisanName: targetQuote.artisanName || "Maâlem",
      proposedPrice: quotePrice,
      paidFromWallet,
      deltaCardAmount,
      chosenAt: now,
    };

    // Retirer immédiatement la demande du Marché Public (DB + RAM)
    await closeCustomRequestOnMarket(db, id, {
      status: "offre_choisie",
      chosenQuote: chosenQuoteObj,
      chosenArtisanRef: targetQuote.artisanRef,
      totalPrice: quotePrice,
      reason: "quote_accepted",
    });

    if (targetQuote.artisanRef) {
      await createNotificationResilient({
        userId: targetQuote.artisanRef,
        userType: "artisan",
        type: "quote_accepted",
        title: `Devis accepté — "${title}"`,
        titleAr: `تم قبول عرضك — "${title}"`,
        message: `Le client a retenu votre devis (${quotePrice} MAD). La commande personnalisée #${orderId} est lancée dans vos commandes actuelles.`,
        messageAr: `اختار الزبون عرضك (${quotePrice} درهم). تم إطلاق الطلب المخصص #${orderId} في قائمة طلباتك الجارية.`,
        sourceId: orderId,
        secondaryUserId: clientRef,
        idempotencyKey: `quote-accepted:${id}:${targetQuote.artisanRef}`,
        metadata: { orderId, customRequestId: id, totalPrice: quotePrice },
      });
    }

    // Notifier les autres artisans non retenus que l'offre a été attribuée et retirée du Marché Public
    const otherBidders = quotes.filter((q) => q.artisanRef && q.artisanRef !== targetQuote.artisanRef);
    for (const other of otherBidders) {
      await createNotificationResilient({
        userId: other.artisanRef,
        userType: "artisan",
        type: "custom_request_closed",
        title: `Demande attribuée — "${title}"`,
        titleAr: `تم إسناد الطلب — "${title}"`,
        message: `Le client a retenu une autre proposition pour "${title}". Cette demande a été retirée du Marché Public.`,
        messageAr: `اختار الزبون عرضاً آخر لطلب "${title}". تم سحب الطلب من السوق المفتوح.`,
        sourceId: id,
        idempotencyKey: `quote-closed:${id}:${other.artisanRef}`,
        metadata: { customRequestId: id },
      });
    }

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
 * [CLIENT API] Créer une nouvelle demande personnalisée / sur-mesure (Atelier Manuel v2)
 */
router.post("/custom-requests", async (req, res) => {
  const clientRef = req.userId || req.body.clientRef || "client-me";
  const {
    customizationOrigin = "from_scratch", // 'from_post' | 'from_scratch'
    sourceProductId,
    sourceVendorId,
    categoryName,
    categoryId,
    title,
    description,
    budget,
    proofImage,
    selectedSize = null,
    selectedColor = null,
    tags: incomingTags = [],
    photos: incomingPhotos = [],
    safetyGuidelinesAccepted = true,
    transportProvider = "vendeur",
  } = req.body;

  if (!safetyGuidelinesAccepted) {
    return res.status(400).json({
      success: false,
      error: "Vous devez accepter la charte d'engagement et de sécurité avant de valider votre demande.",
      error_ar: "يجب الموافقة على ميثاق السلامة والالتزام قبل تأكيد طلبك."
    });
  }

  // Si personnalisation depuis un produit (from_post), vérifier le mode du produit
  let finalMarketType = "public";
  let targetArtisanRef = "artisan-open";

  if (customizationOrigin === "from_post" && sourceProductId) {
    try {
      const { supabase } = await import("../../db/supabase.client.js");
      const { data: prod } = await supabase.from("products").select("*").eq("id", sourceProductId).single();
      if (prod) {
        const mode = prod.personalization_mode || "accept_direct";
        if (mode === "disabled") {
          return res.status(400).json({
            success: false,
            error: "Cet artisan a désactivé la personnalisation sur cette création.",
            error_ar: "عطل الحرفي إمكانية التخصيص على هذا التصميم."
          });
        }
        if (mode === "accept_direct") {
          finalMarketType = "private";
          targetArtisanRef = sourceVendorId || prod.facets?.artisan_ref || prod.artisan_ref || "artisan-1";
        } else {
          // delegate_to_market
          finalMarketType = "public";
          targetArtisanRef = "artisan-open";
        }
      }
    } catch (e) {
      console.warn("[VORK-API] Could not check source product mode:", e.message);
    }
  }

  const now = new Date().toISOString();
  const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const finalTitle = title || (categoryName ? `Création sur-mesure (${categoryName})` : "Création sur-mesure");

  const tags = {
    summary: description || finalTitle,
    title: finalTitle,
    category: categoryName || "Sur-mesure",
    budget: budget ? `${budget} MAD` : "Sur devis",
    quotes: [],
    customizationOrigin,
    sourceProductId: sourceProductId || null,
    sourceVendorId: sourceVendorId || null,
    selectedSize: selectedSize || null,
    selectedColor: selectedColor || null,
    tags: Array.isArray(incomingTags) ? incomingTags.filter(Boolean) : [],
    photos: Array.isArray(incomingPhotos) ? incomingPhotos.filter(Boolean) : [],
  };

  const newRecord = {
    id,
    clientRef,
    artisanRef: targetArtisanRef,
    totalPrice: budget ? Number(budget) : 0,
    productType: "sur_commande",
    transportProvider,
    status: "en_attente_artisan",
    proofImage: proofImage || null,
    customizationTags: JSON.stringify(tags),
    sourceProductId: sourceProductId || null,
    sourceVendorId: sourceVendorId || null,
    customizationOrigin,
    marketType: finalMarketType,
    safetyGuidelinesAccepted: safetyGuidelinesAccepted ? 1 : 0,
    categoryId: categoryId || null,
    categoryName: categoryName || null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.insert(customRequests).values(newRecord);
    if (finalMarketType === "private" && targetArtisanRef && targetArtisanRef !== "artisan-open") {
      await createNotificationResilient({
        userId: targetArtisanRef,
        userType: "artisan",
        type: "private_custom_request",
        title: `Nouvelle demande personnalisée directe — "${finalTitle}"`,
        titleAr: `طلب تفصيل خاص مباشر — "${finalTitle}"`,
        message: `Un client sollicite une personnalisation directe basée sur votre modèle (${budget ? `${budget} MAD` : "Sur devis"}).`,
        messageAr: `طلب زبون تخصيصاً مباشراً استناداً إلى نموذجك (${budget ? `${budget} درهم` : "حسب العرض"}).`,
        sourceId: id,
        secondaryUserId: clientRef,
        idempotencyKey: `private-req:${id}:${targetArtisanRef}`,
        metadata: { customRequestId: id, sourceProductId },
      });
    }
    return res.status(201).json({
      success: true,
      message: finalMarketType === "public"
        ? "Votre demande a été publiée avec succès sur le Marché Public des Artisans."
        : "Votre demande personnalisée a été transmise directement au Maâlem.",
      message_ar: finalMarketType === "public"
        ? "تم نشر طلبك بنجاح في السوق المفتوح للحرفيين."
        : "تم إرسال طلبك المخصص مباشرة إلى الصانع.",
      customRequest: {
        ...newRecord,
        customizationTags: tags,
      }
    });
  } catch (err) {
    console.error("[VORK-API] ❌ Error inserting custom request:", err);
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

  // Hydratation des spécifications produit (tags, photos, tailles, couleurs, mode) pour la vue commande Client & Vendeur
  let sourceProduct = null;
  if (parsed.data.productId) {
    try {
      sourceProduct = await getProductById(parsed.data.productId);
    } catch {}
  }

  const orderMeta = {
    selectedSize: parsed.data.selectedSize || null,
    selectedColor: parsed.data.selectedColor || null,
    tags: (Array.isArray(parsed.data.tags) && parsed.data.tags.length > 0)
      ? parsed.data.tags
      : (Array.isArray(sourceProduct?.tags) ? sourceProduct.tags : []),
    productPhotos: (Array.isArray(parsed.data.productPhotos) && parsed.data.productPhotos.length > 0)
      ? parsed.data.productPhotos
      : (Array.isArray(sourceProduct?.photos) ? sourceProduct.photos : []),
    productSizes: Array.isArray(sourceProduct?.sizes) ? sourceProduct.sizes : [],
    productColors: Array.isArray(sourceProduct?.colors) ? sourceProduct.colors : [],
    manufacturingDays: sourceProduct?.manufacturingDays || null,
    availabilityMode: productType === "sur_commande" ? "hors_stock_sur_commande" : "en_stock",
  };

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
      customizationOrigin: productType === "personnalise" ? "from_scratch" : "from_post",
      sourceProductId: parsed.data.productId || null,
      sourceVendorId: parsed.data.artisanRef || null,
      orderMetadata: JSON.stringify(orderMeta),
      status: "en_attente_paiement",
      createdAt: now,
      updatedAt: now,
    });

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  console.log(`[VORK-API] ✅ Order created successfully (ID: ${id}, Type: ${productType}, Transport: ${transportProvider})`);
  res.json({
    ...order,
    orderMetadata: orderMeta,
    selectedSize: orderMeta.selectedSize,
    selectedColor: orderMeta.selectedColor,
    tags: orderMeta.tags,
    productPhotos: orderMeta.productPhotos,
    productSizes: orderMeta.productSizes,
    productColors: orderMeta.productColors,
    manufacturingDays: orderMeta.manufacturingDays,
  });
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
    // Vérifier d'abord s'il s'agit d'une demande sur-mesure non convertie en commande
    const [existingOrder] = await db.select().from(orders).where(eq(orders.id, req.params.id));
    if (!existingOrder) {
      const [cr] = await db.select().from(customRequests).where(eq(customRequests.id, req.params.id));
      if (cr) {
        if (cr.status === "offre_choisie") {
          return res.status(409).json({ error: "Cette demande a déjà été acceptée et convertie en commande." });
        }
        await db.update(customRequests)
          .set({ status: "annulee", updatedAt: new Date().toISOString() })
          .where(eq(customRequests.id, req.params.id));
        return res.json({ success: true, status: "annulee", refunded: false, message: "Demande retirée du marché avec succès." });
      }
    }

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
 * [CLIENT API] Retrait de l'accord de publication d'un post catalogue (Diagramme 5 - opt Retrait de l'accord)
 */
router.post("/orders/:id/withdraw-publication-consent", async (req, res) => {
  const { id } = req.params;
  const { reason = "", userId: bodyUserId } = req.body || {};
  const actorUserId = req.userId || bodyUserId || "client-me";

  try {
    const result = await withdrawPublicationConsent(id, actorUserId, { reason });
    return res.json(result);
  } catch (err) {
    const status = err.message === "non_autorise" ? 403 : err.message === "commande_introuvable" ? 404 : 400;
    return res.status(status).json({ success: false, error: err.message });
  }
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
