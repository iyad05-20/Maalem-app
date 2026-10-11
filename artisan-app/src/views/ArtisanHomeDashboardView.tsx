import React, { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Lock, CheckCircle2, Landmark, Package, Camera, Check, X, Truck, FileSignature, ChevronRight, Printer, Sparkles } from "lucide-react";
import type { ArtisanOrder, ArtisanWallet } from "../types/artisanTypes";
import { useI18n } from "../services/i18n";
import { getBackendUrl } from "../services/artisanApi";
import { ConvertToCatalogModalSheet } from "../components/ConvertToCatalogModalSheet";

export type ArtisanTab = "home" | "market" | "create" | "posts" | "profile";

interface Props {
  wallet: ArtisanWallet | null;
  orders: ArtisanOrder[];
  onOpenWithdrawalModal: () => void;
  onAccept: (orderId: string) => Promise<void>;
  onOpenRefuseModal: (orderId: string) => void;
  onOpenPrepPhotosModal: (orderId: string) => void;
  onOpenDirectDeliveryModal: (order: ArtisanOrder) => void;
  onEscrowChoice?: (orderId: string, action: "claim" | "extend", extendDays?: number) => Promise<void>;
  onNudgeClient?: (orderId: string) => Promise<void>;
}

export const ArtisanHomeDashboardView: React.FC<Props> = ({
  wallet, orders,
  onOpenWithdrawalModal, onAccept,
  onOpenRefuseModal, onOpenPrepPhotosModal,
  onOpenDirectDeliveryModal,
  onEscrowChoice, onNudgeClient,
}) => {
  const { isRTL, t } = useI18n();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [convertingOrder, setConvertingOrder] = useState<ArtisanOrder | null>(null);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "acompte_verse": return t("status_acompte");
      case "payee_integralement": return t("status_payee");
      case "acceptee": return t("status_acceptee");
      case "en_preparation": return t("status_en_atelier");
      case "en_cours_de_transport": return t("status_transit");
      case "livre": return t("status_livre");
      case "terminee": return t("status_terminee");
      case "annulee": return t("status_cancelled");
      default: return status;
    }
  };

  const handleAccept = async (id: string) => {
    setActionLoading(id);
    try { await onAccept(id); } catch (e: any) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleNudgeAction = async (id: string) => {
    if (!onNudgeClient) return;
    setActionLoading(`nudge-${id}`);
    try {
      await onNudgeClient(id);
      alert(isRTL ? "تم إرسال تذكير للزبون لتأكيد الاستلام بنجاح." : "Rappel envoyé avec succès au client.");
    } catch (e: any) {
      alert(e.message || "Erreur de relance.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleEscrowChoiceAction = async (id: string, action: "claim" | "extend", days: number = 7) => {
    if (!onEscrowChoice) return;
    setActionLoading(`${action}-${id}`);
    try {
      await onEscrowChoice(id, action, days);
      alert(action === "claim" 
        ? (isRTL ? "تم تحرير أموالك وإضافتها لرصيدك المتاح بنجاح!" : "Fonds débloqués avec succès vers votre solde disponible !") 
        : (isRTL ? `تم تمديد المهلة للزبون بـ ${days} أيام.` : `Délai prolongé de ${days} jours pour le client.`));
    } catch (e: any) {
      alert(e.message || "Erreur choix séquestre.");
    } finally {
      setActionLoading(null);
    }
  };

  const pendingStandardOrders = orders.filter(
    o => o.productType === "standard" && ["acompte_verse", "payee_integralement"].includes(o.status) && !o.acceptedAt
  );

  const pendingSurCommandeOrders = orders.filter(
    o => o.productType === "sur_commande" && ["acompte_verse", "payee_integralement"].includes(o.status) && !o.acceptedAt
  );

  const activeOrders = orders.filter(o => {
    if (o.status === "annulee") return false;
    // Commandes personnalisées sont toujours actives dès acceptation du devis
    if (o.productType === "personnalise") return true;
    // Commandes standards ou sur commande déjà acceptées / en cours
    return Boolean(o.acceptedAt) || ["en_preparation", "en_cours_de_transport", "pret_a_expedier", "livre", "terminee"].includes(o.status);
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const [activeFilter, setActiveFilter] = useState<"all" | "standard" | "sur_commande" | "personnalise">("all");

  const displayedOrders = activeOrders.filter(o => {
    if (activeFilter === "all") return true;
    return o.productType === activeFilter;
  });

  const renderPendingCard = (order: ArtisanOrder, i: number, typeLabel: string) => (
    <motion.div
      key={order.id}
      className="artisan-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      style={{ padding: 14 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {order.productImage ? (
            <img
              src={order.productImage}
              alt=""
              style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(0,0,0,0.08)" }}
            />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={20} color="var(--text-placeholder)" />
            </div>
          )}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, color: "var(--primary)" }}>
                {order.productTitle || (isRTL ? "قطعة تقليدية" : "Création")}
              </span>
              <span className="badge badge-urgent" style={{ fontSize: 9 }}>
                {typeLabel}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--accent-warm)", fontWeight: 700 }}>#{order.id.slice(0, 8)}</span>
              {" · "}
              {new Date(order.createdAt).toLocaleDateString(isRTL ? "ar-MA" : "fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
        <div style={{ textAlign: isRTL ? "left" : "right" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--primary)" }}>
            {order.totalPrice} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>MAD</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--accent-emerald)", fontWeight: 700 }}>
            {isRTL ? `الصافي ≈ ${Math.round(order.totalPrice * 0.95)} درهم` : `Net ≈ ${Math.round(order.totalPrice * 0.95)} MAD`}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          className="btn-outline"
          style={{ flex: 1, borderColor: "rgba(220,53,69,0.3)", color: "#DC3545", padding: "8px 12px", fontSize: 12 }}
          onClick={() => onOpenRefuseModal(order.id)}
        >
          <X size={14} /> {t("order_action_decline")}
        </button>
        <button
          className="btn-terracotta"
          style={{ flex: 2, padding: "8px 14px", fontSize: 12 }}
          disabled={actionLoading === order.id}
          onClick={() => handleAccept(order.id)}
        >
          <Check size={15} />
          {actionLoading === order.id ? t("order_accepting") : t("order_accept_action")}
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="app-view">
      {/* ── Zellige corner watermarks */}
      <div className="pattern-corner pattern-top-right" />
      <div className="pattern-corner pattern-bottom-left" />

      {/* ══ WALLET CARD ════════════════════════════════════════════════════ */}
      <div className="wallet-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Wallet size={18} color="var(--accent-premium)" />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.8)", letterSpacing: 0.4 }}>
              {t("wallet_title")}
            </span>
          </div>
          <span className="badge badge-gold" style={{ background: "rgba(212,175,55,0.18)", color: "var(--accent-premium)", border: "1px solid rgba(212,175,55,0.35)" }}>
            {t("wallet_escrow_badge")}
          </span>
        </div>

        <div className="wallet-row">
          {/* Partie Libre */}
          <div className="wallet-half">
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
              <CheckCircle2 size={13} color="#34D399" />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{t("wallet_available")}</span>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#fff" }}>
              {wallet?.availableBalance ?? 0} <span style={{ fontSize: 12, color: "var(--accent-premium)", fontWeight: 500 }}>MAD</span>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{t("wallet_available_sub")}</div>
          </div>

          {/* Partie Bloquée */}
          <div className="wallet-half">
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
              <Lock size={13} color="#93C5FD" />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{t("wallet_guarantee")}</span>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#fff" }}>
              {wallet?.lockedEscrow ?? 0} <span style={{ fontSize: 12, color: "#93C5FD", fontWeight: 500 }}>MAD</span>
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{t("wallet_escrow_sub")}</div>
          </div>
        </div>

        <button
          className="btn-terracotta"
          onClick={onOpenWithdrawalModal}
          disabled={!wallet || wallet.availableBalance <= 0}
          style={{ opacity: !wallet || wallet.availableBalance <= 0 ? 0.55 : 1 }}
        >
          <Landmark size={16} />
          {t("wallet_withdraw_btn")}
        </button>
      </div>

      {/* ══ SECTION 1 : COMMANDES STANDARDS À VALIDER (LISTE VERTICALE 1) ═════════════ */}
      {pendingStandardOrders.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-header" style={{ marginBottom: 8 }}>
            <div>
              <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{isRTL ? "طلبات المنتجات الجاهزة للتأكيد" : "Commandes Standards à valider"}</span>
                <span className="badge badge-urgent">{pendingStandardOrders.length}</span>
              </div>
              <div className="section-subtitle">
                {isRTL ? "منتجات الكتالوج القياسية في انتظار موافقتك للشحن" : "Articles du catalogue prêts à expédier en attente de votre accord"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendingStandardOrders.map((order, i) => renderPendingCard(order, i, isRTL ? "معيارية" : "Standard"))}
          </div>
        </div>
      )}

      {/* ══ SECTION 2 : COMMANDES SUR COMMANDE À VALIDER (LISTE VERTICALE 2) ══════════ */}
      {pendingSurCommandeOrders.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-header" style={{ marginBottom: 8 }}>
            <div>
              <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{isRTL ? "طلبات تحت الطلب للتأكيد" : "Commandes Sur Commande à valider"}</span>
                <span className="badge badge-warning" style={{ background: "rgba(184, 98, 63, 0.15)", color: "var(--accent-warm)" }}>
                  {pendingSurCommandeOrders.length}
                </span>
              </div>
              <div className="section-subtitle">
                {isRTL ? "طلبات الكتالوج الخاصة بورشكم في انتظار بدء التصنيع" : "Modèles du catalogue sur commande à valider pour lancement en atelier"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pendingSurCommandeOrders.map((order, i) => renderPendingCard(order, i, isRTL ? "تحت الطلب" : "Sur Commande"))}
          </div>
        </div>
      )}

      {/* ══ SECTION 3 : COMMANDES ACTUELLES / EN COURS (AVEC FILTRE) ══════════════════ */}
      <div className="section-header" style={{ marginBottom: 8 }}>
        <div>
          <div className="section-title">
            {isRTL ? "الطلبات الجارية في الورشة" : "Commandes Actuelles / En cours"}
          </div>
          <div className="section-subtitle">
            {activeOrders.length} {t("order_count_suffix")}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none", marginBottom: 12 }}>
        <button
          className={`pill-tab ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => setActiveFilter("all")}
          style={{ fontSize: 11, padding: "6px 12px" }}
        >
          {isRTL ? "الكل" : "Toutes"} ({activeOrders.length})
        </button>
        <button
          className={`pill-tab ${activeFilter === "standard" ? "active" : ""}`}
          onClick={() => setActiveFilter("standard")}
          style={{ fontSize: 11, padding: "6px 12px" }}
        >
          {isRTL ? "جاهزة" : "Standards"} ({activeOrders.filter(o => o.productType === "standard").length})
        </button>
        <button
          className={`pill-tab ${activeFilter === "sur_commande" ? "active" : ""}`}
          onClick={() => setActiveFilter("sur_commande")}
          style={{ fontSize: 11, padding: "6px 12px" }}
        >
          {isRTL ? "تحت الطلب" : "Sur Commande"} ({activeOrders.filter(o => o.productType === "sur_commande").length})
        </button>
        <button
          className={`pill-tab ${activeFilter === "personnalise" ? "active" : ""}`}
          onClick={() => setActiveFilter("personnalise")}
          style={{ fontSize: 11, padding: "6px 12px" }}
        >
          {isRTL ? "مخصصة" : "Personnalisées"} ({activeOrders.filter(o => o.productType === "personnalise").length})
        </button>
      </div>

      {displayedOrders.length === 0 ? (
        <div className="artisan-card" style={{ padding: "40px 20px", textAlign: "center" }}>
          <Package size={36} color="var(--text-placeholder)" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
            {t("orders_empty")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {displayedOrders.map((order, i) => {
            const toAccept = ["acompte_verse", "payee_integralement"].includes(order.status) && !order.acceptedAt;
            const inPrep = order.status === "en_preparation";
            const inTransit = order.status === "en_cours_de_transport";
            const done = ["livre", "terminee"].includes(order.status);
            const isBypass = order.prepPhotos?.some(p => String(p).startsWith("bypass:"));
            const hasPhotos = (order.prepPhotos?.length ?? 0) >= 4 || !!isBypass;

            const getTypeBadge = () => {
              if (order.productType === "personnalise") {
                return <span className="badge badge-gold" style={{ fontSize: 9 }}>{isRTL ? "مخصصة" : "Personnalisée"}</span>;
              }
              if (order.productType === "sur_commande") {
                return <span className="badge badge-info" style={{ fontSize: 9 }}>{isRTL ? "تحت الطلب" : "Sur Commande"}</span>;
              }
              return <span className="badge" style={{ fontSize: 9, background: "rgba(0,0,0,0.06)", color: "var(--text-secondary)" }}>{isRTL ? "معيارية" : "Standard"}</span>;
            };

            return (
              <motion.div
                key={order.id}
                className="artisan-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                style={{ padding: 16 }}
              >
                {/* Order header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {order.productImage ? (
                      <img
                        src={order.productImage}
                        alt=""
                        style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(0,0,0,0.08)" }}
                      />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Package size={20} color="var(--text-placeholder)" />
                      </div>
                    )}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--primary)" }}>
                          {order.productTitle || (isRTL ? "قطعة تقليدية" : "Création Artisanale")}
                        </span>
                        {getTypeBadge()}
                        <span className={`badge badge-${toAccept ? "urgent" : inPrep ? "warning" : inTransit ? "info" : "success"}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        <span style={{ color: "var(--accent-warm)", fontWeight: 700 }}>#{order.id.slice(0, 8)}</span>
                        {" · "}
                        {new Date(order.createdAt).toLocaleDateString(isRTL ? "ar-MA" : "fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {order.productType === "standard"
                          ? t("order_type_sendit")
                          : t("order_type_direct")}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: isRTL ? "left" : "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--primary)" }}>
                      {order.totalPrice} <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>MAD</span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--accent-emerald)", fontWeight: 700 }}>
                      {isRTL
                        ? `الصافي ≈ ${Math.round(order.totalPrice * 0.95)} درهم`
                        : `Net ≈ ${Math.round(order.totalPrice * 0.95)} MAD`}
                    </div>
                  </div>
                </div>

                {/* Progress steps */}
                <div style={{
                  background: "rgba(26,42,58,0.04)",
                  borderRadius: 12,
                  padding: "8px 12px",
                  marginBottom: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 10,
                  color: "var(--text-secondary)",
                }}>
                  <span style={{ color: toAccept ? "var(--accent-warm)" : "var(--accent-emerald)", fontWeight: 700 }}>
                    {toAccept ? t("step_pending") : t("step_accepted")}
                  </span>
                  <ChevronRight size={10} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
                  <span style={{ color: inPrep ? "var(--accent-warm)" : (hasPhotos || done || inTransit) ? "var(--accent-emerald)" : "var(--text-placeholder)", fontWeight: 700 }}>
                    {hasPhotos ? t("step_photos_done") : t("step_photos_pending")}
                  </span>
                  <ChevronRight size={10} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
                  <span style={{ color: done ? "var(--accent-emerald)" : inTransit ? "var(--accent-warm)" : "var(--text-placeholder)", fontWeight: 700 }}>
                    {done ? t("step_shipped") : inTransit ? t("step_in_transit") : t("step_shipping")}
                  </span>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {toAccept && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-outline" style={{ flex: 1, borderColor: "rgba(220,53,69,0.3)", color: "#DC3545" }} onClick={() => onOpenRefuseModal(order.id)}>
                        <X size={15} /> {t("order_action_decline")}
                      </button>
                      <button className="btn-terracotta" style={{ flex: 2 }} disabled={actionLoading === order.id} onClick={() => handleAccept(order.id)}>
                        <Check size={16} />
                        {actionLoading === order.id ? t("order_accepting") : t("order_accept_action")}
                      </button>
                    </div>
                  )}

                  {inPrep && (
                    <button
                      className="btn-outline"
                      style={{ justifyContent: "space-between", borderColor: hasPhotos ? "var(--accent-emerald)" : "var(--accent-warm)", color: hasPhotos ? "var(--accent-emerald)" : "var(--accent-warm)" }}
                      onClick={() => onOpenPrepPhotosModal(order.id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Camera size={15} />
                        {hasPhotos
                          ? (isBypass 
                              ? (isRTL ? "✓ تم اعتماد المطابقة بالورشة" : "✓ Conforme pour expédition") 
                              : (isRTL ? `✓ تم إيداع ${order.prepPhotos?.length} صور للورشة` : `✓ ${order.prepPhotos?.length} photos d'atelier`))
                          : t("order_photos_upload_cta")}
                      </div>
                      <ChevronRight size={14} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
                    </button>
                  )}

                  {inPrep && (
                    <button className="btn-primary" onClick={() => onOpenDirectDeliveryModal(order)} disabled={!hasPhotos} style={{ opacity: hasPhotos ? 1 : 0.45 }}>
                      <Truck size={16} /> {isRTL ? "إرسال / تسليم الطلب" : "Déclarer l'expédition / Livraison"}
                    </button>
                  )}

                  {inTransit && (
                    <button className="btn-primary" style={{ background: "var(--accent-emerald)" }} onClick={() => onOpenDirectDeliveryModal(order)}>
                      <FileSignature size={16} /> {isRTL ? "تأكيد التسليم (مرفق بتوقيع الزبون)" : "Confirmer livraison effectuée"}
                    </button>
                  )}

                  {/* ─── TRANSFERT VERS POST SUR COMMANDE (Règle V2 / Décision Ziad) ─── */}
                  {(() => {
                    const isCustomOrSurCmd = ["personnalise", "sur_commande"].includes(order.productType) || Boolean((order as any).customizationOrigin);
                    const isAlreadyPublished = Boolean((order as any).catalogPublishedAt || (order as any).publishedProductId);
                    const isConfectionAdvanced = ["livre", "valide", "terminee"].includes(order.status) || Boolean(order.shippedAt) || (order.status === "en_preparation" && hasPhotos);

                    if (isAlreadyPublished) {
                      return (
                        <div style={{ background: "rgba(45, 106, 79, 0.08)", border: "1px solid rgba(45, 106, 79, 0.25)", borderRadius: 10, padding: "7px 10px", fontSize: 10.5, color: "#2D6A4F", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <CheckCircle2 size={13} />
                          <span>{isRTL ? "✓ تم نشر هذا النموذج كمنتج 'تحت الطلب' بالكتالوج" : "✓ Publié au catalogue en post 'Sur Commande'"}</span>
                        </div>
                      );
                    }

                    if (isCustomOrSurCmd) {
                      return (
                        <button
                          type="button"
                          disabled={!isConfectionAdvanced}
                          onClick={() => setConvertingOrder(order)}
                          title={!isConfectionAdvanced ? "Accessible vers la fin de fabrication ou après upload des photos" : ""}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: 12,
                            border: isConfectionAdvanced ? "1.5px solid var(--accent-warm)" : "1px dashed var(--border)",
                            background: isConfectionAdvanced ? "rgba(184, 98, 63, 0.06)" : "rgba(0,0,0,0.02)",
                            color: isConfectionAdvanced ? "var(--accent-warm)" : "var(--text-secondary)",
                            fontWeight: 700,
                            fontSize: 11,
                            cursor: isConfectionAdvanced ? "pointer" : "not-allowed",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            marginTop: 4,
                            opacity: isConfectionAdvanced ? 1 : 0.5,
                          }}
                        >
                          <Sparkles size={14} />
                          <span>
                            {isConfectionAdvanced
                              ? (isRTL ? "✦ تحويل إلى منشور 'تحت الطلب'" : "✦ Transférer en post 'Sur Commande'")
                              : (isRTL ? "تحويل للكتالوج (متاح بنهاية الصنع)" : "Transférer au catalogue (fin de confection)")}
                          </span>
                        </button>
                      );
                    }

                    return null;
                  })()}

                  {/* ─── CARTE RELANCE CLIENT POUR APPROBATION RÉCEPTION (RÈGLE ZIAD 11/09/2026) ─── */}
                  {order.status === "livre" && order.clientApprovalStatus !== "approved" && (
                    <div style={{ background: "rgba(196, 169, 106, 0.1)", border: "1px solid rgba(196, 169, 106, 0.3)", borderRadius: 12, padding: "10px 12px", marginTop: 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", marginBottom: 3 }}>
                        {isRTL ? "في انتظار تأكيد الزبون للاستلام" : "En attente d'approbation client"}
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.3 }}>
                        {isRTL 
                          ? "حّث الزبون على الضغط على 'تأكيد الاستلام' في تطبيقه لبدء احتساب 7 أيام وصرف مستحقاتك." 
                          : "Le compte à rebours de 7 jours ne commence que lorsque le client clique sur 'Approuver la réception'."}
                      </div>
                      <button 
                        type="button"
                        className="btn-outline" 
                        disabled={actionLoading === `nudge-${order.id}`}
                        onClick={() => handleNudgeAction(order.id)}
                        style={{ fontSize: 11, padding: "6px 10px", width: "100%", justifyContent: "center", borderColor: "var(--accent-warm)", color: "var(--primary)" }}
                      >
                        {actionLoading === `nudge-${order.id}` ? t("loading") : (isRTL ? "🔔 حث الزبون على تأكيد الاستلام" : "🔔 Relancer le client pour valider")}
                      </button>
                    </div>
                  )}

                  {/* ─── CARTE CHOIX SÉQUESTRE ARTISAN À L'ÉCHÉANCE DES 7 JOURS (RÈGLE ZIAD 11/09/2026) ─── */}
                  {(order.escrowActionChoice === "pending_artisan_choice" || (order.withdrawalExpiresAt && new Date(order.withdrawalExpiresAt).getTime() <= Date.now() && !order.escrowReleasedAt)) && (
                    <div style={{ background: "rgba(45, 106, 79, 0.08)", border: "1.5px solid #2D6A4F", borderRadius: 12, padding: "10px 12px", marginTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <CheckCircle2 size={15} color="#2D6A4F" />
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#2D6A4F" }}>
                          {isRTL ? "انقضت 7 أيام من مدة التراجع القانونية !" : "7 jours de rétractation écoulés !"}
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 8, lineHeight: 1.3 }}>
                        {isRTL 
                          ? "يمكنك الآن تحرير أموال هذه الطلبية، أو منح الزبون مهلة إضافية والتواصل معه." 
                          : "Vous pouvez débloquer vos fonds immédiatement ou accorder un délai supplémentaire au client."}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          disabled={actionLoading === `claim-${order.id}`}
                          onClick={() => handleEscrowChoiceAction(order.id, "claim")}
                          style={{ flex: 2, background: "#2D6A4F", color: "#FFF", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                        >
                          {actionLoading === `claim-${order.id}` ? t("loading") : (isRTL ? "💰 تحرير مستحقاتي" : "💰 Débloquer mes fonds")}
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === `extend-${order.id}`}
                          onClick={() => handleEscrowChoiceAction(order.id, "extend", 7)}
                          style={{ flex: 1, background: "#FFF", color: "var(--text-secondary)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 6px", fontSize: 10, fontWeight: 600, cursor: "pointer" }}
                        >
                          {actionLoading === `extend-${order.id}` ? t("loading") : (isRTL ? "تمديد مهلة" : "Accorder délai")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {convertingOrder && (
        <ConvertToCatalogModalSheet
          order={convertingOrder}
          onClose={() => setConvertingOrder(null)}
          onSuccess={() => {
            (convertingOrder as any).catalogPublishedAt = new Date().toISOString();
            setConvertingOrder(null);
          }}
        />
      )}
    </div>
  );
};
