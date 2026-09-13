import { eq } from "drizzle-orm";
import { orders, paymentIntents, ledgerEntries, paymentsReceived } from "../../core/db/schema.js";
import { calculateCancellationRefund } from "./cancellationService.js";

export class CallbackError extends Error {}

function isUniqueConstraintError(e) {
  if (!e || typeof e !== "object") return false;
  if (e.code === "23505") return true;
  const msg = String(e.message || "");
  return (
    msg.includes("UNIQUE constraint failed") ||
    msg.includes("duplicate key") ||
    msg.includes("unique constraint")
  );
}

export async function processCallback(db, result, source) {
  if (!result.valid) {
    throw new CallbackError("hash_invalide");
  }
  if (!result.paymentIntentId) {
    throw new CallbackError("payment_intent_introuvable");
  }

  const [intent] = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.id, result.paymentIntentId));
  if (!intent) {
    throw new CallbackError("payment_intent_introuvable");
  }

  if (intent.statut === "confirme" || intent.statut === "echoue") {
    return intent;
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, intent.orderId));
  if (!order) {
    throw new CallbackError("commande_introuvable");
  }

  if (order.status !== "paiement_initie") {
    throw new CallbackError(`commande_dans_un_etat_inattendu:${order.status}`);
  }

  const now = new Date().toISOString();

  if (!result.success) {
    return await db.transaction(async (tx) => {
      await tx.update(paymentIntents)
        .set({ statut: "echoue", providerRef: result.providerRef, updatedAt: now })
        .where(eq(paymentIntents.id, intent.id));
      await tx.update(orders)
        .set({ status: "paiement_echoue", updatedAt: now })
        .where(eq(orders.id, order.id));
      return { ...intent, statut: "echoue", providerRef: result.providerRef };
    });
  }

  try {
    return await db.transaction(async (tx) => {
      await tx.update(paymentIntents)
        .set({ statut: "confirme", providerRef: result.providerRef, updatedAt: now })
        .where(eq(paymentIntents.id, intent.id));

      await tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId: order.id,
          compteDebit: `${intent.provider}_incoming`,
          compteCredit: `escrow[${order.id}]`,
          montant: intent.montant,
          type: "paiement_confirme",
          metadata: JSON.stringify({ paymentIntentId: intent.id, tranche: intent.tranche }),
          createdAt: now,
        });

      await tx.insert(paymentsReceived)
        .values({
          id: crypto.randomUUID(),
          orderId: order.id,
          paymentIntentId: intent.id,
          source,
          amount: intent.montant,
          tranche: intent.tranche,
          confirmedAt: now,
        });

      await tx.update(orders)
        .set({
          status: intent.tranche === "total_100" ? "payee_integralement" : "acompte_verse",
          updatedAt: now,
        })
        .where(eq(orders.id, order.id));

      return { ...intent, statut: "confirme", providerRef: result.providerRef };
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) {
      const [current] = await db
        .select()
        .from(paymentIntents)
        .where(eq(paymentIntents.id, intent.id));
      if (current) return current;
    }
    throw e;
  }
}

export async function cancelOrder(db, orderId, cancelTimeStr) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
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
    const result = calculateCancellationRefund(order, cancelTimeStr || now);

    const payments = await tx
      .select()
      .from(paymentsReceived)
      .where(eq(paymentsReceived.orderId, orderId));
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const refundCash = Math.max(0, Math.round((totalPaid - result.totalRetained) * 100) / 100);

    if (refundCash > 0) {
      await tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId,
          compteDebit: `escrow[${orderId}]`,
          compteCredit: `wallet[${order.clientRef}]`,
          montant: refundCash,
          type: "annulation_remboursement_client",
          metadata: JSON.stringify(result),
          createdAt: now,
        });
    }

    if (result.indemnityAmount > 0) {
      await tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId,
          compteDebit: `escrow[${orderId}]`,
          compteCredit: `wallet[${order.artisanRef}]`,
          montant: result.indemnityAmount,
          type: "annulation_indemnite_artisan",
          metadata: JSON.stringify(result),
          createdAt: now,
        });
    }

    if (result.commissionAmount > 0) {
      await tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId,
          compteDebit: `escrow[${orderId}]`,
          compteCredit: "platform_revenue",
          montant: result.commissionAmount,
          type: "annulation_commission_retenue",
          metadata: JSON.stringify(result),
          createdAt: now,
        });
    }

    await tx.update(orders)
      .set({
        status: "annulee",
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));

    return {
      ...result,
      totalPaid,
      refundCash,
    };
  });
}

export async function confirmDeliveryPayment(db, orderId) {
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new Error("commande_introuvable");
    if (Number(order.totalPrice) < 1000) return;

    const payments = await tx
      .select()
      .from(paymentsReceived)
      .where(eq(paymentsReceived.orderId, orderId));
    const hasSolde = payments.some((p) => p.tranche === "solde_50");
    if (hasSolde) return;

    const now = new Date().toISOString();
    const soldeAmount = Number(order.totalPrice) * 0.5;

    await tx.insert(paymentsReceived)
      .values({
        id: crypto.randomUUID(),
        orderId,
        paymentIntentId: null,
        source: "cash_on_delivery",
        amount: soldeAmount,
        tranche: "solde_50",
        confirmedAt: now,
      });

    await tx.insert(ledgerEntries)
      .values({
        id: crypto.randomUUID(),
        orderId,
        compteDebit: "cash_on_delivery_incoming",
        compteCredit: `escrow[${orderId}]`,
        montant: soldeAmount,
        type: "paiement_solde_confirme",
        metadata: JSON.stringify({ tranche: "solde_50" }),
        createdAt: now,
      });
  });
}

export async function deliverOrder(db, orderId, deliveryTimeStr) {
  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!order) throw new Error("commande_introuvable");
    
    if (Number(order.totalPrice) >= 1000) {
      await confirmDeliveryPayment(tx, orderId);
    }

    const now = deliveryTimeStr || new Date().toISOString();

    await tx.update(orders)
      .set({
        status: "livre",
        deliveredAt: now,
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));
  });
}
