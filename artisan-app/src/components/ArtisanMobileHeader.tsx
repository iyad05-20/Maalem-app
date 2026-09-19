import React from "react";
import { Bell, RefreshCw } from "lucide-react";
import { useI18n } from "../services/i18n";

interface ArtisanMobileHeaderProps {
  title: string;
  onRefresh: () => void;
  onOpenNotifications: () => void;
  unreadNotifsCount: number;
  loading: boolean;
  shopStatus?: string;
  warningCount?: number;
}

export const ArtisanMobileHeader: React.FC<ArtisanMobileHeaderProps> = ({
  title,
  onRefresh,
  onOpenNotifications,
  unreadNotifsCount,
  loading,
  shopStatus = "active",
}) => {
  const { lang, isRTL, changeLanguage, t } = useI18n();

  return (
    <>
      <div className="app-header">
        {/* Brand — identical to client HomeView */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="brand-logo">MAÂLEM</span>
            <span style={{
              background: "var(--accent-warm)",
              color: "#FFF",
              fontFamily: "var(--font-display)",
              fontSize: 9,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 10,
              letterSpacing: "0.5px",
            }}>
              PRO
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 1, display: "flex", alignItems: "center", gap: 6 }}>
            <span>{title}</span>
            {shopStatus !== "active" && (
              <span className="badge badge-warning" style={{ fontSize: 8, padding: "2px 6px" }}>
                {shopStatus === "paused" ? t("header_vacation_paused") : shopStatus}
              </span>
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="header-actions">
          {/* Language Toggle FR / AR */}
          <button 
            className="pill-tab"
            style={{ 
              padding: "4px 8px", 
              fontSize: 10, 
              fontWeight: 800, 
              background: "rgba(184,98,63,0.1)", 
              color: "var(--accent-warm)",
              border: "1px solid rgba(184,98,63,0.3)",
              cursor: "pointer",
              borderRadius: 8
            }}
            onClick={() => changeLanguage(lang === "ar" ? "fr" : "ar")}
            title={isRTL ? "تغيير اللغة (العربية / Français)" : "Changer de langue (العربية / Français)"}
          >
            {lang === "ar" ? "Français" : "العربية"}
          </button>

          <button className="icon-btn" onClick={onOpenNotifications} title={t("header_notifications")}>
            <Bell size={18} color="var(--text-secondary)" />
            {unreadNotifsCount > 0 && (
              <span className="notif-count">{unreadNotifsCount}</span>
            )}
          </button>
          <button className="icon-btn" onClick={onRefresh} disabled={loading} title={t("header_refresh")}>
            <RefreshCw size={16} color="var(--text-secondary)" style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
};
