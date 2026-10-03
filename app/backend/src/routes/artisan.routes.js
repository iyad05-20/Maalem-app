import express from "express";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { db } from "../core/db/index.js";
import { 
  orders, 
  disputes, 
  vendorProfiles, 
  vendorWarnings, 
  withdrawalRequests, 
  ledgerEntries, 
  returnRequests,
  customRequests 
} from "../core/db/schema.js";
import { getAllProducts, getProductStockInfo, updateProductStockAction } from "../db/products.repository.js";
import { supabase } from "../db/supabase.client.js";
import { loadProducts } from "../services/recommendation.service.js";
import { productsIndex } from "../services/search/meilisearch.service.js";
import { requireAuth, optionalAuth } from "../middleware/localAuth.middleware.js";
import { 
  acceptOrder, 
  uploadPrepPhotos, 
  prepareSenditShipping, 
  confirmSenditPickupReady, 
  shipVendeurSelf, 
  shipOrderDirect,
  completeVendeurDelivery,
  recordVendorWarning,
  handleEscrowChoice,
  nudgeClientApproval,
  contestWarningForceMajeure,
  shipOrder
} from "../client/services/artisanOrderService.js";
import { creditClientWallet } from "../client/services/clientWalletService.js";

export const artisanRouter = express.Router();

/**
 * GET /api/artisan/vendor/:vendorRef/profile
 * Profil public de boutique artisanale & historique des avertissements (Accessible à tous / public)
 */
artisanRouter.get("/vendor/:vendorRef/profile", async (req, res) => {
  const vendorRef = req.params.vendorRef;
  const [profileFound] = await db.select().from(vendorProfiles).where(eq(vendorProfiles.id, vendorRef));
  const profile = profileFound || {
    id: vendorRef,
    warningCountCurrentMonth: 0,
    suspensionStatus: "active",
    suspendedUntil: null,
  };
  const warnings = await db.select().from(vendorWarnings).where(eq(vendorWarnings.vendorRef, vendorRef));
  res.json({ success: true, profile, warnings });
});

/**
 * GET /api/artisan/orders/:id/label
 * Récupération du Bon de Livraison / Justificatif d'expédition (Accessible pour consultation/téléchargement)
 */
