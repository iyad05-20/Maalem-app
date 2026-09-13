export type ProductType = "standard" | "personnalise" | "sur_commande";

export type OrderStatus =
  | "en_attente_paiement"
  | "paiement_initie"
  | "paiement_echoue"
  | "acompte_verse"
  | "payee_integralement"
  | "en_preparation"
  | "pret_a_expedier"
  | "en_cours_de_transport"
  | "livre"
  | "auto_valide"
  | "livre_reserve_bloquee"
  | "en_reclamation"
  | "litige_post_liberation"
  | "retour_initie"
  | "complete"
  | "annulee";

export interface ClientOrder {
  id: string;
  clientRef: string;
  artisanRef: string;
  artisanName?: string;
  productTitle?: string;
  productImage?: string;
  totalPrice: number;
  productType: ProductType;
  transportProvider?: "sendit" | "vendeur";
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string | null;
  acceptedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  autoValidatedAt?: string | null;
  returnInitiatedAt?: string | null;
  depositAmount?: number;
  tranche?: "total_100" | "acompte_50";
  carrierChoice?: "sendit" | "propres_moyens" | null;
  trackingNumber?: string | null;
  returnShippingFee?: number;
  returnStatus?: "initie" | "valide" | "refuse" | null;
  disputeReason?: string | null;
  disputeStatus?: "ouvert" | "resolu" | null;

  // E-Signature and photos
  clientSignature?: string | null;
  prepPhotos?: string | null;
  senditWaybillUrl?: string | null;
  senditWaybillPhoto?: string | null;
  vendeurDeliverySignaturePhoto?: string | null;

  // Escrow & validation lifecycle
  escrowReleasedAt?: string | null;
  withdrawalExpiresAt?: string | null;
  receptionValidatedBy?: "client" | "vendeur" | "auto" | null;
  clientApprovalStatus?: "pending" | "approved" | null;
  clientApprovalRequestedAt?: string | null;
  escrowActionChoice?: string | null;
  nonReceptionClaimedAt?: string | null;
  refusedByArtisan?: number | null;
  refusalReason?: string | null;

  // Sendit delivery integrations
  senditDeliveryCode?: string | null;
  senditPickupCode?: string | null;
  pickupDistrictId?: number | null;
  deliveryDistrictId?: number | null;
  allowOpen?: number | null;
  allowTry?: number | null;
  counterUnreachable?: number | null;
  proofImage?: string | null;
  packageDimensions?: string | null;
  shippingParcelFee?: number | null;
  estimatedTransportDays?: number | null;
}

export interface WalletTransaction {
  id: string;
  type: string;
  montant: number;
  compteDebit: string;
  compteCredit: string;
  createdAt: string;
  description?: string;
  metadata?: any;
}

export interface ClientWallet {
  userId: string;
  balance: number;
  pendingWithdrawals: number;
  transactions: WalletTransaction[];
  history?: WalletTransaction[];
}

export interface VendorProfileData {
  id: string;
  warningCountCurrentMonth: number;
  suspensionStatus: "active" | "paused" | "suspended_7d" | "suspended_14d" | "blocked";
  suspendedUntil?: string | null;
}
