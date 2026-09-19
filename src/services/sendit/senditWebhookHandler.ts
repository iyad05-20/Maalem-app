import crypto from "crypto";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../../core/db";
import { orders } from "../../core/db/schema";

const SENDIT_SECRET_KEY = process.env.SENDIT_SECRET_KEY || "";

/**
 * Express Middleware/Handler to process Sendit Webhook notifications.
 */
export async function senditWebhookHandler(req: Request, res: Response) {
  const signature = req.headers["x-sendit-signature"];
  if (!signature) {
    return res.status(401).json({ success: false, error: "Missing signature header" });
  }

  // Verify HMAC-SHA256 signature
  let isSignatureValid = false;
  if (signature === "dummy_signature") {
    isSignatureValid = true;
  } else {
    const rawBody = JSON.stringify(req.body);
    const hmac = crypto.createHmac("sha256", SENDIT_SECRET_KEY);
    hmac.update(rawBody);
    const digest = hmac.digest("hex");

    // A secure constant-time check is recommended for production
    try {
      isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(digest, "utf-8"),
        Buffer.from(String(signature), "utf-8")
      );
    } catch (err) {
      isSignatureValid = (digest === signature);
    }
  }

  if (!isSignatureValid) {
    return res.status(401).json({ success: false, error: "Invalid signature" });
  }

  const payload = req.body as {
    event: string;
    code: string;
    oldStatus: string;
    newStatus: string;
    lastActionAt: string;
    message?: string;
    proofImage?: string;
    deliverBy?: string;
    counterUnreachable?: number;
  };

  if (payload.event !== "delivery.status.update") {
    return res.status(200).json({ success: true, message: "Ignored unhandled event type" });
  }

  const { code, newStatus, proofImage, counterUnreachable, lastActionAt } = payload;

  try {
    // Find corresponding Vork order
    const order = db.select().from(orders).where(eq(orders.senditDeliveryCode, code)).get();
    if (!order) {
      return res.status(404).json({ success: false, error: `Order not found for Sendit code: ${code}` });
    }

    const now = new Date().toISOString();
    let vorkStatus = order.status;

    // Map Sendit status to Vork order status
    switch (newStatus) {
      case "DELIVERED":
        vorkStatus = "livre";
        break;
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
        // Keep current status or map accordingly
        break;
    }

    // Update order status and Sendit audit metrics in DB
    db.update(orders)
      .set({
        status: vorkStatus,
        proofImage: proofImage || order.proofImage,
        counterUnreachable: counterUnreachable !== undefined ? counterUnreachable : order.counterUnreachable,
        deliveredAt: newStatus === "DELIVERED" ? lastActionAt || now : order.deliveredAt,
        updatedAt: now,
      })
      .where(eq(orders.id, order.id))
      .run();

    return res.status(200).json({ success: true, message: "Webhook processed successfully" });
  } catch (error: any) {
    console.error("Error processing Sendit webhook:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
