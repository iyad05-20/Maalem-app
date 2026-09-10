import React, { useState } from "react";
import { Bell, Package, Scale, RotateCcw, Wallet, CheckCircle2, ChevronRight, Clock, Truck } from "lucide-react";
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
      return ["new_order", "urgent_order", "order_prep", "order_shipped", "order_delivered", "order_confirmed"].includes(n.type);
    }
    if (filter === "disputes") return n.type === "dispute" || n.type === "return";
    if (filter === "wallet") return n.type === "escrow_released" || n.type === "withdrawal";
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "new_order": return <Package size={18} color="var(--accent-warm)" />;
      case "urgent_order": return <Clock size={18} color="#DC3545" />;
      case "order_prep": return <Package size={18} color="var(--accent-warm)" />;
      case "order_shipped": return <Truck size={18} color="#2D6A4F" />;
      case "order_delivered": return <CheckCircle2 size={18} color="#2D6A4F" />;
      case "order_confirmed": return <CheckCircle2 size={18} color="#2D6A4F" />;
      case "dispute": return <Scale size={18} color="#DC3545" />;
      case "return": return <RotateCcw size={18} color="var(--accent-premium)" />;
      case "escrow_released": return <Wallet size={18} color="#2D6A4F" />;
      case "withdrawal": return <CheckCircle2 size={18} color="#2D6A4F" />;
      default: return <Bell size={18} color="var(--primary)" />;
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
      <div className="artisan-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "rgba(204, 119, 85, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <Bell size={20} color="var(--accent-warm)" />
        </div>
        <div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 14, color: "var(--primary)", margin: 0 }}>
            {t("notif_center_title")}
          </h3>
          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
            {t("notif_center_sub")}
          </p>
        </div>
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
          <Bell size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{t("notif_empty")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredNotifications.map((n) => (
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {getIcon(n.type)}
                  <h4 style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--primary)", margin: 0 }}>
                    {n.title}
                  </h4>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                  {new Date(n.date).toLocaleTimeString(isRTL ? "ar-MA" : "fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 8px", lineHeight: 1.4, paddingInlineStart: 26 }}>
                {n.message}
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 4, fontSize: 10, color: "var(--accent-warm)", fontWeight: 700 }}>
                <span>{t("notif_view_file")}</span>
                <ChevronRight size={12} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
