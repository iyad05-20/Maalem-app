import { eq } from "drizzle-orm";
import { orders, returnRequests, ledgerEntries, paymentsReceived } from "../../core/db/schema.js";
import { creditClientWallet } from "./clientWalletService.js";
import { recordVendorWarning } from "./artisanOrderService.js";

export async function requestReturn(db, orderId, mode, returnShippingFee = 0) {
  return await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
    if (!order) {
      throw new Error("commande_introuvable");
    }
    if (order.productType !== "standard") {
      throw new Error("droit_de_retractation_exclu_produit_non_standard");
    }
    if (order.status !== "livre" && order.status !== "valide") {
      throw new Error(`retour_impossible_statut_incompatible:${order.status}`);
    }

    // Contrôle du délai légal de rétractation de 7 jours (Loi 31-08)
    const baseDate = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.updatedAt);
    const diffDays = (Date.now() - baseDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 7) {
      throw new Error("delai_retractation_7_jours_expire");
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

    const isEscrowReleased = Boolean(order.escrowReleasedAt);

    if (refundCash > 0) {
      if (isEscrowReleased) {
        // Cas retour après validation : les fonds séquestre ont déjà été libérés à l'artisan
        // On débite le compte de recouvrement vendeur et on crédite le wallet du client
        await tx.insert(ledgerEntries)
          .values({
            id: crypto.randomUUID(),
            orderId: order.id,
            compteDebit: `VENDOR_RECOVERY:${order.artisanRef}`,
            compteCredit: `wallet[${order.clientRef}]`,
            montant: refundCash,
            type: "retour_post_validation_recouvrement_vendeur",
            metadata: JSON.stringify({ mode: req.mode, returnShippingFee: req.returnShippingFee, escrowReleasedAt: order.escrowReleasedAt }),
            createdAt: now,
          });

        await creditClientWallet(
          order.clientRef,
          refundCash,
          order.id,
          "refund_return_post_validation",
          { mode: req.mode, returnShippingFee: req.returnShippingFee, escrowReleasedAt: order.escrowReleasedAt }
        );

        await recordVendorWarning(
          order.artisanRef,
          `Retour après validation accepté sur commande #${order.id}. Montant à régulariser: ${refundCash} MAD.`,
          order.id
        );
      } else {
        // Cas classique : séquestre encore actif (pré-validation)
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

        await creditClientWallet(
          order.clientRef,
          refundCash,
          order.id,
          "refund_return",
          { mode: req.mode, returnShippingFee: req.returnShippingFee }
        );
      }
    }

    if (req.mode === "sendit" && fee > 0) {
      const feeAmount = Math.min(totalPaid, fee);
      await tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          orderId: order.id,
          compteDebit: isEscrowReleased ? `VENDOR_RECOVERY:${order.artisanRef}` : `escrow[${order.id}]`,
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

    return { status: "valide", refundCash, isPostValidation: isEscrowReleased };
  });
}
