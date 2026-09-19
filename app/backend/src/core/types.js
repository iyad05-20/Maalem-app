export const SEUIL_ACOMPTE_MAD = 1000;

export function montantAPayer(totalPrice) {
  if (totalPrice < SEUIL_ACOMPTE_MAD) {
    return { montant: totalPrice, tranche: "total_100" };
  }
  return { montant: Math.round(totalPrice * 0.5 * 100) / 100, tranche: "acompte_50" };
}
