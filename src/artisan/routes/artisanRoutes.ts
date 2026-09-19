import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../core/db";
import { orders } from "../../core/db/schema";
import { acceptOrder, refuseOrder, shipOrder } from "../services/artisanOrderService";
import { getWalletBalance, requestWithdrawal } from "../services/artisanWalletService";
import { senditClient } from "../../services/sendit/senditClient";

const router = Router();

const withdrawSchema = z.object({
  amount: z.number().positive(),
  rib: z.string().min(10),
});

/**
 * [ARTISAN APP] Liste des commandes reçues par l'artisan.
 */
router.get("/:artisanId/orders", (req, res) => {
  const artisanOrders = db
    .select()
    .from(orders)
    .where(eq(orders.artisanRef, req.params.artisanId))
    .all();
  res.json(artisanOrders);
});

/**
 * [ARTISAN APP] Accepter une commande.
 */
router.post("/orders/:id/accept", (req, res) => {
  try {
    acceptOrder(db, req.params.id);
    res.json({ success: true, status: "en_preparation" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * [ARTISAN APP] Refuser une commande.
 */
router.post("/orders/:id/refuse", (req, res) => {
  try {
    refuseOrder(db, req.params.id);
    res.json({ success: true, status: "annulee" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

const shipSchema = z.object({
  pickup_district_id: z.number(),
  district_id: z.number(),
  name: z.string(),
  phone: z.string(),
  address: z.string(),
});

/**
 * [ARTISAN APP] Expédier une commande (Créer un colis sur Sendit).
 */
router.post("/orders/:id/ship", async (req, res) => {
  const parsed = shipSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.flatten() });
  }

  try {
    const senditDeliveryCode = await shipOrder(db, req.params.id, parsed.data);
    res.json({ success: true, status: "en_cours_de_transport", senditDeliveryCode });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * [ARTISAN APP] Obtenir l'étiquette de livraison.
 */
router.get("/orders/:id/label", async (req, res) => {
  try {
    const order = db.select().from(orders).where(eq(orders.id, req.params.id)).get();
    if (!order || !order.senditDeliveryCode) {
      return res.status(404).json({ error: "commande_ou_code_livraison_introuvable" });
    }
    const labelResult = await senditClient.getLabels(order.senditDeliveryCode);
    res.json(labelResult);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * [ARTISAN APP] Solde du portefeuille virtuel de l'artisan.
 */
router.get("/wallet/:artisanId/balance", (req, res) => {
  try {
    const balance = getWalletBalance(db, req.params.artisanId);
    res.json({ artisanId: req.params.artisanId, balance });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * [ARTISAN APP] Demande de virement sur RIB bancaire.
 */
router.post("/wallet/:artisanId/withdraw", (req, res) => {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.flatten() });
  }

  try {
    const withdrawalId = requestWithdrawal(
      db,
      req.params.artisanId,
      parsed.data.amount,
      parsed.data.rib
    );
    res.json({ success: true, withdrawalId });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
