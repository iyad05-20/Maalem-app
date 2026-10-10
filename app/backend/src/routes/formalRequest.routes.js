import express from "express";
import { 
  createFormalRequest, 
  respondToFormalRequest, 
  escalateToAdmin, 
  getFormalRequestsForUser, 
  getFormalRequestsForOrder,
  FORMAL_REQUEST_CATEGORIES
} from "../services/formalRequestService.js";
import { optionalAuthMiddleware } from "../middleware/auth.middleware.js";

export const formalRequestRouter = express.Router();

/**
 * GET /api/formal-requests/categories
 * Récupère les catégories normalisées selon l'initiateur (client ou artisan).
 */
formalRequestRouter.get("/categories", (req, res) => {
  return res.json({ success: true, categories: FORMAL_REQUEST_CATEGORIES });
});

formalRequestRouter.use(optionalAuthMiddleware);

/**
 * POST /api/formal-requests
 * Crée une nouvelle demande formelle pour une commande.
 */
formalRequestRouter.post("/", async (req, res) => {
  const { orderId, category, description, evidenceUrls = [] } = req.body;
  const initiatorId = req.userId || req.body.initiatorId || "client-me";
  const initiatorType = req.body.initiatorType || (req.user?.role === "artisan" ? "artisan" : "client");

  if (!orderId || !description) {
    return res.status(400).json({ 
      success: false, 
      error: "orderId et description sont obligatoires." 
    });
  }

  try {
    const result = await createFormalRequest({
      orderId,
      initiatorType,
      initiatorId,
      category: category || "autre",
      description,
      evidenceUrls,
    });
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/formal-requests
 * Récupère les demandes de l'utilisateur connecté (initiées et reçues).
 */
formalRequestRouter.get("/", async (req, res) => {
  const userId = req.userId || req.query.userId || "client-me";
  try {
    const data = await getFormalRequestsForUser(userId);
    return res.json({ success: true, ...data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/formal-requests/order/:orderId
 * Récupère les demandes associées à une commande précise.
 */
formalRequestRouter.get("/order/:orderId", async (req, res) => {
  const { orderId } = req.params;
  try {
    const list = await getFormalRequestsForOrder(orderId);
    return res.json({ success: true, requests: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/formal-requests/:id/respond
 * Répondre à une demande formelle reçue.
 */
formalRequestRouter.post("/:id/respond", async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  const respondentId = req.userId || req.body.respondentId || "client-me";

  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: "Un message de réponse est obligatoire." });
  }

  try {
    const result = await respondToFormalRequest(id, respondentId, message);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/formal-requests/:id/escalate
 * Transmettre le dossier à l'équipe d'arbitrage Vork.
 */
formalRequestRouter.post("/:id/escalate", async (req, res) => {
  const { id } = req.params;
  const requestedById = req.userId || req.body.userId || "utilisateur";

  try {
    const result = await escalateToAdmin(id, requestedById);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});
