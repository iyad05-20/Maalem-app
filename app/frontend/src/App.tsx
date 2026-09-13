import { useState, useEffect } from 'react';
import type { View, Product } from './types';
import { HomeView } from './views/client/HomeView';
import { SearchView } from './views/client/SearchView';
import { AtelierView } from './views/client/AtelierView';
import { AuthView } from './views/client/AuthView';
import { ProfileView } from './views/client/ProfileView';
import { ClientOrderDetailView } from './views/client/ClientOrderDetailView';
import { ClientWalletView } from './views/client/ClientWalletView';
import { ProductDetailView } from './views/client/ProductDetailView';
import { FavoritesView } from './views/client/FavoritesView';
import { SeeAllRecsView } from './views/client/SeeAllRecsView';
import { BottomNav } from './components/Shared/BottomNav';
import { MAALEM_DATA } from './data/mockData';
import { recSession } from './services/recommendationSession';
import { authService, type UserProfile } from './services/authService';
import { favoritesService } from './services/favoritesService';
import { NotificationsView } from './views/client/NotificationsView';
import { clientWalletAPI } from './services/clientWalletApi';
import type { ClientOrder } from './types/clientPayment';
import { AnimatePresence, motion } from 'framer-motion';
import './styles/global.css';

// ─── Resolve products by ID ──────────────────────────────────────────────────
const productMap = Object.fromEntries(MAALEM_DATA.products.map(p => [p.id, p]));
const resolve = (ids: string[]) => ids.map(id => productMap[id]).filter(Boolean);

// Helper to extract tags from a product
const extractTags = (product: any): string[] => {
  if (!product) return [];
  if (Array.isArray(product.tags)) return product.tags;
  if (product.rec_tags) {
    const tags: string[] = [];
    if (Array.isArray(product.rec_tags.style)) tags.push(...product.rec_tags.style);
    if (Array.isArray(product.rec_tags.material)) tags.push(...product.rec_tags.material);
    if (Array.isArray(product.rec_tags.color_vibe)) tags.push(...product.rec_tags.color_vibe);
    return tags;
  }
  return [];
};

const PlaceholderView = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <motion.div
    key={title}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2 }}
    className="app-view"
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 24, textAlign: 'center' }}
  >
    <h2 className="section-title" style={{ marginBottom: 8 }}>{title}</h2>
    <p className="section-subtitle">{subtitle}</p>
  </motion.div>
);

