import { eq } from "drizzle-orm";
import type { db as DbType } from "../../core/db";
import { orders, paymentIntents, ledgerEntries, paymentsReceived } from "../../core/db/schema";
import type { CallbackResult } from "../../core/paymentProviders/PaymentProvider";
import { calculateCancellationRefund } from "./cancellationService";

export class CallbackError extends Error {}

function isUniqueConstraintError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string" &&
    (e as { message: string }).message.includes("UNIQUE constraint failed")
  );
}

export async function processCallback(
  db: typeof DbType,
  result: CallbackResult,
  source: string
) {
  if (!result.valid) {
    throw new CallbackError("hash_invalide");
  }
  if (!result.paymentIntentId) {
    throw new CallbackError("payment_intent_introuvable");
  }

  const intent = db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.id, result.paymentIntentId))
    .get();
  if (!intent) {
    throw new CallbackError("payment_intent_introuvable");
  }

  if (intent.statut === "confirme" || intent.statut === "echoue") {
    return intent;
  }

  const order = db.select().from(orders).where(eq(orders.id, intent.orderId)).get();
  if (!order) {
    throw new CallbackError("commande_introuvable");
  }

  if (order.status !== "paiement_initie") {
    throw new CallbackError(`commande_dans_un_etat_inattendu:${order.status}`);
  }

  const now = new Date().toISOString();

  if (!result.success) {
    return db.transaction((tx) => {
      tx.update(paymentIntents)
        .set({ statut: "echoue", providerRef: result.providerRef, updatedAt: now })
        .where(eq(paymentIntents.id, intent.id))
        .run();
      tx.update(orders)
        .set({ status: "paiement_echoue", updatedAt: now })
        .where(eq(orders.id, order.id))
        .run();
      return { ...intent, statut: "echoue" as const, providerRef: result.providerRef };
    });
  }

  try {
    return db.transaction((tx) => {
      tx.update(paymentIntents)
        .set({ statut: "confirme", providerRef: result.providerRef, updatedAt: now })
        .where(eq(paymentIntents.id, intent.id))
        .run();

      tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId: order.id,
          compteDebit: `${intent.provider}_incoming`,
          compteCredit: `escrow[${order.id}]`,
          montant: intent.montant,
          type: "paiement_confirme",
          metadata: JSON.stringify({ paymentIntentId: intent.id, tranche: intent.tranche }),
          createdAt: now,
        })
        .run();

      tx.insert(paymentsReceived)
        .values({
          id: crypto.randomUUID(),
          orderId: order.id,
          paymentIntentId: intent.id,
          source,
          amount: intent.montant,
          tranche: intent.tranche,
          confirmedAt: now,
        })
        .run();

      tx.update(orders)
        .set({
          status: intent.tranche === "total_100" ? "payee_integralement" : "acompte_verse",
          updatedAt: now,
        })
        .where(eq(orders.id, order.id))
        .run();

      return { ...intent, statut: "confirme" as const, providerRef: result.providerRef };
    });
  } catch (e: unknown) {
    if (isUniqueConstraintError(e)) {
      const current = db
        .select()
        .from(paymentIntents)
        .where(eq(paymentIntents.id, intent.id))
        .get();
      if (current) return current;
    }
    throw e;
  }
}

export function cancelOrder(
  db: typeof DbType,
  orderId: string,
  cancelTimeStr?: string
) {
  return db.transaction((tx) => {
    const order = tx.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!order) {
      throw new Error("commande_introuvable");
    }
    if (order.status === "annulee" || order.status === "complete") {
      throw new Error(`commande_deja_terminee_ou_annulee:${order.status}`);
    }
    if (order.shippedAt || order.status === "en_cours_de_transport") {
      throw new Error("annulation_impossible_commande_deja_en_cours_de_transport");
    }

    const now = new Date().toISOString();
    const result = calculateCancellationRefund(order as any, cancelTimeStr || now);

    const payments = tx
      .select()
      .from(paymentsReceived)
      .where(eq(paymentsReceived.orderId, orderId))
      .all();
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    const refundCash = Math.max(0, Math.round((totalPaid - result.totalRetained) * 100) / 100);

    if (refundCash > 0) {
      tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId,
          compteDebit: `escrow[${orderId}]`,
          compteCredit: `wallet[${order.clientRef}]`,
          montant: refundCash,
          type: "annulation_remboursement_client",
          metadata: JSON.stringify(result),
          createdAt: now,
        })
        .run();
    }

    if (result.indemnityAmount > 0) {
      tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId,
          compteDebit: `escrow[${orderId}]`,
          compteCredit: `wallet[${order.artisanRef}]`,
          montant: result.indemnityAmount,
          type: "annulation_indemnite_artisan",
          metadata: JSON.stringify(result),
          createdAt: now,
        })
        .run();
    }

    if (result.commissionAmount > 0) {
      tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId,
          compteDebit: `escrow[${orderId}]`,
          compteCredit: "platform_revenue",
          montant: result.commissionAmount,
          type: "annulation_commission_retenue",
          metadata: JSON.stringify(result),
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

    return {
      ...result,
      totalPaid,
      refundCash,
    };
  });
}

export function confirmDeliveryPayment(db: typeof DbType, orderId: string): void {
  db.transaction((tx) => {
    const order = tx.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!order) throw new Error("commande_introuvable");
    if (order.totalPrice < 1000) return;

    const payments = tx
      .select()
      .from(paymentsReceived)
      .where(eq(paymentsReceived.orderId, orderId))
      .all();
    const hasSolde = payments.some((p) => p.tranche === "solde_50");
    if (hasSolde) return;

    const now = new Date().toISOString();
    const soldeAmount = order.totalPrice * 0.5;

    tx.insert(paymentsReceived)
      .values({
        id: crypto.randomUUID(),
        orderId,
        paymentIntentId: null,
        source: "cash_on_delivery",
        amount: soldeAmount,
        tranche: "solde_50",
        confirmedAt: now,
      })
      .run();

    tx.insert(ledgerEntries)
      .values({
        id: crypto.randomUUID(),
        orderId,
        compteDebit: "cash_on_delivery_incoming",
        compteCredit: `escrow[${orderId}]`,
        montant: soldeAmount,
        type: "paiement_solde_confirme",
        metadata: JSON.stringify({ tranche: "solde_50" }),
        createdAt: now,
      })
      .run();
  });
}

export function deliverOrder(db: typeof DbType, orderId: string, deliveryTimeStr?: string): void {
  db.transaction((tx) => {
    const order = tx.select().from(orders).where(eq(orders.id, orderId)).get();
    if (!order) throw new Error("commande_introuvable");
    
    if (order.totalPrice >= 1000) {
      confirmDeliveryPayment(tx, orderId);
    }

    const now = deliveryTimeStr || new Date().toISOString();
    const P = order.totalPrice;

    tx.update(orders)
      .set({
        status: "livre",
        deliveredAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, orderId))
      .run();
  });
}
