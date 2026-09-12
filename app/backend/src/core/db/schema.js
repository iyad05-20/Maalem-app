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

  // CGV v23 & Arbitrages Prioritaires Ziad (11/09/2026)
  estimatedTransportDays: numeric("estimated_transport_days"),
  escrowActionChoice: text("escrow_action_choice").default("pending"), // 'pending' | 'pending_artisan_choice' | 'released_to_wallet' | 'extended_by_artisan'
  shippingParcelFee: numeric("shipping_parcel_fee"),
  packageDimensions: text("package_dimensions"), // JSON string: { length, width, height }
  clientApprovalStatus: text("client_approval_status").default("pending"), // 'pending' | 'approved'
  clientApprovalRequestedAt: text("client_approval_requested_at"),
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
