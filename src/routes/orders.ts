import { Router } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../core/db";
import { orders, paymentIntents } from "../core/db/schema";
import { montantAPayer } from "../core/types";
import { MockCmiProvider } from "../core/paymentProviders/MockCmiProvider";
import { acceptOrder, refuseOrder } from "../artisan/services/artisanOrderService";
import { cancelOrder, deliverOrder } from "../client/services/clientPaymentService";
import { releaseEscrow } from "../services/paymentService";

const router = Router();
const provider = new MockCmiProvider();

const createOrderSchema = z.object({
  clientRef: z.string().min(1),
  artisanRef: z.string().min(1).optional(),
  totalPrice: z.number().positive(),
  productType: z.enum(["standard", "personnalise"]).optional(),
});

router.post("/", (req, res) => {
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

router.post("/:id/initiate-payment", (req, res) => {
  const order = db.select().from(orders).where(eq(orders.id, req.params.id)).get();
  if (!order) {
    return res.status(404).json({ error: "commande introuvable" });
  }
  if (!["en_attente_paiement", "paiement_echoue"].includes(order.status)) {
    return res
      .status(409)
      .json({ error: `commande dans un état incompatible: ${order.status}` });
  }

  const { montant, tranche } = montantAPayer(order.totalPrice);
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

router.post("/:id/accept", (req, res) => {
  try {
    acceptOrder(db, req.params.id);
    res.json({ success: true, status: "en_preparation" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/refuse", (req, res) => {
  try {
    refuseOrder(db, req.params.id);
    res.json({ success: true, status: "annulee" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/cancel", (req, res) => {
  try {
    const cancelTime = req.body?.cancelTime ? String(req.body.cancelTime) : undefined;
    const result = cancelOrder(db, req.params.id, cancelTime);
    res.json({ success: true, ...result });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/:id/deliver", (req, res) => {
  try {
    const deliveryTime = req.body?.deliveryTime ? String(req.body.deliveryTime) : undefined;
    deliverOrder(db, req.params.id, deliveryTime);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/release-escrow", (req, res) => {
  try {
    const currentTime = req.body?.currentTime ? String(req.body.currentTime) : undefined;
    const releasedCount = releaseEscrow(db, currentTime);
    res.json({ success: true, releasedCount });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/:id/status", (req, res) => {
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
