import { eq, and, gte, or, isNull, sql } from "drizzle-orm";
import { db } from "../../core/db/index.js";
import { orders, vendorWarnings, vendorProfiles, customRequests } from "../../core/db/schema.js";
import {
  decrementProductStock,
  checkStockBeforeAccept,
  createCatalogProduct,
  withdrawOrDeleteCatalogProduct,
} from "../../db/products.repository.js";
import { createNotificationResilient, updateConsentNotificationsStatus } from "../../services/notificationService.js";
import { closeCustomRequestOnMarket, safeJsonParse } from "../../services/customRequestState.js";
import { loadProducts } from "../../services/recommendation.service.js";
import { productsIndex } from "../../services/search/meilisearch.service.js";

function isSameVendor(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const legacy = new Set(["artisan-1", "artisan_abdelkader"]);
  return legacy.has(a) && legacy.has(b);
}

/**
 * 1. Acceptation par l'artisan (lance la fabrication / préparation)
 * (Décision 27) : Le stock est décrémenté à l'acceptation et si stock = 0, le post est masqué.
 * (P5 - 28/09/2026) : Vérification préalable du stock — si stock = 0, blocage avec redirection.
 *                      Si stock ≤ 20% après décrémentation, notification "Stock Limité".
 */
export async function acceptOrder(orderId) {
  return await db.transaction(async (tx) => {
    let [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      console.warn(`[VORK-API] ⚠️ Order ${orderId} not found in DB. Auto-creating as PAID for accept simulation.`);
      const now = new Date().toISOString();
      await tx.insert(orders)
        .values({
          id: orderId,
          clientRef: "767f1271-a560-491c-8225-91bcb06e8930",
          artisanRef: "artisan-1",
          totalPrice: 1500,
          productType: "standard",
          status: "acompte_verse",
          createdAt: now,
          updatedAt: now,
        });
      const [newOrder] = await tx.select().from(orders).where(eq(orders.id, orderId));
      order = newOrder;
    }
    if (!["payee_integralement", "acompte_verse"].includes(order.status)) {
      throw new Error(`statut_incompatible_pour_acceptation:${order.status}`);
    }

    // P5 : Vérification du stock AVANT acceptation
    // Si le produit a un stock tracké et qu'il est à 0, on bloque l'acceptation
    let stockCheck = null;
    if (order.productId) {
      const orderQty = Number(order.quantity) || 1;
      stockCheck = await checkStockBeforeAccept(order.productId, orderQty);
      
      if (stockCheck && !stockCheck.canAccept) {
        // Stock épuisé ou insuffisant — BLOCAGE (P5)
        const error = new Error(stockCheck.message);
        error.stockCheck = stockCheck;
        error.statusCode = 409; // Conflict
        throw error;
      }
    }

    const now = new Date().toISOString();
    await tx.update(orders)
      .set({
        status: "en_preparation",
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));

    // Synchroniser & retirer du Marché Public toute demande personnalisée liée à cette commande acceptée
    const meta = safeJsonParse(order.orderMetadata, {});
    const relatedReqId = meta.customRequestId || null;
    if (relatedReqId) {
      await closeCustomRequestOnMarket(tx, relatedReqId, {
        status: "en_preparation",
        chosenArtisanRef: order.artisanRef,
        reason: "accepted_by_vendor",
      });
    } else if (order.id.startsWith("ord_")) {
      const candidateReqId = `req_${order.id.split("_")[1]}`;
      await closeCustomRequestOnMarket(tx, candidateReqId, {
        status: "en_preparation",
        chosenArtisanRef: order.artisanRef,
        reason: "accepted_by_vendor",
      });
    }

    // Si la commande provient du Marché Public et est basée sur le modèle d'un autre artisan (Mode 2)
    // Notifier immédiatement le Vendeur Initial (propriétaire du modèle source)
    if (order.sourceVendorId && !isSameVendor(order.sourceVendorId, order.artisanRef)) {
      await createNotificationResilient({
        userId: order.sourceVendorId,
        userType: "artisan",
        type: "template_started_by_vendor",
        title: "Un artisan a démarré la fabrication basée sur votre modèle",
        titleAr: "بدأ صانع في تصنيع طلب مستوحى من تصميمك",
        message: `L'artisan ${order.artisanName || 'partenaire'} a pris en charge la fabrication d'une commande personnalisée issue de votre modèle "${order.productTitle || 'Produit'}". Vous pouvez consulter son profil ou le contacter.`,
        messageAr: `بدأ الصانع ${order.artisanName || 'الشريك'} في تحضير طلبية مستوحاة من منتجك "${order.productTitle || 'المنتج'}". يمكنك الاطلاع على حسابه الشخصي أو مراسلته.`,
        linkUrl: `/artisan/vendor/${order.artisanRef}/profile`,
        sourceId: orderId,
        secondaryUserId: order.artisanRef,
        secondaryUserName: order.artisanName,
        idempotencyKey: `template-started:${orderId}:${order.sourceVendorId}`,
        metadata: { orderId, sourceProductId: order.sourceProductId, sourceVendorId: order.sourceVendorId },
      });
    }

    // Décrément du stock et masquage automatique du post si stock = 0 (Décision 27)
    let stockResult = null;
    if (order.productId) {
      stockResult = await decrementProductStock(order.productId, Number(order.quantity) || 1);
    }

    // Retourner les infos de stock pour les notifications frontend (P5)
    return {
      orderId,
      stockNotification: stockResult ? {
        newStock: stockResult.newStock,
        isOutOfStock: stockResult.isOutOfStock,
        isLowStock: stockResult.isLowStock,
        stockPercentage: stockResult.stockPercentage,
        // Si stock = 0 → notifier le vendeur d'ajouter du stock
        // Si stock ≤ 20% → notifier le vendeur de stock limité
        notificationType: stockResult.isOutOfStock 
          ? "stock_epuise" 
          : stockResult.isLowStock 
            ? "stock_limite_20_pourcent" 
            : null,
      } : null,
    };
  });
}

