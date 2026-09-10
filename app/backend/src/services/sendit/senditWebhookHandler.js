import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../../core/db/index.js";
import { orders } from "../../core/db/schema.js";
import { deliverOrder } from "../../client/services/clientPaymentService.js";

const SENDIT_SECRET_KEY = process.env.SENDIT_SECRET_KEY || "vork_sendit_webhook_secret_key_2026";

/**
 * Express Middleware/Handler pour traiter les notifications Webhook officielles Sendit Express.
 * Sécurité : HMAC-SHA256 sur buffer brut req.rawBody avec timingSafeEqual en temps constant.
 */
export async function senditWebhookHandler(req, res) {
  const signature = req.headers["x-sendit-signature"];
  if (!signature) {
    return res.status(401).json({ success: false, error: "En-tête de signature manquant (x-sendit-signature requis)." });
  }

  // 1. Calcul HMAC-SHA256 sur le Buffer brut req.rawBody (préservant l'ordre des octets)
  const rawBuffer = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(req.body));
  const hmac = crypto.createHmac("sha256", SENDIT_SECRET_KEY);
  hmac.update(rawBuffer);
  const digest = hmac.digest("hex");

  // 2. Vérification cryptographique en temps constant
  const isProd = process.env.NODE_ENV === "production";
  let isSignatureValid = false;

  if (signature === "dummy_signature") {
    if (isProd) {
      console.error("[SENDIT-WEBHOOK] ❌ Rejet strict de 'dummy_signature' en production !");
      isSignatureValid = false;
    } else {
      console.warn("[SENDIT-WEBHOOK] ⚠️ Acceptation de 'dummy_signature' en environnement local de développement.");
      isSignatureValid = true;
    }
  } else {
    try {
      const digestBuf = Buffer.from(digest, "utf-8");
      const sigBuf = Buffer.from(String(signature), "utf-8");
      isSignatureValid = (digestBuf.length === sigBuf.length) && crypto.timingSafeEqual(digestBuf, sigBuf);
    } catch {
      isSignatureValid = false;
    }
  }

  if (!isSignatureValid) {
    console.warn("[SENDIT-WEBHOOK] 🚨 Échec de signature HMAC Webhook Sendit.");
    return res.status(401).json({ success: false, error: "Signature HMAC non valide." });
  }

  const payload = req.body;

  if (payload.event !== "delivery.status.update") {
    return res.status(200).json({ success: true, message: "Événement non traité ignoré." });
  }

  const statusKey = payload.newStatus || payload.status;
  const { code, proofImage, counterUnreachable, lastActionAt } = payload;
  const newStatus = statusKey;

  try {
    // Retrouver la commande Vork correspondante
    let order = null;
    if (code) {
      order = db.select().from(orders).where(eq(orders.senditDeliveryCode, code)).get();
    }
    if (!order && (payload.reference || payload.orderId)) {
      const refId = payload.reference || payload.orderId;
      order = db.select().from(orders).where(eq(orders.id, refId)).get();
    }
    if (!order && code) {
      order = db.select().from(orders).where(eq(orders.id, code)).get();
    }
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        error: `Commande Vork introuvable pour le code Sendit: ${code || payload.reference}` 
      });
    }

    const now = new Date().toISOString();

    // Traitement des transitions logistiques Sendit
    if (newStatus === "DELIVERED") {
      // Exécute la livraison et la régularisation du solde COD 50% (si > 1000 DH)
      deliverOrder(db, order.id, lastActionAt || now);

      if (proofImage || counterUnreachable !== undefined) {
        db.update(orders)
          .set({
            proofImage: proofImage || order.proofImage,
            counterUnreachable: counterUnreachable !== undefined ? counterUnreachable : order.counterUnreachable,
            updatedAt: now,
          })
          .where(eq(orders.id, order.id))
          .run();
      }
      console.log(`[SENDIT-WEBHOOK] 📦 Commande #${order.id} livrée par Sendit (Début du séquestre 7j).`);
    } else {
      let vorkStatus = order.status;
      switch (newStatus) {
        case "CANCELED":
        case "REJECTED":
          vorkStatus = "annulee";
          break;
        case "TRANSIT":
        case "DISTRIBUTED":
        case "DELIVERING":
          vorkStatus = "en_cours_de_transport";
          break;
        default:
          break;
      }

      db.update(orders)
        .set({
          status: vorkStatus,
          proofImage: proofImage || order.proofImage,
          counterUnreachable: counterUnreachable !== undefined ? counterUnreachable : order.counterUnreachable,
          updatedAt: now,
        })
        .where(eq(orders.id, order.id))
        .run();

      console.log(`[SENDIT-WEBHOOK] 🚚 Commande #${order.id} mise à jour : ${vorkStatus}`);
    }

    return res.status(200).json({ success: true, message: "Notification Sendit traitée avec succès." });
  } catch (error) {
    console.error("[SENDIT-WEBHOOK] Erreur de traitement Webhook:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
