import React, { useState } from "react";
import { ChevronRight, CheckCircle2, XCircle, Trash2, UserCheck, Flag } from "lucide-react";
import type { ArtisanNotification } from "../types/artisanTypes";
import { useI18n } from "../services/i18n";
import { ReportModal } from "../components/ReportModal";
import { getBackendUrl } from "../services/artisanApi";

interface ArtisanNotificationsViewProps {
  notifications: ArtisanNotification[];
  onNavigateTab: (tab: any) => void;
  artisanRef?: string;
  onRespondConsent?: (orderId: string, decision: "accept" | "refuse", reason?: string) => Promise<void>;
  onDeleteProduct?: (productId: string) => Promise<void>;
  onMarkRead?: (notifId: string) => Promise<void> | void;
}

export const ArtisanNotificationsView: React.FC<ArtisanNotificationsViewProps> = ({
  notifications,
  onNavigateTab,
  artisanRef,
  onRespondConsent,
  onDeleteProduct,
  onMarkRead,
}) => {
  const { isRTL, t } = useI18n();
  const [filter, setFilter] = useState<"all" | "orders" | "disputes" | "wallet">("all");
  const [reportTarget, setReportTarget] = useState<any | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [inspectedVendor, setInspectedVendor] = useState<{ name: string; status: string; warnings: number } | null>(null);

  const filteredNotifications = notifications.filter(n => {
    if (filter === "orders") {
      return [
        "new_order", "urgent_order", "order_prep", "order_shipped", "order_delivered",
        "order_confirmed", "order_cancelled", "secondary_vendor_started_work", "template_started_by_vendor",
        "republication_consent_request", "republication_consent_accepted", "republication_consent_refused",
        "republication_consent_withdrawn", "quote_accepted", "private_custom_request", "custom_request_closed"
      ].includes(n.type);
    }
    if (filter === "disputes") return n.type === "dispute" || n.type === "return";
    if (filter === "wallet") return n.type === "escrow_released" || n.type === "withdrawal";
    return true;
  });

  const getBadge = (type: string) => {
    switch (type) {
      case "republication_consent_request":
        return { label: isRTL ? "مطلوب موافقة" : "ACCORD REQUIS", bg: "rgba(212, 175, 55, 0.2)", color: "#8B6914" };
      case "republication_consent_accepted":
        return { label: isRTL ? "تم القبول والنشر" : "ACCEPTÉE · PUBLIÉ", bg: "rgba(45, 106, 79, 0.16)", color: "#2D6A4F" };
      case "republication_consent_refused":
        return { label: isRTL ? "مرفوض" : "REFUSÉE", bg: "rgba(220, 53, 69, 0.14)", color: "#DC3545" };
      case "republication_consent_withdrawn":
        return { label: isRTL ? "سحب الموافقة" : "RETRAIT ACCORD", bg: "rgba(220, 53, 69, 0.16)", color: "#DC3545" };
      case "private_custom_request":
      case "quote_accepted":
        return { label: isRTL ? "طلب خاص" : "SUR-MESURE", bg: "rgba(212, 175, 55, 0.18)", color: "#8B6914" };
      case "custom_request_closed":
        return { label: isRTL ? "أغلق الطلب" : "CLÔTURÉ", bg: "rgba(107, 114, 128, 0.14)", color: "#4B5563" };
      case "template_started_by_vendor":
      case "secondary_vendor_started_work":
        return { label: isRTL ? "تفويض بالماركت" : "DÉLÉGATION", bg: "rgba(212, 175, 55, 0.18)", color: "#B8623F" };
      case "urgent_order":
        return { label: isRTL ? "مهلة حرجة" : "URGENT", bg: "rgba(220, 53, 69, 0.1)", color: "#DC3545" };
      case "order_cancelled":
        return { label: isRTL ? "إلغاء الطلب" : "ANNULÉ", bg: "rgba(220, 53, 69, 0.1)", color: "#DC3545" };
      case "new_order":
        return { label: isRTL ? "طلب جديد" : "NOUVEAU", bg: "rgba(204, 119, 85, 0.12)", color: "var(--accent-warm)" };
      case "order_prep":
        return { label: isRTL ? "في الورشة" : "EN ATELIER", bg: "rgba(212, 175, 55, 0.15)", color: "#A87A18" };
      case "order_shipped":
        return { label: isRTL ? "الشحن" : "EXPÉDITION", bg: "rgba(45, 106, 79, 0.1)", color: "#2D6A4F" };
      case "order_delivered":
        return { label: isRTL ? "تم التسليم" : "LIVRÉ", bg: "rgba(45, 106, 79, 0.12)", color: "#2D6A4F" };
      case "order_confirmed":
        return { label: isRTL ? "مؤكد" : "CONFIRMÉ", bg: "rgba(45, 106, 79, 0.15)", color: "#2D6A4F" };
      case "escrow_released":
        return { label: isRTL ? "رصيد متاح" : "DÉBLOQUÉ", bg: "rgba(45, 106, 79, 0.15)", color: "#2D6A4F" };
      case "dispute":
        return { label: isRTL ? "شكوى" : "LITIGE", bg: "rgba(220, 53, 69, 0.12)", color: "#DC3545" };
      case "return":
        return { label: isRTL ? "إرجاع" : "RETOUR", bg: "rgba(184, 115, 51, 0.12)", color: "var(--accent-warm)" };
      case "withdrawal":
        return { label: isRTL ? "تحويل بنكي" : "VIREMENT", bg: "rgba(45, 106, 79, 0.12)", color: "#2D6A4F" };
      default:
        return { label: isRTL ? "إشعار" : "INFO", bg: "rgba(26, 42, 58, 0.08)", color: "var(--primary)" };
    }
  };

  const handleInspectVendor = async (vendorId: string, vendorName?: string) => {
    try {
      const res = await fetch(`${getBackendUrl()}/artisan/vendor/${encodeURIComponent(vendorId)}/profile`);
      const data = await res.json();
      setInspectedVendor({
        name: vendorName || vendorId,
        status: data?.profile?.suspensionStatus || "active",
        warnings: Number(data?.profile?.warningCountCurrentMonth || 0),
      });
    } catch {
      setFeedbackBanner({ type: "error", text: "Impossible de charger le profil du Maâlem." });
    }
  };

  const categories = [
    { id: "all", label: t("notif_filter_all") },
    { id: "orders", label: t("notif_filter_orders") },
    { id: "disputes", label: t("notif_filter_disputes") },
    { id: "wallet", label: t("notif_filter_wallet") },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header Info */}
      <div className="artisan-card" style={{ padding: "14px 16px" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--primary)", margin: "0 0 3px 0" }}>
          {t("notif_center_title")}
        </h3>
        <p style={{ fontSize: 11.5, color: "var(--text-secondary)", margin: 0 }}>
          {t("notif_center_sub")}
        </p>
      </div>

      {feedbackBanner && (
        <div style={{
          padding: "10px 12px",
          borderRadius: 12,
          fontSize: 11.5,
          fontWeight: 700,
          background: feedbackBanner.type === "success" ? "rgba(45,106,79,0.1)" : "rgba(220,53,69,0.1)",
          color: feedbackBanner.type === "success" ? "#2D6A4F" : "#DC2626",
          border: `1px solid ${feedbackBanner.type === "success" ? "rgba(45,106,79,0.3)" : "rgba(220,53,69,0.3)"}`,
        }}>
          {feedbackBanner.text}
        </div>
      )}

      {inspectedVendor && (
        <div style={{
          padding: "10px 12px",
          borderRadius: 12,
          background: "rgba(26,42,58,0.05)",
          border: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
        }}>
          <div>
            <strong>{inspectedVendor.name}</strong> · Statut : <span style={{ color: "#2D6A4F", fontWeight: 700 }}>{inspectedVendor.status}</span> · Avertissements : {inspectedVendor.warnings}
          </div>
          <button onClick={() => setInspectedVendor(null)} style={{ border: "none", background: "none", cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Category Filter Pills */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id as any)}
            className={`pill-tab ${filter === cat.id ? "active" : ""}`}
            style={{ padding: "6px 12px", fontSize: 11, whiteSpace: "nowrap" }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="artisan-card" style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-secondary)" }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{t("notif_empty")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredNotifications.map((n) => {
            const badge = getBadge(n.type);
            const displayTitle = isRTL ? (n.title_ar || n.title) : (n.title_fr || n.title);
            const displayMessage = isRTL ? (n.message_ar || n.message) : (n.message_fr || n.message);
            const consentStatus = n.actionStatus || n.metadata?.consentStatus || null;
            const targetOrderId = n.metadata?.orderId || n.orderId || n.sourceId;
            const isConsentPending = n.type === "republication_consent_request" && (!consentStatus || consentStatus === "pending");
            const draftPreview = n.metadata?.draftPreview;

            return (
              <div
                key={n.id}
                onClick={() => {
                  if (onMarkRead && !n.read) onMarkRead(n.id);
                  if (n.type !== "republication_consent_request" && n.type !== "republication_consent_withdrawn") {
                    onNavigateTab(n.linkTab);
                  }
                }}
                className="artisan-card"
                style={{
                  cursor: "pointer",
                  padding: 14,
                  borderInlineStart: !n.read ? "3.5px solid var(--accent-warm)" : "1px solid var(--border)",
                  background: !n.read ? "linear-gradient(135deg, rgba(204,119,85,0.04), var(--surface))" : "var(--surface)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.03em",
                      background: badge.bg,
                      color: badge.color,
                    }}>
                      {badge.label}
                    </span>
                    <h4 style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--primary)", margin: 0 }}>
                      {displayTitle}
                    </h4>
                  </div>
                  <span style={{ fontSize: 10, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {new Date(n.date).toLocaleTimeString(isRTL ? "ar-MA" : "fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                {draftPreview && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: "rgba(212, 175, 55, 0.08)",
                    border: "1px solid rgba(212, 175, 55, 0.25)",
                    marginBottom: 8,
                  }}>
                    {draftPreview.image && (
                      <img src={draftPreview.image} alt={draftPreview.title} style={{ width: 42, height: 42, borderRadius: 8, objectFit: "cover" }} />
                    )}
                    <div style={{ fontSize: 11 }}>
                      <div style={{ fontWeight: 800, color: "var(--primary)" }}>{draftPreview.title}</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>
                        {draftPreview.category} · {draftPreview.price} MAD
                      </div>
                    </div>
                  </div>
                )}

                <p style={{ fontSize: 11.5, color: "var(--text-secondary)", margin: "0 0 8px", lineHeight: 1.5 }}>
                  {displayMessage}
                </p>

                {/* Diagramme 5 : Boutons Accepter / Refuser pour le Vendeur de Base (VB) */}
                {n.type === "republication_consent_request" && targetOrderId && (
                  <div style={{ marginTop: 8, marginBottom: 6 }} onClick={(e) => e.stopPropagation()}>
                    {isConsentPending && onRespondConsent ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          disabled={busyKey === `${targetOrderId}:accept`}
                          onClick={async () => {
                            setBusyKey(`${targetOrderId}:accept`);
                            try {
                              await onRespondConsent(targetOrderId, "accept");
                              setFeedbackBanner({ type: "success", text: isRTL ? "تم تسجيل موافقتك بنجاح." : "Votre accord de vendeur de base a été enregistré." });
                            } catch (err: any) {
                              setFeedbackBanner({ type: "error", text: err.message });
                            } finally {
                              setBusyKey(null);
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "none",
                            background: "#2D6A4F",
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                            cursor: "pointer",
                          }}
                        >
                          <CheckCircle2 size={13} />
                          {isRTL ? "قبول" : "Accepter"}
                        </button>
                        <button
                          type="button"
                          disabled={busyKey === `${targetOrderId}:refuse`}
                          onClick={async () => {
                            setBusyKey(`${targetOrderId}:refuse`);
                            try {
                              await onRespondConsent(targetOrderId, "refuse");
                              setFeedbackBanner({ type: "success", text: isRTL ? "تم تسجيل رفضك. لن يتم نشر المنشور." : "Refus enregistré. La publication a été bloquée." });
                            } catch (err: any) {
                              setFeedbackBanner({ type: "error", text: err.message });
                            } finally {
                              setBusyKey(null);
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(220, 53, 69, 0.35)",
                            background: "rgba(220, 53, 69, 0.08)",
                            color: "#DC2626",
                            fontSize: 11,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                            cursor: "pointer",
                          }}
                        >
                          <XCircle size={13} />
                          {isRTL ? "رفض" : "Refuser"}
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: consentStatus === "accepted" ? "#2D6A4F" : "#DC2626" }}>
                        {consentStatus === "accepted"
                          ? (isRTL ? "✓ لقد وافقت على هذا النشر" : "✓ Accord validé par vos soins")
                          : (isRTL ? "✕ تم رفض الطلب" : "✕ Demande refusée")}
                      </div>
                    )}
                  </div>
                )}

                {/* Action rapide : Supprimer le post en cas de Retrait de l'accord */}
                {n.type === "republication_consent_withdrawn" && (n.metadata?.productId || n.sourceId) && onDeleteProduct && (
                  <div style={{ marginTop: 8, marginBottom: 6 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      disabled={busyKey === `del:${n.metadata?.productId || n.sourceId}`}
                      onClick={async () => {
                        const pid = n.metadata?.productId || n.sourceId!;
                        setBusyKey(`del:${pid}`);
                        try {
                          await onDeleteProduct(pid);
                          setFeedbackBanner({ type: "success", text: isRTL ? "تم حذف المنشور بنجاح." : "Post supprimé du catalogue. Les commandes en cours restent intactes." });
                        } catch (err: any) {
                          setFeedbackBanner({ type: "error", text: err.message });
                        } finally {
                          setBusyKey(null);
                        }
                      }}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 10,
                        border: "none",
                        background: "#DC2626",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={13} />
                      {isRTL ? "حذف المنشور الآن" : "Supprimer le post maintenant"}
                    </button>
                  </div>
                )}

                {/* Actions spécifiques pour délégation ou lien de profil */}
                {n.secondaryUserId && n.type !== "republication_consent_request" && n.type !== "republication_consent_withdrawn" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 8, marginBottom: 8 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleInspectVendor(n.secondaryUserId!, n.secondaryUserName)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 8,
                        background: "rgba(26, 42, 58, 0.08)",
                        border: "1px solid var(--border)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--primary)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <UserCheck size={11} />
                      {isRTL ? "معاينة بروفايل الصانع" : "Profil du Maâlem"}
                    </button>

                    <button
                      onClick={() => {
                        setReportTarget({
                          targetId: n.sourceId || n.secondaryUserId,
                          targetTitle: `Artisan (${n.secondaryUserName || n.secondaryUserId})`,
                          targetOwnerId: n.secondaryUserId,
                        });
                      }}
                      style={{
                        padding: "5px 8px",
                        borderRadius: 8,
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.25)",
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#DC2626",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Flag size={11} />
                      {isRTL ? "إبلاغ" : "Signaler"}
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, fontSize: 10, color: "var(--accent-warm)", fontWeight: 700 }}>
                  <span>{t("notif_view_file")}</span>
                  <ChevronRight size={12} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reportTarget && (
        <ReportModal
          isOpen={Boolean(reportTarget)}
          onClose={() => setReportTarget(null)}
          targetType="product"
          targetId={reportTarget.targetId}
          targetTitle={reportTarget.targetTitle}
          targetOwnerId={reportTarget.targetOwnerId}
          reporterType="artisan"
          reporterId={artisanRef}
        />
      )}
    </div>
  );
};
