/**
 * Helper financier centralisé pour Vork / Maâlem
 * Implémente rigoureusement les décisions financières (Décisions 15, 30 et gardes anti-division par zéro).
 */

/**
 * Calcul des frais de transport (Décision 15 & Garde Q2)
 * Règle : frais × ⌈quantité ÷ seuil⌉
 * Garde anti-division par zéro : si aucun seuil n'est configuré (null, 0 ou non défini),
 * les frais s'appliquent comme forfait fixe non multiplié.
 */
export function calculateShippingFee(fee, quantity = 1, threshold = 1) {
  const baseFee = Number(fee) || 0;
  const qty = Math.max(1, Number(quantity) || 1);
  const seuil = Number(threshold);

  if (!seuil || seuil <= 0) {
    // Garde : Pas de seuil configuré -> montant fixe
    return baseFee;
  }

  const multiplier = Math.ceil(qty / seuil);
  return Math.round(baseFee * multiplier * 100) / 100;
}

/**
 * Calcul de la commission de la plateforme Vork (5% sans minimum, max 2000 MAD)
 * Décision 4 (Q/R 28/09/2026) : Pas de seuil minimum — le 5% s'applique même si le résultat est faible.
 * Maximum plafonné à 2000 MAD par commande.
 */
export const COMMISSION_CONFIG = {
  RATE: 0.05,
  MAX_MAD: 2000,
  DEFAULT_RULE: "PER_ORDER", // 'PER_ORDER' ou 'PER_ITEM'
};

export function calculatePlatformCommission(orderTotal, options = {}) {
  const total = Number(orderTotal) || 0;
  if (total <= 0) return 0;

  const rawCommission = total * COMMISSION_CONFIG.RATE;
  // Pas de seuil minimum (Décision P4) — on plafonne uniquement au max
  const boundedCommission = Math.min(COMMISSION_CONFIG.MAX_MAD, rawCommission);

  return Math.round(boundedCommission * 100) / 100;
}

/**
 * Répartition financière in-app / cash pour paiement fractionné (≥ 1 000 MAD)
 * (Décision 30) :
 * - La commission est prélevée à 100% sur les 50% in-app séquestrés
 * - Les 50% cash sont hors système (responsabilité vendeur)
 * - Net vendeur dans le wallet = 50% in-app - commission
 */
export function calculatePaymentBreakdown(totalPrice, isFractioned = false) {
  const total = Number(totalPrice) || 0;
  const commission = calculatePlatformCommission(total);

  if (isFractioned && total >= 1000) {
    const inAppGross = Math.round(total * 0.5 * 100) / 100;
    const cashOnDelivery = Math.round((total - inAppGross) * 100) / 100;
    const artisanInAppNet = Math.max(0, Math.round((inAppGross - commission) * 100) / 100);

    return {
      totalPrice: total,
      isFractioned: true,
      inAppAmount: inAppGross,
      cashOnDeliveryAmount: cashOnDelivery,
      platformCommission: commission,
      artisanInAppNet: artisanInAppNet,
    };
  }

  // Paiement 100% in-app
  const artisanInAppNet = Math.max(0, Math.round((total - commission) * 100) / 100);
  return {
    totalPrice: total,
    isFractioned: false,
    inAppAmount: total,
    cashOnDeliveryAmount: 0,
    platformCommission: commission,
    artisanInAppNet: artisanInAppNet,
  };
}
