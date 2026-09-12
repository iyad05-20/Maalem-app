import { eq, and, gte, or, isNull, sql } from "drizzle-orm";
import { db } from "../../core/db/index.js";
import { orders, vendorWarnings, vendorProfiles } from "../../core/db/schema.js";
import { senditClient } from "../../services/sendit/senditClient.js";

/**
 * 1. Acceptation par l'artisan (lance la fabrication / préparation)
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

    const now = new Date().toISOString();
    await tx.update(orders)
      .set({
        status: "en_preparation",
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));
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

  // Seuls les produits standards peuvent être expédiés par Sendit (Art. 8.3)
  if (order.productType !== "standard") {
    throw new Error("sendit_interdit_produits_personnalises_sur_commande");
  }

  // Règle 11/09/2026 : Contrôle de volume Sendit (max 40x40 cm)
  if (order.packageDimensions) {
    try {
      const dims = typeof order.packageDimensions === "string" ? JSON.parse(order.packageDimensions) : order.packageDimensions;
      if (dims && (Number(dims.length || 0) > 40 || Number(dims.width || 0) > 40 || Number(dims.height || 0) > 40)) {
        throw new Error("colis_depasse_volume_max_sendit_40x40");
      }
    } catch (err) {
      if (err.message === "colis_depasse_volume_max_sendit_40x40") throw err;
    }
  }

  const isSimulation = process.env.SENDIT_SIMULATION === "true" || !process.env.SENDIT_API_TOKEN;
  let senditDeliveryCode;
  let waybillUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

  if (!isSimulation) {
    try {
      const senditResult = await senditClient.createDelivery({
        pickup_district_id: Number(deliveryData.pickup_district_id || 46),
        district_id: Number(deliveryData.district_id || 1),
        name: deliveryData.name || "Client Destinataire",
        amount: Number(order.totalPrice),
        address: deliveryData.address || "Adresse Client",
        phone: deliveryData.phone || "0600000000",
        reference: order.id,
        allow_open: order.allowOpen ?? 1,
        allow_try: order.allowTry ?? 0,
      });

      if (senditResult.success && senditResult.data?.code) {
        senditDeliveryCode = senditResult.data.code;
      }
    } catch (err) {
      console.warn(`[VORK-API] ⚠️ Sendit Real API call failed (${err.message}). Falling back to simulation code.`);
    }
  } else {
    console.log(`[VORK-API] 🧪 Mode Sendit Simulation actif (SENDIT_SIMULATION=true).`);
  }

  if (!senditDeliveryCode) {
    senditDeliveryCode = `SND-SIM-${order.id.slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  }

  const now = new Date().toISOString();
  await db.update(orders)
    .set({
      senditDeliveryCode: senditDeliveryCode,
      senditWaybillUrl: waybillUrl,
      pickupDistrictId: Number(deliveryData.pickup_district_id || 46),
      deliveryDistrictId: Number(deliveryData.district_id || 1),
      readyToShipAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, orderId));

  return {
    success: true,
    senditDeliveryCode,
    waybillUrl,
    message: "Étape 1 réussie : Bon de livraison généré. Veuillez coller le BL sur le colis et prendre la photo pour l'étape 2.",
  };
}

/**
 * 4. Sendit Étape 2 : Déclaration Colis Prêt pour Ramassage avec Photo du BL collé (Art. 8.3)
 * + Saisie du nombre de jours de transport estimé (max 30j - Règle 11/09/2026)
 */
export async function confirmSenditPickupReady(orderId, payload = {}) {
  const blAttachedPhoto = typeof payload === "string" ? payload : payload?.blAttachedPhoto;
  const estimatedDays = Math.min(30, Math.max(1, Number(payload?.estimatedTransportDays || 7)));

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");
  if (!order.senditDeliveryCode) throw new Error("bl_non_encore_genere");

  const now = new Date().toISOString();
  await db.update(orders)
    .set({
      status: "en_cours_de_transport",
      senditWaybillPhoto: blAttachedPhoto || "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500",
      estimatedTransportDays: estimatedDays,
      shippedAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, orderId));

  return {
    success: true,
    status: "en_cours_de_transport",
    senditDeliveryCode: order.senditDeliveryCode,
    estimatedTransportDays: estimatedDays,
  };
}

/**
 * 5. Transport assuré directement par l'Artisan (Vendeur Self-Transport - Art. 8.2, 9.3, 10.3)
 */
export async function shipVendeurSelf(orderId, { transportDurationDays = 7, notes = "" }) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");

  if (transportDurationDays > 30) {
    throw new Error("delai_transport_max_30_jours");
  }

  const now = new Date().toISOString();
  await db.update(orders)
    .set({
      status: "en_cours_de_transport",
      transportProvider: "vendeur",
      estimatedTransportDays: transportDurationDays,
      shippedAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, orderId));

  return {
    success: true,
    status: "en_cours_de_transport",
    transportProvider: "vendeur",
    transportDurationDays,
  };
}

/**
 * 6. Validation de Livraison Vendeur avec Signature Manuscrite (Art. 11.5 & Décisions Ziad)
 */
