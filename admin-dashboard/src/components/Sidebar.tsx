import React from "react";
import { 
  LayoutDashboard, 
  Scale, 
  ShieldAlert, 
  Wallet, 
  Truck, 
  Clock, 
  Award,
  ChevronRight
} from "lucide-react";

export type AdminTab = "overview" | "disputes" | "vendors" | "escrow" | "logistics" | "cron";

interface SidebarProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  openDisputesCount: number;
  warningsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  onTabChange, 
  openDisputesCount, 
  warningsCount 
}) => {
  const navItems = [
    { id: "overview", label: "Vue d'Ensemble", icon: LayoutDashboard },
    { id: "disputes", label: "Médiation & Litiges", icon: Scale, badge: openDisputesCount, badgeColor: "#DC3545" },
    { id: "vendors", label: "Santé des Maâlems", icon: ShieldAlert, badge: warningsCount > 0 ? warningsCount : undefined, badgeColor: "#8B6914" },
    { id: "escrow", label: "Séquestre & Retraits", icon: Wallet },
    { id: "logistics", label: "Suivi Logistique", icon: Truck },
    { id: "cron", label: "Moteur de Cron Jobs", icon: Clock },
  ];

  return (
    <aside style={{
      width: 260,
      background: "rgba(17, 24, 39, 0.95)",
      backdropFilter: "blur(16px)",
      borderRight: "1px solid var(--border-color)",
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "fixed",
      top: 0,
      left: 0,
      zIndex: 50,
      padding: "24px 16px",
    }}>
      {/* Brand Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingLeft: 8, marginBottom: 32 }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "linear-gradient(135deg, #C4A96A 0%, #8B6914 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(196, 169, 106, 0.3)"
        }}>
          <Award size={22} color="#FFFFFF" />
        </div>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "var(--primary-gold)", letterSpacing: 0.5, margin: 0 }}>
            VORK ADMIN
          </h1>
          <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0, fontWeight: 600 }}>
            Médiation & Supervision CGV
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as AdminTab)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 14px",
                borderRadius: 12,
                border: "none",
                background: isActive ? "linear-gradient(135deg, rgba(196, 169, 106, 0.15) 0%, rgba(139, 105, 20, 0.05) 100%)" : "transparent",
                borderLeft: isActive ? "3.5px solid var(--primary-gold)" : "3.5px solid transparent",
                color: isActive ? "var(--primary-gold)" : "var(--text-secondary)",
                fontFamily: "var(--font-display)",
                fontWeight: isActive ? 700 : 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s ease",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon size={18} color={isActive ? "var(--primary-gold)" : "var(--text-muted)"} />
                <span>{item.label}</span>
              </div>
              
              {item.badge !== undefined && item.badge > 0 ? (
                <span style={{
                  background: item.badgeColor || "var(--primary-gold)",
                  color: "#FFFFFF",
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 7px",
                  borderRadius: 10,
                }}>
                  {item.badge}
                </span>
              ) : (
                <ChevronRight size={14} style={{ opacity: isActive ? 0.8 : 0.2 }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={{
        padding: 12,
        borderRadius: 12,
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid var(--border-color)",
        fontSize: 10,
        color: "var(--text-muted)",
        textAlign: "center"
      }}>
        <p style={{ margin: "0 0 2px", fontWeight: 700, color: "var(--text-main)" }}>Plateforme Vork v2.0</p>
        <p style={{ margin: 0 }}>Conforme CGV 26 Pages</p>
      </div>
    </aside>
  );
};
