import { pgTable, text, numeric } from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  clientRef: text("client_ref").notNull(),
  artisanRef: text("artisan_ref").notNull().default("artisan-1"),
  artisanName: text("artisan_name"),
  totalPrice: numeric("total_price").notNull(),
  productType: text("product_type").notNull().default("standard"), // 'standard' | 'personnalise' | 'sur_commande'
  productTitle: text("product_title"),
  productImage: text("product_image"),
  transportProvider: text("transport_provider").notNull().default("sendit"), // 'sendit' | 'vendeur'
  status: text("status").notNull().default("en_attente_paiement"),
  createdAt: text("created_at").notNull(),
  acceptedAt: text("accepted_at"),
  readyToShipAt: text("ready_to_ship_at"),
  shippedAt: text("shipped_at"),
  deliveredAt: text("delivered_at"),
  updatedAt: text("updated_at").notNull(),

  // Client signature at checkout
  clientSignature: text("client_signature"),

  // Preparation & delivery proof photos
  prepPhotos: text("prep_photos"), // JSON array
  senditWaybillUrl: text("sendit_waybill_url"),
  senditWaybillPhoto: text("sendit_waybill_photo"),
  vendeurDeliverySignaturePhoto: text("vendeur_delivery_signature_photo"),

  // Escrow & validation lifecycle
  escrowReleasedAt: text("escrow_released_at"),
  withdrawalExpiresAt: text("withdrawal_expires_at"),
  receptionValidatedBy: text("reception_validated_by"),
  nonReceptionClaimedAt: text("non_reception_claimed_at"),
  nonReceptionReason: text("non_reception_reason"),
  refusedByArtisan: numeric("refused_by_artisan").default("0"),
  refusalReason: text("refusal_reason"),

  // Cron & Automated Reminders
  j2RelanceSentAt: text("j2_relance_sent_at"),

  // Sendit delivery integrations
  senditDeliveryCode: text("sendit_delivery_code"),
  senditPickupCode: text("sendit_pickup_code"),
  pickupDistrictId: numeric("pickup_district_id"),
  deliveryDistrictId: numeric("delivery_district_id"),
  allowOpen: numeric("allow_open").default("1"),
  allowTry: numeric("allow_try").default("0"),
  counterUnreachable: numeric("counter_unreachable").default("0"),
  proofImage: text("proof_image"),

  // CGV v23 & Flux Vork (26/09/2026)
  productId: text("product_id"),
  quantity: numeric("quantity").default("1"),
  inAppAmount: numeric("in_app_amount"),
  cashOnDeliveryAmount: numeric("cash_on_delivery_amount"),
  platformCommission: numeric("platform_commission"),
  artisanInAppNet: numeric("artisan_in_app_net"),
  refusalReasonCategory: text("refusal_reason_category"),
  refusalReasonText: text("refusal_reason_text"),

  estimatedTransportDays: numeric("estimated_transport_days"),
  escrowActionChoice: text("escrow_action_choice").default("pending"), // 'pending' | 'released_to_wallet'
  shippingParcelFee: numeric("shipping_parcel_fee"),
  packageDimensions: text("package_dimensions"), // JSON string: { length, width, height }
  clientApprovalStatus: text("client_approval_status").default("pending"), // 'pending' | 'approved'
  clientApprovalRequestedAt: text("client_approval_requested_at"),
  
  // Direct Shipping & Carrier Tracking (Décision C05 & C08)
  carrierName: text("carrier_name"),
  carrierTrackingNumber: text("carrier_tracking_number"),
  shippingProofPhoto: text("shipping_proof_photo"),
  notReceivedReportedAt: text("not_received_reported_at"),

  // Traçabilité Modèle Source & Publication Catalogue (v2)
  sourceProductId: text("source_product_id"),
  sourceVendorId: text("source_vendor_id"),
  customizationOrigin: text("customization_origin").default("from_post"), // 'from_post' | 'from_scratch'
  catalogPublishedAt: text("catalog_published_at"),
  publishedProductId: text("published_product_id"),
  republicationConsentStatus: text("republication_consent_status").default("not_required"), // 'not_required' | 'pending' | 'partially_granted' | 'granted' | 'rejected' | 'withdrawn'
  republicationConsentParty: text("republication_consent_party"), // 'source_vendor' | 'client'
  orderMetadata: text("order_metadata"), // JSON: { selectedSize, selectedColor, tags, productPhotos, customRequestId, republicationRequest }
});

