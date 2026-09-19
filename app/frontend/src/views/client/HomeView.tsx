import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { ProductCard } from '../../components/Shared/ProductCard';
import { HeroCard } from '../../components/Shared/HeroCard';
import { ChapterHeader } from '../../components/Home/ChapterHeader';
import { PromoBanner } from '../../components/Home/PromoBanner';
import { DuoSpotlight } from '../../components/Home/DuoSpotlight';
import { OccasionsModule } from '../../components/Home/OccasionsModule';
import { ArtisanCard } from '../../components/Home/ArtisanCard';
import { ArtisanAtelierModal } from '../../components/Home/ArtisanAtelierModal';
import type { Product, HeroData, ArtisanProfile, PromoData, View } from '../../types';
import { useClientI18n } from '../../services/i18n';

interface HomeViewProps {
  hero: HeroData;
  trending: Product[];
  aiPicks: Product[];
  premium: Product[];
  duoSpotlight?: Product[];
  duoMaalem?: Product[];
  regionFes?: Product[];
  occasionsData?: {
    cadeaux: Product[];
    maison: Product[];
    cuisine: Product[];
  };
  featuredArtisan?: ArtisanProfile;
  promoData?: PromoData;
  onNavigate: (view: View) => void;
  onSelectProduct?: (product: Product) => void;
  onRefreshFeed?: () => Promise<void>;
  recResponseState?: any;
  favoritesList?: string[];
  onToggleFavorite?: (product: Product) => void;
  onSeeAllRecs?: () => void;
  onOpenNotifications?: () => void;
  hasUnreadNotifications?: boolean;
}

// ─── Horizontal Product Row with Focus Scaling ─────────────────────────────
const ProductRow: React.FC<{
  products: Product[];
  onSelectProduct?: (p: Product) => void;
  favoritesList?: string[];
  onToggleFavorite?: (product: Product) => void;
}> = ({
  products,
  onSelectProduct,
  favoritesList = [],
  onToggleFavorite,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const updateFocus = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerCenter = container.scrollLeft + container.offsetWidth / 2;
    const cards = container.querySelectorAll<HTMLElement>('.product-card');

    cards.forEach(card => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(containerCenter - cardCenter);
      const maxDist = container.offsetWidth / 2;
      const scale = Math.max(0.95, 1 - (distance / maxDist) * 0.05);
      card.style.transform = `scale(${scale})`;
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateFocus);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    updateFocus();
    return () => {
      container.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [updateFocus]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollLeft = 0;
      updateFocus();
    }
  }, [products, updateFocus]);

  return (
    <div className="scroll-container" ref={containerRef}>
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={onSelectProduct}
          isFavorite={favoritesList.includes(product.id)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
      <div style={{ flexShrink: 0, width: 12 }} />
    </div>
  );
};

