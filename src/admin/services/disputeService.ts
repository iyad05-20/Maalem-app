import { eq } from "drizzle-orm";
import type { db as DbType } from "../../core/db";
import { orders, disputes, ledgerEntries, paymentsReceived } from "../../core/db/schema";
import { calculateCancellationRefund } from "../../client/services/cancellationService";

export function openDispute(db: typeof DbType, orderId: string, reason: string): string {
  return db.transaction((tx: any) => {
    const order = tx.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!order) {
      throw new Error("commande_introuvable");
    }

    const now = new Date().toISOString();
    const disputeId = crypto.randomUUID();

    tx.insert(disputes)
      .values({
        id: disputeId,
        orderId,
        reason,
        status: "ouvert",
        createdAt: now,
      })
      .run();

    tx.update(orders)
      .set({
        status: "en_reclamation",
        updatedAt: now,
      })
      .where(eq(orders.id, orderId))
      .run();

    return disputeId;
  });
}

export function resolveDispute(
  db: typeof DbType,
  disputeId: string,
  resolution: "faute_vendeur" | "faute_sendit" | "faute_client"
) {
  return db.transaction((tx: any) => {
    const dispute = tx.select().from(disputes).where(eq(disputes.id, disputeId)).get();
    if (!dispute) {
      throw new Error("litige_introuvable");
    }
    if (dispute.status !== "ouvert") {
      throw new Error("litige_deja_resolu");
    }

    const order = tx.select().from(orders).where(eq(orders.id, dispute.orderId)).get();
    if (!order) {
      throw new Error("commande_introuvable");
    }

    const now = new Date().toISOString();
    const payments = tx
      .select()
      .from(paymentsReceived)
      .where(eq(paymentsReceived.orderId, order.id))
      .all();
    const totalPaid = payments.reduce((sum: number, p: any) => sum + p.amount, 0);

    if (resolution === "faute_vendeur") {
      if (totalPaid > 0) {
        tx.insert(ledgerEntries)
          .values({
            id: crypto.randomUUID(),
            orderId: order.id,
            compteDebit: `escrow[${order.id}]`,
            compteCredit: `wallet[${order.clientRef}]`,
            montant: totalPaid,
            type: "litige_faute_vendeur_remboursement",
            createdAt: now,
          })
          .run();
      }

      tx.update(orders)
        .set({ status: "annulee", updatedAt: now })
        .where(eq(orders.id, order.id))
        .run();
    } else if (resolution === "faute_sendit") {
      if (totalPaid > 0) {
        tx.insert(ledgerEntries)
          .values({
            id: crypto.randomUUID(),
            orderId: order.id,
            compteDebit: `escrow[${order.id}]`,
            compteCredit: `wallet[${order.clientRef}]`,
            montant: totalPaid,
            type: "litige_faute_sendit_remboursement_client",
            createdAt: now,
          })
          .run();
      }

      const artisanShare = Math.round(order.totalPrice * 0.95 * 100) / 100;
      tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId: order.id,
          compteDebit: "sendit_guarantee_fund",
          compteCredit: `wallet[${order.artisanRef}]`,
          montant: artisanShare,
          type: "litige_faute_sendit_indemnisation_artisan",
          createdAt: now,
        })
        .run();

      tx.update(orders)
        .set({ status: "complete", updatedAt: now })
        .where(eq(orders.id, order.id))
        .run();
    } else {
      const result = calculateCancellationRefund(order as any, now);
      const refundCash = Math.max(0, Math.round((totalPaid - result.totalRetained) * 100) / 100);

      if (refundCash > 0) {
        tx.insert(ledgerEntries)
          .values({
            id: crypto.randomUUID(),
            orderId: order.id,
            compteDebit: `escrow[${order.id}]`,
            compteCredit: `wallet[${order.clientRef}]`,
            montant: refundCash,
            type: "litige_faute_client_remboursement_partiel",
            createdAt: now,
          })
          .run();
      }

      if (result.indemnityAmount > 0) {
        tx.insert(ledgerEntries)
          .values({
            id: crypto.randomUUID(),
            orderId: order.id,
            compteDebit: `escrow[${order.id}]`,
            compteCredit: `wallet[${order.artisanRef}]`,
            montant: result.indemnityAmount,
            type: "litige_faute_client_indemnite_artisan",
            createdAt: now,
          })
          .run();
      }

      if (result.commissionAmount > 0) {
        tx.insert(ledgerEntries)
          .values({
            id: crypto.randomUUID(),
            orderId: order.id,
            compteDebit: `escrow[${order.id}]`,
            compteCredit: "platform_revenue",
            montant: result.commissionAmount,
            type: "litige_faute_client_commission",
            createdAt: now,
          })
          .run();
      }

      tx.update(orders)
        .set({ status: "annulee", updatedAt: now })
        .where(eq(orders.id, order.id))
        .run();
    }

    tx.update(disputes)
      .set({
        resolution,
        status: "resolu",
        resolvedAt: now,
      })
      .where(eq(disputes.id, disputeId))
      .run();

    return { resolution };
  });
}
