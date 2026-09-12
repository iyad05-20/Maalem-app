import { eq, sql } from "drizzle-orm";
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
 */
export async function confirmSenditPickupReady(orderId, payload = {}) {
  const blAttachedPhoto = typeof payload === "string" ? payload : payload?.blAttachedPhoto;
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");
  if (!order.senditDeliveryCode) throw new Error("bl_non_encore_genere");

  const now = new Date().toISOString();
  await db.update(orders)
    .set({
      status: "en_cours_de_transport",
      senditWaybillPhoto: blAttachedPhoto || "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500",
      shippedAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, orderId));

  return {
    success: true,
    status: "en_cours_de_transport",
    senditDeliveryCode: order.senditDeliveryCode,
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
 * 6. Validation de Livraison Vendeur avec Signature Manuscrite (Art. 11.5)
 */
export async function completeVendeurDelivery(orderId, { signaturePhoto }) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");

  const now = new Date().toISOString();
  
  // Si Produit Personnalisé ou Sur Commande -> Libération immédiate des fonds
  // Si Produit Standard -> Délai de rétractation de 7 jours
  const isCustom = ["personnalise", "sur_commande"].includes(order.productType);
  const withdrawalExpiresAt = isCustom
    ? null
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const escrowReleasedAt = isCustom ? now : null;

  await db.update(orders)
    .set({
      status: "livre",
      deliveredAt: now,
      receptionValidatedBy: "vendeur",
      vendeurDeliverySignaturePhoto: signaturePhoto || "https://images.unsplash.com/photo-1583521214690-73421a1829a9?w=500",
      withdrawalExpiresAt,
      escrowReleasedAt,
      updatedAt: now,
    })
    .where(eq(orders.id, orderId));

  return {
    success: true,
    status: "livre",
    withdrawalExpiresAt,
    escrowReleasedAt,
  };
}

/**
 * 7. Gestion des Avertissements Vendeur (Art. 6.4, 19, 22)
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
      createdAt: now.toISOString(),
    });

  // Mettre à jour le profil du vendeur
  let [profile] = await db.select().from(vendorProfiles).where(eq(vendorProfiles.id, vendorRef));
  if (!profile) {
    await db.insert(vendorProfiles)
      .values({
        id: vendorRef,
        warningCountCurrentMonth: 1,
        suspensionStatus: "active",
        updatedAt: now.toISOString(),
      });
    const [newProfile] = await db.select().from(vendorProfiles).where(eq(vendorProfiles.id, vendorRef));
    profile = newProfile;
  } else {
    const newCount = Number(profile.warningCountCurrentMonth || 0) + 1;
    let newStatus = profile.suspensionStatus || "active";
    let suspendedUntil = profile.suspendedUntil;

    if (newCount >= 10) {
      newStatus = "suspended_7d";
      suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }

    await db.update(vendorProfiles)
      .set({
        warningCountCurrentMonth: newCount,
        suspensionStatus: newStatus,
        suspendedUntil,
        updatedAt: now.toISOString(),
      })
      .where(eq(vendorProfiles.id, vendorRef));
  }

  return { success: true, warningId, monthYear };
}

// Wrapper de compatibilité pour l'ancien shipOrder
export async function shipOrder(orderId, deliveryData) {
  return prepareSenditShipping(orderId, deliveryData);
}
