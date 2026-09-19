import { and, eq, lt } from "drizzle-orm";
import type { db as DbType } from "../../core/db";
import { orders, paymentIntents } from "../../core/db/schema";

export async function expireStaleIntents(db: typeof DbType): Promise<number> {
  const now = new Date().toISOString();

  const stale = db
    .select()
    .from(paymentIntents)
    .where(and(eq(paymentIntents.statut, "cree"), lt(paymentIntents.expiresAt, now)))
    .all();

  for (const intent of stale) {
    db.transaction((tx) => {
      tx.update(paymentIntents)
        .set({ statut: "expire", updatedAt: now })
        .where(eq(paymentIntents.id, intent.id))
        .run();

      const order = tx.select().from(orders).where(eq(orders.id, intent.orderId)).get();
      if (order && order.status === "paiement_initie") {
        tx.update(orders)
          .set({ status: "en_attente_paiement", updatedAt: now })
          .where(eq(orders.id, order.id))
          .run();
      }
    });
  }

  return stale.length;
}
