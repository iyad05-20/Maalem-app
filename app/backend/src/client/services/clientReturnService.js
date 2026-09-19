import { eq } from "drizzle-orm";
import { orders, returnRequests, ledgerEntries, paymentsReceived } from "../../core/db/schema.js";

export async function requestReturn(db, orderId, mode, returnShippingFee = 0) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
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

    await tx.insert(returnRequests)
      .values({
        id: returnId,
        orderId,
        mode,
        returnShippingFee: mode === "sendit" ? returnShippingFee : 0,
        status: "initie",
        createdAt: now,
      });

    await tx.update(orders)
      .set({
        status: "retour_initie",
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));

    return returnId;
  });
}

export async function processReturnRefund(db, returnId, action) {
  return await db.transaction(async (tx) => {
    const [req] = await tx.select().from(returnRequests).where(eq(returnRequests.id, returnId));
    if (!req) {
      throw new Error("demande_retour_introuvable");
    }
    if (req.status !== "initie") {
      throw new Error("demande_retour_deja_traitee");
    }

    const [order] = await tx.select().from(orders).where(eq(orders.id, req.orderId));
    if (!order) {
      throw new Error("commande_introuvable");
    }

    const now = new Date().toISOString();

    if (action === "reject") {
      await tx.update(returnRequests)
        .set({ status: "refuse", resolvedAt: now })
        .where(eq(returnRequests.id, returnId));

      await tx.update(orders)
        .set({ status: "livre", updatedAt: now })
        .where(eq(orders.id, order.id));

      return { status: "refuse" };
    }

    const payments = await tx
      .select()
      .from(paymentsReceived)
      .where(eq(paymentsReceived.orderId, order.id));
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    let refundCash = totalPaid;
    const fee = Number(req.returnShippingFee || 0);
    if (req.mode === "sendit" && fee > 0) {
      refundCash = Math.max(0, Math.round((totalPaid - fee) * 100) / 100);
    }

    if (refundCash > 0) {
      await tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId: order.id,
          compteDebit: `escrow[${order.id}]`,
          compteCredit: `wallet[${order.clientRef}]`,
          montant: refundCash,
          type: "retour_remboursement_client",
          metadata: JSON.stringify({ mode: req.mode, returnShippingFee: req.returnShippingFee }),
          createdAt: now,
        });
    }

    if (req.mode === "sendit" && fee > 0) {
      const feeAmount = Math.min(totalPaid, fee);
      await tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId: order.id,
          compteDebit: `escrow[${order.id}]`,
          compteCredit: "sendit_revenue",
          montant: feeAmount,
          type: "retour_frais_sendit",
          createdAt: now,
        });
    }

    await tx.update(returnRequests)
      .set({ status: "valide", resolvedAt: now })
      .where(eq(returnRequests.id, returnId));

    await tx.update(orders)
      .set({ status: "annulee", updatedAt: now })
      .where(eq(orders.id, order.id));

    return { status: "valide", refundCash };
  });
}
