import { eq } from "drizzle-orm";
import type { db as DbType } from "../../core/db";
import { ledgerEntries, withdrawalRequests } from "../../core/db/schema";

export function getWalletBalance(db: any, userId: string): number {
  const credits = db
    .select({ montant: ledgerEntries.montant })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.compteCredit, `wallet[${userId}]`))
    .all() as { montant: number }[];

  const debits = db
    .select({ montant: ledgerEntries.montant })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.compteDebit, `wallet[${userId}]`))
    .all() as { montant: number }[];

  const totalCredit = credits.reduce((sum, entry) => sum + entry.montant, 0);
  const totalDebit = debits.reduce((sum, entry) => sum + entry.montant, 0);

  return Math.round((totalCredit - totalDebit) * 100) / 100;
}

export function requestWithdrawal(
  db: typeof DbType,
  userId: string,
  amount: number,
  rib: string
): string {
  if (amount <= 0) {
    throw new Error("montant_invalide");
  }

  return db.transaction((tx) => {
    const balance = getWalletBalance(tx, userId);
    if (balance < amount) {
      throw new Error("solde_insuffisant");
    }

    const withdrawalId = crypto.randomUUID();
    const now = new Date().toISOString();

    tx.insert(withdrawalRequests)
      .values({
        id: withdrawalId,
        userId,
        amount,
        rib,
        status: "pending",
        createdAt: now,
      })
      .run();

    tx.insert(ledgerEntries)
      .values({
        id: crypto.randomUUID(),
        compteDebit: `wallet[${userId}]`,
        compteCredit: "pending_withdrawals",
        montant: amount,
        type: "retrait_demande",
        metadata: JSON.stringify({ withdrawalId }),
        createdAt: now,
      })
      .run();

    return withdrawalId;
  });
}

export function processWithdrawal(
  db: typeof DbType,
  withdrawalId: string,
  action: "approve" | "reject"
): void {
  db.transaction((tx) => {
    const req = tx
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, withdrawalId))
      .get() as any;

    if (!req) {
      throw new Error("demande_introuvable");
    }
    if (req.status !== "pending") {
      throw new Error("demande_deja_traitee");
    }

    const now = new Date().toISOString();

    if (action === "approve") {
      tx.update(withdrawalRequests)
        .set({ status: "processed", processedAt: now })
        .where(eq(withdrawalRequests.id, withdrawalId))
        .run();

      tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          compteDebit: "pending_withdrawals",
          compteCredit: "platform_bank_payout",
          montant: req.amount,
          type: "retrait_valide",
          metadata: JSON.stringify({ withdrawalId }),
          createdAt: now,
        })
        .run();
    } else {
      tx.update(withdrawalRequests)
        .set({ status: "rejected", processedAt: now })
        .where(eq(withdrawalRequests.id, withdrawalId))
        .run();

      tx.insert(ledgerEntries)
        .values({
          id: crypto.randomUUID(),
          compteDebit: "pending_withdrawals",
          compteCredit: `wallet[${req.userId}]`,
          montant: req.amount,
          type: "retrait_rejete",
          metadata: JSON.stringify({ withdrawalId }),
          createdAt: now,
        })
        .run();
    }
  });
}
