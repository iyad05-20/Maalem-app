export {
  processCallback,
  cancelOrder,
  confirmDeliveryPayment,
  deliverOrder,
  CallbackError,
} from "../client/services/clientPaymentService";

export { acceptOrder, refuseOrder } from "../artisan/services/artisanOrderService";

import { eq, or } from "drizzle-orm";
import type { db as DbType } from "../core/db";
import { orders, ledgerEntries } from "../core/db/schema";

/**
 * Libération des fonds séquestrés (Règle d'Escrow Uniforme 15 jours) :
 * - 100% des fonds de chaque commande restent bloqués en escrow pendant 15 jours après livraison.
 * - À J+15 : Libération de 95% à l'artisan, 5% commission plateforme, 0.01% TVA, statut passe à 'complete'.
 */
export function releaseEscrow(db: typeof DbType, currentTimeStr?: string): number {
  const currentTime = currentTimeStr ? new Date(currentTimeStr) : new Date();
  let count = 0;

  return db.transaction((tx) => {
    const pendingOrders = tx
      .select()
      .from(orders)
      .where(or(eq(orders.status, "livre"), eq(orders.status, "livre_reserve_bloquee")))
      .all();

    for (const order of pendingOrders) {
      if (!order.deliveredAt) continue;
      const deliveredDate = new Date(order.deliveredAt);
      const diffDays = (currentTime.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays >= 15) {
        const now = currentTime.toISOString();
        const P = order.totalPrice;
        const artisanShare = Math.round((P * 0.95) * 100) / 100;
        const platformCommission = Math.round((P * 0.05) * 100) / 100;
        const tvaTax = Math.round((P * 0.0001) * 100) / 100;

        tx.insert(ledgerEntries)
          .values({
            id: crypto.randomUUID(),
            orderId: order.id,
            compteDebit: `escrow[${order.id}]`,
            compteCredit: `wallet[${order.artisanRef}]`,
            montant: artisanShare,
            type: "liberation_escrow_artisan_95",
            createdAt: now,
          })
          .run();

        tx.insert(ledgerEntries)
          .values({
            id: crypto.randomUUID(),
            orderId: order.id,
            compteDebit: `escrow[${order.id}]`,
            compteCredit: "platform_revenue",
            montant: platformCommission,
            type: "liberation_commission_5",
            createdAt: now,
          })
          .run();

        if (tvaTax > 0) {
          tx.insert(ledgerEntries)
            .values({
              id: crypto.randomUUID(),
              orderId: order.id,
              compteDebit: `escrow[${order.id}]`,
              compteCredit: "tax_tva_account",
              montant: tvaTax,
              type: "tva_prelevement_001",
              createdAt: now,
            })
            .run();
        }

        tx.update(orders)
          .set({ status: "complete", updatedAt: now })
          .where(eq(orders.id, order.id))
          .run();

        count++;
      }
    }

    return count;
  });
}
