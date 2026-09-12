import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { paymentIntents, orders } from "../db/schema.js";
import { MockCmiProvider } from "./MockCmiProvider.js";
import { processCallback } from "../../client/services/clientPaymentService.js";

const router = Router();
const provider = new MockCmiProvider();

router.get("/pay", async (req, res) => {
  const intentId = String(req.query.intent_id ?? "");
  const amount = String(req.query.amount ?? "");
  
  let orderId = "";
  try {
    const [payment] = await db.select().from(paymentIntents).where(eq(paymentIntents.id, intentId));
    if (payment) {
      orderId = payment.orderId;
    }
  } catch (err) {
    console.error("Failed to query payment intent during CMI simulation page load:", err.message);
  }

  // Origine de l'application frontend (Vercel ou Local)
  const referer = req.get("referer");
  let clientOrigin = process.env.FRONTEND_URL;
  if (!clientOrigin && referer) {
    try { clientOrigin = new URL(referer).origin; } catch {}
  }
  if (!clientOrigin) clientOrigin = "http://localhost:3000";

  console.log(`\n[VORK-CMI] 🖥️ Simulation Page Loaded - IntentID: ${intentId}, OrderID: ${orderId}, Amount: ${amount} MAD, ClientTarget: ${clientOrigin}`);
  
  res.send(`
    <html><body style="font-family:sans-serif;max-width:400px;margin:60px auto;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,0.1);border-radius:16px;">
      <h3 style="color:#1A2A3A;margin-top:0;">Simulateur CMI (3D Secure 2.0)</h3>
      <p style="font-size:14px;color:#64748B;">Commande ID : <strong>${orderId || intentId}</strong></p>
      <p style="font-size:16px;color:#2D6A4F;">Montant à régler : <strong>${amount} MAD</strong></p>
      <p id="erreur" style="color:red;display:none;font-size:13px;"></p>
      <button id="succes" style="width:100%;padding:12px;background:#2D6A4F;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;margin-bottom:10px;">Simuler paiement réussi</button>
      <button id="echec" style="width:100%;padding:12px;background:#DC3545;color:#fff;border:none;border-radius:12px;font-weight:700;cursor:pointer;">Simuler paiement échoué</button>
      <script>
        async function simuler(resultat) {
          const btnSucces = document.getElementById('succes');
          const btnEchec = document.getElementById('echec');
          const err = document.getElementById('erreur');
          btnSucces.disabled = true;
          btnEchec.disabled = true;
          err.style.display = 'none';
          try {
            const res = await fetch('/mock-cmi/simulate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                intent_id: '${intentId}', amount: ${amount || 0}, resultat,
              }),
            });
            if (!res.ok) throw new Error("HTTP " + res.status);
            window.location.href = '${clientOrigin}/?order_id=${orderId}';
          } catch (e) {
            err.textContent = e.message;
            err.style.display = 'block';
            btnSucces.disabled = false;
            btnEchec.disabled = false;
          }
        }
        document.getElementById('succes').onclick = () => simuler('succes');
        document.getElementById('echec').onclick = () => simuler('echec');
      </script>
    </body></html>
  `);
});

router.post("/simulate", async (req, res) => {
  try {
    const { intent_id: intentId, amount, resultat } = req.body;
    console.log(`\n[VORK-CMI] 🔔 Webhook Simulation Triggered - IntentID: ${intentId}, Status: ${resultat}`);

    // If it's a fallback mock intent, process direct status update
    if (intentId && intentId.startsWith("mock-intent-")) {
      const orderId = intentId.replace("mock-intent-", "");
      console.log(`[VORK-CMI] ℹ️ Mock intent detected. Simulating order state change for OrderID: ${orderId}`);
      try {
        await db.update(orders)
          .set({ 
            status: resultat === "succes" ? "payee_integralement" : "paiement_echoue", 
            updatedAt: new Date().toISOString() 
          })
          .where(eq(orders.id, orderId));
      } catch (dbErr) {
        console.warn("[VORK-CMI] Non-fatal: Failed to update mock order status in DB:", dbErr.message);
      }
      return res.json({ resultat, paymentIntentId: intentId, statut: resultat === "succes" ? "confirme" : "echoue" });
    }

    const signed = MockCmiProvider.buildSignedCallback(intentId, Number(amount), resultat === "succes");
    const result = provider.verifierCallback(signed);
    const intent = await processCallback(db, result, "mock_cmi_webhook");
    console.log(`[VORK-CMI] ✅ Webhook Callback Processed successfully (IntentID: ${intent.id}, Status: ${intent.statut})`);
    res.json({ resultat, paymentIntentId: intent.id, statut: intent.statut });
  } catch (error) {
    console.error("[VORK-CMI] ❌ Simulation failed:", error.message);
    res.status(400).json({ error: error.message });
  }
});

export default router;
