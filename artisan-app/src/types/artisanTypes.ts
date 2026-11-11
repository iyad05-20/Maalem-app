export interface ArtisanOrder {
  id: string;
  clientRef: string;
  artisanRef: string;
  totalPrice: number;
  productType: "standard" | "personnalise" | "sur_commande";
  productTitle?: string;
  productImage?: string;
  transportProvider: "vendeur";
  status: string;
  createdAt: string;
  acceptedAt?: string | null;
  deliveredAt?: string | null;
  prepPhotos?: string[];
  carrierName?: string | null;
  carrierTrackingNumber?: string | null;
  shippingProofPhoto?: string | null;
  senditDeliveryCode?: string | null;
  vendeurDeliverySignaturePhoto?: string | null;
  clientSignature?: string | null;
  escrowReleasedAt?: string | null;
  withdrawalExpiresAt?: string | null;
  clientApprovalStatus?: "pending" | "approved" | null;
  clientApprovalRequestedAt?: string | null;
  escrowActionChoice?: "pending" | "pending_artisan_choice" | "released_to_wallet" | "extended_by_artisan" | null;
  estimatedTransportDays?: number | null;
  counterUnreachable?: number | null;
  nonReceptionClaimedAt?: string | null;
  j2RelanceSentAt?: string | null;
  shippedAt?: string | null;
  customizationOrigin?: "from_post" | "from_scratch" | null;
  sourceProductId?: string | null;
  sourceVendorId?: string | null;
  catalogPublishedAt?: string | null;
  publishedProductId?: string | null;
  republicationConsentStatus?: string | null;
  republicationConsentParty?: string | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
  tags?: string[];
  productPhotos?: string[];
  orderMetadata?: any;
}

export interface ArtisanReturn {
  id: string;
  orderId: string;
  mode: "direct" | "propres_moyens";
  returnShippingFee: number;
  status: "initie" | "resolu_conforme" | "rejete_non_conforme";
  createdAt: string;
  resolvedAt?: string | null;
  order?: ArtisanOrder | null;
}

export interface ArtisanDispute {
  id: string;
  orderId: string;
  type: string;
  claimantRef: string;
  reason: string;
  clientEvidencePhotos: string[];
  artisanResponse?: string | null;
  artisanEvidencePhotos: string[];
  status: string;
  escrowStatusAtDispute: string;
  arbitrationDecision?: string | null;
  arbitrationAmount?: number | null;
  createdAt: string;
  resolvedAt?: string | null;
  order?: ArtisanOrder | null;
}

export interface ArtisanWallet {
  artisanRef: string;
  availableBalance: number;
  lockedEscrow: number;
  totalGrossSales: number;
  totalNetEarnings: number;
  vorkPlatformFeesTotal: number;
  withdrawals: Array<{
    id: string;
    userId: string;
    amount: number;
    rib: string;
    status: "pending" | "processed" | "rejected";
    createdAt: string;
    processedAt?: string | null;
  }>;
}

export interface ArtisanProfileHealth {
  id: string;
  warningCountCurrentMonth: number;
  suspensionStatus: "active" | "paused" | "suspended_7d" | "suspended_14d" | "blocked";
  suspendedUntil?: string | null;
  updatedAt: string;
}

export interface ArtisanProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  clientPrice?: number;
  productType: "standard" | "personnalise" | "sur_commande";
  image: string;
  photos?: string[];
  tags?: string[];
  sizes?: string[];
  colors?: string[];
  isOnDemand?: boolean;
  availabilityMode?: string;
  ipAuthenticityAccepted?: boolean;
  consentWithdrawn?: boolean;
  personalizationMode?: string;
  artisanName: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  createdAt?: string;
  manufacturingDays?: number;
  status?: "active" | "hidden" | "out_of_stock";
}

export interface CustomOrderQuote {
  artisanRef?: string;
  artisanName: string;
  proposedPrice: number;
  confectionDays: number;
  note: string;
  createdAt: string;
}

export interface CustomOrderRequest {
  id: string;
  clientName: string;
  category: string;
  title: string;
  description: string;
  budget: string;
  deliveryCity: string;
  createdAt: string;
  image: string;
  quotes: CustomOrderQuote[];
  quotesCount?: number;
  myQuote?: CustomOrderQuote | null;
  isDirectPrivateRequest?: boolean;
  tags?: string[];
  selectedSize?: string | null;
  selectedColor?: string | null;
}

export interface ArtisanNotification {
  id: string;
  type: "new_order" | "urgent_order" | "order_prep" | "order_shipped" | "order_delivered" | "order_confirmed" | "order_cancelled" | "dispute" | "return" | "escrow_released" | "withdrawal" | string;
  title: string;
  message: string;
  title_fr?: string;
  title_ar?: string;
  message_fr?: string;
  message_ar?: string;
  date: string;
  read: boolean;
  linkTab: string;
  orderId?: string;
  sourceId?: string;
  secondaryUserId?: string;
  secondaryUserName?: string;
  linkUrl?: string;
  actionStatus?: string | null;
  metadata?: any;
}

export interface ArtisanProfileDetails {
  artisanName: string;
  specialty: string;
  bio: string;
  phone: string;
  pickupAddress: string;
  pickupDistrictId: number;
  defaultRib: string;
  isVacationMode: boolean;
  yearsOfExperience: number;
}

export interface ArtisanStats {
  totalOrders: number;
  acceptanceRate: number;
  averageShippingDays: number;
  overallRating: number;
  reviewCount: number;
  monthlyGrowth: string;
}