export const formalRequests = pgTable("formal_requests", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  initiatorType: text("initiator_type").notNull(), // 'client' | 'artisan'
  initiatorId: text("initiator_id").notNull(),
  respondentId: text("respondent_id").notNull(),
  category: text("category").notNull(), // 'non_validation' | 'produit_non_conforme' | 'retard' | 'autre'
  description: text("description").notNull(),
  evidenceUrls: text("evidence_urls"), // JSON array
  status: text("status").notNull().default("ouverte"), // 'ouverte' | 'repondue' | 'escaladee_admin' | 'resolue' | 'rejetee'
  responseMessage: text("response_message"),
  adminNotes: text("admin_notes"),
  createdAt: text("created_at").notNull(),
  deadlineRespondentAt: text("deadline_respondent_at"), // +48h
  resolvedAt: text("resolved_at"),
});

export const clientWallets = pgTable("client_wallets", {
  id: text("id").primaryKey(), // clientRef / userId
  balance: numeric("balance").notNull().default("0"),
  currency: text("currency").notNull().default("MAD"),
  updatedAt: text("updated_at").notNull(),
});

export const clientWalletTransactions = pgTable("client_wallet_transactions", {
  id: text("id").primaryKey(),
  clientRef: text("client_ref").notNull(),
  orderId: text("order_id"),
  type: text("type").notNull(), // 'refund_pre_acceptance' | 'refund_dispute' | 'withdrawal_request' | 'purchase_use'
  amount: numeric("amount").notNull(),
  balanceAfter: numeric("balance_after").notNull(),
  metadata: text("metadata"),
  createdAt: text("created_at").notNull(),
});

export const cronExecutions = pgTable("cron_executions", {
  id: text("id").primaryKey(),
  jobName: text("job_name").notNull(),
  status: text("status").notNull(), // 'success' | 'failed'
  itemsProcessed: numeric("items_processed").default("0"),
  details: text("details"),
  executedAt: text("executed_at").notNull(),
});

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  amount: numeric("amount").notNull(),
  rib: text("rib").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  processedAt: text("processed_at"),
});

export const paymentIntents = pgTable("payment_intents", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  montant: numeric("montant").notNull(),
  tranche: text("tranche").notNull(),
  provider: text("provider").notNull().default("mock_cmi"),
  statut: text("statut").notNull().default("cree"),
  providerRef: text("provider_ref"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export const ledgerEntries = pgTable("ledger_entries", {
  id: text("id").primaryKey(),
  orderId: text("order_id"),
  compteDebit: text("compte_debit").notNull(),
  compteCredit: text("compte_credit").notNull(),
  montant: numeric("montant").notNull(),
  type: text("type").notNull(),
  metadata: text("metadata"),
  createdAt: text("created_at").notNull(),
});

export const paymentsReceived = pgTable("payments_received", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  paymentIntentId: text("payment_intent_id").unique(),
  source: text("source").notNull(),
  amount: numeric("amount").notNull(),
  tranche: text("tranche").notNull(),
  confirmedAt: text("confirmed_at").notNull(),
});

export const returnRequests = pgTable("return_requests", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  mode: text("mode").notNull(),
  returnShippingFee: numeric("return_shipping_fee").notNull().default("0"),
  status: text("status").notNull().default("initie"),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export const disputes = pgTable("disputes", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  type: text("type").notNull().default("non_reception"), // 'non_reception' | 'vice_cache_3mois' | 'non_conformite' | 'retard_critique' | 'retractation_bloquee'
  claimantRef: text("claimant_ref").notNull().default("client-1"),
  reason: text("reason").notNull(),
  clientEvidencePhotos: text("client_evidence_photos"), // JSON array
  artisanResponse: text("artisan_response"),
  artisanEvidencePhotos: text("artisan_evidence_photos"), // JSON array
  resolution: text("resolution"),
  status: text("status").notNull().default("en_arbitrage_admin"), // 'en_attente_artisan' | 'en_arbitrage_admin' | 'resolu_remboursement_total' | 'resolu_remboursement_partiel' | 'resolu_remplacement' | 'rejete'
  escrowStatusAtDispute: text("escrow_status_at_dispute").notNull().default("locked"), // 'locked' | 'already_released'
  arbitrationDecision: text("arbitration_decision"),
  arbitrationAmount: numeric("arbitration_amount"),
  arbitratedBy: text("arbitrated_by").default("admin-vork"),
  createdAt: text("created_at").notNull(),
  resolvedAt: text("resolved_at"),
});

export const vendorWarnings = pgTable("vendor_warnings", {
  id: text("id").primaryKey(),
  vendorRef: text("vendor_ref").notNull(),
  orderId: text("order_id"),
  reason: text("reason").notNull(),
  monthYear: text("month_year").notNull(), // e.g. "2026-08"
  isDismissed: numeric("is_dismissed").default("0"), // 1 si annulé pour Force Majeure (Art. 12.5 & 27)
  dismissReason: text("dismiss_reason"),
  dismissedAt: text("dismissed_at"),
  proofDocUrl: text("proof_doc_url"),
  createdAt: text("created_at").notNull(),
});

export const vendorProfiles = pgTable("vendor_profiles", {
  id: text("id").primaryKey(), // e.g. "artisan-1"
  warningCountCurrentMonth: numeric("warning_count_current_month").default("0"),
  warningCount14d: numeric("warning_count_14d").default("0"), // Compteur glissant 14j (Seuil: 3 -> suspension 7j)
  suspensionStatus: text("suspension_status").default("active"), // 'active' | 'paused' | 'suspended_7d' | 'suspended_14d' | 'blocked'
  suspensionCount: numeric("suspension_count").default("0"),
  suspendedUntil: text("suspended_until"),
  updatedAt: text("updated_at").notNull(),
});

export const appUsers = pgTable("app_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name"),
  role: text("role").notNull().default("client"), // 'client' | 'artisan' | 'admin'
  phone: text("phone"),
  city: text("city"),
  status: text("status").notNull().default("active"), // 'active' | 'suspended' | 'locked'
  failedLoginAttempts: numeric("failed_login_attempts").default("0"),
  lockedUntil: text("locked_until"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: text("id").primaryKey(),
  operatorId: text("operator_id").notNull(),
  action: text("action").notNull(),
  targetId: text("target_id").notNull(),
  details: text("details"),
  ipAddress: text("ip_address"),
  createdAt: text("created_at").notNull(),
});