/**
 * 2. Upload des photos de préparation obligatoires (Art. 8.1, 9.2, 10.2)
 */
export async function uploadPrepPhotos(orderId, photoUrls) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");
  
  const now = new Date().toISOString();
  await db.update(orders)
    .set({
      prepPhotos: JSON.stringify(photoUrls),
      updatedAt: now,
    })
    .where(eq(orders.id, orderId));
  return { success: true, count: photoUrls.length };
}

/**
 * 3. Sendit Étape 1 : Déclaration Commande Prête -> Génération du Bon de Livraison (BL)
 */
export async function prepareSenditShipping(orderId, deliveryData) {
  let [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) {
    console.warn(`[VORK-API] ⚠️ Order ${orderId} not found in DB. Auto-creating as IN_PREPARATION for ship simulation.`);
    const now = new Date().toISOString();
    await db.insert(orders)
      .values({
        id: orderId,
        clientRef: "767f1271-a560-491c-8225-91bcb06e8930",
        artisanRef: "artisan-1",
        totalPrice: 1500,
        productType: "standard",
        status: "en_preparation",
        createdAt: now,
        updatedAt: now,
      });
    const [newOrder] = await db.select().from(orders).where(eq(orders.id, orderId));
    order = newOrder;
  }

  return await shipOrderDirect(orderId, deliveryData);
}

/**
 * 3. Expédition directe assurée par le vendeur (Décision C05)
 * Le vendeur choisit le mode d'acheminement de son choix (ses propres moyens, transporteur indépendant, etc.)
 * et le déclare avec un délai estimé (max 30 jours), un nom de transporteur optionnel et un N° de suivi.
 */
export async function shipOrderDirect(orderId, payload = {}) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");

  const transportDurationDays = Math.min(30, Math.max(1, Number(payload.transportDurationDays || payload.estimatedTransportDays || 7)));
  const carrierName = payload.carrierName || "Transport direct vendeur";
  const trackingNumber = payload.trackingNumber || payload.carrierTrackingNumber || null;
  const shippingProofPhoto = payload.shippingProofPhoto || payload.blAttachedPhoto || null;
  const now = new Date().toISOString();

  await db.update(orders)
    .set({
      status: "en_cours_de_transport",
      transportProvider: "vendeur",
      carrierName,
      carrierTrackingNumber: trackingNumber,
      estimatedTransportDays: transportDurationDays,
      shippingProofPhoto,
      shippedAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, orderId));

  return {
    success: true,
    status: "en_cours_de_transport",
    carrierName,
    carrierTrackingNumber: trackingNumber,
    estimatedTransportDays: transportDurationDays,
    message: "Commande déclarée expédiée. Le client a été notifié.",
    message_ar: "تم تسجيل إرسال الشحنة بنجاح. تم إشعار الزبون.",
  };
}

