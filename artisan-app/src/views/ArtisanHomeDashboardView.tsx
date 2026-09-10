import React, { useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Lock, CheckCircle2, Landmark, Package, Camera, Check, X, Truck, FileSignature, ChevronRight, Printer } from "lucide-react";
import type { ArtisanOrder, ArtisanWallet } from "../types/artisanTypes";
import { useI18n } from "../services/i18n";
import { getBackendUrl } from "../services/artisanApi";

export type ArtisanTab = "home" | "market" | "create" | "posts" | "profile";

interface Props {
  wallet: ArtisanWallet | null;
  orders: ArtisanOrder[];
  onOpenWithdrawalModal: () => void;
  onAccept: (orderId: string) => Promise<void>;
  onOpenRefuseModal: (orderId: string) => void;
  onOpenPrepPhotosModal: (orderId: string) => void;
  onOpenSenditModal: (order: ArtisanOrder) => void;
  onOpenDirectDeliveryModal: (order: ArtisanOrder) => void;
}

export const ArtisanHomeDashboardView: React.FC<Props> = ({
  wallet, orders,
  onOpenWithdrawalModal, onAccept,
  onOpenRefuseModal, onOpenPrepPhotosModal,
  onOpenSenditModal, onOpenDirectDeliveryModal,
}) => {
  const { isRTL, t } = useI18n();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const activeOrders = orders
    .filter(o => o.status !== "annulee")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const toAcceptCount = activeOrders.filter(o => ["acompte_verse", "payee_integralement"].includes(o.status)).length;

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

      {/* ══ COMMANDES ACTIVES ══════════════════════════════════════════════ */}
      <div className="section-header">
        <div>
          <div className="section-title">
            {toAcceptCount > 0 ? t("orders_to_treat") : t("orders_active_list")}
          </div>
          <div className="section-subtitle">
          {activeOrders.length} {t("order_count_suffix")}
          </div>
        </div>
        {toAcceptCount > 0 && (
          <span className="badge badge-urgent">
            ⚡ {toAcceptCount} {t("order_pending_validation")}
          </span>
        )}
      </div>

      {activeOrders.length === 0 ? (
        <div className="artisan-card" style={{ padding: "40px 20px", textAlign: "center" }}>
          <Package size={36} color="var(--text-placeholder)" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
            {t("orders_empty")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {activeOrders.map((order, i) => {
            const toAccept = ["acompte_verse", "payee_integralement"].includes(order.status);
            const inPrep = order.status === "en_preparation";
            const inTransit = order.status === "en_cours_de_transport";
            const done = ["livre", "terminee"].includes(order.status);
            const isBypass = order.prepPhotos?.some(p => String(p).startsWith("bypass:"));
            const hasPhotos = (order.prepPhotos?.length ?? 0) >= 4 || !!isBypass;

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
                    {order.productImage && (
                      <img
                        src={order.productImage}
                        alt=""
                        style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(0,0,0,0.08)" }}
                      />
                    )}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--primary)" }}>
                          {order.productTitle || (isRTL ? "قطعة تقليدية" : "Création Artisanale")}
                        </span>
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
                    order.productType === "standard" ? (
                      <button className="btn-primary" onClick={() => onOpenSenditModal(order)} disabled={!hasPhotos} style={{ opacity: hasPhotos ? 1 : 0.45 }}>
                        <Truck size={16} /> {t("order_generate_sendit")}
                      </button>
                    ) : (
                      <button className="btn-primary" onClick={() => onOpenDirectDeliveryModal(order)} disabled={!hasPhotos} style={{ opacity: hasPhotos ? 1 : 0.45 }}>
                        <FileSignature size={16} /> {t("order_declare_direct")}
                      </button>
                    )
                  )}

                  {inTransit && order.productType !== "standard" && (
                    <button className="btn-primary" style={{ background: "var(--accent-emerald)" }} onClick={() => onOpenDirectDeliveryModal(order)}>
                      <FileSignature size={16} /> {t("order_validate_signed")}
                    </button>
                  )}

                  {order.senditDeliveryCode && (
                    <a
                      className="btn-outline"
                      href={`${getBackendUrl()}/artisan/orders/${order.id}/label?code=${order.senditDeliveryCode}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ textDecoration: "none", justifyContent: "center", fontSize: 12 }}
                    >
                      <Printer size={14} /> {t("order_download_label")}
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
