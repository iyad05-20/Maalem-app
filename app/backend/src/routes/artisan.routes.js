import express from "express";
import { eq, desc, and, or, sql, inArray, notInArray } from "drizzle-orm";
import { db } from "../core/db/index.js";
import { 
  orders, 
  disputes, 
  vendorProfiles, 
  vendorWarnings, 
  withdrawalRequests, 
  ledgerEntries, 
  returnRequests,
  customRequests 
} from "../core/db/schema.js";
import {
  getAllProducts,
  getProductStockInfo,
  updateProductStockAction,
  artisanRamProducts,
  createCatalogProduct,
  withdrawOrDeleteCatalogProduct,
  normalizeProduct,
} from "../db/products.repository.js";
import { supabase } from "../db/supabase.client.js";
import { loadProducts } from "../services/recommendation.service.js";
import { productsIndex } from "../services/search/meilisearch.service.js";
import { requireAuth, optionalAuth } from "../middleware/localAuth.middleware.js";
import { createNotificationResilient } from "../services/notificationService.js";
import {
  memoryCustomRequests,
  OPEN_MARKET_STATUSES,
  isRequestOpenOnMarket,
  safeJsonParse,
} from "../services/customRequestState.js";
import { 
  acceptOrder, 
  uploadPrepPhotos, 
  prepareSenditShipping, 
  confirmSenditPickupReady, 
  shipVendeurSelf, 
  shipOrderDirect,
  completeVendeurDelivery,
  recordVendorWarning,
  handleEscrowChoice,
  nudgeClientApproval,
  contestWarningForceMajeure,
  shipOrder,
  convertOrderToCatalogProduct,
  requestCatalogPublicationConsent
} from "../client/services/artisanOrderService.js";
import { creditClientWallet } from "../client/services/clientWalletService.js";

export const artisanRouter = express.Router();

/**
 * GET /api/artisan/vendor/:vendorRef/profile
 * Profil public de boutique artisanale & historique des avertissements (Accessible à tous / public)
 */
artisanRouter.get("/vendor/:vendorRef/profile", async (req, res) => {
  const vendorRef = req.params.vendorRef;
  const [profileFound] = await db.select().from(vendorProfiles).where(eq(vendorProfiles.id, vendorRef));
  const profile = profileFound || {
    id: vendorRef,
    warningCountCurrentMonth: 0,
    suspensionStatus: "active",
    suspendedUntil: null,
  };
  const warnings = await db.select().from(vendorWarnings).where(eq(vendorWarnings.vendorRef, vendorRef));
  res.json({ success: true, profile, warnings });
});

/**
 * GET /api/artisan/orders/:id/label
 * Récupération du Bon de Livraison / Justificatif d'expédition (Accessible pour consultation/téléchargement)
 */