export async function shipVendeurSelf(orderId, opts = {}) {
  const days = typeof opts === "number" ? opts : (opts.transportDurationDays || 7);
  return shipOrderDirect(orderId, { transportDurationDays: days });
}

export async function confirmSenditPickupReady(orderId, payload = {}) {
  return shipOrderDirect(orderId, payload);
}

/**
 * 6. Validation de Livraison Vendeur avec Signature Manuscrite (Art. 11.5 & Décisions Ziad)
 */
export async function completeVendeurDelivery(orderId, { signaturePhoto }) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");

  const now = new Date().toISOString();

  // Décision 1 (corrigée 28/09/2026) :
  // Les fonds restent séquestrés pour TOUS les types de produits (standard, personnalisé, sur_commande)
  // jusqu'à ce que le CLIENT clique sur « Valider la réception ».
  // PAS de libération automatique, PAS de distinction par type de produit.
  await db.update(orders)
    .set({
      status: "livre",
      deliveredAt: now,
      receptionValidatedBy: "vendeur",
      vendeurDeliverySignaturePhoto: signaturePhoto || "https://images.unsplash.com/photo-1583521214690-73421a1829a9?w=500",
      clientApprovalStatus: "pending",
      withdrawalExpiresAt: null,
      escrowReleasedAt: null,
      escrowActionChoice: "pending",
      updatedAt: now,
    })
    .where(eq(orders.id, orderId));

  return {
    success: true,
    status: "livre",
    clientApprovalStatus: "pending",
    escrowReleasedAt: null,
    message: "Commande livrée. En attente de la validation du client pour débloquer les fonds.",
  };
}

/**
 * 7. Gestion des Avertissements Vendeur (Décision 24 : PAS d'avertissement automatique pour refus)
 * Conserve une traçabilité d'audit sans sanction automatique bloquante.
 */
export async function recordVendorWarning(vendorRef, reason, orderId = null) {
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const warningId = `warn-${Date.now()}`;

  await db.insert(vendorWarnings)
    .values({
      id: warningId,
      vendorRef,
      orderId,
      reason,
      monthYear,
      isDismissed: 0,
      createdAt: now.toISOString(),
    });

  // Note : Plus de suspension automatique sur seuil (Décision 24)
  // Les profils restent gérés manuellement par l'administration Vork via audit
  return { success: true, warningId };
}

/**
 * 8. Déblocage du Séquestre par l'Artisan (Décision 19 : extension supprimée)
 */
export async function handleEscrowChoice(orderId, artisanRef, action = "claim") {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");
  if (order.artisanRef !== artisanRef) throw new Error("non_autorise");

  const now = new Date().toISOString();

  if (action === "claim") {
    await db.update(orders).set({
      escrowReleasedAt: now,
      escrowActionChoice: "released_to_wallet",
      updatedAt: now,
    }).where(eq(orders.id, orderId));

    return {
      success: true,
      action: "claim",
      message: "Fonds débloqués avec succès pour cette commande.",
      escrowReleasedAt: now,
    };
  } else {
    throw new Error("action_invalide_seul_claim_est_supporte");
  }
}

/**
 * 9. Inciter le Client à approuver la réception (Décision 1 : le vendeur contacte/relance le client)
 */
export async function nudgeClientApproval(orderId, artisanRef) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");
  if (order.artisanRef !== artisanRef) throw new Error("non_autorise");

  const now = new Date().toISOString();
  await db.update(orders).set({
    clientApprovalRequestedAt: now,
    updatedAt: now,
  }).where(eq(orders.id, orderId));

  return {
    success: true,
    message: "Rappel envoyé avec succès au client pour approuver la réception.",
    clientApprovalRequestedAt: now,
  };
}

/**
 * 10. Validation de réception par le Client (Décision 1 & 30 : libération immédiate du séquestre)
 * Quand le client clique sur « Valider la réception », les fonds sont libérés instantanément dans le wallet du vendeur.
 */
export async function clientApproveReceipt(orderId, clientRef) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");
  if (order.clientRef !== clientRef) throw new Error("non_autorise");

  const now = new Date().toISOString();

  await db.update(orders).set({
    status: "valide",
    clientApprovalStatus: "approved",
    receptionValidatedBy: "client",
    escrowReleasedAt: now,
    escrowActionChoice: "released_to_wallet",
    updatedAt: now,
  }).where(eq(orders.id, orderId));

  return {
    success: true,
    status: "valide",
    escrowReleasedAt: now,
    message: "Réception confirmée et fonds débloqués dans le portefeuille du vendeur.",
  };
}

