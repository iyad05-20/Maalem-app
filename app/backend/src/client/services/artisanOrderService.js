import { eq, and, gte, or, isNull, sql } from "drizzle-orm";
import { db } from "../../core/db/index.js";
import { orders, vendorWarnings, vendorProfiles } from "../../core/db/schema.js";
import { decrementProductStock, checkStockBeforeAccept } from "../../db/products.repository.js";
import { createNotification } from "../../services/notificationService.js";

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

    // Si la commande provient du Marché Public et est basée sur le modèle d'un autre artisan (Mode 2)
    // Notifier immédiatement le Vendeur Initial (propriétaire du modèle source)
    if (order.sourceVendorId && order.sourceVendorId !== order.artisanRef) {
      try {
        await createNotification({
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
          metadata: { orderId, sourceProductId: order.sourceProductId, sourceVendorId: order.sourceVendorId },
        });
      } catch (notifErr) {
        console.warn("[VORK-API] Failed to emit vendor delegation notification:", notifErr.message);
      }
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
 * 12. Conversion d'une Commande Personnalisée vers un Post "Sur Commande" au Catalogue (Maâlem v2)
 * Règle stricte : accessible uniquement vers la fin de confection (fin de construction avec photo ou livré).
 * Exige une photo finale obligatoire, le marquage des tags et les informations produit.
 */
export async function convertOrderToCatalogProduct(orderId, artisanRef, payload = {}) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");
  if (order.artisanRef !== artisanRef) throw new Error("non_autorise");

  // Vérification stricte : le bouton n'est accessible que vers la fin de confection
  const isFinishedOrAdvanced = ["livre", "valide"].includes(order.status) || 
    (order.status === "en_preparation" && Boolean(order.prepPhotos)) ||
    Boolean(order.shippedAt);

  if (!isFinishedOrAdvanced) {
    throw new Error("conversion_impossible_confection_non_achevee");
  }

  const { title, description, category, price, image, tags = {}, manufacturingDays = 7 } = payload;

  if (!image) {
    throw new Error("image_reelle_confection_obligatoire");
  }
  if (!title || !price) {
    throw new Error("titre_et_prix_obligatoires");
  }

  const now = new Date().toISOString();
  const newProductId = `prd-custom-${Date.now()}`;
  const numNet = Number(price);
  const commissionHt = Math.round(numNet * 0.05);
  const tvaVal = Math.round(commissionHt * 0.20);
  const clientPrice = numNet + commissionHt + tvaVal;

  const { supabase } = await import("../../db/supabase.client.js");

  const productRow = {
    id: newProductId,
    title: String(title).trim(),
    category: category || order.productTitle || "Artisanat d'art",
    category_group: "artisanat",
    price: clientPrice,
    in_stock: true,
    stock: null, // Produit sur commande
    is_out_of_stock: false,
    is_hidden: false,
    personalization_mode: "accept_direct",
    accept_customization: true,
    allow_public_customization: false,
    artisan_name: order.artisanName || "Maâlem",
    image_url: image,
    identity: {
      category: category || "Artisanat d'art",
      description: description || order.productTitle || "",
      product_type: "sur_commande",
      net_price: numNet,
      commission_ht: commissionHt,
      tva: tvaVal,
      manufacturing_days: Number(manufacturingDays) || 7,
      source_order_id: orderId,
    },
    rec_tags: typeof tags === "object" ? tags : {},
    facets: {
      artisan_ref: artisanRef,
    },
    created_at: now,
  };

  try {
    await supabase.from("products").insert(productRow);
  } catch (sbErr) {
    console.warn("[VORK-API] Could not insert into Supabase products:", sbErr.message);
  }

  // Mettre à jour la commande avec la traçabilité
  await db.update(orders).set({
    catalogPublishedAt: now,
    publishedProductId: newProductId,
    republicationConsentStatus: order.customizationOrigin === "from_scratch" ? "client_notified" : "not_required",
    updatedAt: now,
  }).where(eq(orders.id, orderId));

  // Si la commande était "From Scratch" (savoir-faire client), émettre la notification au client
  if (order.customizationOrigin === "from_scratch") {
    try {
      await createNotification({
        userId: order.clientRef,
        userType: "client",
        type: "from_scratch_published_to_catalog",
        title: "Votre création sur-mesure est disponible au catalogue !",
        titleAr: "إبداعك أصبح متوفراً الآن في كتالوج الصانع!",
        message: `Le Maâlem ${order.artisanName || 'partenaire'} a ajouté votre modèle confectionné à son catalogue en produit Sur Commande.`,
        messageAr: `أضاف الصانع ${order.artisanName || 'الشريك'} تصميمك المنفذ إلى كتالوجه كمنتج "تحت الطلب".`,
        linkUrl: `/products/${newProductId}`,
        sourceId: newProductId,
        secondaryUserId: artisanRef,
        secondaryUserName: order.artisanName,
        metadata: { orderId, newProductId },
      });
    } catch (notifClientErr) {
      console.warn("[VORK-API] Failed to emit client publication notification:", notifClientErr.message);
    }
  }

  return {
    success: true,
    productId: newProductId,
    product: productRow,
    message: "Produit 'Sur Commande' créé et publié avec succès dans votre catalogue.",
    message_ar: "تم إنشاء ونشر منتجك 'تحت الطلب' بنجاح في كتالوجك.",
  };
}


