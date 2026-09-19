import { eq } from "drizzle-orm";
import type { db as DbType } from "../../core/db";
import { orders, ledgerEntries, paymentsReceived } from "../../core/db/schema";
import { senditClient } from "../../services/sendit/senditClient";

export function acceptOrder(db: typeof DbType, orderId: string): void {
  db.transaction((tx: any) => {
    const order = tx.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!order) {
      throw new Error("commande_introuvable");
    }
    if (!["payee_integralement", "acompte_verse"].includes(order.status)) {
      throw new Error(`statut_incompatible_pour_acceptation:${order.status}`);
    }

    const now = new Date().toISOString();
    tx.update(orders)
      .set({
        status: "en_preparation",
        acceptedAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, orderId))
      .run();
  });
}

export function refuseOrder(db: typeof DbType, orderId: string): void {
  db.transaction((tx: any) => {
    const order = tx.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!order) {
      throw new Error("commande_introuvable");
    }
    if (!["payee_integralement", "acompte_verse"].includes(order.status)) {
      throw new Error(`statut_incompatible_pour_refus:${order.status}`);
    }

    const payments = tx
      .select()
      .from(paymentsReceived)
      .where(eq(paymentsReceived.orderId, orderId))
      .all();
    const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

    const now = new Date().toISOString();

    if (totalPaid > 0) {
      tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId,
          compteDebit: `escrow[${orderId}]`,
          compteCredit: `wallet[${order.clientRef}]`,
          montant: totalPaid,
          type: "refus_artisan_remboursement",
          metadata: JSON.stringify({ totalPaid }),
          createdAt: now,
        })
        .run();
    }

    tx.update(orders)
      .set({
        status: "annulee",
        updatedAt: now,
      })
      .where(eq(orders.id, orderId))
      .run();
  });
}


export async function shipOrder(
  db: typeof DbType,
  orderId: string,
  deliveryData: {
    pickup_district_id: number;
    district_id: number;
    name: string;
    phone: string;
    address: string;
  }
): Promise<string> {
  const order = db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) {
    throw new Error("commande_introuvable");
  }
  if (order.status !== "en_preparation") {
    throw new Error(`statut_incompatible_pour_expedition:${order.status}`);
  }

  // 1. Appeler l'API Sendit pour créer le colis
  const senditResult = await senditClient.createDelivery({
    pickup_district_id: deliveryData.pickup_district_id,
    district_id: deliveryData.district_id,
    name: deliveryData.name,
    amount: order.totalPrice,
    address: deliveryData.address,
    phone: deliveryData.phone,
    reference: order.id,
    allow_open: order.allowOpen ?? 1,
    allow_try: order.allowTry ?? 0,
  });

  if (!senditResult.success || !senditResult.data?.code) {
    throw new Error("echec_creation_livraison_sendit");
  }

  const senditDeliveryCode = senditResult.data.code;
  const now = new Date().toISOString();

  // 2. Mettre à jour le statut et enregistrer le code de suivi Sendit
  db.update(orders)
    .set({
      status: "en_cours_de_transport",
      senditDeliveryCode: senditDeliveryCode,
      pickupDistrictId: deliveryData.pickup_district_id,
      deliveryDistrictId: deliveryData.district_id,
      shippedAt: now,
      updatedAt: now,
    })
    .where(eq(orders.id, orderId))
    .run();

  return senditDeliveryCode;
}
