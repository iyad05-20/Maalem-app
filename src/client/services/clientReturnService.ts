import { eq } from "drizzle-orm";
import type { db as DbType } from "../../core/db";
import { orders, returnRequests, ledgerEntries, paymentsReceived } from "../../core/db/schema";

/**
 * Demande de retour d'un produit standard (Droit de rétractation 7j).
 */
export function requestReturn(
  db: typeof DbType,
  orderId: string,
  mode: "sendit" | "propres_moyens",
  returnShippingFee: number = 0
): string {
  return db.transaction((tx) => {
    const order = tx.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!order) {
      throw new Error("commande_introuvable");
    }
    if (order.productType !== "standard") {
      throw new Error("droit_de_retractation_exclu_produit_non_standard");
    }
    if (order.status !== "livre") {
      throw new Error(`retour_impossible_statut_incompatible:${order.status}`);
    }

    const now = new Date().toISOString();
    const returnId = crypto.randomUUID();

    tx.insert(returnRequests)
      .values({
        id: returnId,
        orderId,
        mode,
        returnShippingFee: mode === "sendit" ? returnShippingFee : 0,
        status: "initie",
        createdAt: now,
      })
      .run();

    tx.update(orders)
      .set({
        status: "retour_initie",
        updatedAt: now,
      })
      .where(eq(orders.id, orderId))
      .run();

    return returnId;
  });
}

/**
 * Validation du retour et versement du remboursement au client.
 */
export function processReturnRefund(
  db: typeof DbType,
  returnId: string,
  action: "validate" | "reject"
) {
  return db.transaction((tx) => {
    const req = tx.select().from(returnRequests).where(eq(returnRequests.id, returnId)).get();
    if (!req) {
      throw new Error("demande_retour_introuvable");
    }
    if (req.status !== "initie") {
      throw new Error("demande_retour_deja_traitee");
    }

    const order = tx.select().from(orders).where(eq(orders.id, req.orderId)).get();
    if (!order) {
      throw new Error("commande_introuvable");
    }

    const now = new Date().toISOString();

    if (action === "reject") {
      tx.update(returnRequests)
        .set({ status: "refuse", resolvedAt: now })
        .where(eq(returnRequests.id, returnId))
        .run();

      tx.update(orders)
        .set({ status: "livre", updatedAt: now })
        .where(eq(orders.id, order.id))
        .run();

      return { status: "refuse" };
    }

    const payments = tx
      .select()
      .from(paymentsReceived)
      .where(eq(paymentsReceived.orderId, order.id))
      .all();
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    let refundCash = totalPaid;
    if (req.mode === "sendit" && req.returnShippingFee > 0) {
      refundCash = Math.max(0, Math.round((totalPaid - req.returnShippingFee) * 100) / 100);
    }

    if (refundCash > 0) {
      tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId: order.id,
          compteDebit: `escrow[${order.id}]`,
          compteCredit: `wallet[${order.clientRef}]`,
          montant: refundCash,
          type: "retour_remboursement_client",
          metadata: JSON.stringify({ mode: req.mode, returnShippingFee: req.returnShippingFee }),
          createdAt: now,
        })
        .run();
    }

    if (req.mode === "sendit" && req.returnShippingFee > 0) {
      const feeAmount = Math.min(totalPaid, req.returnShippingFee);
      tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId: order.id,
          compteDebit: `escrow[${order.id}]`,
          compteCredit: "sendit_revenue",
          montant: feeAmount,
          type: "retour_frais_sendit",
          createdAt: now,
        })
        .run();
    }

    tx.update(returnRequests)
      .set({ status: "valide", resolvedAt: now })
      .where(eq(returnRequests.id, returnId))
      .run();

    tx.update(orders)
      .set({ status: "annulee", updatedAt: now })
      .where(eq(orders.id, order.id))
      .run();

    return { status: "valide", refundCash };
  });
}
