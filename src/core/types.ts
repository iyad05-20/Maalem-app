export const SEUIL_ACOMPTE_MAD = 1000;

export type TrancheType = "total_100" | "acompte_50";

export type OrderStatus =
  | "en_attente_paiement"
  | "paiement_initie"
  | "acompte_verse"
  | "payee_integralement"
  | "paiement_echoue"
  | "en_preparation"
  | "pret_a_expedier"
  | "en_cours_de_transport"
  | "livre"
  | "livre_reserve_bloquee"
  | "retour_initie"
  | "en_reclamation"
  | "annulee"
  | "complete";

export type PaymentIntentStatus =
  | "cree"
  | "en_attente_retour"
  | "confirme"
  | "echoue"
  | "expire";

export function montantAPayer(totalPrice: number): {
  montant: number;
  tranche: TrancheType;
} {
  if (totalPrice < SEUIL_ACOMPTE_MAD) {
    return { montant: totalPrice, tranche: "total_100" };
  }
  return { montant: Math.round(totalPrice * 0.5 * 100) / 100, tranche: "acompte_50" };
}
