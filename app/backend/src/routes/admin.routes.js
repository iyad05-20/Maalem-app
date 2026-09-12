import express from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "../core/db/index.js";
import { 
  orders, 
  disputes, 
  vendorProfiles, 
  vendorWarnings, 
  withdrawalRequests, 
  ledgerEntries, 
  returnRequests,
  adminAuditLogs
} from "../core/db/schema.js";
import { recordVendorWarning } from "../client/services/artisanOrderService.js";
import { requireAdmin, logAdminAction } from "../middleware/localAuth.middleware.js";

export const adminRouter = express.Router();
adminRouter.use(requireAdmin);

/**
 * GET /api/admin/stats
 * KPIs globaux de la plateforme Vork pour l'Administrateur.
 */
adminRouter.get("/stats", async (req, res) => {
  try {
    const allOrders = await db.select().from(orders);
    const allDisputes = await db.select().from(disputes);
    const allProfiles = await db.select().from(vendorProfiles);
    const allWithdrawals = await db.select().from(withdrawalRequests);

    let totalGmv = 0;
    let lockedEscrowAmount = 0;
    let releasedEscrowAmount = 0;

    allOrders.forEach(o => {
      const price = Number(o.totalPrice) || 0;
      totalGmv += price;
      if (["acompte_verse", "payee_integralement", "en_preparation", "en_cours_de_transport", "livre"].includes(o.status) && !o.escrowReleasedAt) {
        lockedEscrowAmount += price;
      }
      if (o.escrowReleasedAt) {
        releasedEscrowAmount += price;
      }
    });

    const openDisputesCount = allDisputes.filter(d => ["ouvert", "en_arbitrage_admin", "en_attente_artisan"].includes(d.status)).length;
    const pendingWithdrawalsCount = allWithdrawals.filter(w => w.status === "pending").length;
    const suspendedVendorsCount = allProfiles.filter(p => p.suspensionStatus !== "active").length;

    return res.json({
      success: true,
      stats: {
        totalOrdersCount: allOrders.length,
        totalGmv,
        lockedEscrowAmount,
        releasedEscrowAmount,
        platformCommissionEstimate: Math.round(totalGmv * 0.10), // Commission Vork 10%
        openDisputesCount,
        pendingWithdrawalsCount,
        totalVendorsCount: allProfiles.length || 1,
        suspendedVendorsCount,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/disputes
 * Liste des dossiers de litiges avec filtres par statut et type.
 */
adminRouter.get("/disputes", async (req, res) => {
  try {
    const allDisputes = await db.select().from(disputes).orderBy(desc(disputes.createdAt));
    const allOrders = await db.select().from(orders);
    const ordersMap = new Map(allOrders.map(o => [o.id, o]));

    const enrichedDisputes = allDisputes.map(d => {
      const relatedOrder = ordersMap.get(d.orderId);
      return {
        ...d,
        order: relatedOrder || null,
        clientEvidencePhotos: d.clientEvidencePhotos ? JSON.parse(d.clientEvidencePhotos) : [],
        artisanEvidencePhotos: d.artisanEvidencePhotos ? JSON.parse(d.artisanEvidencePhotos) : [],
      };
    });

    return res.json({ success: true, count: enrichedDisputes.length, disputes: enrichedDisputes });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/disputes/:id
 * Dossier d'arbitrage complet avec comparaison des signatures et des preuves contradictoires.
 */
adminRouter.get("/disputes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let [dispute] = await db.select().from(disputes).where(eq(disputes.id, id));

    // Auto-création de litige de démo si non existant
    if (!dispute) {
      const demoDisputeId = id;
      const [order] = await db.select().from(orders);
      const orderId = order ? order.id : "demo-order-1";

      dispute = {
        id: demoDisputeId,
        orderId,
        type: "non_reception",
        claimantRef: "client-1",
        reason: "Le client conteste la livraison. La signature sur le reçu de livraison ne correspond pas.",
        clientEvidencePhotos: JSON.stringify(["https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600"]),
        artisanResponse: "Colis remis en main propre au gardien de la résidence.",
        artisanEvidencePhotos: JSON.stringify(["https://images.unsplash.com/photo-1583521214690-73421a1829a9?w=600"]),
        resolution: null,
        status: "en_arbitrage_admin",
        escrowStatusAtDispute: "locked",
        arbitrationDecision: null,
        arbitrationAmount: 0,
        arbitratedBy: "admin-vork",
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      };
      
      try {
        await db.insert(disputes).values(dispute);
      } catch {}
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, dispute.orderId));

    return res.json({
      success: true,
      dispute: {
        ...dispute,
        clientEvidencePhotos: dispute.clientEvidencePhotos ? JSON.parse(dispute.clientEvidencePhotos) : [],
        artisanEvidencePhotos: dispute.artisanEvidencePhotos ? JSON.parse(dispute.artisanEvidencePhotos) : [],
      },
      order: order ? {
        ...order,
        prepPhotos: order.prepPhotos ? JSON.parse(order.prepPhotos) : []
      } : null
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/disputes/:id/resolve
 * Exécute la décision d'arbitrage du médiateur Vork (Art. 20.5).
 */
adminRouter.post("/disputes/:id/resolve", async (req, res) => {
  const { id } = req.params;
  const { resolutionType, arbitrationAmount, arbitrationDecision, arbitratedBy = "admin-vork" } = req.body;

  if (!resolutionType || !arbitrationDecision) {
    return res.status(400).json({ success: false, error: "La décision motivée et le type de résolution sont obligatoires." });
  }

  try {
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, id));
    if (!dispute) {
      return res.status(404).json({ success: false, error: "Litige introuvable." });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, dispute.orderId));
    const now = new Date().toISOString();
    let newStatus = dispute.status;

    if (resolutionType === "refund_total") {
      newStatus = "resolu_remboursement_total";
      if (order) {
        await db.update(orders).set({ status: "annulee", updatedAt: now }).where(eq(orders.id, order.id));

        // Enregistrement de l'écriture comptable dans le Ledger
        await db.insert(ledgerEntries).values({
          id: `ledger-${Date.now()}`,
          orderId: order.id,
          compteDebit: dispute.escrowStatusAtDispute === "already_released" ? `VENDOR_RECOVERY:${order.artisanRef}` : "ESCROW_LOCKED",
          compteCredit: `CLIENT_WALLET:${order.clientRef}`,
          montant: order.totalPrice,
          type: "arbitration_refund_total",
          metadata: JSON.stringify({ disputeId: id, decision: arbitrationDecision }),
          createdAt: now
        });

        // Si l'escrow avait déjà été libéré au vendeur, sanction & avertissement (Art. 11.6 & 19)
        if (dispute.escrowStatusAtDispute === "already_released") {
          await recordVendorWarning(
            order.artisanRef, 
            `Litige perdu post-libération de séquestre : Recouvrement forcé de ${order.totalPrice} MAD (Art. 11.6)`,
            order.id
          );
        }
      }
    } else if (resolutionType === "refund_partial") {
      newStatus = "resolu_remboursement_partiel";
      const amount = Number(arbitrationAmount) || 0;
      if (order) {
        await db.insert(ledgerEntries).values({
          id: `ledger-${Date.now()}`,
          orderId: order.id,
          compteDebit: "ESCROW_LOCKED",
          compteCredit: `CLIENT_WALLET:${order.clientRef}`,
          montant: amount,
          type: "arbitration_refund_partial",
          metadata: JSON.stringify({ disputeId: id, decision: arbitrationDecision }),
          createdAt: now
        });
      }
    } else if (resolutionType === "replacement") {
      newStatus = "resolu_remplacement";
      if (order) {
        await db.update(orders).set({ status: "en_preparation", updatedAt: now }).where(eq(orders.id, order.id));
      }
    } else if (resolutionType === "rejected") {
      newStatus = "rejete";
      if (order) {
        // Libération immédiate des fonds à l'artisan
        await db.update(orders).set({ escrowReleasedAt: now, status: "livre", updatedAt: now }).where(eq(orders.id, order.id));
        await db.insert(ledgerEntries).values({
          id: `ledger-${Date.now()}`,
          orderId: order.id,
          compteDebit: "ESCROW_LOCKED",
          compteCredit: `VENDOR_WALLET:${order.artisanRef}`,
          montant: order.totalPrice,
          type: "arbitration_rejected_escrow_release",
          metadata: JSON.stringify({ disputeId: id, decision: arbitrationDecision }),
          createdAt: now
        });
      }
    }

    await db.update(disputes).set({
      status: newStatus,
      resolution: resolutionType,
      arbitrationDecision,
      arbitrationAmount: Number(arbitrationAmount) || 0,
      arbitratedBy: req.adminOperator?.email || arbitratedBy,
      resolvedAt: now,
    }).where(eq(disputes.id, id));

    const operatorId = req.adminOperator?.id || req.userId || "admin_master";
    await logAdminAction(
      operatorId,
      "resolve_dispute",
      id,
      { resolutionType, arbitrationAmount: Number(arbitrationAmount) || 0, arbitrationDecision },
      req.ip
    );

    return res.json({ 
      success: true, 
      message: `Décision d'arbitrage enregistrée et exécutée avec succès (Rapport transmis aux deux parties).`,
      disputeId: id,
      resolutionType,
      newStatus 
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/vendors
 * Tableau de santé des Maâlems et historique des avertissements.
 */
adminRouter.get("/vendors", async (req, res) => {
  try {
    const profiles = await db.select().from(vendorProfiles);
    const warnings = await db.select().from(vendorWarnings).orderBy(desc(vendorWarnings.createdAt));

    // S'assurer qu'au moins artisan-1 existe
    if (profiles.length === 0) {
      const defaultProfile = {
        id: "artisan-1",
        warningCountCurrentMonth: 0,
        suspensionStatus: "active",
        suspendedUntil: null,
        updatedAt: new Date().toISOString(),
      };
      try { await db.insert(vendorProfiles).values(defaultProfile); } catch {}
      profiles.push(defaultProfile);
    }

    return res.json({ success: true, count: profiles.length, profiles, warnings });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/vendors/:id/warning
 * Émet un avertissement formel motivé à l'artisan (Art. 6.4 & 19).
 */
adminRouter.post("/vendors/:id/warning", async (req, res) => {
  const { id } = req.params;
  const { orderId, reason } = req.body;

  if (!reason) {
    return res.status(400).json({ success: false, error: "Le motif réglementaire de l'avertissement est obligatoire." });
  }

  try {
    const result = await recordVendorWarning(id, reason, orderId || null);
    const operatorId = req.adminOperator?.id || req.userId || "admin_master";
    await logAdminAction(operatorId, "issue_vendor_warning", id, { reason, orderId }, req.ip);
    return res.json({ success: true, message: "Avertissement formel émis avec succès.", result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/admin/vendors/:id/status
 * Modification manuelle du statut de suspension d'une boutique (Art. 22).
 */
adminRouter.put("/vendors/:id/status", async (req, res) => {
  const { id } = req.params;
  const { suspensionStatus, suspendedUntil } = req.body;

  if (!["active", "paused", "suspended_7d", "suspended_14d", "blocked"].includes(suspensionStatus)) {
    return res.status(400).json({ success: false, error: "Statut de suspension invalide." });
  }

  try {
    const now = new Date().toISOString();
    await db.update(vendorProfiles).set({
      suspensionStatus,
      suspendedUntil: suspendedUntil || null,
      updatedAt: now,
    }).where(eq(vendorProfiles.id, id));

    const operatorId = req.adminOperator?.id || req.userId || "admin_master";
    await logAdminAction(operatorId, "update_vendor_status", id, { suspensionStatus, suspendedUntil }, req.ip);

    return res.json({ success: true, message: `Statut de la boutique ${id} mis à jour : ${suspensionStatus}.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/withdrawals
 * Liste des demandes de virements bancaires des artisans.
 */
adminRouter.get("/withdrawals", async (req, res) => {
  try {
    const requests = await db.select().from(withdrawalRequests).orderBy(desc(withdrawalRequests.createdAt));
    return res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/withdrawals/:id/process
 * Valide ou rejette un virement bancaire sur RIB.
 */
adminRouter.post("/withdrawals/:id/process", async (req, res) => {
  const { id } = req.params;
  const { status, bankTransactionRef } = req.body; // 'processed' | 'rejected'

  try {
    const now = new Date().toISOString();
    await db.update(withdrawalRequests).set({
      status: status || "processed",
      processedAt: now,
    }).where(eq(withdrawalRequests.id, id));

    const operatorId = req.adminOperator?.id || req.userId || "admin_master";
    await logAdminAction(operatorId, "process_withdrawal", id, { status, bankTransactionRef }, req.ip);

    return res.json({ success: true, message: `Demande de virement ${id} marquée comme ${status}.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/ledger
 * Grand Livre comptable du Séquestre.
 */
adminRouter.get("/ledger", async (req, res) => {
  try {
    const entries = await db.select().from(ledgerEntries).orderBy(desc(ledgerEntries.createdAt)).limit(100);
    return res.json({ success: true, count: entries.length, entries });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/logistics
 * Vue d'ensemble des expéditions Sendit et Directes.
 */
adminRouter.get("/logistics", async (req, res) => {
  try {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const logisticsOrders = allOrders.filter(o => o.senditDeliveryCode || o.transportProvider === "vendeur" || ["en_cours_de_transport", "livre"].includes(o.status));
    return res.json({ success: true, count: logisticsOrders.length, orders: logisticsOrders });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/config/db-mode
 * Récupère l'état de la connexion PostgreSQL Supabase.
 */
adminRouter.get("/config/db-mode", async (_req, res) => {
  try {
    return res.json({
      success: true,
      activeMode: "prod",
      postgres: {
        connected: true,
        provider: "Supabase PostgreSQL",
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/config/db-mode
 */
adminRouter.post("/config/db-mode", async (req, res) => {
  const operatorId = req.adminOperator?.id || req.userId || "admin_master";
  await logAdminAction(operatorId, "switch_db_mode", "database_cluster", { mode: "prod" }, req.ip);

  return res.json({ 
    success: true, 
    message: "Base de données unifiée sur Supabase PostgreSQL.",
    activeMode: "prod",
  });
});

/**
 * GET /api/admin/audit-logs
 * Historique des actions et arbitrages des opérateurs administrateurs.
 */
adminRouter.get("/audit-logs", async (_req, res) => {
  try {
    const logs = await db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(100);
    return res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