// ─── Main HomeView (3-Chapter Editorial Magazine) ───────────────────────────
export const HomeView: React.FC<HomeViewProps> = ({
  hero,
  trending,
  aiPicks,
  premium,
  duoSpotlight = [],
  duoMaalem = [],
  regionFes = [],
  occasionsData = { cadeaux: [], maison: [], cuisine: [] },
  featuredArtisan,
  promoData,
  onNavigate,
  onSelectProduct,
  onRefreshFeed,
  recResponseState,
  favoritesList = [],
  onToggleFavorite,
  onSeeAllRecs,
  onOpenNotifications,
  hasUnreadNotifications = false,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isAtelierModalOpen, setIsAtelierModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { lang, changeLanguage, t } = useClientI18n();

  // Profile Maturity & Exploration Strategy Metadata
  const sectionState = recResponseState?.sectionState || 'hidden';
  const sectionTitle = recResponseState?.sectionTitle || (sectionState === 'personalized' ? t('home_for_you') : sectionState === 'discovery' ? t('home_discover_craft') : null);
  const highestTagScore = recResponseState?.highestTagScore || 0;
  const activeTagsCount = recResponseState?.activeTagsCount || 0;

  const handleSwiftRefresh = async () => {
    if (!onRefreshFeed || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefreshFeed();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const rafRef = useRef<number>(0);

  // Track vertical scroll for Hero scale
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setScrollY(el.scrollTop));
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // IntersectionObserver for soft scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.08 }
    );

    sectionRefs.current.forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const setSectionRef = (i: number) => (el: HTMLElement | null) => {
    sectionRefs.current[i] = el;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="app-view"
      ref={scrollRef}
    >
      {/* ─── HEADER ───────────────────────────────────────────────────────── */}
      <header className="app-header">
        <h1 className="brand-logo">MAALEM</h1>
        <div className="header-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Language Toggle Button */}
          <button
            className="pill-tab"
            style={{
              padding: "4px 8px",
              fontSize: 10,
              fontWeight: 800,
              background: "rgba(196,169,106,0.18)",
              color: "#1A2A3A",
              border: "1px solid rgba(196,169,106,0.45)",
              borderRadius: 8,
              cursor: "pointer",
            }}
            onClick={() => changeLanguage(lang === "ar" ? "fr" : "ar")}
            title="Changer de langue (العربية / Français)"
          >
            {lang === "ar" ? "Français" : "العربية"}
          </button>

          <button className="icon-btn" aria-label="Notifications" onClick={onOpenNotifications} style={{ position: "relative" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {hasUnreadNotifications && (
              <span style={{ position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: "50%", background: "#DC3545", border: "2px solid #fff" }} />
            )}
          </button>
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"
            alt="Mon profil"
            className="user-avatar"
            onClick={() => onNavigate('profile')}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </header>

      {/* ─── SEARCH BAR ────────────────────────────────────────────────────── */}
      <section className="search-wrapper">
        <motion.div
          layoutId="search-container-transition"
          className="search-container"
          onClick={() => onNavigate('search')}
          style={{ cursor: 'pointer' }}
        >
          <svg className="search-icon-left" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder={t('home_search_placeholder')}
            readOnly
            style={{ pointerEvents: 'none' }}
            aria-label="Recherche"
          />
        </motion.div>
      </section>

      {/* ─── HERO CARD (~1/3 écran, pièce centrale) ────────────────────────── */}
      <HeroCard hero={hero} scrollY={scrollY} />

      {/* Respiration post-Hero généreuse */}
      <div className="hero-spacer" />

      {/* ====================================================================
         CHAPITRE 1 — INTELLIGENCE ET DÉCOUVERTE (Fond Blanc Pur #FFFFFF)
         ==================================================================== */}
      <section className="home-chapter chapter-1" ref={setSectionRef(0)}>
        <div className="chapter-content-inner">
          {/* Status Indicator & Swift Refresh */}
          <div className="maturity-switch-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: '0.78rem', color: '#4A5568', background: 'rgba(235, 230, 220, 0.5)', padding: '5px 12px', borderRadius: 12 }}>
              📊 {t('home_score_max')}: <strong>{highestTagScore.toFixed(1)}</strong> | {t('home_tags_count')}: <strong>{activeTagsCount}</strong> | {t('home_mode')}: <strong>{sectionState.toUpperCase()}</strong>
            </div>

            <button
              onClick={handleSwiftRefresh}
              disabled={isRefreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, rgba(196, 169, 106, 0.15), rgba(26, 42, 58, 0.08))',
                border: '1px solid rgba(196, 169, 106, 0.35)',
                borderRadius: 14,
                padding: '5px 12px',
                color: '#1A2A3A',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: isRefreshing ? 'wait' : 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ display: 'inline-block', transform: isRefreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s ease' }}>
                ✦
              </span>
              {isRefreshing ? t('home_recalc_ai') : t('home_swift_refresh')}
            </button>
          </div>

          {/* Conditional Personalized / Discovery Rail (Hidden in Cold Start < 3) */}
          {sectionState !== 'hidden' && (
            <div style={{ marginBottom: 28 }}>
              <ChapterHeader
                title={sectionTitle || t('home_discover_craft')}
                subtitle={sectionState === 'personalized' ? t('home_for_you_sub') : t('home_discover_craft_sub')}
                hasAccentBar={sectionState === 'personalized'}
                linkLabel={sectionState === 'personalized' ? t('see_all') : t('explore')}
                onLinkClick={onSeeAllRecs}
              />
              <ProductRow
                products={aiPicks.slice(0, 10)}
                onSelectProduct={onSelectProduct}
                favoritesList={favoritesList}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          )}

          {/* Rail 2: "Tendances actuelles" (Always visible) */}
          <div>
            <ChapterHeader
              title={t('home_trending')}
              subtitle={t('home_trending_sub')}
              linkLabel={t('see_all')}
            />
            <ProductRow
              products={trending}
              onSelectProduct={onSelectProduct}
              favoritesList={favoritesList}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        </div>
      </section>

      {/* ====================================================================
         CHAPITRE 2 — À DÉCOUVRIR (Fond Beige Clair #F6F4EE)
         Rupture de rythme, découverte, événementiel
         ==================================================================== */}
      <section className="home-chapter chapter-2" ref={setSectionRef(1)}>
        <div className="chapter-content-inner">
          {/* Transition 1 au début du Chapitre 2 */}
          <div className="inspiring-transition" style={{ paddingTop: 8, paddingBottom: 20 }}>
            <p className="inspiring-phrase">
              {t('home_quote_inspire')}
            </p>
          </div>

          {/* Module Promotion (Bandeau événementiel pleine largeur) */}
          {promoData && (
            <div className="promo-banner-wrapper">
              <PromoBanner promo={promoData} onExplore={() => onNavigate('search')} />
            </div>
          )}

          {/* Duo Spotlight (2 grandes cartes côte à côte - Éditions limitées) */}
          <div className="duo-spotlight-wrapper">
            <ChapterHeader
              title={t('home_limited_editions')}
              subtitle={t('home_limited_editions_sub')}
            />
            <DuoSpotlight
              products={duoSpotlight.length > 0 ? duoSpotlight : premium.slice(0, 2)}
              onSelectProduct={onSelectProduct}
              badgeTag={t('home_limited_badge')}
            />
          </div>

          {/* Module "Occasions" (1 composant avec 3 onglets Cadeaux / Maison / Cuisine) */}
          <div className="occasions-wrapper" style={{ marginBottom: 12 }}>
            <ChapterHeader
              title={t('home_by_occasion')}
              subtitle={t('home_by_occasion_sub')}
            />
            <OccasionsModule
              occasionsData={occasionsData}
              onSelectProduct={onSelectProduct}
              favoritesList={favoritesList}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        </div>
      </section>

      {/* ====================================================================
         CHAPITRE 3 — L'HÉRITAGE MAROCAIN (Fond Blanc + Pattern Géométrique Zellige)
         Dimension émotionnelle & humaine
         ==================================================================== */}
      <section className="home-chapter chapter-3" ref={setSectionRef(2)}>
        {/* Discrete Zellige Watermark Patterns in corners */}
        <div className="chapter-3-corner-pattern chapter-3-top-right" />
        <div className="chapter-3-corner-pattern chapter-3-bottom-left" />

        <div className="chapter-content-inner">
          {/* Transition 2 au début du Chapitre 3 */}
          <div className="editorial-divider-wrap" style={{ paddingTop: 8, paddingBottom: 20 }}>
            <div className="editorial-divider-line">
              <div className="editorial-line" />
              <h4 className="editorial-divider-title">{t('home_soul_craft')}</h4>
              <div className="editorial-line" />
            </div>
          </div>

          {/* Module 1: Région mise à l'honneur (Les trésors de Fès) */}
          <div style={{ marginBottom: 28 }}>
            <ChapterHeader
              title={t('home_fes_treasures')}
              subtitle={t('home_city_honored')}
              discreetBadge={t('home_region_honored')}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              }
              linkLabel={t('home_explore_fes')}
            />
            <ProductRow
              products={regionFes.length > 0 ? regionFes : trending}
              onSelectProduct={onSelectProduct}
              favoritesList={favoritesList}
              onToggleFavorite={onToggleFavorite}
            />
          </div>

          {/* Module 2: Artisan Sélectionné (Carte Éditoriale Humaine) */}
          {featuredArtisan && (
            <div className="artisan-card-wrapper">
              <ChapterHeader
                title={t('home_artisan_month')}
                subtitle={t('home_artisan_month_sub')}
              />
              <ArtisanCard
                artisan={featuredArtisan}
                onOpenAtelier={() => setIsAtelierModalOpen(true)}
              />
            </div>
          )}

          {/* Module 3: Sélection MAALEM (Duo Spotlight Éditorial) */}
          <div className="duo-spotlight-wrapper" style={{ marginBottom: 0 }}>
            <ChapterHeader
              title={lang === 'ar' ? 'مختارات معلم الفاخرة' : 'Sélection MAALEM'}
              subtitle={lang === 'ar' ? 'إبداعات مختارة بعناية من فريقنا' : 'Des créations choisies par notre équipe éditoriale'}
            />
            <DuoSpotlight
              products={duoMaalem.length > 0 ? duoMaalem : premium.slice(2, 4)}
              onSelectProduct={onSelectProduct}
              badgeTag={lang === 'ar' ? 'مختارات معلم' : 'Sélection MAALEM'}
            />
          </div>
        </div>
      </section>

      {/* Modal / Drawer Immersion Atelier du Maâlem */}
      {featuredArtisan && (
        <ArtisanAtelierModal
          isOpen={isAtelierModalOpen}
          onClose={() => setIsAtelierModalOpen(false)}
          artisan={featuredArtisan}
        />
      )}
    </motion.div>
  );
};
