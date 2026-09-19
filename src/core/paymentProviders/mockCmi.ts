import { Router } from "express";
import { db } from "../db";
import { MockCmiProvider } from "./MockCmiProvider";
import { processCallback } from "../../client/services/clientPaymentService";

const router = Router();
const provider = new MockCmiProvider();

router.get("/pay", (req, res) => {
  const intentId = String(req.query.intent_id ?? "");
  const amount = String(req.query.amount ?? "");
  const orderId = String(req.query.order_id ?? "");
  res.send(`
    <html><body style="font-family:sans-serif;max-width:400px;margin:60px auto">
      <h3>Simulateur CMI (dev)</h3>
      <p>Commande : ${orderId || intentId}</p>
      <p>Montant : ${amount} MAD</p>
      <p id="erreur" style="color:red;display:none;"></p>
      <button id="succes">Simuler paiement réussi</button>
      <button id="echec">Simuler paiement échoué</button>
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
            window.location.href = '/?order_id=${orderId}';
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
  const { intent_id: intentId, amount, resultat } = req.body as {
    intent_id: string;
    amount: number;
    resultat: "succes" | "echec";
  };
  const signed = MockCmiProvider.buildSignedCallback(intentId, Number(amount), resultat === "succes");
  const result = provider.verifierCallback(signed);
  const intent = await processCallback(db, result, "mock_cmi_webhook");
  res.json({ resultat, paymentIntentId: intent.id, statut: intent.statut });
});

export default router;