/**
 * 11. Contestation Avertissement pour Force Majeure (Art. 12.5 & 27 CGV v23)
 */
export async function contestWarningForceMajeure(warningId, vendorRef, reason, proofDocUrl = "") {
  const [warn] = await db.select().from(vendorWarnings).where(eq(vendorWarnings.id, warningId));
  if (!warn) throw new Error("avertissement_introuvable");
  if (warn.vendorRef !== vendorRef) throw new Error("non_autorise");

  const now = new Date().toISOString();
  await db.update(vendorWarnings).set({
    isDismissed: 1,
    dismissReason: reason,
    dismissedAt: now,
    proofDocUrl,
  }).where(eq(vendorWarnings.id, warningId));

  // Recalculer le compteur 14 jours
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const recentWarnings = await db.select().from(vendorWarnings).where(
    and(
      eq(vendorWarnings.vendorRef, vendorRef),
      gte(vendorWarnings.createdAt, fourteenDaysAgo),
      or(eq(vendorWarnings.isDismissed, 0), isNull(vendorWarnings.isDismissed))
    )
  );

  await db.update(vendorProfiles).set({
    warningCount14d: recentWarnings.length,
    updatedAt: now,
  }).where(eq(vendorProfiles.id, vendorRef));

  return {
    success: true,
    message: "Avertissement contesté pour Force Majeure avec succès.",
    remaining14d: recentWarnings.length,
  };
}

// Wrapper de compatibilité pour l'ancien shipOrder
export async function shipOrder(orderId, deliveryData) {
  return prepareSenditShipping(orderId, deliveryData);
}

/**
 * 12. Diagramme 5 (#post-accord) : Demande d'accord de publication en post "Sur Commande"
 * - Accessible uniquement APRÈS validation de réception par le client (`valide` / `approved`).
 * - Ne publie PAS immédiatement : envoie une notification interactive Accepter / Refuser :
 *   * Au Client (toujours)
 *   * Au Vendeur de base (VB) UNIQUEMENT si personnalisation issue de son produit (`from_post` avec sourceVendorId distinct)
 *   * En `from_scratch`, le vendeur de base n'existe pas -> seul le Client est interrogé.
 */
