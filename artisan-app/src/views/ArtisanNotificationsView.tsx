import React, { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { ArtisanNotification } from "../types/artisanTypes";
import { useI18n } from "../services/i18n";

interface ArtisanNotificationsViewProps {
  notifications: ArtisanNotification[];
  onNavigateTab: (tab: any) => void;
}

export const ArtisanNotificationsView: React.FC<ArtisanNotificationsViewProps> = ({
  notifications,
  onNavigateTab,
}) => {
  const { isRTL, t } = useI18n();
  const [filter, setFilter] = useState<"all" | "orders" | "disputes" | "wallet">("all");

  const filteredNotifications = notifications.filter(n => {
    if (filter === "orders") {
      return ["new_order", "urgent_order", "order_prep", "order_shipped", "order_delivered", "order_confirmed", "order_cancelled"].includes(n.type);
    }
    if (filter === "disputes") return n.type === "dispute" || n.type === "return";
    if (filter === "wallet") return n.type === "escrow_released" || n.type === "withdrawal";
    return true;
  });

  const getBadge = (type: string) => {
    switch (type) {
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

            return (
              <div
                key={n.id}
                onClick={() => onNavigateTab(n.linkTab)}
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

                <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 8px", lineHeight: 1.5 }}>
                  {displayMessage}
                </p>

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, fontSize: 10, color: "var(--accent-warm)", fontWeight: 700 }}>
                  <span>{t("notif_view_file")}</span>
                  <ChevronRight size={12} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
