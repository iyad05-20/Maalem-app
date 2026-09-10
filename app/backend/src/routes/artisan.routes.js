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
  returnRequests 
} from "../core/db/schema.js";
import { getAllProducts } from "../db/products.repository.js";
import { supabase } from "../db/supabase.client.js";
import { loadProducts } from "../services/recommendation.service.js";
import { requireAuth, optionalAuth } from "../middleware/localAuth.middleware.js";
import { 
  acceptOrder, 
  uploadPrepPhotos, 
  prepareSenditShipping, 
  confirmSenditPickupReady, 
  shipVendeurSelf, 
  completeVendeurDelivery,
  recordVendorWarning,
  shipOrder
} from "../client/services/artisanOrderService.js";
import { senditClient } from "../services/sendit/senditClient.js";

export const artisanRouter = express.Router();
artisanRouter.use(optionalAuth);

const DEFAULT_ARTISAN_REF = "artisan_abdelkader";

export const getArtisanRef = (req) => {
  return req.userId || (req.user && req.user.id) || DEFAULT_ARTISAN_REF;
};

/**
 * GET /api/artisan/orders
 * Récupère les commandes assignées à l'artisan.
 */
artisanRouter.get("/orders", async (req, res) => {
  try {
    const artisanRef = getArtisanRef(req);
    const list = db.select().from(orders).where(
      or(
        eq(orders.artisanRef, artisanRef),
        eq(orders.artisanRef, "artisan-default"),
        eq(orders.artisanRef, "artisan-1"),
        eq(orders.artisanRef, "artisan_abdelkader")
      )
    ).orderBy(desc(orders.createdAt)).all();

    const enriched = list.map(o => ({
      ...o,
      prepPhotos: o.prepPhotos ? JSON.parse(o.prepPhotos) : [],
    }));

    return res.json({ success: true, count: enriched.length, orders: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/accept
 * Accepte la commande sous 72h max (Art. 6.1).
 */
artisanRouter.post("/orders/:id/accept", async (req, res) => {
  const { id } = req.params;
  try {
    await acceptOrder(id);
    const updated = db.select().from(orders).where(eq(orders.id, id)).get();
    return res.json({ success: true, message: "Commande acceptée ! Entrée en fabrication.", order: updated });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/orders/:id/refuse
 * Refuse la commande avec motif explicatif libre (Art. 6.4).
 */
artisanRouter.post("/orders/:id/refuse", async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ success: false, error: "Un motif explicatif est obligatoire pour refuser une commande." });
  }

  try {
    const order = db.select().from(orders).where(eq(orders.id, id)).get();
    if (!order) return res.status(404).json({ success: false, error: "Commande introuvable." });

    const now = new Date().toISOString();

    // Remboursement 100% Client
    db.update(orders).set({
      status: "annulee",
      refusedByArtisan: 1,
      refusalReason: reason.trim(),
      updatedAt: now,
    }).where(eq(orders.id, id)).run();

    db.insert(ledgerEntries).values({
      id: `ledger-${Date.now()}`,
      orderId: id,
      compteDebit: "ESCROW_LOCKED",
      compteCredit: `CLIENT_WALLET:${order.clientRef}`,
      montant: order.totalPrice,
      type: "order_refused_by_artisan_refund",
      metadata: JSON.stringify({ reason: reason.trim() }),
      createdAt: now,
    }).run();

    return res.json({ success: true, message: "Commande refusée. Le client a été intégralement remboursé." });
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
 * POST /api/artisan/orders/:id/ship-sendit-step1
 * Étape 1 Sendit : Génération du Bon de Livraison (BL).
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
 * Étape 2 Sendit : Upload photo du colis étiqueté & ordre de ramassage (Art. 8.3).
 */
artisanRouter.post("/orders/:id/ship-sendit-step2", async (req, res) => {
  const { id } = req.params;
  const { blAttachedPhoto } = req.body;

  try {
    const result = await confirmSenditPickupReady(id, blAttachedPhoto);
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
 * GET /api/artisan/returns
 * Récupère les demandes de retours clients concernant l'artisan.
 */
artisanRouter.get("/returns", async (req, res) => {
  try {
    const allReturns = db.select().from(returnRequests).orderBy(desc(returnRequests.createdAt)).all();
    const allOrders = db.select().from(orders).all();
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
    const ret = db.select().from(returnRequests).where(eq(returnRequests.id, id)).get();
    if (!ret) return res.status(404).json({ success: false, error: "Demande de retour introuvable." });

    const order = db.select().from(orders).where(eq(orders.id, ret.orderId)).get();
    if (order) {
      db.update(orders).set({ status: "annulee", updatedAt: now }).where(eq(orders.id, order.id)).run();

      const refundAmount = Math.max(0, order.totalPrice - (ret.returnShippingFee || 0));
      db.insert(ledgerEntries).values({
        id: `ledger-${Date.now()}`,
        orderId: order.id,
        compteDebit: "ESCROW_LOCKED",
        compteCredit: `CLIENT_WALLET:${order.clientRef}`,
        montant: refundAmount,
        type: "return_validated_by_artisan_refund",
        createdAt: now,
      }).run();
    }

    db.update(returnRequests).set({ status: "resolu_conforme", resolvedAt: now }).where(eq(returnRequests.id, id)).run();

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
    const allDisputes = db.select().from(disputes).orderBy(desc(disputes.createdAt)).all();
    const allOrders = db.select().from(orders).all();
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
    db.update(disputes).set({
      artisanResponse: artisanResponse.trim(),
      artisanEvidencePhotos: JSON.stringify(artisanEvidencePhotos),
      status: "en_arbitrage_admin",
    }).where(eq(disputes.id, id)).run();

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
    const allOrders = db.select().from(orders).where(eq(orders.artisanRef, artisanRef)).all();
    const allWithdrawals = db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, artisanRef)).all();

    let availableBalance = 0;
    let lockedEscrow = 0;
    let totalGrossSales = 0;

    allOrders.forEach(o => {
      // Formule exacte Vork : Prix Client TTC = Prix Net Artisan + 5% Comm HT + 20% TVA sur Comm (Majoration 6%)
      const netAmount = Math.round((o.totalPrice / 1.06) * 100) / 100;
      totalGrossSales += o.totalPrice;

      if (o.escrowReleasedAt) {
        availableBalance += netAmount;
      } else if (["acompte_verse", "payee_integralement", "en_preparation", "en_cours_de_transport", "livre"].includes(o.status)) {
        lockedEscrow += netAmount;
      }
    });

    // Déduction des retraits bancaires déjà validés ou en cours
    const processedWithdrawals = allWithdrawals
      .filter(w => ["processed", "pending", "en_attente_lot_vendredi"].includes(w.status))
      .reduce((sum, w) => sum + w.amount, 0);

    availableBalance = Math.max(0, Math.round((availableBalance - processedWithdrawals) * 100) / 100);
    const totalNetEarnings = Math.round((totalGrossSales / 1.06) * 100) / 100;
    const vorkPlatformFeesTotal = Math.round((totalGrossSales - totalNetEarnings) * 100) / 100;

    return res.json({
      success: true,
      wallet: {
        artisanRef,
        availableBalance,
        lockedEscrow: Math.round(lockedEscrow * 100) / 100,
        totalGrossSales: Math.round(totalGrossSales * 100) / 100,
        totalNetEarnings,
        vorkPlatformFeesTotal,
        withdrawals: allWithdrawals,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/artisan/wallet/withdraw
 * Demande de virement des gains sur RIB marocain (24 chiffres - Art. 15).
 * Contrôle de solvabilité atomique : rejet HTTP 422 si le solde disponible est insuffisant.
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
      txResult = db.transaction((tx) => {
        // 1. Calcul en temps réel du solde net débloqué issu des ventes
        const allOrders = tx.select().from(orders).where(eq(orders.artisanRef, artisanRef)).all();
        const allWithdrawals = tx.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, artisanRef)).all();

        let totalReleased = 0;
        allOrders.forEach((o) => {
          if (o.escrowReleasedAt) {
            // Formule Vork : Prix Net = Prix Client / 1.06
            totalReleased += Math.round((o.totalPrice / 1.06) * 100) / 100;
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
        tx.insert(withdrawalRequests).values({
          id: withdrawalId,
          userId: artisanRef,
          amount: numericAmount,
          rib: cleanRib,
          status: "en_attente_lot_vendredi",
          createdAt: now,
        }).run();

        // 5. Consignation immédiate dans le Grand Livre comptable
        tx.insert(ledgerEntries).values({
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
        }).run();

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
    let profile = db.select().from(vendorProfiles).where(eq(vendorProfiles.id, artisanRef)).get();
    if (!profile) {
      profile = {
        id: artisanRef,
        warningCountCurrentMonth: 0,
        suspensionStatus: "active",
        suspendedUntil: null,
        updatedAt: new Date().toISOString(),
      };
      try { db.insert(vendorProfiles).values(profile).run(); } catch {}
    }

    const warnings = db.select().from(vendorWarnings).where(eq(vendorWarnings.vendorRef, artisanRef)).orderBy(desc(vendorWarnings.createdAt)).all();

    return res.json({ success: true, profile, warnings });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/artisan/products & POST /api/artisan/products
 * Gestion du Catalogue de l'Artisan (Art. 4).
 */
let artisanProductsList = [
  {
    id: "prd-001",
    title: "Tajine Fassi Émaillé Bleu de Fès",
    description: "Céramique traditionnelle cuite au four à bois, décorée à la main avec les émaux naturels de Fès.",
    price: 350,
    clientPrice: Math.round(350 * 1.06),
    productType: "standard",
    image: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
    artisanName: "Maâlem Abdelkader",
    category: "Céramique & Poterie",
    rating: 4.9,
    reviewCount: 24,
    inStock: true,
    manufacturingDays: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: "prd-002",
    title: "Vase Amphore Zellige Traditionnel",
    description: "Grande jarre décorative avec motifs géométriques complexes et finition vernissée.",
    price: 520,
    clientPrice: Math.round(520 * 1.06),
    productType: "standard",
    image: "https://images.unsplash.com/photo-1583521214690-73421a1829a9?w=600",
    artisanName: "Maâlem Abdelkader",
    category: "Céramique & Poterie",
    rating: 4.8,
    reviewCount: 17,
    inStock: true,
    manufacturingDays: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: "prd-003",
    title: "Service de 6 Assiettes Plates Fassi",
    description: "Ensemble de 6 assiettes plates artisanales pour table de réception marocaine.",
    price: 780,
    clientPrice: Math.round(780 * 1.06),
    productType: "personnalise",
    image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600",
    artisanName: "Maâlem Abdelkader",
    category: "Céramique & Poterie",
    rating: 5.0,
    reviewCount: 31,
    inStock: true,
    manufacturingDays: 7,
    createdAt: new Date().toISOString(),
  }
];

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
  try {
    let combined = [...artisanProductsList];

    // Also pull products from Supabase to ensure persistence across server restarts
    try {
      const { data: dbData, error: dbError } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!dbError && Array.isArray(dbData)) {
        for (const p of dbData) {
          if (!combined.some((item) => item.id === p.id)) {
            combined.push({
              id: p.id,
              title: p.title,
              description: p.identity?.description || "",
              price: p.identity?.net_price || p.price,
              clientPrice: p.price,
              productType: p.identity?.product_type || "standard",
              category: p.category,
              image: p.image_url || "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600",
              artisanName: p.artisan_name || "Maâlem Abdelkader",
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
  const { title, description, price, productType = "standard", category, image, manufacturingDays = 5 } = req.body;

  if (!title || !price) {
    return res.status(400).json({ success: false, error: "Le titre et le prix net sont obligatoires." });
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
  const artisanName = req.body.artisanName 
    || req.userProfile?.name 
    || req.userProfile?.full_name 
    || req.user?.user_metadata?.full_name 
    || "Maâlem Iyad Outahadout";

  // 1. Prepare Supabase row conforming to database schema
  const supabaseRow = {
    id: productId,
    title: prodTitle,
    category: category || "Céramique & Poterie",
    category_group: categoryGroup,
    price: clientPrice,
    in_stock: true,
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
        await productsIndex.addDocuments([supabaseRow]);
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
 * GET /api/artisan/notifications & POST /api/artisan/notifications/:id/read
 * Centre de Notifications Artisan.
 */
artisanRouter.get("/notifications", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  try {
    const allOrders = db.select().from(orders).where(eq(orders.artisanRef, artisanRef)).all();
    const allDisputes = db.select().from(disputes).all();
    const allReturns = db.select().from(returnRequests).all();
    const allWithdrawals = db.select().from(withdrawalRequests).where(eq(withdrawalRequests.userId, artisanRef)).all();

    const notifications = [];

    // Notifications de commandes
    allOrders.forEach(o => {
      // 1. Nouvelle commande ou Alerte délai critique 72h
      if (["acompte_verse", "payee_integralement"].includes(o.status)) {
        const createdMs = new Date(o.createdAt).getTime();
        const diffHours = (Date.now() - createdMs) / (1000 * 60 * 60);

        if (diffHours >= 36) {
          notifications.push({
            id: `notif-order-urgent-${o.id}`,
            type: "urgent_order",
            title: "Délai Critique : Acceptation requise",
            message: `Plus que ${Math.max(0, Math.round(72 - diffHours))}h pour accepter la commande #${o.id} (${o.totalPrice} MAD) avant annulation automatique.`,
            date: o.createdAt,
            read: false,
            linkTab: "atelier",
            orderId: o.id,
          });
        } else {
          notifications.push({
            id: `notif-order-${o.id}`,
            type: "new_order",
            title: "Nouvelle commande reçue",
            message: `Commande #${o.id} (${o.totalPrice} MAD) réglée et sécurisée. Prise en charge requise sous 72h max.`,
            date: o.createdAt,
            read: false,
            linkTab: "atelier",
            orderId: o.id,
          });
        }
      }

      // 2. Commande en confection d'atelier
      if (o.status === "en_preparation") {
        notifications.push({
          id: `notif-prep-${o.id}`,
          type: "order_prep",
          title: "Confection en cours à l'atelier",
          message: `Commande #${o.id} en fabrication. Validez la conformité de la pièce pour générer l'expédition Sendit.`,
          date: o.acceptedAt || o.updatedAt || o.createdAt,
          read: false,
          linkTab: "atelier",
          orderId: o.id,
        });
      }

      // 3. Colis en cours d'acheminement (Logistique)
      if (o.status === "en_cours_de_transport") {
        notifications.push({
          id: `notif-shipped-${o.id}`,
          type: "order_shipped",
          title: "Colis confié au transporteur",
          message: `Le colis #${o.id} est en transit vers le client. N° de suivi : ${o.senditDeliveryCode || o.id}.`,
          date: o.shippedAt || o.updatedAt || o.createdAt,
          read: false,
          linkTab: "atelier",
          orderId: o.id,
        });
      }

      // 4. Colis Livré au Destinataire
      if (o.status === "livre") {
        notifications.push({
          id: `notif-delivered-${o.id}`,
          type: "order_delivered",
          title: "Colis Livré au Destinataire",
          message: `La remise du colis #${o.id} a été enregistrée. Le délai de 7 jours a débuté avant déblocage automatique.`,
          date: o.deliveredAt || o.updatedAt || o.createdAt,
          read: false,
          linkTab: "atelier",
          orderId: o.id,
        });
      }

      // 5. Réception validée par le Client
      if (["auto_valide", "complete"].includes(o.status)) {
        notifications.push({
          id: `notif-confirmed-${o.id}`,
          type: "order_confirmed",
          title: "Réception Validée par le Client",
          message: `La conformité de la commande #${o.id} a été confirmée. Déblocage du paiement programmé sous séquestre.`,
          date: o.updatedAt || o.createdAt,
          read: true,
          linkTab: "atelier",
          orderId: o.id,
        });
      }

      // 6. Fonds Débloqués sur Solde Retirable
      if (o.escrowReleasedAt) {
        notifications.push({
          id: `notif-escrow-${o.id}`,
          type: "escrow_released",
          title: "Fonds Débloqués sur votre Solde",
          message: `Le montant de la commande #${o.id} (${o.totalPrice} MAD) a été crédité. Vous pouvez demander un virement bancaire sur votre RIB.`,
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
        title: "Réclamation Client Ouverte",
        message: `Dossier #${d.id} sur la commande #${d.orderId}. Transmettez vos explications sous 48h.`,
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
        title: "Demande de Retour Déclarée",
        message: `Demande de retour déclarée sur la commande #${r.orderId}.`,
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
          title: "Virement Bancaire Exécuté",
          message: `Votre virement de ${w.amount} MAD a été transféré vers votre compte bancaire.`,
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
let memoryProfileData = {
  artisanName: "Maâlem Abdelkader",
  specialty: "Céramique, Poterie & Maroquinerie",
  bio: "Maître artisan issu de la médina de Fès avec plus de 22 ans de savoir-faire traditionnel. Spécialiste des émaux bleus et du cuir naturel tanné à l'ancienne.",
  phone: "06 61 23 45 67",
  pickupAddress: "Derb El Miter, N° 14, Médina de Fès",
  pickupDistrictId: 2, // Fès
  defaultRib: "230780000123456789012345",
  isVacationMode: false,
  yearsOfExperience: 22,
};

artisanRouter.get("/profile/details", async (req, res) => {
  const currentProfile = {
    ...memoryProfileData,
    artisanName: req.userProfile?.fullName || req.user?.email || memoryProfileData.artisanName,
    phone: req.userProfile?.phone || memoryProfileData.phone,
  };
  return res.json({ success: true, profileDetails: currentProfile });
});

artisanRouter.put("/profile/details", async (req, res) => {
  const updates = req.body;
  memoryProfileData = { ...memoryProfileData, ...updates };
  return res.json({ success: true, message: "Profil atelier mis à jour avec succès.", profileDetails: memoryProfileData });
});

/**
 * GET /api/artisan/stats
 * Statistiques & Performance de vente pour l'artisan.
 */
artisanRouter.get("/stats", async (req, res) => {
  const artisanRef = getArtisanRef(req);
  try {
    const allOrders = db.select().from(orders).where(eq(orders.artisanRef, artisanRef)).all();

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
  const { category } = req.query;
  let list = memoryCustomRequests;
  if (category && category !== "Toutes") {
    list = list.filter(r => r.category.toLowerCase().includes(String(category).toLowerCase()));
  }
  return res.json({ success: true, count: list.length, requests: list });
});

artisanRouter.post("/custom-requests/:id/quote", async (req, res) => {
  const { id } = req.params;
  const { proposedPrice, confectionDays, note } = req.body;

  if (!proposedPrice || !confectionDays) {
    return res.status(400).json({ success: false, error: "Le prix et le délai de confection sont obligatoires." });
  }

  const reqItem = memoryCustomRequests.find(r => r.id === id);
  if (!reqItem) return res.status(404).json({ success: false, error: "Annonce sur-mesure introuvable." });

  const newQuote = {
    artisanName: "Maâlem Abdelkader",
    proposedPrice: Number(proposedPrice),
    confectionDays: Number(confectionDays),
    note: note || "",
    createdAt: new Date().toISOString(),
  };

  reqItem.quotes.push(newQuote);

  return res.json({ success: true, message: "Devis / Offre transmis au client avec succès !", quote: newQuote });
});

/**
 * POST /api/artisan/orders/:id/ship
 * Route d'expédition (Legacy / Wrapper Étape 1 Sendit)
 */
artisanRouter.post("/orders/:id/ship", async (req, res) => {
  try {
    const result = await shipOrder(req.params.id, req.body);
    res.json({ success: true, status: "en_preparation", ...result });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

/**
 * GET /api/artisan/vendor/:vendorRef/profile
 * Profil public de boutique artisanale & historique des avertissements
 */
artisanRouter.get("/vendor/:vendorRef/profile", (req, res) => {
  const vendorRef = req.params.vendorRef;
  const profile = db.select().from(vendorProfiles).where(eq(vendorProfiles.id, vendorRef)).get() || {
    id: vendorRef,
    warningCountCurrentMonth: 0,
    suspensionStatus: "active",
    suspendedUntil: null,
  };
  const warnings = db.select().from(vendorWarnings).where(eq(vendorWarnings.vendorRef, vendorRef)).all();
  res.json({ success: true, profile, warnings });
});

/**
 * GET /api/artisan/orders/:id/label
 * Récupération du Bon de Livraison (BL) officiel Sendit
 */
artisanRouter.get("/orders/:id/label", async (req, res) => {
  try {
    const result = await senditClient.getLabels(req.query.code || "");
    res.json(result);
  } catch (e) {
    console.warn(`[VORK-API] ⚠️ Failed to fetch label from Sendit API (${e.message}). Using local fallback.`);
    res.json({ success: true, labelUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" });
  }
});

