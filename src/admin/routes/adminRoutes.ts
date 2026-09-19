import { Router } from "express";
import { z } from "zod";
import { db } from "../../core/db";
import { releaseEscrow } from "../../services/paymentService";
import { openDispute, resolveDispute } from "../../services/disputeService";
import { processWithdrawal } from "../../artisan/services/artisanWalletService";
import { processReturnRefund } from "../../client/services/clientReturnService";

const router = Router();

const disputeSchema = z.object({
  reason: z.string().min(1),
});

const resolveDisputeSchema = z.object({
  resolution: z.enum(["faute_vendeur", "faute_sendit", "faute_client"]),
});

const processWithdrawalSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

const processReturnSchema = z.object({
  action: z.enum(["validate", "reject"]),
});

/**
 * [ADMIN] Ouvrir un litige.
 */
router.post("/orders/:id/disputes", (req, res) => {
  const parsed = disputeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.flatten() });
  }
  try {
    const disputeId = openDispute(db, req.params.id, parsed.data.reason);
    res.json({ success: true, disputeId });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * [ADMIN] Trancher un litige.
 */
router.post("/disputes/:id/resolve", (req, res) => {
  const parsed = resolveDisputeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.flatten() });
  }
  try {
    const result = resolveDispute(db, req.params.id, parsed.data.resolution);
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * [ADMIN] Valider ou rejeter une demande de virement RIB artisan.
 */
router.post("/withdrawals/:id/process", (req, res) => {
  const parsed = processWithdrawalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.flatten() });
  }
  try {
    processWithdrawal(db, req.params.id, parsed.data.action);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * [ADMIN] Valider ou rejeter un retour sous 7 jours.
 */
router.post("/returns/:id/process", (req, res) => {
  const parsed = processReturnSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.flatten() });
  }
  try {
    const result = processReturnRefund(db, req.params.id, parsed.data.action);
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * [ADMIN/CRON] Job automatique de libération des fonds (J+7 / J+15).
 */
router.post("/cron/release-escrow", (req, res) => {
  try {
    const currentTime = req.body?.currentTime ? String(req.body.currentTime) : undefined;
    const releasedCount = releaseEscrow(db, currentTime);
    res.json({ success: true, releasedCount });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