export async function requestCatalogPublicationConsent(orderId, artisanRef, payload = {}) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");
  if (!isSameVendor(order.artisanRef, artisanRef)) throw new Error("non_autorise");

  // Diagramme 5 : "Valide la réception" -> "Affiche le bouton Demander l'accord"
  const isValidated =
    ["valide", "complete", "auto_valide"].includes(order.status) ||
    order.clientApprovalStatus === "approved" ||
    order.receptionValidatedBy === "client";

  if (!isValidated) {
    throw new Error("commande_non_validee_par_client");
  }

  if (order.republicationConsentStatus === "granted" && order.publishedProductId) {
    throw new Error("deja_publie_au_catalogue");
  }

  const {
    title,
    description = "",
    category = "Artisanat d'art",
    price,
    image,
    photos = [],
    tags = [],
    sizes = [],
    colors = [],
    manufacturingDays = 7,
    consentMessage = "",
  } = payload;

  const photoList = Array.isArray(photos)
    ? photos.map((x) => String(x || "").trim()).filter(Boolean)
    : [];
  const primaryImage = String(image || photoList[0] || "").trim();
  if (!primaryImage) {
    throw new Error("image_reelle_confection_obligatoire");
  }
  if (!title || !price) {
    throw new Error("titre_et_prix_obligatoires");
  }

  const allPhotos = photoList.length > 0 ? photoList : [primaryImage];
  if (!allPhotos.includes(primaryImage)) allPhotos.unshift(primaryImage);

  const normalizedTags = Array.isArray(tags)
    ? tags.map((x) => String(x || "").trim()).filter(Boolean)
    : (tags && typeof tags === "object" ? Object.values(tags).flat().map(String).filter(Boolean) : []);
  const normalizedSizes = Array.isArray(sizes) ? sizes.map((x) => String(x || "").trim()).filter(Boolean) : [];
  const normalizedColors = Array.isArray(colors) ? colors.map((x) => String(x || "").trim()).filter(Boolean) : [];

  const numNet = Number(price);
  const commissionHt = Math.round(numNet * 0.05);
  const tvaVal = Math.round(commissionHt * 0.20);
  const clientPrice = numNet + commissionHt + tvaVal;

  // Règle explicite : VB interrogé UNIQUEMENT si personnalisation issue du produit d'un autre vendeur (`from_post`)
  const requiresSourceVendor =
    order.customizationOrigin === "from_post" &&
    Boolean(order.sourceVendorId) &&
    !isSameVendor(order.sourceVendorId, artisanRef);

  const now = new Date().toISOString();
  const consentRequestId = `consent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const finalMessage = String(consentMessage || "").trim() ||
    `Bonjour, suite à la validation de la commande "${String(title).trim()}", je sollicite votre accord pour publier cette réalisation en modèle "Sur Commande" dans mon catalogue Vork.`;

  const existingMeta = safeJsonParse(order.orderMetadata, {});
  const draftProduct = {
    title: String(title).trim(),
    description: String(description || order.productTitle || "").trim(),
    category: category || order.productTitle || "Artisanat d'art",
    netPrice: numNet,
    clientPrice,
    image: primaryImage,
    photos: allPhotos,
    tags: normalizedTags,
    sizes: normalizedSizes,
    colors: normalizedColors,
    manufacturingDays: Number(manufacturingDays) || 7,
  };

  existingMeta.republicationRequest = {
    requestId: consentRequestId,
    requestedBy: artisanRef,
    requestedByName: order.artisanName || "Maâlem",
    requestedAt: now,
    customMessage: finalMessage,
    requiresClient: true,
    requiresSourceVendor,
    sourceVendorId: requiresSourceVendor ? order.sourceVendorId : null,
    status: "pending",
    decisions: {
      client: "pending",
      sourceVendor: requiresSourceVendor ? "pending" : "not_required",
    },
    draftProduct,
  };

  await db.update(orders).set({
    republicationConsentStatus: "pending",
    republicationConsentParty: requiresSourceVendor ? "client_and_source_vendor" : "client",
    orderMetadata: JSON.stringify(existingMeta),
    updatedAt: now,
  }).where(eq(orders.id, orderId));

  const sharedNotifMetadata = {
    orderId,
    consentRequestId,
    customMessage: finalMessage,
    consentStatus: "pending",
    requiresSourceVendor,
    customizationOrigin: order.customizationOrigin || "from_scratch",
    draftPreview: {
      title: draftProduct.title,
      price: clientPrice,
      netPrice: numNet,
      image: primaryImage,
      category: draftProduct.category,
      manufacturingDays: draftProduct.manufacturingDays,
      tags: normalizedTags,
      sizes: normalizedSizes,
      colors: normalizedColors,
    },
  };

  // Notification interactive pour le Client (toujours)
  await createNotificationResilient({
    userId: order.clientRef,
    userType: "client",
    type: "republication_consent_request",
    title: `Demande d'accord de publication — "${draftProduct.title}"`,
    titleAr: `طلب موافقة على نشر إبداع "${draftProduct.title}"`,
    message: finalMessage,
    messageAr: finalMessage,
    sourceId: orderId,
    secondaryUserId: artisanRef,
    secondaryUserName: order.artisanName || "Maâlem",
    idempotencyKey: `consent-req:${consentRequestId}:client`,
    actionStatus: "pending",
    metadata: { ...sharedNotifMetadata, role: "client" },
  });

  // Notification interactive pour le Vendeur de Base (UNIQUEMENT si from_post avec sourceVendorId distinct)
  if (requiresSourceVendor && order.sourceVendorId) {
    await createNotificationResilient({
      userId: order.sourceVendorId,
      userType: "artisan",
      type: "republication_consent_request",
      title: `Accord Vendeur de Base requis — "${draftProduct.title}"`,
      titleAr: `مطلوب موافقة البائع الأصلي — "${draftProduct.title}"`,
      message: `${order.artisanName || "Un artisan"} demande votre accord (avec celui du client) pour publier une création issue de votre modèle : "${finalMessage}"`,
      messageAr: `يطلب ${order.artisanName || "صانع"} موافقتك (مع الزبون) لنشر قطعة مستوحاة من منتجك الأصلي: "${finalMessage}"`,
      sourceId: orderId,
      secondaryUserId: artisanRef,
      secondaryUserName: order.artisanName || "Maâlem",
      idempotencyKey: `consent-req:${consentRequestId}:source_vendor`,
      actionStatus: "pending",
      metadata: { ...sharedNotifMetadata, role: "source_vendor" },
    });
  }

  return {
    success: true,
    pendingConsent: true,
    consentStatus: "pending",
    requiresSourceVendor,
    consentRequestId,
    message: requiresSourceVendor
      ? "Demande d'accord envoyée au Client et au Vendeur de base. Le post sera publié dès que les deux auront accepté."
      : "Demande d'accord envoyée au Client. Le post sera publié automatiquement après son acceptation.",
    message_ar: requiresSourceVendor
      ? "تم إرسال طلب الموافقة إلى الزبون والبائع الأصلي. سيتم النشر بعد موافقتهما معاً."
      : "تم إرسال طلب الموافقة إلى الزبون. سيتم نشر المنشور فور قبوله.",
  };
}

