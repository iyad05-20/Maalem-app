import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, ArrowUpRight, SlidersHorizontal, Check } from 'lucide-react';
import { SearchProductCard } from '../../components/Shared/SearchProductCard';
import { MAALEM_DATA } from '../../data/mockData';
import type { View } from '../../types';

import { recSession } from '../../services/recommendationSession';
import { useClientI18n } from '../../services/i18n';

interface SearchViewProps {
  onNavigate: (view: View) => void;
  onSelectProduct?: (product: any) => void;
}

import { API_BASE } from '../../services/apiConfig';

// ── Static data (will be dynamic later) ──────────────────────────────────────
const RECENT_SEARCHES = ['Siniya cuivre', 'Tajine fassi', 'Tapis boucherouite'];

const AI_SUGGESTIONS = [
  { title: 'Fibule berbère traditionnelle', subtitle: 'Bijouterie · Atlas Mountains', type: 'bijou' },
  { title: 'Lanterne laiton ajouré', subtitle: 'Dinanderie · Fès', type: 'deco' },
  { title: 'Pochette velours Sirma', subtitle: 'Broderie · Édition limitée', type: 'mode' },
];

const CATEGORIES = [
  { key: 'bijouterie',  label: 'Bijouterie',  icon: '◆', color: 'rgba(212,175,55,0.08)',  border: 'rgba(212,175,55,0.2)' },
  { key: 'ceramique',  label: 'Céramique',   icon: '○', color: 'rgba(204,119,85,0.07)', border: 'rgba(204,119,85,0.2)' },
  { key: 'dinanderie', label: 'Dinanderie',  icon: '✦', color: 'rgba(156,175,136,0.08)', border: 'rgba(156,175,136,0.25)' },
  { key: 'tissage',    label: 'Tissage',     icon: '▦', color: 'rgba(26,42,58,0.06)',    border: 'rgba(26,42,58,0.15)' },
];

const COLLECTIONS = [
  { label: 'Héritage Fassi', q: 'fassi' },
  { label: 'Trésors Berbères', q: 'berbere' },
  { label: 'Noces Marocaines', q: 'mariage' },
];


const formatCategoryName = (cat: string) => {
  if (!cat) return '';
  const formatted = cat.charAt(0).toUpperCase() + cat.slice(1);
  if (formatted === 'Ceramique') return 'Céramique';
  if (formatted === 'Bijouterie') return 'Bijouterie';
  if (formatted === 'Dinanderie') return 'Dinanderie';
  if (formatted === 'Broderie') return 'Broderie';
  if (formatted === 'Tissage') return 'Tissage';
  return formatted;
};

let cachedSearchKey: string | null = null;
async function getSearchKey(): Promise<string> {
  if (cachedSearchKey) return cachedSearchKey;
  const res = await fetch(`${API_BASE}/search/key`);
  if (!res.ok) throw new Error('Search key retrieval failed');
  const data = await res.json();
  cachedSearchKey = data.searchKey;
  return cachedSearchKey!;
}

