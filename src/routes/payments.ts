import { Router } from "express";
import { db } from "../core/db";
import { MockCmiProvider } from "../core/paymentProviders/MockCmiProvider";
import { processCallback } from "../client/services/clientPaymentService";

const router = Router();
const provider = new MockCmiProvider();

router.post("/cmi/callback", async (req, res) => {
  try {
    const result = provider.verifierCallback(req.body);
    const intent = await processCallback(db, result, "cmi_callback");
    res.json({ status: intent.statut, paymentIntentId: intent.id });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