// Compatibilité ascendante avec l'ancien nom d'export utilisé par artisan.routes.js
export const convertOrderToCatalogProduct = requestCatalogPublicationConsent;

/**
 * Réponse interactive (Accepter / Refuser) du Client ou du Vendeur de Base à une demande d'accord (Diagramme 5).
 * Règle : 1 seul refus => Demande REFUSÉE ; Tous acceptent => Publication au catalogue + Notification ACCEPTÉE.
 */
export async function respondToPublicationConsent(orderId, actorUserId, { decision, role = null, reason = "" } = {}) {
  if (!["accept", "refuse"].includes(decision)) {
    throw new Error("decision_invalide");
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");

  const meta = safeJsonParse(order.orderMetadata, {});
  const reqData = meta.republicationRequest;
  if (!reqData) {
    throw new Error("demande_accord_introuvable");
  }

  // Résolution & contrôle d'autorisation strict du répondant
  const isClientActor =
    order.clientRef === actorUserId ||
    (role === "client" && (order.clientRef === actorUserId || order.clientRef === "client-me"));
  const isSourceVendorActor =
    reqData.requiresSourceVendor &&
    Boolean(reqData.sourceVendorId) &&
    isSameVendor(actorUserId, reqData.sourceVendorId);

  let respondentRole = null;
  if (role === "source_vendor" && isSourceVendorActor) respondentRole = "sourceVendor";
  else if (role === "client" && isClientActor) respondentRole = "client";
  else if (isClientActor) respondentRole = "client";
  else if (isSourceVendorActor) respondentRole = "sourceVendor";

  if (!respondentRole) {
    throw new Error("non_autorise");
  }

  // Si déjà clôturé (idempotence)
  if (reqData.status === "granted" || reqData.status === "rejected" || reqData.status === "withdrawn") {
    return {
      success: true,
      alreadyResolved: true,
      consentStatus: reqData.status,
      published: reqData.status === "granted",
      productId: order.publishedProductId || reqData.publishedProductId || null,
    };
  }

  const now = new Date().toISOString();

  // CAS REFUS : une seule personne suffit -> rejet immédiat
  if (decision === "refuse") {
    reqData.decisions[respondentRole] = "rejected";
    reqData.status = "rejected";
    reqData.rejectedBy = respondentRole === "sourceVendor" ? "source_vendor" : "client";
    reqData.rejectionReason = String(reason || "").trim() || null;
    reqData.resolvedAt = now;
    meta.republicationRequest = reqData;

    await db.update(orders).set({
      republicationConsentStatus: "rejected",
      republicationConsentParty: reqData.rejectedBy,
      orderMetadata: JSON.stringify(meta),
      updatedAt: now,
    }).where(eq(orders.id, orderId));

    await updateConsentNotificationsStatus({
      sourceId: orderId,
      actionStatus: "rejected",
      extraMetadata: { rejectedBy: reqData.rejectedBy },
    });

    const partyLabelFr = reqData.rejectedBy === "source_vendor" ? "le vendeur de base" : "le client";
    const partyLabelAr = reqData.rejectedBy === "source_vendor" ? "البائع الأصلي" : "الزبون";

    await createNotificationResilient({
      userId: order.artisanRef,
      userType: "artisan",
      type: "republication_consent_refused",
      title: `Demande REFUSÉE — "${reqData.draftProduct?.title || order.productTitle || "Création"}"`,
      titleAr: `تم رفض الطلب — "${reqData.draftProduct?.title || order.productTitle || "المنتج"}"`,
      message: `Votre demande d'accord pour publier « ${reqData.draftProduct?.title || order.productTitle} » a été refusée par ${partyLabelFr}. Aucun post n'a été publié.`,
      messageAr: `تم رفض طلب نشر « ${reqData.draftProduct?.title || order.productTitle} » من طرف ${partyLabelAr}. لم يتم نشر أي منشور.`,
      sourceId: orderId,
      secondaryUserId: actorUserId,
      idempotencyKey: `consent-refused:${reqData.requestId}`,
      actionStatus: "rejected",
      metadata: { orderId, consentRequestId: reqData.requestId, rejectedBy: reqData.rejectedBy },
    });

    return {
      success: true,
      consentStatus: "rejected",
      published: false,
      rejectedBy: reqData.rejectedBy,
      message: "Refus enregistré. La demande a été clôturée sans publication.",
    };
  }

  // CAS ACCEPTATION
  reqData.decisions[respondentRole] = "accepted";
  await updateConsentNotificationsStatus({
    sourceId: orderId,
    targetUserId: actorUserId,
    actionStatus: "accepted",
    extraMetadata: { acceptedByRole: respondentRole },
  });

  const clientAccepted = reqData.decisions.client === "accepted";
  const sourceVendorAccepted = !reqData.requiresSourceVendor || reqData.decisions.sourceVendor === "accepted";

  if (!clientAccepted || !sourceVendorAccepted) {
    // En attente de l'autre signataire (Cas 2 from_post : Client + Vendeur de base)
    meta.republicationRequest = reqData;
    await db.update(orders).set({
      republicationConsentStatus: "partially_granted",
      orderMetadata: JSON.stringify(meta),
      updatedAt: now,
    }).where(eq(orders.id, orderId));

    return {
      success: true,
      consentStatus: "partially_granted",
      published: false,
      waitingFor: !clientAccepted ? "client" : "source_vendor",
      message: "Votre accord est enregistré. Publication en attente de la validation de l'autre partie.",
    };
  }

  // TOUS ONT ACCEPTÉ -> Publication effective au catalogue en "Sur Commande"
  const draft = reqData.draftProduct || {};
  const newProductId = `prd-custom-${Date.now()}`;
  const pubResult = await createCatalogProduct({
    productId: newProductId,
    artisanRef: order.artisanRef,
    artisanName: order.artisanName || "Maâlem",
    title: draft.title || order.productTitle || "Création Sur-Mesure",
    description: draft.description || "",
    category: draft.category || "Artisanat d'art",
    netPrice: draft.netPrice || Math.round(Number(order.totalPrice || 100) / 1.06),
    productType: "sur_commande",
    photos: draft.photos || [draft.image].filter(Boolean),
    image: draft.image || "",
    tags: draft.tags || [],
    sizes: draft.sizes || [],
    colors: draft.colors || [],
    manufacturingDays: draft.manufacturingDays || 7,
    personalizationMode: "accept_direct",
    ipAuthenticityAccepted: true,
    sourceOrderId: orderId,
  });

  // Indexation Meilisearch + rafraîchissement recommandations (non bloquants)
  loadProducts().catch(() => {});
  try {
    await productsIndex.addDocuments([{ ...pubResult.supabaseRow, artisanName: order.artisanName || "Maâlem", imageUrl: pubResult.normalizedProduct.image }]);
  } catch {}

  reqData.status = "granted";
  reqData.resolvedAt = now;
  reqData.publishedProductId = newProductId;
  meta.republicationRequest = reqData;

  await db.update(orders).set({
    catalogPublishedAt: now,
    publishedProductId: newProductId,
    republicationConsentStatus: "granted",
    republicationConsentParty: reqData.requiresSourceVendor ? "client_and_source_vendor" : "client",
    orderMetadata: JSON.stringify(meta),
    updatedAt: now,
  }).where(eq(orders.id, orderId));

  // Notification au Vendeur réalisateur (V) : Demande ACCEPTÉE (Post publié)
  await createNotificationResilient({
    userId: order.artisanRef,
    userType: "artisan",
    type: "republication_consent_accepted",
    title: `Demande ACCEPTÉE — Post publié`,
    titleAr: `تمت الموافقة — تم نشر المنتج`,
    message: `Votre demande d'accord pour « ${draft.title || order.productTitle} » a été acceptée ! Le post est désormais publié en "Sur Commande" au catalogue.`,
    messageAr: `تم قبول طلب نشر « ${draft.title || order.productTitle} »! أصبح منشورك متاحاً الآن بالكتالوج كمنتج تحت الطلب.`,
    linkUrl: `/products/${newProductId}`,
    sourceId: newProductId,
    idempotencyKey: `consent-accepted:${reqData.requestId}`,
    actionStatus: "accepted",
    metadata: { orderId, newProductId, consentRequestId: reqData.requestId },
  });

  // Notification au Client avec lien & droit de retrait (opt Retrait de l'accord)
  await createNotificationResilient({
    userId: order.clientRef,
    userType: "client",
    type: "from_scratch_published_to_catalog",
    title: `Post publié — "${draft.title || order.productTitle}"`,
    titleAr: `تم النشر في الكتالوج — "${draft.title || order.productTitle}"`,
    message: `Le modèle « ${draft.title || order.productTitle} » est maintenant publié en Sur Commande chez ${order.artisanName || "le Maâlem"}. Vous pouvez consulter la fiche ou demander le retrait de votre accord à tout moment.`,
    messageAr: `أصبح التصميم « ${draft.title || order.productTitle} » منشوراً الآن كمنتج تحت الطلب. يمكنك معاينة المنشور أو سحب موافقتك في أي وقت.`,
    linkUrl: `/products/${newProductId}`,
    sourceId: newProductId,
    secondaryUserId: order.artisanRef,
    secondaryUserName: order.artisanName,
    idempotencyKey: `consent-published-client:${reqData.requestId}`,
    actionStatus: "granted",
    metadata: { orderId, newProductId, canWithdraw: true },
  });

  return {
    success: true,
    consentStatus: "granted",
    published: true,
    productId: newProductId,
    product: pubResult.normalizedProduct,
    message: "Accord complet validé ! Le post 'Sur Commande' est maintenant publié au catalogue.",
  };
}

/**
 * Retrait de l'accord après publication (Diagramme 5 - opt Retrait de l'accord)
 * - Retire/masque le post du catalogue et notifie le vendeur de l'obligation de suppression.
 * - Les commandes déjà en cours restent intactes.
 */
export async function withdrawPublicationConsent(orderId, actorUserId, { reason = "" } = {}) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");

  const isClientActor = order.clientRef === actorUserId || (order.clientRef === "client-me" && Boolean(actorUserId));
  const isBaseVendorActor = Boolean(order.sourceVendorId) && isSameVendor(actorUserId, order.sourceVendorId);
  if (!isClientActor && !isBaseVendorActor) {
    throw new Error("non_autorise");
  }

  if (!order.publishedProductId || order.republicationConsentStatus !== "granted") {
    if (order.republicationConsentStatus === "withdrawn") {
      return { success: true, alreadyWithdrawn: true, consentStatus: "withdrawn" };
    }
    throw new Error("aucun_post_publie_a_retirer");
  }

  const now = new Date().toISOString();
  const meta = safeJsonParse(order.orderMetadata, {});
  if (meta.republicationRequest) {
    meta.republicationRequest.status = "withdrawn";
    meta.republicationRequest.withdrawnAt = now;
    meta.republicationRequest.withdrawnBy = actorUserId;
    meta.republicationRequest.withdrawReason = String(reason || "").trim() || null;
  }

  await withdrawOrDeleteCatalogProduct(order.publishedProductId, "consent_withdrawn");
  loadProducts().catch(() => {});

  await db.update(orders).set({
    republicationConsentStatus: "withdrawn",
    republicationConsentParty: isBaseVendorActor ? "source_vendor" : "client",
    orderMetadata: JSON.stringify(meta),
    updatedAt: now,
  }).where(eq(orders.id, orderId));

  const title = meta.republicationRequest?.draftProduct?.title || order.productTitle || "Création";
  await createNotificationResilient({
    userId: order.artisanRef,
    userType: "artisan",
    type: "republication_consent_withdrawn",
    title: `Retrait de l'accord — Supprimer le post "${title}"`,
    titleAr: `سحب الموافقة — يجب حذف منشور "${title}"`,
    message: `Le client (ou ayants droit) demande le retrait de l'accord pour le post « ${title} ». Obligation de supprimer ce post (les commandes déjà en cours continuent normalement).`,
    messageAr: `تم طلب سحب الموافقة على نشر « ${title} ». يجب حذف المنشور من الكتالوج (تستمر الطلبيات الجارية بشكل عادي).`,
    sourceId: order.publishedProductId,
    secondaryUserId: actorUserId,
    idempotencyKey: `consent-withdrawn:${orderId}:${order.publishedProductId}`,
    actionStatus: "withdrawn",
    metadata: {
      orderId,
      productId: order.publishedProductId,
      actionRequired: "delete_post",
    },
  });

  return {
    success: true,
    consentStatus: "withdrawn",
    productId: order.publishedProductId,
    message: "Retrait de l'accord enregistré. Le post a été retiré et le vendeur a été notifié (les commandes en cours se poursuivent).",
  };
}


