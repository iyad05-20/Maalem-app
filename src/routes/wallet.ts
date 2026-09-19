import { Router } from "express";
import { z } from "zod";
import { db } from "../core/db";
import { getWalletBalance, requestWithdrawal } from "../artisan/services/artisanWalletService";

const router = Router();

const withdrawSchema = z.object({
  amount: z.number().positive(),
  rib: z.string().min(10),
});

router.get("/:userId/balance", (req, res) => {
  try {
    const balance = getWalletBalance(db, req.params.userId);
    res.json({ userId: req.params.userId, balance });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:userId/withdraw", (req, res) => {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.flatten() });
  }

  try {
    const withdrawalId = requestWithdrawal(
      db,
      req.params.userId,
      parsed.data.amount,
      parsed.data.rib
    );
    res.json({ success: true, withdrawalId });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
