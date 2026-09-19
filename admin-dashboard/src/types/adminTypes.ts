export interface AdminStats {
  totalOrdersCount: number;
  totalGmv: number;
  lockedEscrowAmount: number;
  releasedEscrowAmount: number;
  platformCommissionEstimate: number;
  openDisputesCount: number;
  pendingWithdrawalsCount: number;
  totalVendorsCount: number;
  suspendedVendorsCount: number;
}

export interface DisputeDossier {
  id: string;
  orderId: string;
  type: "non_reception" | "vice_cache_3mois" | "non_conformite" | "retard_critique" | "retractation_bloquee";
  claimantRef: string;
  reason: string;
  clientEvidencePhotos: string[];
  artisanResponse?: string | null;
  artisanEvidencePhotos: string[];
  resolution?: string | null;
  status: "en_attente_artisan" | "en_arbitrage_admin" | "resolu_remboursement_total" | "resolu_remboursement_partiel" | "resolu_remplacement" | "rejete";
  escrowStatusAtDispute: "locked" | "already_released";
  arbitrationDecision?: string | null;
  arbitrationAmount?: number | null;
  arbitratedBy?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  order?: {
    id: string;
    clientRef: string;
    artisanRef: string;
    totalPrice: number;
    productType: "standard" | "personnalise" | "sur_commande";
    transportProvider: "sendit" | "vendeur";
    status: string;
    createdAt: string;
    acceptedAt?: string | null;
    deliveredAt?: string | null;
    clientSignature?: string | null;
    prepPhotos?: string[];
    senditWaybillUrl?: string | null;
    senditWaybillPhoto?: string | null;
    vendeurDeliverySignaturePhoto?: string | null;
    senditDeliveryCode?: string | null;
    proofImage?: string | null;
    counterUnreachable?: number | null;
  } | null;
}

export interface VendorProfile {
  id: string;
  warningCountCurrentMonth: number;
  suspensionStatus: "active" | "paused" | "suspended_7d" | "suspended_14d" | "blocked";
  suspendedUntil?: string | null;
  updatedAt: string;
}

export interface VendorWarning {
  id: string;
  vendorRef: string;
  orderId?: string | null;
  reason: string;
  monthYear: string;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  rib: string;
  status: "pending" | "processed" | "rejected";
  createdAt: string;
  processedAt?: string | null;
}

export interface LedgerEntry {
  id: string;
  orderId?: string | null;
  compteDebit: string;
  compteCredit: string;
  montant: number;
  type: string;
  metadata?: string | null;
  createdAt: string;
}

export interface CronExecution {
  id: string;
  jobName: string;
  status: "success" | "failed";
  itemsProcessed: number;
  details?: string | null;
  executedAt: string;
}