// ─── App Root ────────────────────────────────────────────────────────────────
function App() {
  const [view, setView] = useState<View>('home');
  const [dynamicAiPicks, setDynamicAiPicks] = useState<Product[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showFavoritesOverlay, setShowFavoritesOverlay] = useState(false);
  const [showSeeAllOverlay, setShowSeeAllOverlay] = useState(false);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isAtelierModalOpen, setIsAtelierModalOpen] = useState(false);
  const [showNotificationsOverlay, setShowNotificationsOverlay] = useState(false);
  const [clientOrdersList, setClientOrdersList] = useState<ClientOrder[]>([]);

  useEffect(() => {
    if (currentUser?.id) {
      clientWalletAPI.fetchOrders(currentUser.id).then((orders) => {
        setClientOrdersList(orders);
      }).catch(() => {});
    }
  }, [currentUser, view, showNotificationsOverlay]);

  const hasUnreadNotifications = clientOrdersList.some((o) => {
    if (["acompte_verse", "payee_integralement"].includes(o.status)) {
      const diffHours = (Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60 * 60);
      return diffHours >= 48;
    }
    return false;
  });

  const trending = resolve(MAALEM_DATA.collections.trending);
  const fallbackAiPicks = resolve(MAALEM_DATA.collections.aiPicks);
  const premium = resolve(MAALEM_DATA.collections.premium);
  const duoSpotlight = resolve(MAALEM_DATA.collections.duoSpotlight || []);
  const duoMaalem = resolve(MAALEM_DATA.collections.duoMaalem || []);
  const regionFes = resolve(MAALEM_DATA.collections.regionFes || []);
  const occasionsData = {
    cadeaux: resolve(MAALEM_DATA.collections.occasions?.cadeaux || []),
    maison: resolve(MAALEM_DATA.collections.occasions?.maison || []),
    cuisine: resolve(MAALEM_DATA.collections.occasions?.cuisine || []),
  };

  const [recResponseState, setRecResponseState] = useState<any>(null);
  const [favoritesList, setFavoritesList] = useState<string[]>([]);

  // Check auth session on load
  useEffect(() => {
    const verifyAuth = async () => {
      const stored = authService.getStoredUser();
      if (stored) {
        setCurrentUser(stored);
      }
      const verified = await authService.checkSession();
      if (verified) {
        setCurrentUser(verified);
      }
      setAuthChecking(false);
    };
    verifyAuth();
  }, []);

  // Load products from Supabase on mount to build robust resolution catalog
  useEffect(() => {
    const loadDbProducts = async () => {
      try {
        const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';
        const res = await fetch(`${API_BASE}/products?limit=100`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setDbProducts(json.data);
        }
      } catch (err) {
        console.error("Error loading products from db:", err);
      }
    };
    loadDbProducts();
  }, []);

  // Reset activeOrderId and close overlays when user navigates to a new view
  useEffect(() => {
    if (view !== 'client-order-detail' && view !== 'cart') {
      setActiveOrderId(null);
    }
    setShowFavoritesOverlay(false);
    setShowSeeAllOverlay(false);
  }, [view]);

  // Initialize recommendation session when authenticated & register auto-sync
  useEffect(() => {
    if (!currentUser) return;
    const initRec = async () => {
      recSession.registerAutoSyncCallback((res) => {
        if (res && res.items.length > 0) {
          setDynamicAiPicks(res.items as Product[]);
          setRecResponseState(res);
        }
      });

      await recSession.initSession(currentUser.id);
      const res = await recSession.fetchFeed(currentUser.id, 15);
      if (res && res.items.length > 0) {
        setDynamicAiPicks(res.items as Product[]);
        setRecResponseState(res);
      }

      // Load favorites
      try {
        const favs = await favoritesService.fetchFavorites(currentUser.id);
        setFavoritesList(favs);
      } catch (err) {
        console.error("Error loading user favorites:", err);
      }
    };
    initRec();
  }, [currentUser]);

  const handleToggleFavorite = async (product: Product) => {
    if (!currentUser) return;
    const isCurrentlyFav = favoritesList.includes(product.id);
    const tags = extractTags(product);
    
    // Optimistic UI update
    if (isCurrentlyFav) {
      setFavoritesList(prev => prev.filter(id => id !== product.id));
    } else {
      setFavoritesList(prev => [...prev, product.id]);
      recSession.trackAction('BOOKMARK', tags);
    }
    
    try {
      const res = await favoritesService.toggleFavorite(currentUser.id, product.id);
      if (res.success) {
        if (res.isFavorite) {
          setFavoritesList(prev => Array.from(new Set([...prev, product.id])));
        } else {
          setFavoritesList(prev => prev.filter(id => id !== product.id));
        }
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const handleSelectProduct = (product: Product) => {
    const tags = extractTags(product);
    recSession.trackAction('VIEW', tags);
    setSelectedProduct(product);
  };

  const resolveFavorite = (id: string): Product | undefined => {
    const foundDb = dbProducts.find(p => p.id === id);
    if (foundDb) return foundDb;

    const foundAi = dynamicAiPicks.find(p => p.id === id);
    if (foundAi) return foundAi;

    return productMap[id];
  };

  const resolvedFavorites = favoritesList
    .map(id => resolveFavorite(id))
    .filter(Boolean) as Product[];

  const handleLogout = async () => {
    if (currentUser) {
      await recSession.logout(currentUser.id);
    }
    await authService.logout();
    setCurrentUser(null);
    setView('home');
  };

  const handleRefreshFeed = async () => {
    if (!currentUser) return;
    console.log(`[APP] ✦ Swift Refresh triggered for user ${currentUser.id}`);
    const res = await recSession.fetchFeed(currentUser.id, 15);
    if (res && res.items.length > 0) {
      setDynamicAiPicks(res.items as Product[]);
      setRecResponseState(res);
    }
  };

  if (authChecking) {
    return (
      <div className="phone-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FCFBF9' }}>
        <div style={{ color: '#1A2A3A', fontSize: '0.95rem', fontWeight: 600 }}>Chargement de MAALEM...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="phone-shell">
        <AuthView onAuthSuccess={(user) => setCurrentUser(user)} />
      </div>
    );
  }

  return (
    <div className="phone-shell">
      {/* E4 Signature Patterns */}
      <div className="pattern-corner pattern-top-right" />
      <div className="pattern-corner pattern-bottom-left" />

      {/* Main Content Switcher */}
      <main className="app-content">
        <AnimatePresence mode="wait">
          {(view === 'home' || view === 'search') && (
            <HomeView
              key="home"
              hero={MAALEM_DATA.hero}
              trending={trending}
              aiPicks={dynamicAiPicks.length > 0 ? dynamicAiPicks : fallbackAiPicks}
              premium={premium}
              duoSpotlight={duoSpotlight}
              duoMaalem={duoMaalem}
              regionFes={regionFes}
              occasionsData={occasionsData}
              featuredArtisan={MAALEM_DATA.featuredArtisan}
              promoData={MAALEM_DATA.promo}
              onNavigate={setView as any}
              onSelectProduct={handleSelectProduct}
              onRefreshFeed={handleRefreshFeed}
              recResponseState={recResponseState}
              favoritesList={favoritesList}
              onToggleFavorite={handleToggleFavorite}
              onSeeAllRecs={() => setShowSeeAllOverlay(true)}
              onOpenNotifications={() => setShowNotificationsOverlay(true)}
              hasUnreadNotifications={hasUnreadNotifications}
            />
          )}
          {view === 'atelier' && (
            <AtelierView
              key="atelier"
              currentUser={currentUser}
              onNavigate={setView}
              onModalStateChange={setIsAtelierModalOpen}
            />
          )}
          {view === 'profile' && (
            <ProfileView
              key="profile"
              currentUser={currentUser}
              onLogout={handleLogout}
              onNavigate={(v) => {
                if (v === 'favorites') {
                  setShowFavoritesOverlay(true);
                } else {
                  setView(v);
                }
              }}
              favoritesCount={favoritesList.length}
            />
          )}
          {(view === 'cart' || view === 'client-order-detail') && (
            <ClientOrderDetailView
              key="client-order-detail"
              orderId={activeOrderId || undefined}
              userId={currentUser.id}
              onBack={() => setView('home')}
              onNavigateToWallet={() => setView('client-wallet')}
              onDetailToggle={setIsOrderDetailOpen}
            />
          )}
          {view === 'client-wallet' && (
            <ClientWalletView
              key="client-wallet"
              userId={currentUser.id}
              onBack={() => setView('profile')}
              onModalToggle={setIsWalletModalOpen}
            />
          )}
          {view === 'product-detail' && (
            <PlaceholderView key="product-detail" title="Détail du Produit" subtitle="Chargement..." />
          )}
        </AnimatePresence>
      </main>

      {/* Notifications Overlay */}
      <AnimatePresence>
        {showNotificationsOverlay && (
          <NotificationsView
            key="notifications-overlay"
            orders={clientOrdersList}
            onClose={() => setShowNotificationsOverlay(false)}
            onSelectOrder={(orderId) => {
              setActiveOrderId(orderId);
              setView('cart');
            }}
          />
        )}
      </AnimatePresence>

      {/* Search Overlay */}
      <AnimatePresence>
        {view === 'search' && (
          <SearchView
            key="search-overlay"
            onNavigate={setView}
            onSelectProduct={handleSelectProduct}
          />
        )}
      </AnimatePresence>

      {/* Product Detail Overlay */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailView
            key="product-detail-overlay"
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onNavigate={setView}
            setActiveOrderId={setActiveOrderId}
            isFavorite={favoritesList.includes(selectedProduct.id)}
            onToggleFavorite={handleToggleFavorite}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>

      {/* Favorites Overlay */}
      <AnimatePresence>
        {showFavoritesOverlay && (
          <FavoritesView
            key="favorites-overlay"
            favoritedProducts={resolvedFavorites}
            onClose={() => setShowFavoritesOverlay(false)}
            onSelectProduct={handleSelectProduct}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </AnimatePresence>

      {/* See All Recs Overlay */}
      <AnimatePresence>
        {showSeeAllOverlay && (
          <SeeAllRecsView
            key="see-all-recs-overlay"
            products={dynamicAiPicks.length > 0 ? dynamicAiPicks : fallbackAiPicks}
            title={recResponseState?.sectionTitle || "Pour vous"}
            onClose={() => setShowSeeAllOverlay(false)}
            onSelectProduct={handleSelectProduct}
            favoritesList={favoritesList}
            onToggleFavorite={handleToggleFavorite}
          />
        )}
      </AnimatePresence>

      {/* Floating Bottom Nav */}
      <AnimatePresence>
        {view !== 'search' && !selectedProduct && !showFavoritesOverlay && !showSeeAllOverlay && !isOrderDetailOpen && !isWalletModalOpen && !isAtelierModalOpen && (
          <motion.div
            key="bottom-nav"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}
          >
            <BottomNav activeView={view} onNavigate={setView} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
