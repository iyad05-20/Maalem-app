import React, { useRef, useEffect, useState } from "react";
import { Home, ShoppingBag, Layers, User, Plus } from "lucide-react";
import { useI18n } from "../services/i18n";

export type MobileArtisanTab = "home" | "market" | "create" | "posts" | "profile";

interface ArtisanBottomNavProps {
  currentTab: MobileArtisanTab;
  onTabChange: (tab: MobileArtisanTab) => void;
  pendingOrdersCount?: number;
  openDisputesCount?: number;
  returnsCount?: number;
}

const NAV_TABS: { id: MobileArtisanTab; label: string }[] = [
  { id: "home",    label: "Atelier" },
  { id: "market",  label: "Marché" },
  { id: "posts",   label: "Mes Posts" },
  { id: "profile", label: "Profil" },
];

export const ArtisanBottomNav: React.FC<ArtisanBottomNavProps> = ({
  currentTab,
  onTabChange,
  pendingOrdersCount = 0,
  openDisputesCount = 0,
  returnsCount = 0,
}) => {
  const navRef = useRef<HTMLDivElement>(null);
  const capsuleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const capsule = capsuleRef.current;
    if (!nav || !capsule) return;
    if (currentTab === "create") return;

    // Map to DOM slot (center button is slot 2)
    const tabToSlot: Record<string, number> = { home: 0, market: 1, posts: 3, profile: 4 };
    const domIndex = tabToSlot[currentTab];
    if (domIndex === undefined) return;

    const items = nav.querySelectorAll<HTMLElement>(".nav-item, .nav-item-center");
    const target = items[domIndex];
    if (!target) return;

    const navRect = nav.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    capsule.style.left = `${targetRect.left - navRect.left - 6}px`;
    capsule.style.width = `${targetRect.width + 12}px`;
  }, [currentTab]);

  const { t } = useI18n();
  const totalBadge = pendingOrdersCount + openDisputesCount + returnsCount;

  return (
    <div className="nav-bar-container">
      <div className="floating-nav" ref={navRef}>
        <div className="nav-capsule" ref={capsuleRef} />

        {/* Atelier (Home) */}
        <button
          className={`nav-item ${currentTab === "home" ? "active" : ""}`}
          onClick={() => onTabChange("home")}
        >
          <div style={{ position: "relative" }}>
            <Home size={22} strokeWidth={currentTab === "home" ? 2.5 : 1.8} />
            {pendingOrdersCount > 0 && (
              <span className="notif-count" style={{ top: -4, right: -8 }}>{pendingOrdersCount}</span>
            )}
          </div>
          <span className="nav-label">{t("nav_home")}</span>
        </button>

        {/* Marché */}
        <button
          className={`nav-item ${currentTab === "market" ? "active" : ""}`}
          onClick={() => onTabChange("market")}
        >
          <ShoppingBag size={22} strokeWidth={currentTab === "market" ? 2.5 : 1.8} />
          <span className="nav-label">{t("nav_market")}</span>
        </button>

        {/* Centre — Publier (+ button, terracotta) */}
        <button className="nav-item-center" onClick={() => onTabChange("create")}>
          <div className="nav-center-btn">
            <Plus size={24} strokeWidth={2.5} />
          </div>
          <span className="nav-label" style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 2 }}>{t("nav_create")}</span>
        </button>

        {/* Mes Posts */}
        <button
          className={`nav-item ${currentTab === "posts" ? "active" : ""}`}
          onClick={() => onTabChange("posts")}
        >
          <Layers size={22} strokeWidth={currentTab === "posts" ? 2.5 : 1.8} />
          <span className="nav-label">{t("nav_posts")}</span>
        </button>

        {/* Profil */}
        <button
          className={`nav-item ${currentTab === "profile" ? "active" : ""}`}
          onClick={() => onTabChange("profile")}
        >
          <div style={{ position: "relative" }}>
            <User size={22} strokeWidth={currentTab === "profile" ? 2.5 : 1.8} />
            {totalBadge > 0 && <span className="notif-dot" />}
          </div>
          <span className="nav-label">{t("nav_profile")}</span>
        </button>
      </div>
    </div>
  );
};