export const customRequests = pgTable("custom_requests", {
  id: text("id").primaryKey(),
  clientRef: text("client_ref").notNull(),
  artisanRef: text("artisan_ref").notNull().default("artisan-open"),
  totalPrice: numeric("total_price").notNull().default("0"),
  productType: text("product_type").notNull().default("personnalise"), // 'personnalise' | 'sur_commande'
  transportProvider: text("transport_provider").notNull().default("vendeur"),
  status: text("status").notNull().default("en_attente_artisan"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  proofImage: text("proof_image"),
  customizationTags: text("customization_tags"),

  // Traçabilité Modèle Source & Marché (v2)
  sourceProductId: text("source_product_id"),
  sourceVendorId: text("source_vendor_id"),
  customizationOrigin: text("customization_origin").notNull().default("from_post"), // 'from_post' | 'from_scratch'
  marketType: text("market_type").notNull().default("private"), // 'private' | 'public'
  safetyGuidelinesAccepted: numeric("safety_guidelines_accepted").default("1"),
  categoryId: text("category_id"),
  categoryName: text("category_name"),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(), // ClientRef ou ArtisanRef
  userType: text("user_type").notNull(), // 'artisan' | 'client'
  type: text("type").notNull(), // 'template_started_by_vendor' | 'from_scratch_published_to_catalog' | 'report_update'
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  message: text("message").notNull(),
  messageAr: text("message_ar"),
  linkUrl: text("link_url"),
  sourceId: text("source_id"), // orderId ou productId
  secondaryUserId: text("secondary_user_id"),
  secondaryUserName: text("secondary_user_name"),
  isRead: numeric("is_read").default("0"),
  metadata: text("metadata"), // JSON string
  idempotencyKey: text("idempotency_key"),
  actionStatus: text("action_status"), // 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'info'
  updatedAt: text("updated_at"),
  createdAt: text("created_at").notNull(),
});

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").notNull(),
  reporterType: text("reporter_type").notNull(), // 'client' | 'artisan'
  targetType: text("target_type").notNull(), // 'product' | 'public_custom_request' | 'vendor'
  targetId: text("target_id").notNull(),
  targetTitle: text("target_title"),
  targetOwnerId: text("target_owner_id"),
  category: text("category").notNull(), // 'plagiat' | 'image_inappropriee' | 'non_respect_charte' | 'autre'
  reason: text("reason").notNull(),
  evidenceUrls: text("evidence_urls"), // JSON string array
  status: text("status").notNull().default("en_attente_admin"), // 'en_attente_admin' | 'en_investigation' | 'resolu' | 'rejete'
  adminDecision: text("admin_decision"), // 'post_deleted' | 'vendor_banned' | 'dismissed'
  adminNotes: text("admin_notes"),
  resolvedBy: text("resolved_by"),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").notNull(),
});

