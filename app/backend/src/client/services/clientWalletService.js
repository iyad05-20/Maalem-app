import { eq, desc } from "drizzle-orm";
import { db } from "../../core/db/index.js";
import { clientWallets, clientWalletTransactions, withdrawalRequests } from "../../core/db/schema.js";

/**
 * Service de gestion du Wallet Interne Client (Décision 28)
 * Permet d'encaisser les remboursements immédiats et de demander un virement bancaire (RIB).
 */

export async function getOrCreateClientWallet(clientRef) {
  let [wallet] = await db.select().from(clientWallets).where(eq(clientWallets.id, clientRef));
  if (!wallet) {
    const now = new Date().toISOString();
    await db.insert(clientWallets).values({
      id: clientRef,
      balance: "0",
      currency: "MAD",
      updatedAt: now,
    });
    [wallet] = await db.select().from(clientWallets).where(eq(clientWallets.id, clientRef));
  }
  return wallet;
}

export async function creditClientWallet(clientRef, amount, orderId = null, type = "refund_pre_acceptance", metadata = {}) {
  const numericAmount = Number(amount);
  if (numericAmount <= 0) return null;

  return await db.transaction(async (tx) => {
    let [wallet] = await tx.select().from(clientWallets).where(eq(clientWallets.id, clientRef));
    const now = new Date().toISOString();

    let currentBalance = 0;
    if (!wallet) {
      await tx.insert(clientWallets).values({
        id: clientRef,
        balance: "0",
        currency: "MAD",
        updatedAt: now,
      });
      currentBalance = 0;
    } else {
      currentBalance = Number(wallet.balance || 0);
    }

    const newBalance = Math.round((currentBalance + numericAmount) * 100) / 100;

    await tx.update(clientWallets)
      .set({
        balance: String(newBalance),
        updatedAt: now,
      })
      .where(eq(clientWallets.id, clientRef));

    const txId = `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await tx.insert(clientWalletTransactions).values({
      id: txId,
      clientRef,
      orderId,
      type,
      amount: String(numericAmount),
      balanceAfter: String(newBalance),
      metadata: JSON.stringify(metadata),
      createdAt: now,
    });

    return {
      success: true,
      clientRef,
      creditedAmount: numericAmount,
      balance: newBalance,
      transactionId: txId,
    };
  });
}

export async function debitClientWallet(clientRef, amount, orderId = null, type = "withdrawal_request", metadata = {}) {
  const numericAmount = Number(amount);
  if (numericAmount <= 0) throw new Error("montant_invalide");

  return await db.transaction(async (tx) => {
    let [wallet] = await tx.select().from(clientWallets).where(eq(clientWallets.id, clientRef));
    if (!wallet) throw new Error("wallet_client_introuvable");

    const currentBalance = Number(wallet.balance || 0);
    if (currentBalance < numericAmount) {
      throw new Error("solde_insuffisant");
    }

    const newBalance = Math.round((currentBalance - numericAmount) * 100) / 100;
    const now = new Date().toISOString();

    await tx.update(clientWallets)
      .set({
        balance: String(newBalance),
        updatedAt: now,
      })
      .where(eq(clientWallets.id, clientRef));

    const txId = `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await tx.insert(clientWalletTransactions).values({
      id: txId,
      clientRef,
      orderId,
      type,
      amount: String(numericAmount),
      balanceAfter: String(newBalance),
      metadata: JSON.stringify(metadata),
      createdAt: now,
    });

    return {
      success: true,
      clientRef,
      debitedAmount: numericAmount,
      balance: newBalance,
      transactionId: txId,
    };
  });
}

export async function getClientWalletDetails(clientRef) {
  const wallet = await getOrCreateClientWallet(clientRef);
  const transactions = await db.select()
    .from(clientWalletTransactions)
    .where(eq(clientWalletTransactions.clientRef, clientRef))
    .orderBy(desc(clientWalletTransactions.createdAt));

  return {
    balance: Number(wallet.balance || 0),
    currency: wallet.currency || "MAD",
    updatedAt: wallet.updatedAt,
    transactions: transactions.map(t => ({
      ...t,
      amount: Number(t.amount),
      balanceAfter: Number(t.balanceAfter),
      metadata: t.metadata ? (typeof t.metadata === "string" ? JSON.parse(t.metadata) : t.metadata) : null,
    })),
  };
}

export async function requestClientWithdrawal(clientRef, amount, rib) {
  if (!rib || rib.replace(/\s+/g, "").length !== 24) {
    throw new Error("rib_invalide_24_chiffres_requis");
  }

  // Débit immédiat du solde
  const debitRes = await debitClientWallet(clientRef, amount, null, "withdrawal_request", { rib: rib.trim() });

  // Enregistrement dans les demandes de virement (traitées chaque vendredi à 10h)
  const reqId = `with-cl-${Date.now()}`;
  await db.insert(withdrawalRequests).values({
    id: reqId,
    userId: clientRef,
    amount: String(amount),
    rib: rib.trim(),
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  return {
    success: true,
    withdrawalRequestId: reqId,
    remainingBalance: debitRes.balance,
    message: "Demande de virement bancaire enregistrée.",
  };
}
