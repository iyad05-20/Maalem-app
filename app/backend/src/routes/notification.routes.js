import express from "express";
import { 
  getNotificationsForUser, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from "../services/notificationService.js";
import { optionalAuth } from "../middleware/localAuth.middleware.js";
import {
  respondToPublicationConsent,
  withdrawPublicationConsent,
} from "../client/services/artisanOrderService.js";

export const notificationRouter = express.Router();
notificationRouter.use(optionalAuth);

/**
 * POST /api/notifications/consent/:orderId/respond
 * Réponse interactive Accepter / Refuser à une demande d'accord de publication (Diagramme 5).
 */
notificationRouter.post("/consent/:orderId/respond", async (req, res) => {
  const { orderId } = req.params;
  const { decision, role = null, reason = "", userId: bodyUserId } = req.body || {};
  const actorUserId = req.userId || (req.user && req.user.id) || bodyUserId || "client-me";
  const resolvedRole = role || (req.userRole === "artisan" ? "source_vendor" : null);

  try {
    const result = await respondToPublicationConsent(orderId, actorUserId, {
      decision,
      role: resolvedRole,
      reason,
    });
    return res.json(result);
  } catch (err) {
    const status = err.message === "non_autorise" ? 403 : err.message === "commande_introuvable" || err.message === "demande_accord_introuvable" ? 404 : 400;
    return res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/consent/:orderId/withdraw
 * Retrait de l'accord après publication (Diagramme 5 - opt Retrait de l'accord).
 */
notificationRouter.post("/consent/:orderId/withdraw", async (req, res) => {
  const { orderId } = req.params;
  const { reason = "", userId: bodyUserId } = req.body || {};
  const actorUserId = req.userId || (req.user && req.user.id) || bodyUserId || "client-me";

  try {
    const result = await withdrawPublicationConsent(orderId, actorUserId, { reason });
    return res.json(result);
  } catch (err) {
    const status = err.message === "non_autorise" ? 403 : err.message === "commande_introuvable" ? 404 : 400;
    return res.status(status).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/notifications
 * Récupère les notifications de l'utilisateur connecté ou selon userId / userType.
 */
notificationRouter.get("/", async (req, res) => {
  const userId = req.userId || (req.user && req.user.id) || req.query.userId || "client-me";
  const userType = req.query.userType || (req.user && req.user.role) || null;

  try {
    const list = await getNotificationsForUser(userId, userType);
    return res.json({ success: true, count: list.length, notifications: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/:id/read
 * Marque une notification spécifique comme lue.
 */
notificationRouter.post("/:id/read", async (req, res) => {
  const { id } = req.params;
  const userId = req.userId || (req.user && req.user.id) || req.body.userId || "client-me";

  try {
    const result = await markNotificationAsRead(id, userId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notifications/read-all
 * Marque toutes les notifications de l'utilisateur comme lues.
 */
notificationRouter.post("/read-all", async (req, res) => {
  const userId = req.userId || (req.user && req.user.id) || req.body.userId || "client-me";

  try {
    const result = await markAllNotificationsAsRead(userId);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default notificationRouter;