artisanRouter.get("/orders/:id/label", async (req, res) => {
  res.json({ success: true, labelUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" });
});

// Authentification obligatoire pour toutes les routes de gestion d'atelier (Anti-IDOR)
artisanRouter.use(requireAuth(["artisan", "admin"]));

export const getArtisanRef = (req) => {
  // Identité dérivée exclusivement du JWT (Anti-IDOR) — jamais du corps de la requête
  return req.userId || (req.user && req.user.id);
};

export const getArtisanOrderCondition = (artisanRef) => {
  const isAbdelkader = artisanRef === "artisan_abdelkader" || artisanRef === "artisan-1";
  return isAbdelkader
    ? or(eq(orders.artisanRef, "artisan_abdelkader"), eq(orders.artisanRef, "artisan-1"), eq(orders.artisanRef, artisanRef))
    : eq(orders.artisanRef, artisanRef);
};

/**
 * GET /api/artisan/orders
 * Récupère les commandes assignées à l'artisan.
 */
artisanRouter.get("/orders", async (req, res) => {
  try {
    const artisanRef = getArtisanRef(req);
    if (!artisanRef) {
      return res.status(401).json({ success: false, error: "Identité artisan introuvable. Reconnectez-vous." });
    }

    const condition = getArtisanOrderCondition(artisanRef);

    const list = await db.select().from(orders)
      .where(condition)
      .orderBy(desc(orders.createdAt));

    const enriched = list.map(o => {
      let prepPhotos = [];
      try {
        prepPhotos = typeof o.prepPhotos === 'string' ? JSON.parse(o.prepPhotos) : (Array.isArray(o.prepPhotos) ? o.prepPhotos : []);
      } catch {}
      return {
        ...o,
        prepPhotos,
      };
    });

    return res.json({ success: true, count: enriched.length, orders: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/accept
 * Accepte la commande sous 72h max (Art. 6.1).
 * (P5 - 28/09/2026) : Vérifie le stock avant acceptation.
 *   - Si stock = 0 → 409 avec redirection vers la page d'incrémentation du stock
 *   - Si stock ≤ 20% après décrémentation → notification "Stock Limité"
 *   - Si stock tombe à 0 après décrémentation → notification "Stock Épuisé"
 */
artisanRouter.post("/orders/:id/accept", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await acceptOrder(id);
    const [updated] = await db.select().from(orders).where(eq(orders.id, id));

    const response = {
      success: true,
      message: "Commande acceptée ! Entrée en fabrication.",
      message_ar: "تم قبول الطلب! بدأ التحضير.",
      order: updated,
    };

    // P5 : Notifications de stock pour le frontend
    if (result && result.stockNotification) {
      response.stockNotification = result.stockNotification;

      if (result.stockNotification.notificationType === "stock_epuise") {
        response.stockAlert = {
          type: "stock_epuise",
          title: "Stock épuisé",
          title_ar: "المخزون نفد",
          message: "Le stock de ce produit est tombé à 0. Le post a été masqué automatiquement. Veuillez ajouter du stock pour le rendre visible à nouveau.",
          message_ar: "نفد مخزون هذا المنتج. تم إخفاء المنشور تلقائياً. يرجى إضافة المخزون لإعادة إظهاره.",
          actionLabel: "Ajouter du stock",
          actionLabel_ar: "إضافة مخزون",
          redirectTo: `/artisan/products/${updated?.productId}/stock`,
        };
      } else if (result.stockNotification.notificationType === "stock_limite_20_pourcent") {
        response.stockAlert = {
          type: "stock_limite",
          title: "Stock limité",
          title_ar: "مخزون محدود",
          message: `Attention : il ne reste que ${result.stockNotification.stockPercentage}% du stock (${result.stockNotification.newStock} unité(s)). Pensez à réapprovisionner.`,
          message_ar: `تنبيه: لم يتبق سوى ${result.stockNotification.stockPercentage}% من المخزون (${result.stockNotification.newStock} وحدة). يرجى التفكير في إعادة التزود.`,
          actionLabel: "Gérer le stock",
          actionLabel_ar: "إدارة المخزون",
          redirectTo: `/artisan/products/${updated?.productId}/stock`,
        };
      }
    }

    return res.json(response);
  } catch (err) {
    // P5 : Erreur de stock — blocage de l'acceptation
    if (err.statusCode === 409 && err.stockCheck) {
      return res.status(409).json({
        success: false,
        error: err.stockCheck.isOutOfStock
          ? "Le stock de ce produit est épuisé. Vous devez d'abord incrémenter le stock avant de pouvoir accepter cette commande."
          : "Le stock est insuffisant pour la quantité commandée. Veuillez ajuster le stock.",
        error_ar: err.stockCheck.isOutOfStock
          ? "مخزون هذا المنتج نفد. يجب عليك أولاً زيادة المخزون قبل قبول هذا الطلب."
          : "المخزون غير كافٍ للكمية المطلوبة. يرجى تعديل المخزون.",
        stockCheck: err.stockCheck,
        actionRequired: "increment_stock",
        actionLabel: "Incrémenter le stock",
        actionLabel_ar: "زيادة المخزون",
        redirectTo: err.stockCheck.redirectTo,
      });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/refuse
 * Refuse la commande avec motif en liste déroulante + texte si "Autre" (Décision 23).
 * SANS sanction ni avertissement automatique (Décision 24).
 * Remboursement automatique 100% sur le wallet interne du client (Décision 28).
 */
artisanRouter.post("/orders/:id/refuse", async (req, res) => {
  const { id } = req.params;
  const { category = "autre", reason = "" } = req.body;

  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return res.status(404).json({ success: false, error: "Commande introuvable." });

    const now = new Date().toISOString();
    const finalReason = String(reason || category).trim();

    // 1. Remboursement automatique 100% au Wallet Client (Décision 28)
    await creditClientWallet(
      order.clientRef, 
      order.totalPrice, 
      id, 
      "refund_order_refused", 
      { category, reason: finalReason }
    );

    // 2. Mise à jour de la commande
    await db.update(orders).set({
      status: "refuse_vendeur",
      refusedByArtisan: 1,
      refusalReason: finalReason,
      refusalReasonCategory: category,
      refusalReasonText: finalReason,
      updatedAt: now,
    }).where(eq(orders.id, id));

    await db.insert(ledgerEntries).values({
      id: `ledger-${Date.now()}`,
      orderId: id,
      compteDebit: "ESCROW_LOCKED",
      compteCredit: `CLIENT_WALLET:${order.clientRef}`,
      montant: order.totalPrice,
      type: "order_refused_by_artisan_refund",
      metadata: JSON.stringify({ category, reason: finalReason }),
      createdAt: now,
    });

    // Remarque : AUCUN avertissement émis (Décision 24)

    return res.json({ 
      success: true, 
      status: "refuse_vendeur",
      message: "Commande déclinée sans pénalité. Le client a été intégralement remboursé sur son portefeuille interne Vork." 
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/prep-photos
 * Upload des 4 photos de préparation obligatoires (Art. 8.1).
 */
artisanRouter.post("/orders/:id/prep-photos", async (req, res) => {
  const { id } = req.params;
  const { photos, bypass } = req.body;

  // ─── PROVISIONAL BYPASS (Facile à éliminer) ──────────────────────────────
  const isBypass = bypass === true || (Array.isArray(photos) && photos.some(p => String(p).startsWith("bypass:")));

  if (!isBypass && (!photos || !Array.isArray(photos) || photos.length === 0)) {
    return res.status(400).json({ success: false, error: "Veuillez fournir les photos de préparation." });
  }

  const finalPhotos = isBypass ? ["bypass:prep_photos_waived"] : photos;

  try {
    const result = await uploadPrepPhotos(id, finalPhotos);
    return res.json({ 
      success: true, 
      message: isBypass 
        ? "Conformité de préparation validée en atelier." 
        : `${finalPhotos.length} photo(s) de préparation enregistrée(s).`, 
      result 
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/ship
 * Expédition directe unifiée (Décision C05).
 * Le vendeur choisit le mode d'acheminement de son choix (ses propres moyens, transporteur indépendant, etc.)
 */
artisanRouter.post("/orders/:id/ship", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await shipOrderDirect(id, req.body);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/ship-sendit-step1
 * Étape 1 Sendit (Rétrocompatibilité -> Redirige vers expédition directe).
 */
artisanRouter.post("/orders/:id/ship-sendit-step1", async (req, res) => {
  const { id } = req.params;
  const deliveryData = req.body;

  try {
    const result = await prepareSenditShipping(id, deliveryData);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/ship-sendit-step2
 * Étape 2 Sendit : Upload photo du colis étiqueté & ordre de ramassage (Art. 8.3)
 * + Saisie du nombre de jours de transport estimé (max 30j - Règle Ziad 11/09/2026).
 */
artisanRouter.post("/orders/:id/ship-sendit-step2", async (req, res) => {
  const { id } = req.params;
  const { blAttachedPhoto, estimatedTransportDays } = req.body;

  try {
    const result = await confirmSenditPickupReady(id, { blAttachedPhoto, estimatedTransportDays });
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/ship-vendeur
 * Expédition directe par les propres moyens du Maâlem (Art. 8.2 & 9.3).
 */
artisanRouter.post("/orders/:id/ship-vendeur", async (req, res) => {
  const { id } = req.params;
  const { transportDurationDays = 7 } = req.body;

  try {
    const result = await shipVendeurSelf(id, transportDurationDays);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/complete-delivery
 * Validation livraison directe avec photo du bordereau signé (Art. 11.5).
 */
artisanRouter.post("/orders/:id/complete-delivery", async (req, res) => {
  const { id } = req.params;
  const { signaturePhoto } = req.body;

  try {
    const result = await completeVendeurDelivery(id, signaturePhoto);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/escrow-choice
 * Décision de l'artisan après l'expiration des 7 jours de rétractation (Règle Ziad 11/09/2026) :
 * action: 'claim' (débloquer les fonds de la commande spécifique) OU 'extend' (accorder plus de temps au client).
 */
artisanRouter.post("/orders/:id/escrow-choice", async (req, res) => {
  const { id } = req.params;
  const { action, extendDays } = req.body;
  const artisanRef = getArtisanRef(req);

  try {
    const result = await handleEscrowChoice(id, artisanRef, action, extendDays);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/nudge-client
 * Inciter le client à approuver la réception de sa livraison transporteur vendeur (Règle Ziad 11/09/2026).
 */
artisanRouter.post("/orders/:id/nudge-client", async (req, res) => {
  const { id } = req.params;
  const artisanRef = getArtisanRef(req);

  try {
    const result = await nudgeClientApproval(id, artisanRef);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/warnings/:id/contest-force-majeure
 * Contestation d'un avertissement pour Force Majeure dans le mois (Art. 12.5 & 27 CGV v23).
 */
artisanRouter.post("/warnings/:id/contest-force-majeure", async (req, res) => {
  const { id } = req.params;
  const { reason, proofDocUrl } = req.body;
  const artisanRef = getArtisanRef(req);

  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, error: "Un motif justificatif de Force Majeure est obligatoire." });
  }

  try {
    const result = await contestWarningForceMajeure(id, artisanRef, reason.trim(), proofDocUrl);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/returns
 * Récupère les demandes de retours clients concernant l'artisan.
 */
artisanRouter.get("/returns", async (req, res) => {
  try {
    const allReturns = await db.select().from(returnRequests).orderBy(desc(returnRequests.createdAt));
    const allOrders = await db.select().from(orders);
    const ordersMap = new Map(allOrders.map(o => [o.id, o]));

    const enriched = allReturns.map(r => ({
      ...r,
      order: ordersMap.get(r.orderId) || null,
    }));

    return res.json({ success: true, count: enriched.length, returns: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/returns/:id/confirm
 * Confirmation de réception de l'article retourné sous 48h (Art. 13.6).
 */
artisanRouter.post("/returns/:id/confirm", async (req, res) => {
  const { id } = req.params;
  const now = new Date().toISOString();

  try {
    const [ret] = await db.select().from(returnRequests).where(eq(returnRequests.id, id));
    if (!ret) return res.status(404).json({ success: false, error: "Demande de retour introuvable." });

    const [order] = await db.select().from(orders).where(eq(orders.id, ret.orderId));
    if (order) {
      await db.update(orders).set({ status: "annulee", updatedAt: now }).where(eq(orders.id, order.id));

      const refundAmount = Math.max(0, Number(order.totalPrice) - Number(ret.returnShippingFee || 0));
      await db.insert(ledgerEntries).values({
        id: `ledger-${Date.now()}`,
        orderId: order.id,
        compteDebit: "ESCROW_LOCKED",
        compteCredit: `CLIENT_WALLET:${order.clientRef}`,
        montant: refundAmount,
        type: "return_validated_by_artisan_refund",
        createdAt: now,
      });
    }

    await db.update(returnRequests).set({ status: "resolu_conforme", resolvedAt: now }).where(eq(returnRequests.id, id));

    return res.json({ success: true, message: "Retour validé avec succès. Client remboursé." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/disputes
 * Liste des réclamations concernant le Maâlem.
 */
artisanRouter.get("/disputes", async (req, res) => {
  try {
    const allDisputes = await db.select().from(disputes).orderBy(desc(disputes.createdAt));
    const allOrders = await db.select().from(orders);
    const ordersMap = new Map(allOrders.map(o => [o.id, o]));

    const enriched = allDisputes.map(d => ({
      ...d,
      order: ordersMap.get(d.orderId) || null,
      clientEvidencePhotos: d.clientEvidencePhotos ? JSON.parse(d.clientEvidencePhotos) : [],
      artisanEvidencePhotos: d.artisanEvidencePhotos ? JSON.parse(d.artisanEvidencePhotos) : [],
    }));

    return res.json({ success: true, count: enriched.length, disputes: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/disputes/:id/respond
 * Soumission de la réponse contradictoire du Maâlem sous 48h (Art. 20).
 */
artisanRouter.post("/disputes/:id/respond", async (req, res) => {
  const { id } = req.params;
  const { artisanResponse, artisanEvidencePhotos = [] } = req.body;

  if (!artisanResponse || !artisanResponse.trim()) {
    return res.status(400).json({ success: false, error: "Veuillez formuler vos explications écrites." });
  }

  try {
    const now = new Date().toISOString();
    await db.update(disputes).set({
      artisanResponse: artisanResponse.trim(),
      artisanEvidencePhotos: JSON.stringify(artisanEvidencePhotos),
      status: "en_arbitrage_admin",
    }).where(eq(disputes.id, id));

    return res.json({ success: true, message: "Votre réponse contradictoire a été transmise à la médiation Vork." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/wallet
 * Portefeuille financier du Maâlem (Ventes nettes, Séquestre, Historique).
 */
artisanRouter.get("/wallet", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  try {
    const condition = getArtisanOrderCondition(artisanRef);
    const allOrders = await db.select().from(orders).where(condition);
    const allWithdrawals = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, artisanRef));

    let availableBalance = 0;
    let lockedEscrow = 0;
    let totalGrossSales = 0;

    allOrders.forEach(o => {
      // Formule exacte Vork : Prix Client TTC = Prix Net Artisan + 5% Comm HT + 20% TVA sur Comm (Majoration 6%)
      const netAmount = Math.round((Number(o.totalPrice) / 1.06) * 100) / 100;
      totalGrossSales += Number(o.totalPrice);

      if (o.status === "annulee") {
        return;
      }

      if (o.escrowReleasedAt) {
        availableBalance += netAmount;
      } else if (["acompte_verse", "payee_integralement", "en_preparation", "en_cours_de_transport", "livre"].includes(o.status)) {
        lockedEscrow += netAmount;
      }
    });

    const pendingOrProcessedWithdrawals = allWithdrawals
      .filter(w => ["processed", "pending", "en_attente_lot_vendredi"].includes(w.status))
      .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

    availableBalance = Math.max(0, Math.round((availableBalance - pendingOrProcessedWithdrawals) * 100) / 100);
    lockedEscrow = Math.round(lockedEscrow * 100) / 100;
    totalGrossSales = Math.round(totalGrossSales * 100) / 100;

    return res.json({
      success: true,
      wallet: {
        availableBalance,
        lockedEscrow,
        totalGrossSales,
        withdrawalBatchDay: "Chaque Vendredi ouvré à 16h00 (Wafacash / CIH Bank)",
        withdrawalsHistory: allWithdrawals,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/wallet/withdraw
 * Demande de virement bancaire des fonds débloqués vers le RIB du Maâlem (Art. 18.2).
 */
artisanRouter.post("/wallet/withdraw", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  const { rib, amount } = req.body;

  if (!rib || String(rib).trim().length !== 24 || !/^\d+$/.test(String(rib).trim())) {
    return res.status(400).json({ 
      success: false, 
      error: "Le RIB bancaire marocain doit comporter exactement 24 chiffres bancaires normalisés." 
    });
  }

  const cleanRib = String(rib).trim();
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0 || isNaN(numericAmount)) {
    return res.status(400).json({ success: false, error: "Le montant de virement demandé doit être supérieur à 0 MAD." });
  }

  try {
    let txResult;
    try {
      txResult = await db.transaction(async (tx) => {
        // 1. Calcul en temps réel du solde net débloqué issu des ventes
        const allOrders = await tx.select().from(orders).where(eq(orders.artisanRef, artisanRef));
        const allWithdrawals = await tx.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, artisanRef));

        let totalReleased = 0;
        allOrders.forEach((o) => {
          if (o.escrowReleasedAt) {
            // Formule Vork : Prix Net = Prix Client / 1.06
            totalReleased += Math.round((Number(o.totalPrice) / 1.06) * 100) / 100;
          }
        });

        // 2. Déduction des virements déjà traités ou en attente d'exécution
        const committedWithdrawals = allWithdrawals
          .filter((w) => ["processed", "pending", "en_attente_lot_vendredi"].includes(w.status))
          .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

        const availableBalance = Math.max(0, Math.round((totalReleased - committedWithdrawals) * 100) / 100);

        // 3. Vérification de solvabilité stricte
        if (numericAmount > availableBalance) {
          const err = new Error(`Solde retirable insuffisant. Votre solde disponible est de ${availableBalance.toFixed(2)} MAD (montant demandé : ${numericAmount.toFixed(2)} MAD).`);
          err.statusCode = 422;
          err.availableBalance = availableBalance;
          throw err;
        }

        const now = new Date().toISOString();
        const withdrawalId = `with-${Date.now()}`;

        // 4. Enregistrement de la demande de virement
        await tx.insert(withdrawalRequests).values({
          id: withdrawalId,
          userId: artisanRef,
          amount: numericAmount,
          rib: cleanRib,
          status: "en_attente_lot_vendredi",
          createdAt: now,
        });

        // 5. Consignation immédiate dans le Grand Livre comptable
        await tx.insert(ledgerEntries).values({
          id: `ledger-${Date.now()}`,
          orderId: null,
          compteDebit: `VENDOR_WALLET:${artisanRef}`,
          compteCredit: "BANK_PAYOUT_ESCROW",
          montant: numericAmount,
          type: "demande_virement_artisan",
          metadata: JSON.stringify({ 
            withdrawalId, 
            rib: cleanRib, 
            availableBalanceBefore: availableBalance,
            artisanRef,
          }),
          createdAt: now,
        });

        return {
          withdrawalId,
          amount: numericAmount,
          availableBalanceAfter: Math.round((availableBalance - numericAmount) * 100) / 100,
        };
      });
    } catch (txErr) {
      if (txErr.statusCode === 422) {
        return res.status(422).json({
          success: false,
          error: txErr.message,
          availableBalance: txErr.availableBalance,
        });
      }
      throw txErr;
    }

    return res.json({
      success: true,
      message: `Demande de virement de ${numericAmount} MAD consignée avec succès. Exécution programmée lors du lot hebdomadaire (Vendredi à 10h00).`,
      withdrawalId: txResult.withdrawalId,
      availableBalance: txResult.availableBalanceAfter,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/profile/health
 * Santé de la boutique & Compteur d'avertissements (Art. 19 & 22).
 */
artisanRouter.get("/profile/health", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  try {
    let [profile] = await db.select().from(vendorProfiles).where(eq(vendorProfiles.id, artisanRef));
    if (!profile) {
      profile = {
        id: artisanRef,
        warningCountCurrentMonth: 0,
        suspensionStatus: "active",
        suspendedUntil: null,
        updatedAt: new Date().toISOString(),
      };
      try { await db.insert(vendorProfiles).values(profile); } catch {}
    }

    const warnings = await db.select().from(vendorWarnings).where(eq(vendorWarnings.vendorRef, artisanRef)).orderBy(desc(vendorWarnings.createdAt));

    return res.json({ success: true, profile, warnings });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/products & POST /api/artisan/products
 * Gestion du Catalogue de l'Artisan (Art. 4).
 */
// Catalogue en mémoire — vide par défaut, les produits sont chargés depuis Supabase ou créés par les artisans
let artisanProductsList = [];

function mapCategoryToGroup(cat = "") {
  const c = String(cat).toLowerCase();
  if (c.includes("céra") || c.includes("pot") || c.includes("فخار") || c.includes("خزف")) return "ceramique";
  if (c.includes("cuir") || c.includes("maroquin") || c.includes("جلد")) return "maroquinerie";
  if (c.includes("text") || c.includes("caftan") || c.includes("نسيج") || c.includes("قفطان")) return "textile";
  if (c.includes("bois") || c.includes("zellige") || c.includes("خشب") || c.includes("زليج")) return "menuiserie";
  if (c.includes("cuiv") || c.includes("métal") || c.includes("نحاس") || c.includes("معادن")) return "dinanderie";
  if (c.includes("tapis") || c.includes("broder") || c.includes("زرابي") || c.includes("طرز")) return "broderie";
  if (c.includes("bijou") || c.includes("حلي") || c.includes("إكسسوار")) return "bijouterie";
  return "artisanat";
}

artisanRouter.get("/products", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  if (!artisanRef) {
    return res.status(401).json({ success: false, error: "Identité artisan introuvable. Reconnectez-vous." });
  }

  try {
    // 1. Produits RAM créés lors de cette session (filtrés par artisan)
    let combined = artisanProductsList.filter(p => !p.artisanRef || p.artisanRef === artisanRef);

    // 2. Produits Supabase persistés — filtrés par artisan_ref dans facets
    try {
      const { data: dbData, error: dbError } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!dbError && Array.isArray(dbData)) {
        for (const p of dbData) {
          // Filtrage : on n'inclut que les produits appartenant à cet artisan
          const prodArtisanRef = p.facets?.artisan_ref || null;
          if (prodArtisanRef && prodArtisanRef !== artisanRef) continue;

          if (!combined.some((item) => item.id === p.id)) {
            combined.push({
              id: p.id,
              artisanRef: prodArtisanRef,
              title: p.title,
              description: p.identity?.description || "",
              price: p.identity?.net_price || p.price,
              clientPrice: p.price,
              productType: p.identity?.product_type || "standard",
              category: p.category,
              image: p.image_url || "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
              artisanName: p.artisan_name || "",
              rating: 5.0,
              reviewCount: 0,
              inStock: p.in_stock ?? true,
              manufacturingDays: p.identity?.manufacturing_days || 5,
              createdAt: p.created_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch (sbErr) {
      console.warn("[VORK-API] Supabase fetch for artisan products failed:", sbErr.message);
    }

    return res.json({ success: true, count: combined.length, products: combined });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

artisanRouter.post("/products", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  if (!artisanRef) {
    return res.status(401).json({ success: false, error: "Identité artisan introuvable. Reconnectez-vous." });
  }

  const { 
    title, 
    description, 
    price, 
    productType = "standard", 
    category, 
    image, 
    manufacturingDays = 5,
    stock,
    stockPolicy,
    shippingFee,
    shippingThreshold,
  } = req.body;

  if (!title || !price) {
    return res.status(400).json({ success: false, error: "Le titre et le prix net sont obligatoires." });
  }

  // Décision 33 : Seuil de transport obligatoire si frais de livraison définis
  const numShippingFee = Number(shippingFee) || 0;
  const numShippingThreshold = Number(shippingThreshold);
  if (numShippingFee > 0 && (!numShippingThreshold || numShippingThreshold < 1)) {
    return res.status(400).json({
      success: false,
      error: "Le seuil de quantité pour le transport est obligatoire dès lors que des frais de livraison sont définis (minimum 1 article par forfait).",
      error_ar: "عتبة الكمية لمصاريف الشحن إلزامية عند تحديد سعر التوصيل (قطعة واحدة كحد أدنى لكل طرد).",
    });
  }

  const numNet = Number(price);
  const commissionHt = Math.round(numNet * 0.05);
  const tvaVal = Math.round(commissionHt * 0.20);
  const clientPrice = numNet + commissionHt + tvaVal;
  const productId = `prd-${Date.now()}`;
  const prodTitle = String(title).trim();
  const prodDesc = String(description || "").trim();
  const prodImg = image || "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600";
  const categoryGroup = mapCategoryToGroup(category);
  // Identité artisan dérivée exclusivement du JWT (Anti-IDOR)
  const artisanName = req.user?.fullName || req.body.artisanName || "Maâlem";

  const numStock = stock !== undefined && stock !== null && stock !== "" ? Math.max(0, parseInt(stock)) : null;

  // 1. Prepare Supabase row conforming to database schema
  const supabaseRow = {
    id: productId,
    title: prodTitle,
    category: category || "Céramique & Poterie",
    category_group: categoryGroup,
    price: clientPrice,
    in_stock: numStock !== null ? numStock > 0 : true,
    stock: numStock,
    initial_stock: numStock,
    is_out_of_stock: numStock === 0,
    is_hidden: numStock === 0,
    stock_policy: stockPolicy || {},
    artisan_name: artisanName,
    image_url: prodImg,
    identity: {
      category: category || "Céramique & Poterie",
      category_group: categoryGroup,
      description: prodDesc,
      product_type: productType,
      net_price: numNet,
      commission_ht: commissionHt,
      tva: tvaVal,
      manufacturing_days: Number(manufacturingDays) || 5,
      shipping_fee: numShippingFee,
      shipping_threshold: numShippingThreshold || 1,
    },
    rec_tags: {
      style: ["traditionnel", "fait-main"],
      material: [categoryGroup],
      color_vibe: ["authentique", "naturel"],
    },
    facets: {
      origin: ["maroc"],
      artisan_ref: getArtisanRef(req),
    },
  };

  // 2. Insert into Supabase (Persist to shared DB so client app and recommendations see it)
  try {
    const { error: sbError } = await supabase.from("products").insert(supabaseRow);
    if (sbError) {
      console.warn("[VORK-API] ⚠️ Failed to insert product into Supabase:", sbError.message);
    } else {
      console.log(`[VORK-API] ✅ Product "${prodTitle}" (${productId}) successfully persisted to Supabase!`);
      // Trigger background update of recommendation engine memory catalog
      loadProducts().catch(() => {});
      // Trigger instant Meilisearch indexation
      try {
        const meiliDoc = {
          ...supabaseRow,
          artisanName: artisanName,
          imageUrl: prodImg,
        };
        await productsIndex.addDocuments([meiliDoc]);
        console.log(`[MEILI] ✅ Product "${prodTitle}" (${productId}) indexed into Meilisearch!`);
      } catch (mErr) {
        console.warn("[MEILI] ⚠️ Failed to auto-index product into Meilisearch:", mErr.message);
      }
    }
  } catch (err) {
    console.warn("[VORK-API] ⚠️ Error writing product to Supabase:", err.message);
  }

  // 3. Keep in RAM cache for instantaneous local artisan UI response
  const newProduct = {
    id: productId,
    artisanRef,  // Lier le produit à l'artisan connecté
    title: prodTitle,
    description: prodDesc,
    price: numNet,
    clientPrice,
    productType,
    category: category || "Céramique & Poterie",
    image: prodImg,
    artisanName,
    rating: 5.0,
    reviewCount: 0,
    inStock: true,
    manufacturingDays: Number(manufacturingDays) || 5,
    createdAt: new Date().toISOString(),
  };

  artisanProductsList.unshift(newProduct);

  return res.status(201).json({
    success: true,
    message: "Création publiée au catalogue Vork avec succès !",
    product: newProduct,
  });
});

artisanRouter.put("/products/:id", async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const index = artisanProductsList.findIndex(p => p.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: "Produit introuvable." });
  }

  artisanProductsList[index] = { ...artisanProductsList[index], ...updates };
  return res.json({
    success: true,
    message: "Produit mis à jour avec succès !",
    product: artisanProductsList[index],
  });
});

/**
 * GET /api/artisan/products/:id/stock
 * Consulter les informations de stock d'un produit (P5 - 28/09/2026).
 */
artisanRouter.get("/products/:id/stock", async (req, res) => {
  const { id } = req.params;
  try {
    const stockInfo = await getProductStockInfo(id);
    if (!stockInfo) {
      return res.status(404).json({ success: false, error: "Produit introuvable.", error_ar: "المنتج غير موجود." });
    }
    return res.json({ success: true, ...stockInfo });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/artisan/products/:id/stock
 * Incrémenter / modifier le stock d'un produit (P5 - 28/09/2026).
 * La nouvelle valeur de stock devient la référence 100% (initial_stock).
 * Le signe « Stock Limité » apparaît quand le stock descend ≤ 20% de initial_stock.
 * Actions possibles : 'add_stock', 'disable_tracking', 'switch_to_on_demand', 'hide_manually'
 */
artisanRouter.put("/products/:id/stock", async (req, res) => {
  const { id } = req.params;
  const { action = "add_stock", stock, days } = req.body;

  if (action === "add_stock" && (!stock || Number(stock) < 0)) {
    return res.status(400).json({
      success: false,
      error: "Veuillez spécifier une quantité de stock valide (≥ 0).",
      error_ar: "يرجى تحديد كمية مخزون صالحة (≥ 0).",
    });
  }

  try {
    const result = await updateProductStockAction(id, action, { stock, days });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    const messages = {
      add_stock: {
        fr: `Stock mis à jour avec succès : ${stock} unité(s). Cette valeur est maintenant votre référence 100%.`,
        ar: `تم تحديث المخزون بنجاح: ${stock} وحدة. هذه القيمة هي الآن مرجعك 100%.`,
      },
      disable_tracking: {
        fr: "Suivi de stock désactivé pour ce produit. Le post est à nouveau visible.",
        ar: "تم تعطيل تتبع المخزون لهذا المنتج. المنشور مرئي مرة أخرى.",
      },
      switch_to_on_demand: {
        fr: `Produit converti en \"Sur Commande\" avec un délai de fabrication de ${days || 7} jour(s).`,
        ar: `تم تحويل المنتج إلى \"حسب الطلب\" مع مدة تصنيع ${days || 7} يوم(أيام).`,
      },
      hide_manually: {
        fr: "Post masqué manuellement. Il reste dans votre historique mais n'apparaît plus sur le marché.",
        ar: "تم إخفاء المنشور يدوياً. يبقى في سجلك لكنه لا يظهر في السوق.",
      },
    };

    return res.json({
      success: true,
      message: messages[action]?.fr || "Stock mis à jour.",
      message_ar: messages[action]?.ar || "تم تحديث المخزون.",
      product: result.product,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/artisan/products/:id/stock-policy
 * Configurer la politique de stock de la boutique du vendeur (P5 - 28/09/2026).
 *
 * Politiques disponibles :
 *   - show_stock_to_client (boolean) : Afficher le stock actuel au client
 *   - allow_order_exceeding_stock (boolean) : Commande possible si qté commandée > stock actuel
 *   - auto_accept_exceeding_stock (boolean) : Acceptation auto reste active même si qté > stock
 *     (uniquement si allow_order_exceeding_stock = true)
 *
 * NOTE : Ces options sont OBLIGATOIRES dès que le vendeur active le stock sur un produit.
 * Le stock est optionnel, mais si activé → politique obligatoire.
 */
artisanRouter.put("/products/:id/stock-policy", async (req, res) => {
  const { id } = req.params;
  const {
    show_stock_to_client = false,
    allow_order_exceeding_stock = false,
    auto_accept_exceeding_stock = false,
  } = req.body;

  // Validation : auto_accept_exceeding_stock n'est possible que si allow_order_exceeding_stock est true
  if (auto_accept_exceeding_stock && !allow_order_exceeding_stock) {
    return res.status(400).json({
      success: false,
      error: "L'acceptation automatique pour les commandes dépassant le stock n'est possible que si vous autorisez d'abord les commandes dépassant le stock.",
      error_ar: "القبول التلقائي للطلبات التي تتجاوز المخزون ممكن فقط إذا سمحت أولاً بالطلبات التي تتجاوز المخزون.",
    });
  }

  try {
    const stockPolicy = {
      show_stock_to_client: Boolean(show_stock_to_client),
      allow_order_exceeding_stock: Boolean(allow_order_exceeding_stock),
      auto_accept_exceeding_stock: Boolean(auto_accept_exceeding_stock),
    };

    const { error } = await supabase
      .from('products')
      .update({
        stock_policy: stockPolicy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    return res.json({
      success: true,
      message: "Politique de stock mise à jour avec succès.",
      message_ar: "تم تحديث سياسة المخزون بنجاح.",
      stockPolicy,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/notifications & POST /api/artisan/notifications/:id/read
 * Centre de Notifications Artisan.
 */
artisanRouter.get("/notifications", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  const lang = req.query.lang === "ar" || req.headers["accept-language"]?.includes("ar") ? "ar" : "fr";
  try {
    const condition = getArtisanOrderCondition(artisanRef);
    const allOrders = await db.select().from(orders).where(condition);
    const allDisputes = await db.select().from(disputes);
    const allReturns = await db.select().from(returnRequests);
    const allWithdrawals = await db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, artisanRef));

    const notifications = [];

    // Notifications de commandes
    allOrders.forEach(o => {
      // 1. Nouvelle commande ou Alerte délai critique 72h
      if (["acompte_verse", "payee_integralement"].includes(o.status)) {
        const createdMs = new Date(o.createdAt).getTime();
        const diffHours = (Date.now() - createdMs) / (1000 * 60 * 60);

        if (diffHours >= 36) {
          const hoursLeft = Math.max(0, Math.round(72 - diffHours));
          notifications.push({
            id: `notif-order-urgent-${o.id}`,
            type: "urgent_order",
            title: lang === "ar" ? "مهلة حرجة : تأكيد الاستلام مطلوب" : "Délai Critique : Acceptation requise",
            title_fr: "Délai Critique : Acceptation requise",
            title_ar: "مهلة حرجة : تأكيد الاستلام مطلوب",
            message: lang === "ar"
              ? `متبقي ${hoursLeft} ساعة فقط لتأكيد الطلب #${o.id} (${o.totalPrice} درهم) قبل الإلغاء التلقائي.`
              : `Plus que ${hoursLeft}h pour accepter la commande #${o.id} (${o.totalPrice} MAD) avant annulation automatique.`,
            message_fr: `Plus que ${hoursLeft}h pour accepter la commande #${o.id} (${o.totalPrice} MAD) avant annulation automatique.`,
            message_ar: `متبقي ${hoursLeft} ساعة فقط لتأكيد الطلب #${o.id} (${o.totalPrice} درهم) قبل الإلغاء التلقائي.`,
            date: o.createdAt,
            read: false,
            linkTab: "atelier",
            orderId: o.id,
          });
        } else {
          notifications.push({
            id: `notif-order-${o.id}`,
            type: "new_order",
            title: lang === "ar" ? "طلب جديد وارد إلى الورشة" : "Nouvelle commande reçue",
            title_fr: "Nouvelle commande reçue",
            title_ar: "طلب جديد وارد إلى الورشة",
            message: lang === "ar"
              ? `طلب جديد #${o.id} (${o.totalPrice} درهم) مؤدى ومؤمّن. يُرجى تأكيد استلام العمل خلال 72 ساعة.`
              : `Commande #${o.id} (${o.totalPrice} MAD) réglée et sécurisée. Prise en charge requise sous 72h max.`,
            message_fr: `Commande #${o.id} (${o.totalPrice} MAD) réglée et sécurisée. Prise en charge requise sous 72h max.`,
            message_ar: `طلب جديد #${o.id} (${o.totalPrice} درهم) مؤدى ومؤمّن. يُرجى تأكيد استلام العمل خلال 72 ساعة.`,
            date: o.createdAt,
            read: false,
            linkTab: "atelier",
            orderId: o.id,
          });
        }
      }

      // 2. Commande Annulée (par le client ou expiration)
      if (o.status === "annulee") {
        const isExpired = o.cancellationReason === "expiration_72h";
        const isRefusedByMe = Boolean(o.refusedByArtisan || o.refusalReason);

        if (isExpired) {
          notifications.push({
            id: `notif-expired-${o.id}`,
            type: "order_cancelled",
            title: lang === "ar" ? "انتهت المهلة : تم إلغاء الطلب" : "Délai Dépassé : Commande Expirée",
            title_fr: "Délai Dépassé : Commande Expirée",
            title_ar: "انتهت المهلة : تم إلغاء الطلب",
            message: lang === "ar"
              ? `انتهت مهلة 72 ساعة لتأكيد الطلب #${o.id}. تم إلغاء الطلب تلقائياً واسترجاع المبلغ للزبون.`
              : `Le délai d'acceptation de 72h pour la commande #${o.id} a expiré. La commande a été annulée automatiquement.`,
            message_fr: `Le délai d'acceptation de 72h pour la commande #${o.id} a expiré. La commande a été annulée automatiquement.`,
            message_ar: `انتهت مهلة 72 ساعة لتأكيد الطلب #${o.id}. تم إلغاء الطلب تلقائياً واسترجاع المبلغ للزبون.`,
            date: o.updatedAt || o.createdAt,
            read: false,
            linkTab: "atelier",
            orderId: o.id,
          });
        } else if (isRefusedByMe) {
          notifications.push({
            id: `notif-declined-${o.id}`,
            type: "order_cancelled",
            title: lang === "ar" ? "تم الاعتذار عن الطلب" : "Commande Déclinée par l'Atelier",
            title_fr: "Commande Déclinée par l'Atelier",
            title_ar: "تم الاعتذار عن الطلب",
            message: lang === "ar"
              ? `لقد اعتذرتم عن قبول الطلب #${o.id}. تم استرجاع المبلغ للزبون فوراً.`
              : `Vous avez décliné la commande #${o.id}. Les fonds ont été reversés au client.`,
            message_fr: `Vous avez décliné la commande #${o.id}. Les fonds ont été reversés au client.`,
            message_ar: `لقد اعتذرتم عن قبول الطلب #${o.id}. تم استرجاع المبلغ للزبون فوراً.`,
            date: o.updatedAt || o.createdAt,
            read: true,
            linkTab: "atelier",
            orderId: o.id,
          });
        } else {
          // Annulation active du client
          notifications.push({
            id: `notif-cancel-${o.id}`,
            type: "order_cancelled",
            title: lang === "ar" ? "إلغاء الطلب من قِبل الزبون" : "Commande Annulée par le Client",
            title_fr: "Commande Annulée par le Client",
            title_ar: "إلغاء الطلب من قِبل الزبون",
            message: lang === "ar"
              ? `تم إلغاء الطلب #${o.id} (${o.totalPrice} درهم) من قِبل الزبون. يُرجى وقف أي تصنيع أو شحن فوراً.`
              : `La commande #${o.id} (${o.totalPrice} MAD) a été annulée par le client. Toute confection ou expédition doit être suspendue.`,
            message_fr: `La commande #${o.id} (${o.totalPrice} MAD) a été annulée par le client. Toute confection ou expédition doit être suspendue.`,
            message_ar: `تم إلغاء الطلب #${o.id} (${o.totalPrice} درهم) من قِبل الزبون. يُرجى وقف أي تصنيع أو شحن فوراً.`,
            date: o.updatedAt || o.createdAt,
            read: false,
            linkTab: "atelier",
            orderId: o.id,
          });
        }
      }

      // 3. Commande en confection d'atelier
      if (o.status === "en_preparation") {
        notifications.push({
          id: `notif-prep-${o.id}`,
          type: "order_prep",
          title: lang === "ar" ? "قيد التصنيع في الورشة" : "Confection en cours à l'atelier",
          title_fr: "Confection en cours à l'atelier",
          title_ar: "قيد التصنيع في الورشة",
          message: lang === "ar"
            ? `الطلب #${o.id} قيد الإنجاز في الورشة. تحقّق من مطابقة القطعة لإصدار إشعار الشحن.`
            : `Commande #${o.id} en fabrication. Validez la conformité de la pièce pour générer l'expédition Sendit.`,
          message_fr: `Commande #${o.id} en fabrication. Validez la conformité de la pièce pour générer l'expédition Sendit.`,
          message_ar: `الطلب #${o.id} قيد الإنجاز في الورشة. تحقّق من مطابقة القطعة لإصدار إشعار الشحن.` ,
          date: o.acceptedAt || o.updatedAt || o.createdAt,
          read: false,
          linkTab: "atelier",
          orderId: o.id,
        });
      }

      // 4. Colis en cours d'acheminement (Logistique)
      if (o.status === "en_cours_de_transport") {
        notifications.push({
          id: `notif-shipped-${o.id}`,
          type: "order_shipped",
          title: lang === "ar" ? "الشحنة لدى شركة التوصيل" : "Colis confié au transporteur",
          title_fr: "Colis confié au transporteur",
          title_ar: "الشحنة لدى شركة التوصيل",
          message: lang === "ar"
            ? `الشحنة #${o.id} في طريقها للزبون. رقم التتبع : ${o.senditDeliveryCode || o.id}.`
            : `Le colis #${o.id} est en transit vers le client. N° de suivi : ${o.senditDeliveryCode || o.id}.`,
          message_fr: `Le colis #${o.id} est en transit vers le client. N° de suivi : ${o.senditDeliveryCode || o.id}.`,
          message_ar: `الشحنة #${o.id} في طريقها للزبون. رقم التتبع : ${o.senditDeliveryCode || o.id}.`,
          date: o.shippedAt || o.updatedAt || o.createdAt,
          read: false,
          linkTab: "atelier",
          orderId: o.id,
        });
      }

      // 5. Colis Livré au Destinataire
      if (o.status === "livre") {
        notifications.push({
          id: `notif-delivered-${o.id}`,
          type: "order_delivered",
          title: lang === "ar" ? "تم تسليم الطلب للزبون" : "Colis Livré au Destinataire",
          title_fr: "Colis Livré au Destinataire",
          title_ar: "تم تسليم الطلب للزبون",
          message: lang === "ar"
            ? `تم تسجيل استلام الشحنة #${o.id}. بدأ احتساب مهلة 7 أيام قبل التحرير التلقائي للضمان.`
            : `La remise du colis #${o.id} a été enregistrée. Le délai de 7 jours a débuté avant déblocage automatique.`,
          message_fr: `La remise du colis #${o.id} a été enregistrée. Le délai de 7 jours a débuté avant déblocage automatique.`,
          message_ar: `تم تسجيل استلام الشحنة #${o.id}. بدأ احتساب مهلة 7 أيام قبل التحرير التلقائي للضمان.`,
          date: o.deliveredAt || o.updatedAt || o.createdAt,
          read: false,
          linkTab: "atelier",
          orderId: o.id,
        });
      }

      // 6. Réception validée par le Client
      if (["auto_valide", "complete"].includes(o.status)) {
        notifications.push({
          id: `notif-confirmed-${o.id}`,
          type: "order_confirmed",
          title: lang === "ar" ? "تأكيد الاستلام من الزبون" : "Réception Validée par le Client",
          title_fr: "Réception Validée par le Client",
          title_ar: "تأكيد الاستلام من الزبون",
          message: lang === "ar"
            ? `أكّد الزبون مطابقة الطلب #${o.id}. تم اعتماد المستحقات للتحرير النهائي.`
            : `La conformité de la commande #${o.id} a été confirmée. Déblocage du paiement programmé sous séquestre.`,
          message_fr: `La conformité de la commande #${o.id} a été confirmée. Déblocage du paiement programmé sous séquestre.`,
          message_ar: `أكّد الزبون مطابقة الطلب #${o.id}. تم اعتماد المستحقات للتحرير النهائي.`,
          date: o.updatedAt || o.createdAt,
          read: true,
          linkTab: "atelier",
          orderId: o.id,
        });
      }

      // 7. Fonds Débloqués sur Solde Retirable
      if (o.escrowReleasedAt) {
        notifications.push({
          id: `notif-escrow-${o.id}`,
          type: "escrow_released",
          title: lang === "ar" ? "تحرير المستحقات إلى رصيدك" : "Fonds Débloqués sur votre Solde",
          title_fr: "Fonds Débloqués sur votre Solde",
          title_ar: "تحرير المستحقات إلى رصيدك",
          message: lang === "ar"
            ? `تم إيداع مبلغ الطلب #${o.id} (${o.totalPrice} درهم) في رصيدك القابل للسحب البنكي على رقم حسابك (RIB).`
            : `Le montant de la commande #${o.id} (${o.totalPrice} MAD) a été crédité. Vous pouvez demander un virement bancaire sur votre RIB.`,
          message_fr: `Le montant de la commande #${o.id} (${o.totalPrice} MAD) a été crédité. Vous pouvez demander un virement bancaire sur votre RIB.`,
          message_ar: `تم إيداع مبلغ الطلب #${o.id} (${o.totalPrice} درهم) في رصيدك القابل للسحب البنكي على رقم حسابك (RIB).`,
          date: o.escrowReleasedAt,
          read: true,
          linkTab: "wallet",
          orderId: o.id,
        });
      }
    });

    // Notifications de litiges
    allDisputes.forEach(d => {
      notifications.push({
        id: `notif-dispute-${d.id}`,
        type: "dispute",
        title: lang === "ar" ? "شكوى مفتوحة من الزبون" : "Réclamation Client Ouverte",
        title_fr: "Réclamation Client Ouverte",
        title_ar: "شكوى مفتوحة من الزبون",
        message: lang === "ar"
          ? `ملف شكوى #${d.id} بخصوص الطلب #${d.orderId}. يُرجى تقديم توضيحاتك خلال 48 ساعة.`
          : `Dossier #${d.id} sur la commande #${d.orderId}. Transmettez vos explications sous 48h.`,
        message_fr: `Dossier #${d.id} sur la commande #${d.orderId}. Transmettez vos explications sous 48h.`,
        message_ar: `ملف شكوى #${d.id} بخصوص الطلب #${d.orderId}. يُرجى تقديم توضيحاتك خلال 48 ساعة.`,
        date: d.createdAt,
        read: !!d.artisanResponse,
        linkTab: "litiges",
        orderId: d.orderId,
      });
    });

    // Notifications de retours
    allReturns.forEach(r => {
      notifications.push({
        id: `notif-return-${r.id}`,
        type: "return",
        title: lang === "ar" ? "طلب إرجاع معلن" : "Demande de Retour Déclarée",
        title_fr: "Demande de Retour Déclarée",
        title_ar: "طلب إرجاع معلن",
        message: lang === "ar"
          ? `تم الإعلان عن طلب إرجاع بخصوص الشحنة #${r.orderId}.`
          : `Demande de retour déclarée sur la commande #${r.orderId}.`,
        message_fr: `Demande de retour déclarée sur la commande #${r.orderId}.`,
        message_ar: `تم الإعلان عن طلب إرجاع بخصوص الشحنة #${r.orderId}.`,
        date: r.createdAt,
        read: r.status !== "initie",
        linkTab: "retours",
        orderId: r.orderId,
      });
    });

    // Notifications de retraits
    allWithdrawals.forEach(w => {
      if (w.status === "processed") {
        notifications.push({
          id: `notif-with-${w.id}`,
          type: "withdrawal",
          title: lang === "ar" ? "تحويل بنكي منفذ" : "Virement Bancaire Exécuté",
          title_fr: "Virement Bancaire Exécuté",
          title_ar: "تحويل بنكي منفذ",
          message: lang === "ar"
            ? `تم تحويل مبلغ ${w.amount} درهم بنجاح إلى حسابكم البنكي.`
            : `Votre virement de ${w.amount} MAD a été transféré vers votre compte bancaire.`,
          message_fr: `Votre virement de ${w.amount} MAD a été transféré vers votre compte bancaire.`,
          message_ar: `تم تحويل مبلغ ${w.amount} درهم بنجاح إلى حسابكم البنكي.`,
          date: w.processedAt || w.createdAt,
          read: true,
          linkTab: "wallet",
        });
      }
    });

    // Tri par date décroissante
    notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({ success: true, count: notifications.length, notifications });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/artisan/profile
 * Mise à jour des informations de l'atelier & coordonnées de ramassage.
 */
// Profils en mémoire par artisanRef (clé = artisanRef)
const memoryProfiles = {};

function getMemoryProfile(artisanRef, user) {
  if (!memoryProfiles[artisanRef]) {
    // Initialisation depuis le JWT au premier accès
    memoryProfiles[artisanRef] = {
      artisanName: user?.fullName || artisanRef,
      specialty: "",
      bio: "",
      phone: user?.phone || "",
      pickupAddress: user?.city || "",
      pickupDistrictId: null,
      defaultRib: "",
      isVacationMode: false,
      yearsOfExperience: 0,
    };
  }
  return memoryProfiles[artisanRef];
}

artisanRouter.get("/profile/details", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  const profile = getMemoryProfile(artisanRef, req.user);
  return res.json({ success: true, profileDetails: profile });
});

artisanRouter.put("/profile/details", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  const updates = req.body;
  const profile = getMemoryProfile(artisanRef, req.user);
  memoryProfiles[artisanRef] = { ...profile, ...updates };
  return res.json({ success: true, message: "Profil atelier mis à jour avec succès.", profileDetails: memoryProfiles[artisanRef] });
});

/**
 * GET /api/artisan/stats
 * Statistiques & Performance de vente pour l'artisan.
 */
artisanRouter.get("/stats", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  try {
    const condition = getArtisanOrderCondition(artisanRef);
    const allOrders = await db.select().from(orders).where(condition);

    const totalOrders = allOrders.length;
    const acceptedOrders = allOrders.filter(o => o.status !== "annulee").length;
    const acceptanceRate = totalOrders > 0 ? Math.round((acceptedOrders / totalOrders) * 100) : 100;
    const averageShippingDays = 3.2; // Estimation standard
    const overallRating = 4.9;
    const reviewCount = 38;

    return res.json({
      success: true,
      stats: {
        totalOrders,
        acceptanceRate,
        averageShippingDays,
        overallRating,
        reviewCount,
        monthlyGrowth: "+14.5%",
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * In-memory Custom Order Requests (Marché Sur-Mesure Vendeur)
 */
let memoryCustomRequests = [
  {
    id: "req-101",
    clientName: "Laila Bennani",
    category: "Céramique & Poterie",
    title: "Ensemble de 12 assiettes Zellige Bleu Fassi",
    description: "Je recherche un ensemble personnalisé de 12 grandes assiettes de service avec motifs géométriques bleus traditionnels de Fès.",
    budget: "1 800 MAD",
    deliveryCity: "Casablanca",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
    quotes: [
      {
        artisanName: "Maâlem Abdelkader",
        proposedPrice: 1650,
        confectionDays: 8,
        note: "Réalisable à la main dans notre atelier de Fès avec cuisson traditionnelle.",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      }
    ]
  },
  {
    id: "req-102",
    clientName: "Karim Tazi",
    category: "Cuir & Maroquinerie",
    title: "Pouf en cuir naturel teinté terracotta sur-mesure",
    description: "Recherche artisan maroquinier pour réaliser un pouf rond de 60cm de diamètre en cuir véritable teinté à la main.",
    budget: "900 MAD",
    deliveryCity: "Rabat",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600",
    quotes: []
  },
  {
    id: "req-103",
    clientName: "Sofia El Amrani",
    category: "Textile & Caftans",
    title: "Selham Royal en laine blanche tressé fil d'or",
    description: "Commande spéciale pour un événement familial. Selham traditionnel cousu main avec Sfifa d'or.",
    budget: "3 500 MAD",
    deliveryCity: "Marrakech",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600",
    quotes: []
  }
];

artisanRouter.get("/custom-requests", async (req, res) => {
  try {
    const { category } = req.query;
    let list = [...memoryCustomRequests];

    // Interroger la table custom_requests pour les projets créés depuis l'Atelier
    try {
      const dbRequests = await db.select().from(customRequests)
        .where(or(eq(customRequests.artisanRef, "artisan-open"), eq(customRequests.productType, "sur_commande")))
        .orderBy(desc(customRequests.createdAt));

      const formatted = dbRequests.map(r => {
        let tags = {};
        try { tags = typeof r.customizationTags === 'string' ? JSON.parse(r.customizationTags) : (r.customizationTags || {}); } catch(e) {}
        const mods = tags.modifications || [];
        const catMod = mods.find(m => (m.feature || '').toLowerCase().includes('mat') || (m.feature || '').toLowerCase().includes('cat'));
        const autoCat = catMod?.value || tags.category || 'Sur-mesure';

        return {
          id: r.id,
          clientName: r.clientRef || "Client Vork",
          category: autoCat,
          title: tags.summary ? tags.summary.split('\n')[0].replace(/^[•\s*]+/, '') : "Création sur mesure",
          description: tags.summary || "Demande de création artisanale personnalisée.",
          budget: r.totalPrice ? `${r.totalPrice} DH` : "Sur devis",
          deliveryCity: "Maroc",
          createdAt: r.createdAt,
          image: r.proofImage || tags.anchorProduct?.imageUrl || "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
          quotes: Array.isArray(tags.quotes) ? tags.quotes : []
        };
      });

      list = [...formatted, ...list];
    } catch (e) {
      console.warn("[ARTISAN-ROUTES] ⚠️ Could not fetch custom requests from DB:", e.message);
    }

    if (category && category !== "Toutes" && category !== "all") {
      list = list.filter(r => r.category.toLowerCase().includes(String(category).toLowerCase()));
    }
    return res.json({ success: true, count: list.length, requests: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

artisanRouter.post("/custom-requests/:id/quote", async (req, res) => {
  const { id } = req.params;
  const { proposedPrice, confectionDays, note } = req.body;

  if (!proposedPrice || !confectionDays) {
    return res.status(400).json({ success: false, error: "Le prix et le délai de confection sont obligatoires." });
  }

  const newQuote = {
    artisanName: req.user?.fullName || req.userId || "Maâlem",
    artisanRef: getArtisanRef(req),
    proposedPrice: Number(proposedPrice),
    confectionDays: Number(confectionDays),
    note: note || "",
    createdAt: new Date().toISOString(),
  };

  const reqItem = memoryCustomRequests.find(r => r.id === id);
  if (reqItem) {
    reqItem.quotes.push(newQuote);
  }

  // Persister également dans la base PostgreSQL si la demande provient de l'Atelier
  try {
    const [dbReq] = await db.select().from(customRequests).where(eq(customRequests.id, id));
    if (dbReq) {
      let tags = {};
      try {
        tags = typeof dbReq.customizationTags === 'string' ? JSON.parse(dbReq.customizationTags) : (dbReq.customizationTags || {});
      } catch (e) {}
      if (!Array.isArray(tags.quotes)) {
        tags.quotes = [];
      }
      tags.quotes.push(newQuote);
      await db.update(customRequests)
        .set({
          customizationTags: JSON.stringify(tags),
          updatedAt: new Date().toISOString()
        })
        .where(eq(customRequests.id, id));
    }
  } catch (err) {
    console.warn("[ARTISAN-ROUTES] ⚠️ Could not persist quote to DB custom_request:", err.message);
  }

  return res.json({ success: true, message: "Devis / Offre transmis au client avec succès !", quote: newQuote });
});