export const SearchView: React.FC<SearchViewProps> = ({ onNavigate, onSelectProduct }) => {
  const { lang, t, getCategoryLabel } = useClientI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [results, setResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableStyles, setAvailableStyles] = useState<string[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);
  const [availableColorVibes, setAvailableColorVibes] = useState<string[]>([]);
  const [availableContexts, setAvailableContexts] = useState<string[]>([]);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedColorVibes, setSelectedColorVibes] = useState<string[]>([]);
  const [selectedContexts, setSelectedContexts] = useState<string[]>([]);

  const [appliedCategories, setAppliedCategories] = useState<string[]>([]);
  const [appliedStyles, setAppliedStyles] = useState<string[]>([]);
  const [appliedMaterials, setAppliedMaterials] = useState<string[]>([]);
  const [appliedColorVibes, setAppliedColorVibes] = useState<string[]>([]);
  const [appliedContexts, setAppliedContexts] = useState<string[]>([]);

  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Auto-focus
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setSuggestions([]); return; }
    try {
      const key = await getSearchKey();
      const meiliHost = import.meta.env.VITE_MEILISEARCH_HOST || 'http://localhost:7700';
      const res = await fetch(`${meiliHost}/indexes/products/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          q: q,
          limit: 8,
          attributesToHighlight: ['title'],
          attributesToRetrieve: ['title', 'category_group']
        })
      });
      const data = await res.json();
      if (data.hits) {
        const seen = new Set();
        const suggs = [];
        for (const hit of data.hits) {
          const text = hit.title.toLowerCase();
          if (!seen.has(text)) {
            seen.add(text);
            suggs.push({ text: hit.title, type: 'product', category: hit.category_group });
          }
        }
        setSuggestions(suggs);
      }
    } catch { /* silent */ }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    if (results !== null) setResults(null);
    fetchSuggestions(q);
  };

  const performSearch = useCallback(async (
    q: string,
    filters?: {
      categories?: string[];
      styles?: string[];
      materials?: string[];
      vibes?: string[];
      contexts?: string[];
    }
  ) => {
    if (!q.trim()) return;
    setIsSearching(true);
    setSuggestions([]);

    const queryTag = q.toLowerCase().trim();
    recSession.trackAction('SEARCH', [queryTag]);

    try {
      const key = await getSearchKey();
      const meiliHost = import.meta.env.VITE_MEILISEARCH_HOST || 'http://localhost:7700';
      const searchOptions: any = {
        limit: 20,
        facets: ['category_group', 'rec_tags.style', 'rec_tags.material', 'rec_tags.color_vibe', 'price']
      };

      const filterParts: string[] = [];
      if (filters) {
        if (filters.categories && filters.categories.length > 0) {
          filterParts.push(`category IN [${filters.categories.map(c => `"${c}"`).join(', ')}]`);
        }
        if (filters.styles && filters.styles.length > 0) {
          filterParts.push(`rec_tags.style IN [${filters.styles.map(s => `"${s}"`).join(', ')}]`);
        }
        if (filters.materials && filters.materials.length > 0) {
          filterParts.push(`rec_tags.material IN [${filters.materials.map(m => `"${m}"`).join(', ')}]`);
        }
        if (filters.vibes && filters.vibes.length > 0) {
          filterParts.push(`rec_tags.color_vibe IN [${filters.vibes.map(v => `"${v}"`).join(', ')}]`);
        }
        if (filters.contexts && filters.contexts.length > 0) {
          filterParts.push(`facets.placement_context IN [${filters.contexts.map(c => `"${c}"`).join(', ')}]`);
        }
      }

      if (filterParts.length > 0) {
        searchOptions.filter = filterParts.join(' AND ');
      }

      // 1. Direct Search
      let res = await fetch(`${meiliHost}/indexes/products/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({ q, ...searchOptions })
      });
      let data = await res.json();
      let foundItems = data.hits || [];

      // 2. Intent fallback if direct hits are empty AND no active filters
      const hasActiveFilters = filters && (
        (filters.categories && filters.categories.length > 0) ||
        (filters.styles && filters.styles.length > 0) ||
        (filters.materials && filters.materials.length > 0) ||
        (filters.vibes && filters.vibes.length > 0) ||
        (filters.contexts && filters.contexts.length > 0)
      );

      if (foundItems.length === 0 && !hasActiveFilters) {
        const intentRes = await fetch(`${meiliHost}/indexes/search_intents/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({ q, limit: 1 })
        });
        const intentData = await intentRes.json();
        
        if (intentData.hits && intentData.hits.length > 0) {
          const intent = intentData.hits[0];
          const intentFilterParts = [];
          
          if (intent.category_groups) {
            intentFilterParts.push(`category_group = "${intent.category_groups}"`);
          } else if (intent.tags && intent.tags.length > 0) {
            const validStyleTags = ['traditionnel', 'berbere', 'luxe', 'artisanal', 'marocain', 'moderne', 'rustique'];
            const matchingTags = intent.tags.filter((t: string) => validStyleTags.includes(t));
            if (matchingTags.length > 0) {
              const tagList = matchingTags.map((t: string) => `"${t}"`).join(', ');
              intentFilterParts.push(`rec_tags.style IN [${tagList}]`);
            }
          }

          if (intentFilterParts.length > 0) {
            searchOptions.filter = intentFilterParts.join(' AND ');
          }

          const refinedRes = await fetch(`${meiliHost}/indexes/products/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({ q: '', ...searchOptions })
          });
          const refinedData = await refinedRes.json();
          foundItems = refinedData.hits || [];
        }
      }

      setResults(foundItems);

      // If primary query, extract and set all available filter choices from direct un-filtered hits
      if (filters === undefined) {
        const cats = new Set<string>();
        const styles = new Set<string>();
        const materials = new Set<string>();
        const vibes = new Set<string>();
        const contexts = new Set<string>();

        foundItems.forEach((hit: any) => {
          if (hit.category) cats.add(hit.category);
          if (hit.rec_tags) {
            if (Array.isArray(hit.rec_tags.style)) hit.rec_tags.style.forEach((s: any) => styles.add(s));
            if (Array.isArray(hit.rec_tags.material)) hit.rec_tags.material.forEach((m: any) => materials.add(m));
            if (Array.isArray(hit.rec_tags.color_vibe)) hit.rec_tags.color_vibe.forEach((v: any) => vibes.add(v));
          }
          if (hit.facets) {
            if (Array.isArray(hit.facets.placement_context)) {
              hit.facets.placement_context.forEach((c: any) => contexts.add(c));
            }
          }
        });

        setAvailableCategories(Array.from(cats).filter(Boolean));
        setAvailableStyles(Array.from(styles).filter(Boolean));
        setAvailableMaterials(Array.from(materials).filter(Boolean));
        setAvailableColorVibes(Array.from(vibes).filter(Boolean));
        setAvailableContexts(Array.from(contexts).filter(Boolean));

        setSelectedCategories([]);
        setSelectedStyles([]);
        setSelectedMaterials([]);
        setSelectedColorVibes([]);
        setSelectedContexts([]);

        setAppliedCategories([]);
        setAppliedStyles([]);
        setAppliedMaterials([]);
        setAppliedColorVibes([]);
        setAppliedContexts([]);

        setShowFiltersPanel(false);
      } else {
        setAppliedCategories(filters.categories || []);
        setAppliedStyles(filters.styles || []);
        setAppliedMaterials(filters.materials || []);
        setAppliedColorVibes(filters.vibes || []);
        setAppliedContexts(filters.contexts || []);
      }

      // Track search interaction tags in profile
      if (foundItems.length > 0) {
        const searchTags: string[] = [queryTag];
        foundItems.forEach((item: any) => {
          if (item.rec_tags) {
            if (Array.isArray(item.rec_tags.style)) searchTags.push(...item.rec_tags.style);
            if (Array.isArray(item.rec_tags.material)) searchTags.push(...item.rec_tags.material);
            if (Array.isArray(item.rec_tags.color_vibe)) searchTags.push(...item.rec_tags.color_vibe);
          }
          if (item.category_group) searchTags.push(item.category_group);
        });

        const uniqueSearchTags = Array.from(new Set(searchTags));
        recSession.trackAction('SEARCH', uniqueSearchTags);
        console.log(`[SEARCH] 🔍 SEARCH action queued on tags [${uniqueSearchTags.join(', ')}]`);
      }
    } catch (e) {
      console.error('Search error:', e);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { setQuery(query); performSearch(query); }
  };

  const handleSuggestionClick = (text: string) => {
    setQuery(text);
    performSearch(text);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setResults(null);

    setAvailableCategories([]);
    setAvailableStyles([]);
    setAvailableMaterials([]);
    setAvailableColorVibes([]);
    setAvailableContexts([]);

    setSelectedCategories([]);
    setSelectedStyles([]);
    setSelectedMaterials([]);
    setSelectedColorVibes([]);
    setSelectedContexts([]);

    setAppliedCategories([]);
    setAppliedStyles([]);
    setAppliedMaterials([]);
    setAppliedColorVibes([]);
    setAppliedContexts([]);

    setShowFiltersPanel(false);
  };

  const searchState = results !== null ? 'results' : query.length > 0 ? 'typing' : 'empty';

  return (
    <motion.div
      className="search-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* ── Background: zellige pattern + blur on home ── */}
      <div className="search-bg-pattern" />
      <div className="search-bg-blur" />

      {/* ── Main panel ── */}
      <motion.div
        className="search-panel"
        initial={{ y: 24, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 16, opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* ── Header ── */}
        <div className="search-header">
          <button
            className="search-back-btn"
            onClick={() => onNavigate('home')}
            aria-label={lang === 'ar' ? "رجوع" : "Retour"}
          >
            <X size={18} strokeWidth={2} />
          </button>

          {/* ── Search Bar ── */}
          <div className="search-bar-wrap">
            <Search className="search-bar-icon" size={18} strokeWidth={1.8} />
            <input
              ref={inputRef}
              type="text"
              className="search-bar-input"
              placeholder={lang === 'ar' ? "ابحث عن تحف، معلمين، مواد..." : "Rechercher une création..."}
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            <AnimatePresence>
              {query && (
                <motion.button
                  className="search-bar-clear"
                  onClick={handleClear}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  aria-label={lang === 'ar' ? "مسح" : "Effacer"}
                >
                  <X size={13} strokeWidth={2.5} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Content Area ── */}
        <div className="search-body">
          <AnimatePresence mode="wait">

            {/* ════════════════════ EMPTY STATE ════════════════════ */}
            {searchState === 'empty' && (
              <motion.div
                key="empty"
                className="search-content"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Recent */}
                <section className="search-section">
                  <p className="search-label">
                    <span className="search-label-icon">🕘</span>
                    {t('search_recent')}
                  </p>
                  <div className="recent-pills">
                    {RECENT_SEARCHES.map(tag => (
                      <button key={tag} className="recent-pill" onClick={() => handleSuggestionClick(tag)}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </section>

                {/* AI Suggestions */}
                <section className="search-section">
                  <p className="search-label ai-label">
                    <span className="search-label-icon">✨</span>
                    {lang === 'ar' ? "إلهامات الساعة" : "Inspirations du moment"}
                  </p>
                  <div className="ai-cards">
                    {AI_SUGGESTIONS.map((s, i) => (
                      <motion.button
                        key={i}
                        className="ai-card"
                        onClick={() => handleSuggestionClick(s.title)}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className="ai-card-dot" />
                        <div className="ai-card-body">
                          <span className="ai-card-title">{s.title}</span>
                          <span className="ai-card-sub">{s.subtitle}</span>
                        </div>
                        <ArrowUpRight size={14} className="ai-card-arrow" strokeWidth={2} style={{ transform: lang === 'ar' ? 'rotate(-90deg)' : 'none' }} />
                      </motion.button>
                    ))}
                  </div>
                </section>

                {/* Explorer grid */}
                <section className="search-section">
                  <p className="search-label">
                    <span className="search-label-icon">⬚</span>
                    {lang === 'ar' ? "استكشاف" : "Explorer"}
                  </p>
                  <div className="explore-grid">
                    {/* Categories */}
                    <div className="explore-col">
                      {CATEGORIES.map(c => (
                        <motion.button
                          key={c.key}
                          className="category-card"
                          style={{ '--cat-bg': c.color, '--cat-border': c.border } as any}
                          onClick={() => handleSuggestionClick(c.label)}
                          whileTap={{ scale: 0.96 }}
                        >
                          <span className="category-icon">{c.icon}</span>
                          <span className="category-name">{lang === 'ar' ? getCategoryLabel(c.key) : c.label}</span>
                        </motion.button>
                      ))}
                    </div>

                    {/* Collections */}
                    <div className="explore-col">
                      <p className="explore-col-header">{lang === 'ar' ? "مجموعات مميزة" : "Collections"}</p>
                      {COLLECTIONS.map(col => (
                        <motion.button
                          key={col.label}
                          className="collection-card"
                          onClick={() => handleSuggestionClick(col.q)}
                          whileTap={{ scale: 0.96 }}
                        >
                          <span className="collection-dot">✦</span>
                          <span className="collection-name">{lang === 'ar' ? (col.label === 'Héritage Fassi' ? 'التراث الفاسي' : col.label === 'Trésors Berbères' ? 'كنوز الأطلس' : 'أعراس مغربية') : col.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </section>
              </motion.div>
            )}

            {/* ════════════════════ TYPING — Suggestions ════════════════════ */}
            {searchState === 'typing' && (
              <motion.div
                key="typing"
                className="suggest-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {suggestions.length > 0 ? (
                  suggestions.map((s, i) => (
                    <motion.button
                      key={i}
                      className="suggest-row"
                      onClick={() => handleSuggestionClick(s.text)}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="suggest-icon-wrap">
                        <Search size={14} strokeWidth={2} className="suggest-icon" />
                      </div>
                      <div className="suggest-text-wrap">
                        <span className="suggest-title">{s.text}</span>
                        {s.category && (
                          <span className="suggest-sub">{s.category}</span>
                        )}
                      </div>
                      <ArrowUpRight size={13} className="suggest-arrow" strokeWidth={2} />
                    </motion.button>
                  ))
                ) : (
                  <div className="suggest-loading">
                    <div className="suggest-dot-row">
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="suggest-dot"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                    <span className="suggest-loading-text">Recherche en cours…</span>
                  </div>
                )}
              </motion.div>
            )}

            {/* ════════════════════ RESULTS ════════════════════ */}
            {searchState === 'results' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {isSearching ? (
                  <div className="results-loading">
                    <div className="results-spinner" />
                    <span>{lang === 'ar' ? "جاري البحث..." : "Recherche en cours…"}</span>
                  </div>
                ) : results && results.length > 0 ? (
                  <>
                    {(() => {
                      const totalAppliedFilters = appliedCategories.length + appliedStyles.length + appliedMaterials.length + appliedColorVibes.length + appliedContexts.length;
                      const totalAvailableOptionsCount = availableCategories.length + availableStyles.length + availableMaterials.length + availableColorVibes.length + availableContexts.length;

                      return (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div className="results-meta" style={{ margin: 0 }}>
                              <span className="results-count">{results.length} {lang === 'ar' ? "نتائج" : "résultats"} </span>
                              <span className="results-query">{lang === 'ar' ? `لبحث « ${query} »` : `pour « ${query} »`}</span>
                            </div>
                            
                            {/* Filter Button */}
                            {totalAvailableOptionsCount > 1 && (
                              <button
                                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '6px 12px',
                                  background: showFiltersPanel || totalAppliedFilters > 0 ? 'rgba(212,175,55,0.08)' : 'var(--surface)',
                                  border: `1.5px solid ${showFiltersPanel || totalAppliedFilters > 0 ? 'var(--primary)' : 'rgba(0,0,0,0.06)'}`,
                                  borderRadius: 16,
                                  fontFamily: 'var(--font-display)',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  color: showFiltersPanel || totalAppliedFilters > 0 ? 'var(--primary)' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  boxShadow: 'var(--shadow-sm)'
                                }}
                              >
                                <SlidersHorizontal size={14} />
                                <span>{t('search_filters_btn')}</span>
                                {totalAppliedFilters > 0 && (
                                  <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: 16,
                                    height: 16,
                                    borderRadius: '50%',
                                    background: 'var(--primary)',
                                    color: '#fff',
                                    fontSize: 9,
                                    fontWeight: 800,
                                    marginLeft: 2
                                  }}>
                                    {totalAppliedFilters}
                                  </span>
                                )}
                              </button>
                            )}
                          </div>

                          {/* Collapsible Filter Panel */}
                          <AnimatePresence>
                            {showFiltersPanel && totalAvailableOptionsCount > 1 && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                style={{
                                  overflow: 'hidden',
                                  background: '#FFFEFC',
                                  border: '1px solid rgba(196, 169, 106, 0.15)',
                                  borderRadius: 16,
                                  padding: '16px',
                                  marginBottom: 20,
                                  boxShadow: '0 4px 16px rgba(26, 42, 58, 0.03)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 14
                                }}
                              >
                                {/* Categories Filter */}
                                {availableCategories.length > 0 && (
                                  <div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                                      {lang === 'ar' ? "الأصناف والحرف" : "Catégories"}
                                    </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                      {availableCategories.map(cat => {
                                        const isSelected = selectedCategories.includes(cat);
                                        return (
                                          <button
                                            key={cat}
                                            onClick={() => {
                                              setSelectedCategories(isSelected ? selectedCategories.filter(c => c !== cat) : [...selectedCategories, cat]);
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              padding: '6px 12px',
                                              background: isSelected ? 'rgba(212,175,55,0.08)' : '#FCFBF9',
                                              border: `1.2px solid ${isSelected ? 'var(--primary)' : 'rgba(196,169,106,0.12)'}`,
                                              borderRadius: 12,
                                              fontFamily: 'var(--font-body)',
                                              fontSize: 11,
                                              fontWeight: isSelected ? 700 : 500,
                                              color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            {isSelected && <Check size={10} strokeWidth={3} />}
                                            <span>{lang === 'ar' ? getCategoryLabel(cat) : formatCategoryName(cat)}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Styles Filter */}
                                {availableStyles.length > 0 && (
                                  <div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                                      {lang === 'ar' ? "الأنماط والطابع" : "Styles"}
                                    </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                      {availableStyles.map(style => {
                                        const isSelected = selectedStyles.includes(style);
                                        return (
                                          <button
                                            key={style}
                                            onClick={() => {
                                              setSelectedStyles(isSelected ? selectedStyles.filter(s => s !== style) : [...selectedStyles, style]);
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              padding: '6px 12px',
                                              background: isSelected ? 'rgba(212,175,55,0.08)' : '#FCFBF9',
                                              border: `1.2px solid ${isSelected ? 'var(--primary)' : 'rgba(196,169,106,0.12)'}`,
                                              borderRadius: 12,
                                              fontFamily: 'var(--font-body)',
                                              fontSize: 11,
                                              fontWeight: isSelected ? 700 : 500,
                                              color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            {isSelected && <Check size={10} strokeWidth={3} />}
                                            <span>{style.charAt(0).toUpperCase() + style.slice(1)}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Materials Filter */}
                                {availableMaterials.length > 0 && (
                                  <div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                                      {lang === 'ar' ? "المواد والخامات" : "Matériaux"}
                                    </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                      {availableMaterials.map(mat => {
                                        const isSelected = selectedMaterials.includes(mat);
                                        return (
                                          <button
                                            key={mat}
                                            onClick={() => {
                                              setSelectedMaterials(isSelected ? selectedMaterials.filter(m => m !== mat) : [...selectedMaterials, mat]);
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              padding: '6px 12px',
                                              background: isSelected ? 'rgba(212,175,55,0.08)' : '#FCFBF9',
                                              border: `1.2px solid ${isSelected ? 'var(--primary)' : 'rgba(196,169,106,0.12)'}`,
                                              borderRadius: 12,
                                              fontFamily: 'var(--font-body)',
                                              fontSize: 11,
                                              fontWeight: isSelected ? 700 : 500,
                                              color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            {isSelected && <Check size={10} strokeWidth={3} />}
                                            <span>{mat.charAt(0).toUpperCase() + mat.slice(1)}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Color Vibes Filter */}
                                {availableColorVibes.length > 0 && (
                                  <div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                                      {lang === 'ar' ? "الألوان والأجواء" : "Ambiance & Couleurs"}
                                    </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                      {availableColorVibes.map(vibe => {
                                        const isSelected = selectedColorVibes.includes(vibe);
                                        return (
                                          <button
                                            key={vibe}
                                            onClick={() => {
                                              setSelectedColorVibes(isSelected ? selectedColorVibes.filter(v => v !== vibe) : [...selectedColorVibes, vibe]);
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              padding: '6px 12px',
                                              background: isSelected ? 'rgba(212,175,55,0.08)' : '#FCFBF9',
                                              border: `1.2px solid ${isSelected ? 'var(--primary)' : 'rgba(196,169,106,0.12)'}`,
                                              borderRadius: 12,
                                              fontFamily: 'var(--font-body)',
                                              fontSize: 11,
                                              fontWeight: isSelected ? 700 : 500,
                                              color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            {isSelected && <Check size={10} strokeWidth={3} />}
                                            <span>{vibe.charAt(0).toUpperCase() + vibe.slice(1)}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Context Filter */}
                                {availableContexts.length > 0 && (
                                  <div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
                                      {lang === 'ar' ? "الاستخدام والمجال" : "Usage & Univers"}
                                    </span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                      {availableContexts.map(ctx => {
                                        const isSelected = selectedContexts.includes(ctx);
                                        return (
                                          <button
                                            key={ctx}
                                            onClick={() => {
                                              setSelectedContexts(isSelected ? selectedContexts.filter(c => c !== ctx) : [...selectedContexts, ctx]);
                                            }}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 4,
                                              padding: '6px 12px',
                                              background: isSelected ? 'rgba(212,175,55,0.08)' : '#FCFBF9',
                                              border: `1.2px solid ${isSelected ? 'var(--primary)' : 'rgba(196,169,106,0.12)'}`,
                                              borderRadius: 12,
                                              fontFamily: 'var(--font-body)',
                                              fontSize: 11,
                                              fontWeight: isSelected ? 700 : 500,
                                              color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                                              cursor: 'pointer'
                                            }}
                                          >
                                            {isSelected && <Check size={10} strokeWidth={3} />}
                                            <span>{ctx.charAt(0).toUpperCase() + ctx.slice(1)}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Actions */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 14, borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: 12, marginTop: 4 }}>
                                  <button
                                    onClick={() => {
                                      setSelectedCategories([]);
                                      setSelectedStyles([]);
                                      setSelectedMaterials([]);
                                      setSelectedColorVibes([]);
                                      setSelectedContexts([]);
                                      performSearch(query, {});
                                      setShowFiltersPanel(false);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      fontFamily: 'var(--font-body)',
                                      fontWeight: 600,
                                      fontSize: 12,
                                      color: 'var(--text-secondary)',
                                      cursor: 'pointer',
                                      padding: '4px 8px'
                                    }}
                                  >
                                    {t('search_filter_reset')}
                                  </button>
                                  <button
                                    onClick={() => {
                                      performSearch(query, {
                                        categories: selectedCategories,
                                        styles: selectedStyles,
                                        materials: selectedMaterials,
                                        vibes: selectedColorVibes,
                                        contexts: selectedContexts
                                      });
                                      setShowFiltersPanel(false);
                                    }}
                                    style={{
                                      background: 'var(--primary)',
                                      border: 'none',
                                      borderRadius: 10,
                                      padding: '8px 16px',
                                      fontFamily: 'var(--font-display)',
                                      fontWeight: 700,
                                      fontSize: 12,
                                      color: '#fff',
                                      cursor: 'pointer',
                                      boxShadow: 'var(--shadow-sm)'
                                    }}
                                  >
                                    {t('search_filter_apply')}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </>
                      );
                    })()}
                    <div className="results-grid">
                      {results.map(p => (
                        <SearchProductCard
                          key={p.id}
                          product={p}
                          onSelect={(searchProd) => {
                            const sAny = searchProd as any;
                            const fullProd = MAALEM_DATA.products.find(item => item.id === searchProd.id) || {
                              id: searchProd.id,
                              title: searchProd.title,
                              category: searchProd.category_group || sAny.category,
                              price: searchProd.price ? `${searchProd.price} MAD` : (lang === 'ar' ? 'عند الطلب' : 'Sur demande'),
                              rating: 4.8,
                              badge: null,
                              image: sAny.image_url || sAny.imageUrl || sAny.image || '',
                              artisanId: sAny.facets?.artisan_ref || sAny.artisan_ref || sAny.artisanId || "artisan_abdelkader",
                              artisanRef: sAny.facets?.artisan_ref || sAny.artisan_ref || sAny.artisanId || "artisan_abdelkader",
                              artisanName: sAny.artisan_name || sAny.artisanName || "Maâlem Abdelkader",
                            };
                            onSelectProduct?.(fullProd);
                          }}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="zero-results">
                    <span className="zero-results-icon">◇</span>
                    <p className="zero-results-title">{lang === 'ar' ? "لم يتم العثور على أي نتيجة" : "Aucun résultat"}</p>
                    <p className="zero-results-sub">{lang === 'ar' ? `لبحث « ${query} »` : `pour « ${query} »`}</p>
                    <button className="zero-results-btn" onClick={handleClear}>
                      {t('search_filter_reset')}
                    </button>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};