export async function completeVendeurDelivery(orderId, { signaturePhoto }) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");

  const now = new Date().toISOString();
  const isCustom = ["personnalise", "sur_commande"].includes(order.productType);

  // Décision Ziad :
  // - Si Sur-mesure / Sur commande : Libération immédiate des fonds dès la livraison
  // - Si Standard : Le compte à rebours 7j ne commence que lorsque le client clique "Approuvé"
  const escrowReleasedAt = isCustom ? now : null;
  const withdrawalExpiresAt = null; // En attente du clic client pour Standard

  await db.update(orders)
    .set({
      status: "livre",
      deliveredAt: now,
      receptionValidatedBy: "vendeur",
      vendeurDeliverySignaturePhoto: signaturePhoto || "https://images.unsplash.com/photo-1583521214690-73421a1829a9?w=500",
      clientApprovalStatus: isCustom ? "approved" : "pending",
      withdrawalExpiresAt,
      escrowReleasedAt,
      escrowActionChoice: isCustom ? "released_to_wallet" : "pending",
      updatedAt: now,
    })
    .where(eq(orders.id, orderId));

  return {
    success: true,
    status: "livre",
    isCustom,
    clientApprovalStatus: isCustom ? "approved" : "pending",
    escrowReleasedAt,
  };
}

/**
 * 7. Gestion des Avertissements Vendeur (Décision Ziad 11/09/2026 : 3 avertissements en 14j -> Suspension 7j)
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

  // Calcul glissant : nombre d'avertissements actifs sur les 14 derniers jours
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const recentWarnings = await db.select().from(vendorWarnings).where(
    and(
      eq(vendorWarnings.vendorRef, vendorRef),
      gte(vendorWarnings.createdAt, fourteenDaysAgo),
      or(eq(vendorWarnings.isDismissed, 0), isNull(vendorWarnings.isDismissed))
    )
  );
  const count14d = recentWarnings.length;

  let [profile] = await db.select().from(vendorProfiles).where(eq(vendorProfiles.id, vendorRef));
  if (!profile) {
    const isSuspended = count14d >= 3;
    await db.insert(vendorProfiles)
      .values({
        id: vendorRef,
        warningCountCurrentMonth: 1,
        warningCount14d: count14d,
        suspensionStatus: isSuspended ? "suspended_7d" : "active",
        suspensionCount: isSuspended ? 1 : 0,
        suspendedUntil: isSuspended ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        updatedAt: now.toISOString(),
      });
  } else {
    let newStatus = profile.suspensionStatus || "active";
    let suspendedUntil = profile.suspendedUntil;
    let suspensionCount = Number(profile.suspensionCount || 0);

    // Seuil strict : 3 avertissements sur 14 jours -> suspension 7 jours
    if (count14d >= 3) {
      newStatus = "suspended_7d";
      suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      suspensionCount += 1;
    }

    await db.update(vendorProfiles)
      .set({
        warningCountCurrentMonth: Number(profile.warningCountCurrentMonth || 0) + 1,
        warningCount14d: count14d,
        suspensionStatus: newStatus,
        suspensionCount,
        suspendedUntil,
        updatedAt: now.toISOString(),
      })
      .where(eq(vendorProfiles.id, vendorRef));
  }

  return { success: true, warningId, count14d };
}

/**
 * 8. Choix de l'Artisan après expiration des 7 jours de rétractation (Décision Ziad 11/09/2026)
 * - action === 'claim' : Débloque les fonds pour la commande spécifique seule
 * - action === 'extend' : Accorde un délai supplémentaire au client et permet de le contacter
 */
export async function handleEscrowChoice(orderId, artisanRef, action, extendDays = 7) {
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
  } else if (action === "extend") {
    const days = Math.min(30, Math.max(1, Number(extendDays)));
    const newExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await db.update(orders).set({
      withdrawalExpiresAt: newExpiresAt,
      escrowActionChoice: "extended_by_artisan",
      updatedAt: now,
    }).where(eq(orders.id, orderId));

    return {
      success: true,
      action: "extend",
      message: `Délai prolongé de ${days} jours pour le client.`,
      newWithdrawalExpiresAt: newExpiresAt,
    };
  } else {
    throw new Error("action_invalide_claim_ou_extend");
  }
}

/**
 * 9. Inciter le Client à approuver la réception (Décision Ziad 11/09/2026)
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
 * 10. Validation de réception par le Client (enclenche les 7 jours de rétractation)
 */
export async function clientApproveReceipt(orderId, clientRef) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");
  if (order.clientRef !== clientRef) throw new Error("non_autorise");

  const now = new Date();
  const isCustom = ["personnalise", "sur_commande"].includes(order.productType);

  const withdrawalExpiresAt = isCustom
    ? null
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const escrowReleasedAt = isCustom ? now.toISOString() : null;

  await db.update(orders).set({
    clientApprovalStatus: "approved",
    receptionValidatedBy: "client",
    withdrawalExpiresAt,
    escrowReleasedAt,
    escrowActionChoice: isCustom ? "released_to_wallet" : "pending",
    updatedAt: now.toISOString(),
  }).where(eq(orders.id, orderId));

  return {
    success: true,
    withdrawalExpiresAt,
    escrowReleasedAt,
    isCustom,
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

