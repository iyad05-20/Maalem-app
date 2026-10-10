import express from "express";
import { 
  getNotificationsForUser, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from "../services/notificationService.js";
import { optionalAuth } from "../middleware/localAuth.middleware.js";

export const notificationRouter = express.Router();
notificationRouter.use(optionalAuth);

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
