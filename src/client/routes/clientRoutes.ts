import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../core/db";
import { orders, paymentIntents } from "../../core/db/schema";
import { montantAPayer } from "../../core/types";
import { MockCmiProvider } from "../../core/paymentProviders/MockCmiProvider";
import { cancelOrder, deliverOrder } from "../services/clientPaymentService";
import { requestReturn } from "../services/clientReturnService";

const router = Router();
const provider = new MockCmiProvider();

const createOrderSchema = z.object({
  clientRef: z.string().min(1),
  artisanRef: z.string().min(1).optional(),
  totalPrice: z.number().positive(),
  productType: z.enum(["standard", "personnalise"]).optional(),
});

const returnSchema = z.object({
  mode: z.enum(["sendit", "propres_moyens"]),
  returnShippingFee: z.number().nonnegative().optional(),
});

/**
 * [CLIENT APP] Créer une nouvelle commande.
 */
router.post("/orders", (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.flatten() });
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.insert(orders)
    .values({
      id,
      clientRef: parsed.data.clientRef,
      artisanRef: parsed.data.artisanRef ?? "artisan-1",
      totalPrice: parsed.data.totalPrice,
      productType: parsed.data.productType ?? "standard",
      status: "en_attente_paiement",
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const order = db.select().from(orders).where(eq(orders.id, id)).get();
  res.json(order);
});

/**
 * [CLIENT APP] Initiatier le paiement (CMI / Acompte 50%).
 */
router.post("/orders/:id/initiate-payment", (req, res) => {
  const order = db.select().from(orders).where(eq(orders.id, req.params.id)).get();
  if (!order) {
    return res.status(404).json({ error: "commande introuvable" });
  }
  if (!["en_attente_paiement", "paiement_echoue"].includes(order.status)) {
    return res
      .status(409)
      .json({ error: `commande dans un état incompatible: ${order.status}` });
  }

  const choice = req.body?.choice || "deposit"; // "deposit" or "total"
  let montant = order.totalPrice;
  let tranche = "total_100";

  if (order.totalPrice >= 1000 && choice === "deposit") {
    montant = Math.round(order.totalPrice * 0.5 * 100) / 100;
    tranche = "acompte_50";
  }
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const intentId = crypto.randomUUID();

  db.insert(paymentIntents)
    .values({
      id: intentId,
      orderId: order.id,
      montant,
      tranche,
      provider: "mock_cmi",
      statut: "cree",
      createdAt: now,
      updatedAt: now,
      expiresAt,
    })
    .run();

  db.update(orders)
    .set({ status: "paiement_initie", updatedAt: now })
    .where(eq(orders.id, order.id))
    .run();

  const requete = provider.construireRequete(
    { id: intentId, montant },
    `${req.protocol}://${req.get("host")}/mock-cmi`
  );

  res.json({
    paymentIntentId: intentId,
    redirectUrl: requete.redirectUrl,
    montant,
    tranche,
  });
});

/**
 * [CLIENT APP] Annulation de la commande par le client.
 */
router.post("/orders/:id/cancel", (req, res) => {
  try {
    const cancelTime = req.body?.cancelTime ? String(req.body.cancelTime) : undefined;
    const result = cancelOrder(db, req.params.id, cancelTime);
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * [CLIENT APP] Validation de la livraison par le client.
 */
router.post("/orders/:id/deliver", (req, res) => {
  try {
    const deliveryTime = req.body?.deliveryTime ? String(req.body.deliveryTime) : undefined;
    deliverOrder(db, req.params.id, deliveryTime);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * [CLIENT APP] Demande de retour (Rétractation 7j).
 */
router.post("/orders/:id/return", (req, res) => {
  const parsed = returnSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ error: parsed.error.flatten() });
  }

  try {
    const returnId = requestReturn(
      db,
      req.params.id,
      parsed.data.mode,
      parsed.data.returnShippingFee
    );
    res.json({ success: true, returnId });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * [CLIENT APP] Suivi du statut de la commande.
 */
router.get("/orders/:id/status", (req, res) => {
  const order = db.select().from(orders).where(eq(orders.id, req.params.id)).get();
  if (!order) {
    return res.status(404).json({ error: "commande introuvable" });
  }
  const { montant, tranche } = montantAPayer(order.totalPrice);
  res.json({
    orderId: order.id,
    status: order.status,
    montantAPayer: montant,
    tranche,
  });
});

export default router;