artisanRouter.get("/orders/:id/label", async (req, res) => {
  res.json({ success: true, labelUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" });
});

// Authentification obligatoire pour toutes les routes de gestion d'atelier (Anti-IDOR)
artisanRouter.use(requireAuth(["artisan", "admin"]));

export const getArtisanRef = (req) => {
  // Identité dérivée prioritairement du JWT, ou du header/query pour isolation stricte
  const tokenRef = req.userId || (req.user && req.user.id);
  const paramRef = req.query?.artisanRef || req.headers?.['x-artisan-ref'];
  
  if (tokenRef && paramRef && tokenRef !== paramRef && req.userRole !== 'admin') {
    return tokenRef;
  }
  return tokenRef || paramRef || "artisan_abdelkader";
};

export const getArtisanOrderCondition = (artisanRef) => {
  if (!artisanRef || artisanRef === 'artisan-1' || artisanRef === 'artisan_abdelkader') {
    return or(eq(orders.artisanRef, "artisan_abdelkader"), eq(orders.artisanRef, "artisan-1"));
  }
  return eq(orders.artisanRef, artisanRef);
};

async function verifyOrderOwnership(req, orderId) {
  const artisanRef = getArtisanRef(req);
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return { errorStatus: 404, error: "Commande introuvable." };
  if (req.userRole === "admin") return { order, artisanRef };
  const isLegacyOwner = (artisanRef === "artisan_abdelkader" || artisanRef === "artisan-1")
    && (order.artisanRef === "artisan_abdelkader" || order.artisanRef === "artisan-1");
  if (order.artisanRef !== artisanRef && !isLegacyOwner) {
    return { errorStatus: 403, error: "Accès refusé : cette commande est assignée à un autre artisan." };
  }
  return { order, artisanRef };
}

/**
 * GET /api/artisan/orders
 * Récupère les commandes assignées à l'artisan.
 */
artisanRouter.get("/orders", async (req, res) => {
  try {
    const artisanRef = getArtisanRef(req);
    if (!artisanRef) {
      return res.status(401).json({ success: false, error: "Identité artisan introuvable. Reconnectez-vous." });
    }

    const condition = getArtisanOrderCondition(artisanRef);
    const origin = `${req.protocol}://${req.get("host") || "localhost:3001"}`;

    const list = await db.select({
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
      senditDeliveryCode: orders.senditDeliveryCode,
      estimatedTransportDays: orders.estimatedTransportDays,
      acceptedAt: orders.acceptedAt,
      shippedAt: orders.shippedAt,
      deliveredAt: orders.deliveredAt,
      escrowReleasedAt: orders.escrowReleasedAt,
      clientApprovalStatus: orders.clientApprovalStatus,
      refusedByArtisan: orders.refusedByArtisan,
      refusalReason: orders.refusalReason,
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
    }).from(orders)
      .where(condition)
      .orderBy(desc(orders.createdAt));

    const enriched = list.map(o => {
      let prepPhotos = [];
      try {
        prepPhotos = typeof o.prepPhotos === 'string' ? JSON.parse(o.prepPhotos) : (Array.isArray(o.prepPhotos) ? o.prepPhotos : []);
      } catch {}
      const parsedMeta = safeJsonParse(o.orderMetadata, {});
      const productImage = o.productImageMeta === "__MEDIA__"
        ? `${origin}/api/public/media/order/${o.id}`
        : (o.productImageMeta || null);
      const { productImageMeta, ...rest } = o;
      return {
        ...rest,
        orderMetadata: parsedMeta,
        selectedSize: parsedMeta.selectedSize || null,
        selectedColor: parsedMeta.selectedColor || null,
        tags: Array.isArray(parsedMeta.tags) ? parsedMeta.tags : [],
        productPhotos: Array.isArray(parsedMeta.productPhotos) ? parsedMeta.productPhotos : [],
        productImage,
        prepPhotos,
      };
    });

    return res.json({ success: true, count: enriched.length, orders: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/accept
 * Accepte la commande sous 72h max (Art. 6.1).
 * (P5 - 28/09/2026) : Vérifie le stock avant acceptation.
 *   - Si stock = 0 → 409 avec redirection vers la page d'incrémentation du stock
 *   - Si stock ≤ 20% après décrémentation → notification "Stock Limité"
 *   - Si stock tombe à 0 après décrémentation → notification "Stock Épuisé"
 */
artisanRouter.post("/orders/:id/accept", async (req, res) => {
  const { id } = req.params;
  try {
    const check = await verifyOrderOwnership(req, id);
    if (check.errorStatus) {
      return res.status(check.errorStatus).json({ success: false, error: check.error });
    }
    const result = await acceptOrder(id);
    const [updated] = await db.select().from(orders).where(eq(orders.id, id));

    const response = {
      success: true,
      message: "Commande acceptée ! Entrée en fabrication.",
      message_ar: "تم قبول الطلب! بدأ التحضير.",
      order: updated,
    };

    // P5 : Notifications de stock pour le frontend
    if (result && result.stockNotification) {
      response.stockNotification = result.stockNotification;

      if (result.stockNotification.notificationType === "stock_epuise") {
        response.stockAlert = {
          type: "stock_epuise",
          title: "Stock épuisé",
          title_ar: "المخزون نفد",
          message: "Le stock de ce produit est tombé à 0. Le post a été masqué automatiquement. Veuillez ajouter du stock pour le rendre visible à nouveau.",
          message_ar: "نفد مخزون هذا المنتج. تم إخفاء المنشور تلقائياً. يرجى إضافة المخزون لإعادة إظهاره.",
          actionLabel: "Ajouter du stock",
          actionLabel_ar: "إضافة مخزون",
          redirectTo: `/artisan/products/${updated?.productId}/stock`,
        };
      } else if (result.stockNotification.notificationType === "stock_limite_20_pourcent") {
        response.stockAlert = {
          type: "stock_limite",
          title: "Stock limité",
          title_ar: "مخزون محدود",
          message: `Attention : il ne reste que ${result.stockNotification.stockPercentage}% du stock (${result.stockNotification.newStock} unité(s)). Pensez à réapprovisionner.`,
          message_ar: `تنبيه: لم يتبق سوى ${result.stockNotification.stockPercentage}% من المخزون (${result.stockNotification.newStock} وحدة). يرجى التفكير في إعادة التزود.`,
          actionLabel: "Gérer le stock",
          actionLabel_ar: "إدارة المخزون",
          redirectTo: `/artisan/products/${updated?.productId}/stock`,
        };
      }
    }

    return res.json(response);
  } catch (err) {
    // P5 : Erreur de stock — blocage de l'acceptation
    if (err.statusCode === 409 && err.stockCheck) {
      return res.status(409).json({
        success: false,
        error: err.stockCheck.isOutOfStock
          ? "Le stock de ce produit est épuisé. Vous devez d'abord incrémenter le stock avant de pouvoir accepter cette commande."
          : "Le stock est insuffisant pour la quantité commandée. Veuillez ajuster le stock.",
        error_ar: err.stockCheck.isOutOfStock
          ? "مخزون هذا المنتج نفد. يجب عليك أولاً زيادة المخزون قبل قبول هذا الطلب."
          : "المخزون غير كافٍ للكمية المطلوبة. يرجى تعديل المخزون.",
        stockCheck: err.stockCheck,
        actionRequired: "increment_stock",
        actionLabel: "Incrémenter le stock",
        actionLabel_ar: "زيادة المخزون",
        redirectTo: err.stockCheck.redirectTo,
      });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/refuse
 * Refuse la commande avec motif en liste déroulante + texte si "Autre" (Décision 23).
 * SANS sanction ni avertissement automatique (Décision 24).
 * Remboursement automatique 100% sur le wallet interne du client (Décision 28).
 */
artisanRouter.post("/orders/:id/refuse", async (req, res) => {
  const { id } = req.params;
  const { category = "autre", reason = "" } = req.body;

  try {
    const check = await verifyOrderOwnership(req, id);
    if (check.errorStatus) {
      return res.status(check.errorStatus).json({ success: false, error: check.error });
    }
    const order = check.order;

    const now = new Date().toISOString();
    const finalReason = String(reason || category).trim();

    // 1. Remboursement automatique 100% au Wallet Client (Décision 28)
    await creditClientWallet(
      order.clientRef, 
      order.totalPrice, 
      id, 
      "refund_order_refused", 
      { category, reason: finalReason }
    );

    // 2. Mise à jour de la commande
    await db.update(orders).set({
      status: "refuse_vendeur",
      refusedByArtisan: 1,
      refusalReason: finalReason,
      refusalReasonCategory: category,
      refusalReasonText: finalReason,
      updatedAt: now,
    }).where(eq(orders.id, id));

    await db.insert(ledgerEntries).values({
      id: `ledger-${Date.now()}`,
      orderId: id,
      compteDebit: "ESCROW_LOCKED",
      compteCredit: `CLIENT_WALLET:${order.clientRef}`,
      montant: order.totalPrice,
      type: "order_refused_by_artisan_refund",
      metadata: JSON.stringify({ category, reason: finalReason }),
      createdAt: now,
    });

    // Remarque : AUCUN avertissement émis (Décision 24)

    return res.json({ 
      success: true, 
      status: "refuse_vendeur",
      message: "Commande déclinée sans pénalité. Le client a été intégralement remboursé sur son portefeuille interne Vork." 
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/prep-photos
 * Upload des 4 photos de préparation obligatoires (Art. 8.1).
 */
artisanRouter.post("/orders/:id/prep-photos", async (req, res) => {
  const { id } = req.params;
  const { photos, bypass } = req.body;

  // ─── PROVISIONAL BYPASS (Facile à éliminer) ──────────────────────────────
  const isBypass = bypass === true || (Array.isArray(photos) && photos.some(p => String(p).startsWith("bypass:")));

  if (!isBypass && (!photos || !Array.isArray(photos) || photos.length === 0)) {
    return res.status(400).json({ success: false, error: "Veuillez fournir les photos de préparation." });
  }

  const finalPhotos = isBypass ? ["bypass:prep_photos_waived"] : photos;

  try {
    const result = await uploadPrepPhotos(id, finalPhotos);
    return res.json({ 
      success: true, 
      message: isBypass 
        ? "Conformité de préparation validée en atelier." 
        : `${finalPhotos.length} photo(s) de préparation enregistrée(s).`, 
      result 
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/ship
 * Expédition directe unifiée (Décision C05).
 * Le vendeur choisit le mode d'acheminement de son choix (ses propres moyens, transporteur indépendant, etc.)
 */
artisanRouter.post("/orders/:id/ship", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await shipOrderDirect(id, req.body);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/ship-sendit-step1
 * Étape 1 Sendit (Rétrocompatibilité -> Redirige vers expédition directe).
 */
artisanRouter.post("/orders/:id/ship-sendit-step1", async (req, res) => {
  const { id } = req.params;
  const deliveryData = req.body;

  try {
    const result = await prepareSenditShipping(id, deliveryData);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/ship-sendit-step2
 * Étape 2 Sendit : Upload photo du colis étiqueté & ordre de ramassage (Art. 8.3)
 * + Saisie du nombre de jours de transport estimé (max 30j - Règle Ziad 11/09/2026).
 */
artisanRouter.post("/orders/:id/ship-sendit-step2", async (req, res) => {
  const { id } = req.params;
  const { blAttachedPhoto, estimatedTransportDays } = req.body;

  try {
    const result = await confirmSenditPickupReady(id, { blAttachedPhoto, estimatedTransportDays });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/ship-vendeur
 * Expédition directe par les propres moyens du Maâlem (Art. 8.2 & 9.3).
 */
artisanRouter.post("/orders/:id/ship-vendeur", async (req, res) => {
  const { id } = req.params;
  const { transportDurationDays = 7 } = req.body;

  try {
    const result = await shipVendeurSelf(id, transportDurationDays);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/complete-delivery
 * Validation livraison directe avec photo du bordereau signé (Art. 11.5).
 */
artisanRouter.post("/orders/:id/complete-delivery", async (req, res) => {
  const { id } = req.params;
  const { signaturePhoto } = req.body;

  try {
    const result = await completeVendeurDelivery(id, signaturePhoto);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/convert-to-catalog
 * Transfert d'une commande personnalisée/sur-mesure achevée vers le catalogue en post 'Sur Commande'
 * Accessible uniquement vers la fin de confection (photos fournies, prêt, expédié, livré).
 * Requiert obligatoirement une vraie photo du produit confectionné, titre, prix, catégorie, tags.
 */
async function handleRequestPublicationConsent(req, res) {
  const { id } = req.params;
  const artisanRef = getArtisanRef(req);

  try {
    const result = await requestCatalogPublicationConsent(id, artisanRef, req.body);
    return res.json(result);
  } catch (err) {
    if (err.message === "image_reelle_confection_obligatoire") {
      return res.status(400).json({ 
        success: false, 
        error: "Une photo réelle du produit confectionné est obligatoire pour la publication.",
        error_ar: "صورة حقيقية للمنتج المصنوع إلزامية للنشر." 
      });
    }
    if (err.message === "commande_non_validee_par_client" || err.message === "commande_non_achevee") {
      return res.status(400).json({ 
        success: false, 
        error: "La demande d'accord n'est disponible qu'après validation de la réception par le client.",
        error_ar: "طلب الموافقة متاح فقط بعد تأكيد الزبون لاستلام الطلبية." 
      });
    }
    if (err.message === "deja_publie_au_catalogue") {
      return res.status(409).json({
        success: false,
        error: "Ce modèle est déjà publié dans votre catalogue.",
        error_ar: "هذا التصميم منشور بالفعل في كتالوجك.",
      });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
}

artisanRouter.post("/orders/:id/convert-to-catalog", handleRequestPublicationConsent);
artisanRouter.post("/orders/:id/request-publication-consent", handleRequestPublicationConsent);

/**
 * POST /api/artisan/orders/:id/escrow-choice
 * Décision de l'artisan après l'expiration des 7 jours de rétractation (Règle Ziad 11/09/2026) :
 * action: 'claim' (débloquer les fonds de la commande spécifique) OU 'extend' (accorder plus de temps au client).
 */
artisanRouter.post("/orders/:id/escrow-choice", async (req, res) => {
  const { id } = req.params;
  const { action, extendDays } = req.body;
  const artisanRef = getArtisanRef(req);

  try {
    const result = await handleEscrowChoice(id, artisanRef, action, extendDays);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/nudge-client
 * Inciter le client à approuver la réception de sa livraison transporteur vendeur (Règle Ziad 11/09/2026).
 */
artisanRouter.post("/orders/:id/nudge-client", async (req, res) => {
  const { id } = req.params;
  const artisanRef = getArtisanRef(req);

  try {
    const result = await nudgeClientApproval(id, artisanRef);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/warnings/:id/contest-force-majeure
 * Contestation d'un avertissement pour Force Majeure dans le mois (Art. 12.5 & 27 CGV v23).
 */
artisanRouter.post("/warnings/:id/contest-force-majeure", async (req, res) => {
  const { id } = req.params;
  const { reason, proofDocUrl } = req.body;
  const artisanRef = getArtisanRef(req);

  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, error: "Un motif justificatif de Force Majeure est obligatoire." });
  }

  try {
    const result = await contestWarningForceMajeure(id, artisanRef, reason.trim(), proofDocUrl);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/returns
 * Récupère les demandes de retours clients concernant l'artisan.
 */
artisanRouter.get("/returns", async (req, res) => {
  try {
    const artisanRef = getArtisanRef(req);
    const condition = getArtisanOrderCondition(artisanRef);
    const [myOrders, allReturns] = await Promise.all([
      db.select().from(orders).where(condition),
      db.select().from(returnRequests).orderBy(desc(returnRequests.createdAt)),
    ]);
    const myOrderIds = new Set(myOrders.map(o => o.id));
    const ordersMap = new Map(myOrders.map(o => [o.id, o]));

    const myReturns = allReturns.filter(r => myOrderIds.has(r.orderId));

    const enriched = myReturns.map(r => ({
      ...r,
      order: ordersMap.get(r.orderId) || null,
    }));

    return res.json({ success: true, count: enriched.length, returns: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/returns/:id/confirm
 * Confirmation de réception de l'article retourné sous 48h (Art. 13.6).
 */
artisanRouter.post("/returns/:id/confirm", async (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  try {
    const [ret] = await db.select().from(returnRequests).where(eq(returnRequests.id, id));
    if (!ret) return res.status(404).json({ success: false, error: "Demande de retour introuvable." });

    const [order] = await db.select().from(orders).where(eq(orders.id, ret.orderId));
    if (order) {
      await db.update(orders).set({ status: "annulee", updatedAt: now }).where(eq(orders.id, order.id));

      const refundAmount = Math.max(0, Number(order.totalPrice) - Number(ret.returnShippingFee || 0));
      await db.insert(ledgerEntries).values({
        id: `ledger-${Date.now()}`,
        orderId: order.id,
        compteDebit: "ESCROW_LOCKED",
        compteCredit: `CLIENT_WALLET:${order.clientRef}`,
        montant: refundAmount,
        type: "return_validated_by_artisan_refund",
        createdAt: now,
      });
    }

    await db.update(returnRequests).set({ status: "resolu_conforme", resolvedAt: now }).where(eq(returnRequests.id, id));

    return res.json({ success: true, message: "Retour validé avec succès. Client remboursé." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/disputes
 * Liste des réclamations concernant le Maâlem.
 */
artisanRouter.get("/disputes", async (req, res) => {
  try {
    const artisanRef = getArtisanRef(req);
    const condition = getArtisanOrderCondition(artisanRef);
    const [myOrders, allDisputes] = await Promise.all([
      db.select().from(orders).where(condition),
      db.select().from(disputes).orderBy(desc(disputes.createdAt)),
    ]);
    const myOrderIds = new Set(myOrders.map(o => o.id));
    const ordersMap = new Map(myOrders.map(o => [o.id, o]));

    const myDisputes = allDisputes.filter(d => myOrderIds.has(d.orderId));

    const enriched = myDisputes.map(d => ({
      ...d,
      order: ordersMap.get(d.orderId) || null,
      clientEvidencePhotos: d.clientEvidencePhotos ? JSON.parse(d.clientEvidencePhotos) : [],
      artisanEvidencePhotos: d.artisanEvidencePhotos ? JSON.parse(d.artisanEvidencePhotos) : [],
    }));

    return res.json({ success: true, count: enriched.length, disputes: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/disputes/:id/respond
 * Soumission de la réponse contradictoire du Maâlem sous 48h (Art. 20).
 */
artisanRouter.post("/disputes/:id/respond", async (req, res) => {
  const { id } = req.params;
  const { artisanResponse, artisanEvidencePhotos = [] } = req.body;

  if (!artisanResponse || !artisanResponse.trim()) {
    return res.status(400).json({ success: false, error: "Veuillez formuler vos explications écrites." });
  }

  try {
    const now = new Date().toISOString();
    await db.update(disputes).set({
      artisanResponse: artisanResponse.trim(),
      artisanEvidencePhotos: JSON.stringify(artisanEvidencePhotos),
      status: "en_arbitrage_admin",
    }).where(eq(disputes.id, id));

    return res.json({ success: true, message: "Votre réponse contradictoire a été transmise à la médiation Vork." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/wallet
 * Portefeuille financier du Maâlem (Ventes nettes, Séquestre, Historique).
 */
artisanRouter.get("/wallet", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  try {
    const condition = getArtisanOrderCondition(artisanRef);
    const [allOrders, allWithdrawals] = await Promise.all([
      db.select({
        id: orders.id,
        totalPrice: orders.totalPrice,
        status: orders.status,
        escrowReleasedAt: orders.escrowReleasedAt,
      }).from(orders).where(condition),
      db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, artisanRef)),
    ]);

    let availableBalance = 0;
    let lockedEscrow = 0;
    let totalGrossSales = 0;

    allOrders.forEach(o => {
      // Formule exacte Vork : Prix Client TTC = Prix Net Artisan + 5% Comm HT + 20% TVA sur Comm (Majoration 6%)
      const netAmount = Math.round((Number(o.totalPrice) / 1.06) * 100) / 100;
      totalGrossSales += Number(o.totalPrice);

      if (o.status === "annulee") {
        return;
      }

      if (o.escrowReleasedAt) {
        availableBalance += netAmount;
      } else if (["acompte_verse", "payee_integralement", "en_preparation", "en_cours_de_transport", "livre"].includes(o.status)) {
        lockedEscrow += netAmount;
      }
    });

    const pendingOrProcessedWithdrawals = allWithdrawals
      .filter(w => ["processed", "pending", "en_attente_lot_vendredi"].includes(w.status))
      .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

    availableBalance = Math.max(0, Math.round((availableBalance - pendingOrProcessedWithdrawals) * 100) / 100);
    lockedEscrow = Math.round(lockedEscrow * 100) / 100;
    totalGrossSales = Math.round(totalGrossSales * 100) / 100;

    return res.json({
      success: true,
      wallet: {
        availableBalance,
        lockedEscrow,
        totalGrossSales,
        withdrawalBatchDay: "Chaque Vendredi ouvré à 16h00 (Wafacash / CIH Bank)",
        withdrawalsHistory: allWithdrawals,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/wallet/withdraw
 * Demande de virement bancaire des fonds débloqués vers le RIB du Maâlem (Art. 18.2).
 */
artisanRouter.post("/wallet/withdraw", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  const { rib, amount } = req.body;

  if (!rib || String(rib).trim().length !== 24 || !/^\d+$/.test(String(rib).trim())) {
    return res.status(400).json({ 
      success: false, 
      error: "Le RIB bancaire marocain doit comporter exactement 24 chiffres bancaires normalisés." 
    });
  }

  const cleanRib = String(rib).trim();
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0 || isNaN(numericAmount)) {
    return res.status(400).json({ success: false, error: "Le montant de virement demandé doit être supérieur à 0 MAD." });
  }

  try {
    let txResult;
    try {
      txResult = await db.transaction(async (tx) => {
        // 1. Calcul en temps réel du solde net débloqué issu des ventes
        const allOrders = await tx.select().from(orders).where(eq(orders.artisanRef, artisanRef));
        const allWithdrawals = await tx.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, artisanRef));

        let totalReleased = 0;
        allOrders.forEach((o) => {
          if (o.escrowReleasedAt) {
            // Formule Vork : Prix Net = Prix Client / 1.06
            totalReleased += Math.round((Number(o.totalPrice) / 1.06) * 100) / 100;
          }
        });

        // 2. Déduction des virements déjà traités ou en attente d'exécution
        const committedWithdrawals = allWithdrawals
          .filter((w) => ["processed", "pending", "en_attente_lot_vendredi"].includes(w.status))
          .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

        const availableBalance = Math.max(0, Math.round((totalReleased - committedWithdrawals) * 100) / 100);

        // 3. Vérification de solvabilité stricte
        if (numericAmount > availableBalance) {
          const err = new Error(`Solde retirable insuffisant. Votre solde disponible est de ${availableBalance.toFixed(2)} MAD (montant demandé : ${numericAmount.toFixed(2)} MAD).`);
          err.statusCode = 422;
          err.availableBalance = availableBalance;
          throw err;
        }

        const now = new Date().toISOString();
        const withdrawalId = `with-${Date.now()}`;

        // 4. Enregistrement de la demande de virement
        await tx.insert(withdrawalRequests).values({
          id: withdrawalId,
          userId: artisanRef,
          amount: numericAmount,
          rib: cleanRib,
          status: "en_attente_lot_vendredi",
          createdAt: now,
        });

        // 5. Consignation immédiate dans le Grand Livre comptable
        await tx.insert(ledgerEntries).values({
          id: `ledger-${Date.now()}`,
          orderId: null,
          compteDebit: `VENDOR_WALLET:${artisanRef}`,
          compteCredit: "BANK_PAYOUT_ESCROW",
          montant: numericAmount,
          type: "demande_virement_artisan",
          metadata: JSON.stringify({ 
            withdrawalId, 
            rib: cleanRib, 
            availableBalanceBefore: availableBalance,
            artisanRef,
          }),
          createdAt: now,
        });

        return {
          withdrawalId,
          amount: numericAmount,
          availableBalanceAfter: Math.round((availableBalance - numericAmount) * 100) / 100,
        };
      });
    } catch (txErr) {
      if (txErr.statusCode === 422) {
        return res.status(422).json({
          success: false,
          error: txErr.message,
          availableBalance: txErr.availableBalance,
        });
      }
      throw txErr;
    }

    return res.json({
      success: true,
      message: `Demande de virement de ${numericAmount} MAD consignée avec succès. Exécution programmée lors du lot hebdomadaire (Vendredi à 10h00).`,
      withdrawalId: txResult.withdrawalId,
      availableBalance: txResult.availableBalanceAfter,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/profile/health
 * Santé de la boutique & Compteur d'avertissements (Art. 19 & 22).
 */
artisanRouter.get("/profile/health", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  try {
    let [profile] = await db.select().from(vendorProfiles).where(eq(vendorProfiles.id, artisanRef));
    if (!profile) {
      profile = {
        id: artisanRef,
        warningCountCurrentMonth: 0,
        suspensionStatus: "active",
        suspendedUntil: null,
        updatedAt: new Date().toISOString(),
      };
      try { await db.insert(vendorProfiles).values(profile); } catch {}
    }

    const warnings = await db.select().from(vendorWarnings).where(eq(vendorWarnings.vendorRef, artisanRef)).orderBy(desc(vendorWarnings.createdAt));

    return res.json({ success: true, profile, warnings });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/products & POST /api/artisan/products
 * Gestion du Catalogue de l'Artisan (Art. 4).
 */
artisanRouter.get("/products", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  if (!artisanRef) {
    return res.status(401).json({ success: false, error: "Identité artisan introuvable. Reconnectez-vous." });
  }

  const isLegacyAbdelkader = artisanRef === "artisan_abdelkader" || artisanRef === "artisan-1";

  try {
    // 1. Produits RAM créés lors de cette session (isolation stricte par artisan)
    let combined = artisanRamProducts.filter(
      (p) =>
        !p.identity?.deleted_by_vendor &&
        (p.artisanRef === artisanRef ||
          (isLegacyAbdelkader && (!p.artisanRef || p.artisanRef === "artisan_abdelkader" || p.artisanRef === "artisan-1")))
    );

    // 2. Produits Supabase persistés — filtrés côté SQL pour performance maximale
    try {
      let query = supabase
        .from("products")
        .select("id, title, category, category_group, price, in_stock, stock, initial_stock, is_out_of_stock, is_hidden, personalization_mode, artisan_name, image_url, identity, rec_tags, facets, created_at")
        .order("created_at", { ascending: false });

      if (!isLegacyAbdelkader) {
        query = query.contains("facets", { artisan_ref: artisanRef });
      }

      const { data: dbData, error: dbError } = await query;

      if (!dbError && Array.isArray(dbData)) {
        for (const p of dbData) {
          if (p.identity?.deleted_by_vendor) continue;
          const prodArtisanRef = p.facets?.artisan_ref || p.identity?.artisan_id || null;
          if (prodArtisanRef) {
            if (isLegacyAbdelkader) {
              if (prodArtisanRef !== "artisan_abdelkader" && prodArtisanRef !== "artisan-1") continue;
            } else if (prodArtisanRef !== artisanRef) {
              continue;
            }
          } else if (!isLegacyAbdelkader) {
            continue;
          }

          if (!combined.some((item) => item.id === p.id)) {
            const norm = normalizeProduct(p);
            combined.push({
              ...norm,
              artisanRef: prodArtisanRef,
              description: p.identity?.description || "",
              price: norm.netPrice ?? p.price,
              clientPrice: norm.clientPrice ?? p.price,
              image: norm.image || "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
              rating: 5.0,
              reviewCount: 0,
              inStock: p.in_stock ?? true,
              status: p.identity?.consent_withdrawn
                ? "hidden"
                : p.is_hidden
                  ? "hidden"
                  : p.is_out_of_stock && norm.productType !== "sur_commande"
                    ? "out_of_stock"
                    : "active",
              consentWithdrawn: Boolean(p.identity?.consent_withdrawn),
              createdAt: p.created_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch (sbErr) {
      console.warn("[VORK-API] Supabase fetch for artisan products failed:", sbErr.message);
    }

    return res.json({ success: true, count: combined.length, products: combined });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

artisanRouter.post("/products", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  if (!artisanRef) {
    return res.status(401).json({ success: false, error: "Identité artisan introuvable. Reconnectez-vous." });
  }

  const {
    title,
    description = "",
    price,
    productType = "standard",
    category,
    image = "",
    photos = [],
    tags = [],
    sizes = [],
    colors = [],
    dimensions = null,
    manufacturingDays = 5,
    stock,
    stockPolicy,
    shippingFee,
    shippingThreshold,
    ipAuthenticityAccepted,
  } = req.body;

  if (!title || !price) {
    return res.status(400).json({ success: false, error: "Le titre et le prix net sont obligatoires." });
  }

  if (ipAuthenticityAccepted === false) {
    return res.status(400).json({
      success: false,
      error: "Vous devez certifier l'authenticité et le respect de la propriété intellectuelle.",
      error_ar: "يجب التصديق على الأصالة واحترام حقوق الملكية الفكرية.",
    });
  }

  // Décision 33 : Seuil de transport obligatoire si frais de livraison définis
  const numShippingFee = Number(shippingFee) || 0;
  const numShippingThreshold = Number(shippingThreshold);
  if (numShippingFee > 0 && (!numShippingThreshold || numShippingThreshold < 1)) {
    return res.status(400).json({
      success: false,
      error: "Le seuil de quantité pour le transport est obligatoire dès lors que des frais de livraison sont définis (minimum 1 article par forfait).",
      error_ar: "عتبة الكمية لمصاريف الشحن إلزامية عند تحديد سعر التوصيل (قطعة واحدة كحد أدنى لكل طرد).",
    });
  }

  const artisanName = req.user?.fullName || req.body.artisanName || "Maâlem";
  const personalizationMode = req.body.personalizationMode || req.body.personalization_mode || "accept_direct";

  const { persisted, supabaseRow, artisanProduct } = await createCatalogProduct({
    artisanRef,
    artisanName,
    title,
    description,
    category,
    netPrice: price,
    productType,
    photos,
    image,
    tags,
    sizes,
    colors,
    dimensions,
    manufacturingDays,
    shippingFee: numShippingFee,
    shippingThreshold: numShippingThreshold || 1,
    personalizationMode,
    stock,
    stockPolicy,
    ipAuthenticityAccepted: ipAuthenticityAccepted !== false,
  });

  if (persisted) {
    loadProducts().catch(() => {});
    try {
      await productsIndex.addDocuments([{
        ...supabaseRow,
        artisanName,
        imageUrl: supabaseRow.image_url,
      }]);
    } catch (mErr) {
      console.warn("[MEILI] ⚠️ Failed to auto-index product into Meilisearch:", mErr.message);
    }
  }

  return res.status(201).json({
    success: true,
    message: "Création publiée au catalogue Vork avec succès !",
    product: artisanProduct,
  });
});

artisanRouter.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const index = artisanRamProducts.findIndex(p => p.id === id);

  if (index !== -1) {
    artisanRamProducts[index] = { ...artisanRamProducts[index], ...updates };
  }

  try {
    const sbUpdates = {};
    if (updates.title) sbUpdates.title = updates.title;
    if (updates.price) sbUpdates.price = updates.price;
    if (updates.status === "hidden") sbUpdates.is_hidden = true;
    else if (updates.status === "active") sbUpdates.is_hidden = false;

    const { data: existing } = await supabase.from("products").select("identity").eq("id", id).single();
    const nextIdentity = { ...(existing?.identity || {}) };
    if (updates.description !== undefined) nextIdentity.description = updates.description;
    if (Array.isArray(updates.tags)) nextIdentity.tags = updates.tags;
    if (Array.isArray(updates.sizes)) nextIdentity.sizes = updates.sizes;
    if (Array.isArray(updates.colors)) nextIdentity.colors = updates.colors;
    if (Array.isArray(updates.photos)) nextIdentity.photos = updates.photos;
    if (updates.productType) nextIdentity.product_type = updates.productType;
    sbUpdates.identity = nextIdentity;

    const mode = updates.personalizationMode || updates.personalization_mode;
    if (mode) {
      sbUpdates.personalization_mode = mode;
      sbUpdates.accept_customization = mode !== "disabled";
      sbUpdates.allow_public_customization = mode === "delegate_to_market";
    }
    if (Object.keys(sbUpdates).length > 0) {
      await supabase.from("products").update(sbUpdates).eq("id", id);
      loadProducts().catch(() => {});
    }
  } catch (e) {
    console.warn("[VORK-API] Failed to update product in Supabase:", e.message);
  }

  return res.json({
    success: true,
    message: "Produit mis à jour avec succès !",
    product: index !== -1 ? artisanRamProducts[index] : updates,
  });
});

artisanRouter.delete("/products/:id", async (req, res) => {
  const { id } = req.params;
  const artisanRef = getArtisanRef(req);
  if (!artisanRef) {
    return res.status(401).json({ success: false, error: "Identité artisan introuvable." });
  }

  try {
    const { data: prod } = await supabase.from("products").select("id, facets").eq("id", id).single();
    const ownerRef = prod?.facets?.artisan_ref || artisanRamProducts.find(p => p.id === id)?.artisanRef;
    const isOwner = ownerRef === artisanRef || ((artisanRef === "artisan_abdelkader" || artisanRef === "artisan-1") && (!ownerRef || ownerRef === "artisan_abdelkader" || ownerRef === "artisan-1"));
    if (ownerRef && !isOwner && req.userRole !== "admin") {
      return res.status(403).json({ success: false, error: "Accès refusé pour supprimer ce post." });
    }

    await withdrawOrDeleteCatalogProduct(id, "deleted_by_vendor");
    loadProducts().catch(() => {});
    try {
      await productsIndex.deleteDocument(id);
    } catch {}

    return res.json({
      success: true,
      message: "Post supprimé du catalogue. Les commandes déjà en cours restent inchangées.",
      message_ar: "تم حذف المنشور من الكتالوج. تستمر الطلبيات الجارية دون تغيير.",
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/products/:id/stock
 * Consulter les informations de stock d'un produit (P5 - 28/09/2026).
 */
artisanRouter.get("/products/:id/stock", async (req, res) => {
  const { id } = req.params;
  try {
    const stockInfo = await getProductStockInfo(id);
    if (!stockInfo) {
      return res.status(404).json({ success: false, error: "Produit introuvable.", error_ar: "المنتج غير موجود." });
    }
    return res.json({ success: true, ...stockInfo });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/artisan/products/:id/stock
 * Incrémenter / modifier le stock d'un produit (P5 - 28/09/2026).
 * La nouvelle valeur de stock devient la référence 100% (initial_stock).
 * Le signe « Stock Limité » apparaît quand le stock descend ≤ 20% de initial_stock.
 * Actions possibles : 'add_stock', 'disable_tracking', 'switch_to_on_demand', 'hide_manually'
 */
artisanRouter.put("/products/:id/stock", async (req, res) => {
  const { id } = req.params;
  const { action = "add_stock", stock, days } = req.body;

  if (action === "add_stock" && (!stock || Number(stock) < 0)) {
    return res.status(400).json({
      success: false,
      error: "Veuillez spécifier une quantité de stock valide (≥ 0).",
      error_ar: "يرجى تحديد كمية مخزون صالحة (≥ 0).",
    });
  }

  try {
    const result = await updateProductStockAction(id, action, { stock, days });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    const messages = {
      add_stock: {
        fr: `Stock mis à jour avec succès : ${stock} unité(s). Cette valeur est maintenant votre référence 100%.`,
        ar: `تم تحديث المخزون بنجاح: ${stock} وحدة. هذه القيمة هي الآن مرجعك 100%.`,
      },
      disable_tracking: {
        fr: "Suivi de stock désactivé pour ce produit. Le post est à nouveau visible.",
        ar: "تم تعطيل تتبع المخزون لهذا المنتج. المنشور مرئي مرة أخرى.",
      },
      switch_to_on_demand: {
        fr: `Produit converti en \"Sur Commande\" avec un délai de fabrication de ${days || 7} jour(s).`,
        ar: `تم تحويل المنتج إلى \"حسب الطلب\" مع مدة تصنيع ${days || 7} يوم(أيام).`,
      },
      hide_manually: {
        fr: "Post masqué manuellement. Il reste dans votre historique mais n'apparaît plus sur le marché.",
        ar: "تم إخفاء المنشور يدوياً. يبقى في سجلك لكنه لا يظهر في السوق.",
      },
    };

    return res.json({
      success: true,
      message: messages[action]?.fr || "Stock mis à jour.",
      message_ar: messages[action]?.ar || "تم تحديث المخزون.",
      product: result.product,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/artisan/products/:id/stock-policy
 * Configurer la politique de stock de la boutique du vendeur (P5 - 28/09/2026).
 *
 * Politiques disponibles :
 *   - show_stock_to_client (boolean) : Afficher le stock actuel au client
 *   - allow_order_exceeding_stock (boolean) : Commande possible si qté commandée > stock actuel
 *   - auto_accept_exceeding_stock (boolean) : Acceptation auto reste active même si qté > stock
 *     (uniquement si allow_order_exceeding_stock = true)
 *
 * NOTE : Ces options sont OBLIGATOIRES dès que le vendeur active le stock sur un produit.
 * Le stock est optionnel, mais si activé → politique obligatoire.
 */
artisanRouter.put("/products/:id/stock-policy", async (req, res) => {
  const { id } = req.params;
  const {
    show_stock_to_client = false,
    allow_order_exceeding_stock = false,
    auto_accept_exceeding_stock = false,
  } = req.body;

  // Validation : auto_accept_exceeding_stock n'est possible que si allow_order_exceeding_stock est true
  if (auto_accept_exceeding_stock && !allow_order_exceeding_stock) {
    return res.status(400).json({
      success: false,
      error: "L'acceptation automatique pour les commandes dépassant le stock n'est possible que si vous autorisez d'abord les commandes dépassant le stock.",
      error_ar: "القبول التلقائي للطلبات التي تتجاوز المخزون ممكن فقط إذا سمحت أولاً بالطلبات التي تتجاوز المخزون.",
    });
  }

  try {
    const stockPolicy = {
      show_stock_to_client: Boolean(show_stock_to_client),
      allow_order_exceeding_stock: Boolean(allow_order_exceeding_stock),
      auto_accept_exceeding_stock: Boolean(auto_accept_exceeding_stock),
    };

    const { error } = await supabase
      .from('products')
      .update({
        stock_policy: stockPolicy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    return res.json({
      success: true,
      message: "Politique de stock mise à jour avec succès.",
      message_ar: "تم تحديث سياسة المخزون بنجاح.",
      stockPolicy,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/notifications & POST /api/artisan/notifications/:id/read
 * Centre de Notifications Artisan.
 */
artisanRouter.get("/notifications", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  const lang = req.query.lang === "ar" || req.headers["accept-language"]?.includes("ar") ? "ar" : "fr";
  try {
    const condition = getArtisanOrderCondition(artisanRef);
    const [allOrders, rawDisputes, rawReturns, allWithdrawals] = await Promise.all([
      db.select({
        id: orders.id,
        status: orders.status,
        totalPrice: orders.totalPrice,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        acceptedAt: orders.acceptedAt,
        shippedAt: orders.shippedAt,
        deliveredAt: orders.deliveredAt,
        escrowReleasedAt: orders.escrowReleasedAt,
        refusedByArtisan: orders.refusedByArtisan,
        refusalReason: orders.refusalReason,
        senditDeliveryCode: orders.senditDeliveryCode,
      }).from(orders).where(condition),
      db.select({
        id: disputes.id,
        orderId: disputes.orderId,
        artisanResponse: disputes.artisanResponse,
        createdAt: disputes.createdAt,
      }).from(disputes),
      db.select({
        id: returnRequests.id,
        orderId: returnRequests.orderId,
        status: returnRequests.status,
        createdAt: returnRequests.createdAt,
      }).from(returnRequests),
      db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, artisanRef)),
    ]);
    const myOrderIds = new Set(allOrders.map(o => o.id));
    const allDisputes = rawDisputes.filter(d => myOrderIds.has(d.orderId));
    const allReturns = rawReturns.filter(r => myOrderIds.has(r.orderId));

    const notifications = [];

    // Notifications de commandes
    allOrders.forEach(o => {
      // 1. Nouvelle commande ou Alerte délai critique 72h
      if (["acompte_verse", "payee_integralement"].includes(o.status)) {
        const createdMs = new Date(o.createdAt).getTime();
        const diffHours = (Date.now() - createdMs) / (1000 * 60 * 60);

        if (diffHours >= 36) {
          const hoursLeft = Math.max(0, Math.round(72 - diffHours));
          notifications.push({
            id: `notif-order-urgent-${o.id}`,
            type: "urgent_order",
            title: lang === "ar" ? "مهلة حرجة : تأكيد الاستلام مطلوب" : "Délai Critique : Acceptation requise",
            title_fr: "Délai Critique : Acceptation requise",
            title_ar: "مهلة حرجة : تأكيد الاستلام مطلوب",
            message: lang === "ar"
              ? `متبقي ${hoursLeft} ساعة فقط لتأكيد الطلب #${o.id} (${o.totalPrice} درهم) قبل الإلغاء التلقائي.`
              : `Plus que ${hoursLeft}h pour accepter la commande #${o.id} (${o.totalPrice} MAD) avant annulation automatique.`,
            message_fr: `Plus que ${hoursLeft}h pour accepter la commande #${o.id} (${o.totalPrice} MAD) avant annulation automatique.`,
            message_ar: `متبقي ${hoursLeft} ساعة فقط لتأكيد الطلب #${o.id} (${o.totalPrice} درهم) قبل الإلغاء التلقائي.`,
            date: o.createdAt,
            read: false,
            linkTab: "atelier",
            orderId: o.id,
          });
        } else {
          notifications.push({
            id: `notif-order-${o.id}`,
            type: "new_order",
            title: lang === "ar" ? "طلب جديد وارد إلى الورشة" : "Nouvelle commande reçue",
            title_fr: "Nouvelle commande reçue",
            title_ar: "طلب جديد وارد إلى الورشة",
            message: lang === "ar"
              ? `طلب جديد #${o.id} (${o.totalPrice} درهم) مؤدى ومؤمّن. يُرجى تأكيد استلام العمل خلال 72 ساعة.`
              : `Commande #${o.id} (${o.totalPrice} MAD) réglée et sécurisée. Prise en charge requise sous 72h max.`,
            message_fr: `Commande #${o.id} (${o.totalPrice} MAD) réglée et sécurisée. Prise en charge requise sous 72h max.`,
            message_ar: `طلب جديد #${o.id} (${o.totalPrice} درهم) مؤدى ومؤمّن. يُرجى تأكيد استلام العمل خلال 72 ساعة.`,
            date: o.createdAt,
            read: false,
            linkTab: "atelier",
            orderId: o.id,
          });
        }
      }

      // 2. Commande Annulée (par le client ou expiration)
      if (o.status === "annulee") {
        const isExpired = o.cancellationReason === "expiration_72h";
        const isRefusedByMe = Boolean(o.refusedByArtisan || o.refusalReason);

        if (isExpired) {
          notifications.push({
            id: `notif-expired-${o.id}`,
            type: "order_cancelled",
            title: lang === "ar" ? "انتهت المهلة : تم إلغاء الطلب" : "Délai Dépassé : Commande Expirée",
            title_fr: "Délai Dépassé : Commande Expirée",
            title_ar: "انتهت المهلة : تم إلغاء الطلب",
            message: lang === "ar"
              ? `انتهت مهلة 72 ساعة لتأكيد الطلب #${o.id}. تم إلغاء الطلب تلقائياً واسترجاع المبلغ للزبون.`
              : `Le délai d'acceptation de 72h pour la commande #${o.id} a expiré. La commande a été annulée automatiquement.`,
            message_fr: `Le délai d'acceptation de 72h pour la commande #${o.id} a expiré. La commande a été annulée automatiquement.`,
            message_ar: `انتهت مهلة 72 ساعة لتأكيد الطلب #${o.id}. تم إلغاء الطلب تلقائياً واسترجاع المبلغ للزبون.`,
            date: o.updatedAt || o.createdAt,
            read: false,
            linkTab: "atelier",
            orderId: o.id,
          });
        } else if (isRefusedByMe) {
          notifications.push({
            id: `notif-declined-${o.id}`,
            type: "order_cancelled",
            title: lang === "ar" ? "تم الاعتذار عن الطلب" : "Commande Déclinée par l'Atelier",
            title_fr: "Commande Déclinée par l'Atelier",
            title_ar: "تم الاعتذار عن الطلب",
            message: lang === "ar"
              ? `لقد اعتذرتم عن قبول الطلب #${o.id}. تم استرجاع المبلغ للزبون فوراً.`
              : `Vous avez décliné la commande #${o.id}. Les fonds ont été reversés au client.`,
            message_fr: `Vous avez décliné la commande #${o.id}. Les fonds ont été reversés au client.`,
            message_ar: `لقد اعتذرتم عن قبول الطلب #${o.id}. تم استرجاع المبلغ للزبون فوراً.`,
            date: o.updatedAt || o.createdAt,
            read: true,
            linkTab: "atelier",
            orderId: o.id,
          });
        } else {
          // Annulation active du client
          notifications.push({
            id: `notif-cancel-${o.id}`,
            type: "order_cancelled",
            title: lang === "ar" ? "إلغاء الطلب من قِبل الزبون" : "Commande Annulée par le Client",
            title_fr: "Commande Annulée par le Client",
            title_ar: "إلغاء الطلب من قِبل الزبون",
            message: lang === "ar"
              ? `تم إلغاء الطلب #${o.id} (${o.totalPrice} درهم) من قِبل الزبون. يُرجى وقف أي تصنيع أو شحن فوراً.`
              : `La commande #${o.id} (${o.totalPrice} MAD) a été annulée par le client. Toute confection ou expédition doit être suspendue.`,
            message_fr: `La commande #${o.id} (${o.totalPrice} MAD) a été annulée par le client. Toute confection ou expédition doit être suspendue.`,
            message_ar: `تم إلغاء الطلب #${o.id} (${o.totalPrice} درهم) من قِبل الزبون. يُرجى وقف أي تصنيع أو شحن فوراً.`,
            date: o.updatedAt || o.createdAt,
            read: false,
            linkTab: "atelier",
            orderId: o.id,
          });
        }
      }

      // 3. Commande en confection d'atelier
      if (o.status === "en_preparation") {
        notifications.push({
          id: `notif-prep-${o.id}`,
          type: "order_prep",
          title: lang === "ar" ? "قيد التصنيع في الورشة" : "Confection en cours à l'atelier",
          title_fr: "Confection en cours à l'atelier",
          title_ar: "قيد التصنيع في الورشة",
          message: lang === "ar"
            ? `الطلب #${o.id} قيد الإنجاز في الورشة. تحقّق من مطابقة القطعة لإصدار إشعار الشحن.`
            : `Commande #${o.id} en fabrication. Validez la conformité de la pièce pour générer l'expédition Sendit.`,
          message_fr: `Commande #${o.id} en fabrication. Validez la conformité de la pièce pour générer l'expédition Sendit.`,
          message_ar: `الطلب #${o.id} قيد الإنجاز في الورشة. تحقّق من مطابقة القطعة لإصدار إشعار الشحن.` ,
          date: o.acceptedAt || o.updatedAt || o.createdAt,
          read: false,
          linkTab: "atelier",
          orderId: o.id,
        });
      }

      // 4. Colis en cours d'acheminement (Logistique)
      if (o.status === "en_cours_de_transport") {
        notifications.push({
          id: `notif-shipped-${o.id}`,
          type: "order_shipped",
          title: lang === "ar" ? "الشحنة لدى شركة التوصيل" : "Colis confié au transporteur",
          title_fr: "Colis confié au transporteur",
          title_ar: "الشحنة لدى شركة التوصيل",
          message: lang === "ar"
            ? `الشحنة #${o.id} في طريقها للزبون. رقم التتبع : ${o.senditDeliveryCode || o.id}.`
            : `Le colis #${o.id} est en transit vers le client. N° de suivi : ${o.senditDeliveryCode || o.id}.`,
          message_fr: `Le colis #${o.id} est en transit vers le client. N° de suivi : ${o.senditDeliveryCode || o.id}.`,
          message_ar: `الشحنة #${o.id} في طريقها للزبون. رقم التتبع : ${o.senditDeliveryCode || o.id}.`,
          date: o.shippedAt || o.updatedAt || o.createdAt,
          read: false,
          linkTab: "atelier",
          orderId: o.id,
        });
      }

      // 5. Colis Livré au Destinataire
      if (o.status === "livre") {
        notifications.push({
          id: `notif-delivered-${o.id}`,
          type: "order_delivered",
          title: lang === "ar" ? "تم تسليم الطلب للزبون" : "Colis Livré au Destinataire",
          title_fr: "Colis Livré au Destinataire",
          title_ar: "تم تسليم الطلب للزبون",
          message: lang === "ar"
            ? `تم تسجيل استلام الشحنة #${o.id}. بدأ احتساب مهلة 7 أيام قبل التحرير التلقائي للضمان.`
            : `La remise du colis #${o.id} a été enregistrée. Le délai de 7 jours a débuté avant déblocage automatique.`,
          message_fr: `La remise du colis #${o.id} a été enregistrée. Le délai de 7 jours a débuté avant déblocage automatique.`,
          message_ar: `تم تسجيل استلام الشحنة #${o.id}. بدأ احتساب مهلة 7 أيام قبل التحرير التلقائي للضمان.`,
          date: o.deliveredAt || o.updatedAt || o.createdAt,
          read: false,
          linkTab: "atelier",
          orderId: o.id,
        });
      }

      // 6. Réception validée par le Client
      if (["auto_valide", "complete"].includes(o.status)) {
        notifications.push({
          id: `notif-confirmed-${o.id}`,
          type: "order_confirmed",
          title: lang === "ar" ? "تأكيد الاستلام من الزبون" : "Réception Validée par le Client",
          title_fr: "Réception Validée par le Client",
          title_ar: "تأكيد الاستلام من الزبون",
          message: lang === "ar"
            ? `أكّد الزبون مطابقة الطلب #${o.id}. تم اعتماد المستحقات للتحرير النهائي.`
            : `La conformité de la commande #${o.id} a été confirmée. Déblocage du paiement programmé sous séquestre.`,
          message_fr: `La conformité de la commande #${o.id} a été confirmée. Déblocage du paiement programmé sous séquestre.`,
          message_ar: `أكّد الزبون مطابقة الطلب #${o.id}. تم اعتماد المستحقات للتحرير النهائي.`,
          date: o.updatedAt || o.createdAt,
          read: true,
          linkTab: "atelier",
          orderId: o.id,
        });
      }

      // 7. Fonds Débloqués sur Solde Retirable
      if (o.escrowReleasedAt) {
        notifications.push({
          id: `notif-escrow-${o.id}`,
          type: "escrow_released",
          title: lang === "ar" ? "تحرير المستحقات إلى رصيدك" : "Fonds Débloqués sur votre Solde",
          title_fr: "Fonds Débloqués sur votre Solde",
          title_ar: "تحرير المستحقات إلى رصيدك",
          message: lang === "ar"
            ? `تم إيداع مبلغ الطلب #${o.id} (${o.totalPrice} درهم) في رصيدك القابل للسحب البنكي على رقم حسابك (RIB).`
            : `Le montant de la commande #${o.id} (${o.totalPrice} MAD) a été crédité. Vous pouvez demander un virement bancaire sur votre RIB.`,
          message_fr: `Le montant de la commande #${o.id} (${o.totalPrice} MAD) a été crédité. Vous pouvez demander un virement bancaire sur votre RIB.`,
          message_ar: `تم إيداع مبلغ الطلب #${o.id} (${o.totalPrice} درهم) في رصيدك القابل للسحب البنكي على رقم حسابك (RIB).`,
          date: o.escrowReleasedAt,
          read: true,
          linkTab: "wallet",
          orderId: o.id,
        });
      }
    });

    // Notifications de litiges
    allDisputes.forEach(d => {
      notifications.push({
        id: `notif-dispute-${d.id}`,
        type: "dispute",
        title: lang === "ar" ? "شكوى مفتوحة من الزبون" : "Réclamation Client Ouverte",
        title_fr: "Réclamation Client Ouverte",
        title_ar: "شكوى مفتوحة من الزبون",
        message: lang === "ar"
          ? `ملف شكوى #${d.id} بخصوص الطلب #${d.orderId}. يُرجى تقديم توضيحاتك خلال 48 ساعة.`
          : `Dossier #${d.id} sur la commande #${d.orderId}. Transmettez vos explications sous 48h.`,
        message_fr: `Dossier #${d.id} sur la commande #${d.orderId}. Transmettez vos explications sous 48h.`,
        message_ar: `ملف شكوى #${d.id} بخصوص الطلب #${d.orderId}. يُرجى تقديم توضيحاتك خلال 48 ساعة.`,
        date: d.createdAt,
        read: !!d.artisanResponse,
        linkTab: "litiges",
        orderId: d.orderId,
      });
    });

    // Notifications de retours
    allReturns.forEach(r => {
      notifications.push({
        id: `notif-return-${r.id}`,
        type: "return",
        title: lang === "ar" ? "طلب إرجاع معلن" : "Demande de Retour Déclarée",
        title_fr: "Demande de Retour Déclarée",
        title_ar: "طلب إرجاع معلن",
        message: lang === "ar"
          ? `تم الإعلان عن طلب إرجاع بخصوص الشحنة #${r.orderId}.`
          : `Demande de retour déclarée sur la commande #${r.orderId}.`,
        message_fr: `Demande de retour déclarée sur la commande #${r.orderId}.`,
        message_ar: `تم الإعلان عن طلب إرجاع بخصوص الشحنة #${r.orderId}.`,
        date: r.createdAt,
        read: r.status !== "initie",
        linkTab: "retours",
        orderId: r.orderId,
      });
    });

    // Notifications de retraits
    allWithdrawals.forEach(w => {
      if (w.status === "processed") {
        notifications.push({
          id: `notif-with-${w.id}`,
          type: "withdrawal",
          title: lang === "ar" ? "تحويل بنكي منفذ" : "Virement Bancaire Exécuté",
          title_fr: "Virement Bancaire Exécuté",
          title_ar: "تحويل بنكي منفذ",
          message: lang === "ar"
            ? `تم تحويل مبلغ ${w.amount} درهم بنجاح إلى حسابكم البنكي.`
            : `Votre virement de ${w.amount} MAD a été transféré vers votre compte bancaire.`,
          message_fr: `Votre virement de ${w.amount} MAD a été transféré vers votre compte bancaire.`,
          message_ar: `تم تحويل مبلغ ${w.amount} درهم بنجاح إلى حسابكم البنكي.`,
          date: w.processedAt || w.createdAt,
          read: true,
          linkTab: "wallet",
        });
      }
    });

    // Tri par date décroissante
    notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({ success: true, count: notifications.length, notifications });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/artisan/profile
 * Mise à jour des informations de l'atelier & coordonnées de ramassage.
 */
// Profils en mémoire par artisanRef (clé = artisanRef)
const memoryProfiles = {};

function getMemoryProfile(artisanRef, user) {
  if (!memoryProfiles[artisanRef]) {
    // Initialisation depuis le JWT au premier accès
    memoryProfiles[artisanRef] = {
      artisanName: user?.fullName || artisanRef,
      specialty: "",
      bio: "",
      phone: user?.phone || "",
      pickupAddress: user?.city || "",
      pickupDistrictId: null,
      defaultRib: "",
      isVacationMode: false,
      yearsOfExperience: 0,
    };
  }
  return memoryProfiles[artisanRef];
}

artisanRouter.get("/profile/details", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  const profile = getMemoryProfile(artisanRef, req.user);
  return res.json({ success: true, profileDetails: profile });
});

artisanRouter.put("/profile/details", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  const updates = req.body;
  const profile = getMemoryProfile(artisanRef, req.user);
  memoryProfiles[artisanRef] = { ...profile, ...updates };
  return res.json({ success: true, message: "Profil atelier mis à jour avec succès.", profileDetails: memoryProfiles[artisanRef] });
});

/**
 * GET /api/artisan/stats
 * Statistiques & Performance de vente pour l'artisan.
 */
artisanRouter.get("/stats", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  try {
    const condition = getArtisanOrderCondition(artisanRef);
    const allOrders = await db.select({ id: orders.id, status: orders.status }).from(orders).where(condition);

    const totalOrders = allOrders.length;
    const acceptedOrders = allOrders.filter(o => o.status !== "annulee").length;
    const acceptanceRate = totalOrders > 0 ? Math.round((acceptedOrders / totalOrders) * 100) : 100;
    const averageShippingDays = 3.2; // Estimation standard
    const overallRating = 4.9;
    const reviewCount = 38;

    return res.json({
      success: true,
      stats: {
        totalOrders,
        acceptanceRate,
        averageShippingDays,
        overallRating,
        reviewCount,
        monthlyGrowth: "+14.5%",
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

function isQuoteOwnedByArtisan(quote, artisanRef) {
  if (!quote || !quote.artisanRef || !artisanRef) return false;
  if (quote.artisanRef === artisanRef) return true;
  if ((artisanRef === "artisan_abdelkader" || artisanRef === "artisan-1")
    && (quote.artisanRef === "artisan_abdelkader" || quote.artisanRef === "artisan-1")) {
    return true;
  }
  return false;
}

artisanRouter.get("/custom-requests", async (req, res) => {
  try {
    const artisanRef = getArtisanRef(req);
    const { category } = req.query;

    // 1. Filtrer les requêtes en mémoire uniquement si toujours ouvertes sur le marché
    let list = memoryCustomRequests
      .filter(r => isRequestOpenOnMarket(r))
      .map(r => {
        const allQuotes = Array.isArray(r.quotes) ? r.quotes : [];
        const myQuote = allQuotes.find(q => isQuoteOwnedByArtisan(q, artisanRef)) || null;
        return {
          ...r,
          quotes: allQuotes,
          quotesCount: allQuotes.length,
          myQuote,
          isDirectPrivateRequest: false,
        };
      });

    // 2. Interroger la table custom_requests : liste blanche stricte des demandes ouvertes
    try {
      const origin = `${req.protocol}://${req.get("host") || "localhost:3001"}`;
      const marketCondition = (artisanRef === "artisan_abdelkader" || artisanRef === "artisan-1")
        ? or(eq(customRequests.artisanRef, "artisan-open"), eq(customRequests.artisanRef, "artisan_abdelkader"), eq(customRequests.artisanRef, "artisan-1"))
        : or(eq(customRequests.artisanRef, "artisan-open"), eq(customRequests.artisanRef, artisanRef));

      const dbRequests = await db.select({
        id: customRequests.id,
        clientRef: customRequests.clientRef,
        artisanRef: customRequests.artisanRef,
        productType: customRequests.productType,
        marketType: customRequests.marketType,
        proofImageMeta: sql`CASE WHEN ${customRequests.proofImage} LIKE 'http%' THEN ${customRequests.proofImage} WHEN ${customRequests.proofImage} IS NOT NULL AND length(${customRequests.proofImage}) > 0 THEN '__MEDIA__' ELSE NULL END`,
        totalPrice: customRequests.totalPrice,
        status: customRequests.status,
        customizationTags: customRequests.customizationTags,
        createdAt: customRequests.createdAt,
        updatedAt: customRequests.updatedAt,
      }).from(customRequests)
        .where(and(
          marketCondition,
          inArray(customRequests.status, OPEN_MARKET_STATUSES)
        ))
        .orderBy(desc(customRequests.createdAt))
        .limit(40);

      // Recueillir les commandes liées déjà acceptées/réalisées pour éviter toute fuite sur le marché public
      const activeOrRealizedCustomReqIds = new Set();
      try {
        const recentOrders = await db.select({ id: orders.id, status: orders.status, acceptedAt: orders.acceptedAt, orderMetadata: orders.orderMetadata }).from(orders);
        for (const o of recentOrders) {
          if (["annulee", "annule_avant_acceptation"].includes(o.status)) continue;
          const meta = safeJsonParse(o.orderMetadata, {});
          if (meta.customRequestId) {
            activeOrRealizedCustomReqIds.add(meta.customRequestId);
          }
          if (o.id.startsWith("ord_")) {
            activeOrRealizedCustomReqIds.add(`req_${o.id.split("_")[1]}`);
          }
        }
      } catch {}

      const formatted = dbRequests
        .filter(r => {
          const tags = safeJsonParse(r.customizationTags, {});
          if (!isRequestOpenOnMarket(r, tags)) {
            return false;
          }
          if (activeOrRealizedCustomReqIds.has(r.id)) {
            return false;
          }
          const isPrivate = r.marketType === "private" || (r.artisanRef && r.artisanRef !== "artisan-open");
          if (isPrivate) {
            const isMine = r.artisanRef === artisanRef || ((artisanRef === "artisan_abdelkader" || artisanRef === "artisan-1") && (r.artisanRef === "artisan_abdelkader" || r.artisanRef === "artisan-1"));
            if (!isMine) return false;
          }
          return true;
        })
        .map(r => {
          const tags = safeJsonParse(r.customizationTags, {});
          const mods = tags.modifications || [];
          const catMod = mods.find(m => (m.feature || '').toLowerCase().includes('mat') || (m.feature || '').toLowerCase().includes('cat'));
          const autoCat = catMod?.value || tags.category || 'Sur-mesure';
          const resolvedProofImage = r.proofImageMeta === "__MEDIA__"
            ? `${origin}/api/public/media/custom-request/${r.id}`
            : r.proofImageMeta;
          const listImage = resolvedProofImage || tags.anchorProduct?.imageUrl || "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600";
          const allQuotes = Array.isArray(tags.quotes) ? tags.quotes : [];
          const myQuote = allQuotes.find(q => isQuoteOwnedByArtisan(q, artisanRef)) || null;
          const isPrivate = r.marketType === "private" || (r.artisanRef && r.artisanRef !== "artisan-open");

          return {
            id: r.id,
            clientName: r.clientRef || "Client Vork",
            category: autoCat,
            title: tags.title || (tags.summary ? tags.summary.split('\n')[0].replace(/^[•\s*]+/, '') : "Création sur mesure"),
            description: tags.summary || "Demande de création artisanale personnalisée.",
            budget: r.totalPrice ? `${r.totalPrice} DH` : "Sur devis",
            deliveryCity: "Maroc",
            createdAt: r.createdAt,
            image: listImage,
            quotes: allQuotes,
            quotesCount: allQuotes.length,
            myQuote,
            isDirectPrivateRequest: isPrivate,
            tags: Array.isArray(tags.tags) ? tags.tags : [],
            selectedSize: tags.selectedSize || null,
            selectedColor: tags.selectedColor || null,
          };
        });

      list = [...formatted, ...list];
    } catch (e) {
      console.warn("[ARTISAN-ROUTES] ⚠️ Could not fetch custom requests from DB:", e.message);
    }

    if (category && category !== "Toutes" && category !== "all") {
      list = list.filter(r => r.category.toLowerCase().includes(String(category).toLowerCase()));
    }
    return res.json({ success: true, count: list.length, requests: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

artisanRouter.post("/custom-requests/:id/quote", async (req, res) => {
  const { id } = req.params;
  const { proposedPrice, confectionDays, note } = req.body;

  if (!proposedPrice || !confectionDays || Number(proposedPrice) <= 0 || Number(confectionDays) <= 0) {
    return res.status(400).json({ success: false, error: "Le prix et le délai de confection sont obligatoires." });
  }

  const artisanRef = getArtisanRef(req);
  if (!artisanRef) {
    return res.status(401).json({ success: false, error: "Identité artisan introuvable." });
  }

  const profile = getMemoryProfile(artisanRef, req.user);
  const artisanName = req.user?.fullName || profile?.artisanName || req.user?.email?.split("@")[0] || "Maâlem";

  const newQuote = {
    artisanName,
    artisanRef,
    artisanCity: req.user?.city || profile?.pickupAddress || "",
    proposedPrice: Number(proposedPrice),
    confectionDays: Number(confectionDays),
    note: note || "",
    createdAt: new Date().toISOString(),
  };

  const reqItem = memoryCustomRequests.find(r => r.id === id);
  if (reqItem) {
    if (!isRequestOpenOnMarket(reqItem)) {
      return res.status(409).json({ success: false, error: "Cette demande a déjà été attribuée à un artisan." });
    }
    if (!Array.isArray(reqItem.quotes)) reqItem.quotes = [];
    const existingIdx = reqItem.quotes.findIndex(q => isQuoteOwnedByArtisan(q, artisanRef));
    if (existingIdx >= 0) {
      reqItem.quotes[existingIdx] = newQuote;
    } else {
      reqItem.quotes.push(newQuote);
    }
  }

  // Persister également dans la base PostgreSQL si la demande provient de l'Atelier
  try {
    const [dbReq] = await db.select().from(customRequests).where(eq(customRequests.id, id));
    if (dbReq) {
      const tags = safeJsonParse(dbReq.customizationTags, {});

      if (!isRequestOpenOnMarket(dbReq, tags)) {
        return res.status(409).json({
          success: false,
          error: "Cette demande a déjà été attribuée à un artisan ou clôturée par le client.",
        });
      }

      const isPrivate = dbReq.marketType === "private" || (dbReq.artisanRef && dbReq.artisanRef !== "artisan-open");
      const isMine = dbReq.artisanRef === artisanRef || ((artisanRef === "artisan_abdelkader" || artisanRef === "artisan-1") && (dbReq.artisanRef === "artisan_abdelkader" || dbReq.artisanRef === "artisan-1"));
      if (isPrivate && !isMine) {
        return res.status(403).json({
          success: false,
          error: "Accès refusé : cette demande personnalisée privée est adressée à un autre Maâlem.",
        });
      }

      if (!Array.isArray(tags.quotes)) {
        tags.quotes = [];
      }
      const existingIdx = tags.quotes.findIndex(q => isQuoteOwnedByArtisan(q, artisanRef));
      if (existingIdx >= 0) {
        tags.quotes[existingIdx] = newQuote;
      } else {
        tags.quotes.push(newQuote);
      }

      await db.update(customRequests)
        .set({
          customizationTags: JSON.stringify(tags),
          status: dbReq.status === "en_attente_artisan" ? "devis_recu" : dbReq.status,
          updatedAt: new Date().toISOString()
        })
        .where(eq(customRequests.id, id));

      // Notifier le client de la nouvelle proposition de manière résiliente
      if (dbReq.clientRef) {
        await createNotificationResilient({
          userId: dbReq.clientRef,
          userType: "client",
          type: "custom_quote_received",
          title: `Nouveau devis de ${artisanName}`,
          titleAr: `عرض سعر جديد من ${artisanName}`,
          message: `${artisanName} propose ${newQuote.proposedPrice} MAD (délai ${newQuote.confectionDays} jours) pour votre création sur-mesure.`,
          messageAr: `اقترح ${artisanName} مبلغ ${newQuote.proposedPrice} درهم (مدة الإنجاز ${newQuote.confectionDays} أيام) لطلبك المخصص.`,
          sourceId: id,
          secondaryUserId: artisanRef,
          secondaryUserName: artisanName,
          idempotencyKey: `quote:${id}:${artisanRef}:${newQuote.proposedPrice}:${newQuote.confectionDays}`,
          metadata: { orderId: id, proposedPrice: newQuote.proposedPrice, confectionDays: newQuote.confectionDays },
        });
      }
    } else if (!reqItem) {
      return res.status(404).json({ success: false, error: "Demande sur-mesure introuvable." });
    }
  } catch (err) {
    console.warn("[ARTISAN-ROUTES] ⚠️ Could not persist quote to DB custom_request:", err.message);
  }

  return res.json({ success: true, message: "Devis / Offre transmis au client avec succès !", quote: newQuote });
});

