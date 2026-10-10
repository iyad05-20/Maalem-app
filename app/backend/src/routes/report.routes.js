import express from "express";
import { 
  submitReport, 
  getReportsForAdmin, 
  resolveReportAdmin 
} from "../services/reportService.js";
import { optionalAuth, requireAdmin } from "../middleware/localAuth.middleware.js";

export const reportRouter = express.Router();

/**
 * POST /api/reports
 * Soumet un signalement pour un produit, une commande publique ou un vendeur.
 * Accessible aux clients et aux artisans.
 */
reportRouter.post("/", optionalAuth, async (req, res) => {
  const reporterId = req.userId || (req.user && req.user.id) || req.body.reporterId || "anonymous-reporter";
  const reporterType = req.user?.role || req.body.reporterType || "client";

  const {
    targetType,
    targetId,
    targetTitle,
    targetOwnerId,
    category,
    reason,
    evidenceUrls,
  } = req.body;

  try {
    const result = await submitReport({
      reporterId,
      reporterType,
      targetType,
      targetId,
      targetTitle,
      targetOwnerId,
      category,
      reason,
      evidenceUrls,
    });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/reports/admin (ou /api/admin/reports via admin routes)
 * Consultation de la liste des signalements pour les administrateurs.
 */
reportRouter.get("/admin", requireAdmin, async (req, res) => {
  const { status, category } = req.query;
  try {
    const list = await getReportsForAdmin({ status, category });
    return res.json({ success: true, count: list.length, reports: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/reports/admin/:id/resolve
 * Traitement et exécution de la décision de modération admin.
 */
reportRouter.post("/admin/:id/resolve", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const operatorId = req.userId || "admin-operator";
  const { decision, adminNotes } = req.body;

  if (!decision) {
    return res.status(400).json({ success: false, error: "La décision d'arbitrage est requise." });
  }

  try {
    const result = await resolveReportAdmin(id, operatorId, { decision, adminNotes });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

export default reportRouter;
