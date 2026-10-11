import React, { useState, useEffect } from "react";
import { ArtisanBottomNav, type MobileArtisanTab } from "./components/ArtisanBottomNav";
import { ArtisanMobileHeader } from "./components/ArtisanMobileHeader";
import { useI18n } from "./services/i18n";

import { ArtisanHomeDashboardView } from "./views/ArtisanHomeDashboardView";
import { ArtisanMarketplaceView } from "./views/ArtisanMarketplaceView";
import { ArtisanPostsView } from "./views/ArtisanPostsView";
import { ArtisanProfileView } from "./views/ArtisanProfileView";
import { ArtisanNotificationsView } from "./views/ArtisanNotificationsView";
import { ReturnsWorkshopView } from "./views/ReturnsWorkshopView";
import { DisputesWorkshopView } from "./views/DisputesWorkshopView";

import { CreatePostModalSheet } from "./components/CreatePostModalSheet";
import { PrepPhotosModal } from "./components/PrepPhotosModal";
import { DirectDeliveryModal } from "./components/DirectDeliveryModal";
import { RefuseOrderModal } from "./components/RefuseOrderModal";
import { OutOfStockActionModal } from "./components/OutOfStockActionModal";
import { DisputeReplyModal } from "./components/DisputeReplyModal";
import { WithdrawalModal } from "./components/WithdrawalModal";
import { CGVModalSheet } from "./components/CGVModalSheet";
import { ArtisanAuthView } from "./views/ArtisanAuthView";
import { artisanAuthService, type ArtisanUser } from "./services/artisanAuthService";
import { artisanAPI } from "./services/artisanApi";
import type { 
  ArtisanOrder, 
  ArtisanDispute, 
  ArtisanReturn, 
  ArtisanWallet, 
  ArtisanProfileHealth, 
  ArtisanProduct,
  ArtisanNotification,
  ArtisanProfileDetails,
  ArtisanStats,
  CustomOrderRequest
} from "./types/artisanTypes";

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<ArtisanUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  const [currentTab, setCurrentTab] = useState<MobileArtisanTab>("home");
  const [orders, setOrders] = useState<ArtisanOrder[]>([]);
  const [returns, setReturns] = useState<ArtisanReturn[]>([]);
  const [disputes, setDisputes] = useState<ArtisanDispute[]>([]);
  const [wallet, setWallet] = useState<ArtisanWallet | null>(null);
  const [health, setHealth] = useState<ArtisanProfileHealth | null>(null);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [products, setProducts] = useState<ArtisanProduct[]>([]);
  const [customRequests, setCustomRequests] = useState<CustomOrderRequest[]>([]);
  const [notifications, setNotifications] = useState<ArtisanNotification[]>([]);
  const [profileDetails, setProfileDetails] = useState<ArtisanProfileDetails | null>(null);
  const [stats, setStats] = useState<ArtisanStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals & Drawers
  const [showCreatePostModal, setShowCreatePostModal] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [showReturnsDrawer, setShowReturnsDrawer] = useState<boolean>(false);
  const [showDisputesDrawer, setShowDisputesDrawer] = useState<boolean>(false);
  const [prepPhotosOrderId, setPrepPhotosOrderId] = useState<string | null>(null);
  const [directDeliveryOrder, setDirectDeliveryOrder] = useState<ArtisanOrder | null>(null);
  const [refuseOrderId, setRefuseOrderId] = useState<string | null>(null);
  const [replyDispute, setReplyDispute] = useState<ArtisanDispute | null>(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState<boolean>(false);
  const [showCGVModal, setShowCGVModal] = useState<boolean>(false);
  const [outOfStockProduct, setOutOfStockProduct] = useState<{ id: string; title: string; imageUrl?: string } | null>(null);

  // ── Chargement Dynamique par Domaine ───────────────────────────────────────

  // 1. Données Atelier & Commandes (Fréquentes / Temps réel)
  const loadHomeData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const artisanRef = currentUser?.id;
      const [o, w, n] = await Promise.all([
        artisanAPI.getOrders(artisanRef).catch(() => []),
        artisanAPI.getWallet(artisanRef).catch(() => null),
        artisanAPI.getNotifications(artisanRef).catch(() => []),
      ]);
      setOrders(o);
      if (w) setWallet(w);
      setNotifications(n);
    } catch (err) {
      console.warn("[DYNAMIC-SYNC] Erreur sync commandes/wallet:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // 2. Marché Sur-Mesure (Chargement à la demande / Lazy)
  const loadMarketData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const cr = await artisanAPI.getCustomRequests().catch(() => []);
      setCustomRequests(cr);
    } catch (err) {
      console.warn("[DYNAMIC-SYNC] Erreur sync marché:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // 3. Catalogue de Produits
  const loadPostsData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const p = await artisanAPI.getProducts().catch(() => []);
      setProducts(p);
    } catch (err) {
      console.warn("[DYNAMIC-SYNC] Erreur sync catalogue:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // 4. Profil, Litiges, Retours & Performance
  const loadProfileData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const artisanRef = currentUser?.id;
      const [h, prof, st, r, d] = await Promise.all([
        artisanAPI.getProfileHealth(artisanRef).catch(() => ({ profile: null, warnings: [] })),
        artisanAPI.getProfileDetails().catch(() => null),
        artisanAPI.getStats(artisanRef).catch(() => null),
        artisanAPI.getReturns().catch(() => []),
        artisanAPI.getDisputes().catch(() => []),
      ]);
      if (h) {
        setHealth(h.profile);
        setWarnings(h.warnings || []);
      }
      setProfileDetails(prof);
      setStats(st);
      setReturns(r);
      setDisputes(d);
    } catch (err) {
      console.warn("[DYNAMIC-SYNC] Erreur sync profil:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Chargement global initial / rafraîchissement manuel
  const loadAllData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      await Promise.all([
        loadHomeData(true),
        loadPostsData(true),
        loadProfileData(true),
        // Ne charger le marché immédiatement que si l'onglet actif est "market"
        currentTab === "market" ? loadMarketData(true) : Promise.resolve(),
      ]);
    } catch (err) {
      console.error("Erreur chargement global données:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  // Initialisation Session
  useEffect(() => {
    const initAuth = async () => {
      try {
        const user = await artisanAuthService.checkSession();
        setCurrentUser(user);
        if (user) {
          await loadAllData(false);
        }
      } catch (err) {
        console.error("Erreur initialisation session:", err);
      } finally {
        setCheckingAuth(false);
      }
    };
    initAuth();
  }, []);

  // Polling dynamique silencieux en arrière-plan (élimine le besoin de refresh manuel)
  useEffect(() => {
    if (!currentUser) return;

    const timer = setInterval(() => {
      // Sync périodique légère (toutes les 5s)
      loadHomeData(true);
      if (currentTab === "market") {
        loadMarketData(true);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [currentUser, currentTab]);

  // Synchronisation multi-onglets pour isolation des sessions vendeurs
  useEffect(() => {
    const onStorageChange = (e: StorageEvent) => {
      if (e.key === "artisan_session_token" || e.key === "artisan_user_profile") {
        const activeUser = artisanAuthService.getStoredUser();
        if (!activeUser && currentUser) {
          setCurrentUser(null);
        } else if (activeUser && activeUser.id !== currentUser?.id) {
          setCurrentUser(activeUser);
          loadAllData(false);
        }
      }
    };
    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, [currentUser]);

  const handleAuthSuccess = async (user: ArtisanUser) => {
    setCurrentUser(user);
    await loadAllData(false);
  };

  const handleLogout = () => {
    artisanAuthService.logout();
    setCurrentUser(null);
  };

  // Handlers avec navigation et lazy-loading automatique
  const handleTabChange = (tab: MobileArtisanTab) => {
    if (tab === "create") {
      setShowCreatePostModal(true);
    } else {
      setCurrentTab(tab);
      if (tab === "market" && customRequests.length === 0) {
        loadMarketData(false);
      } else if (tab === "profile" && !stats) {
        loadProfileData(false);
      } else if (tab === "posts" && products.length === 0) {
        loadPostsData(false);
      }
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    try {
      const res = await artisanAPI.acceptOrder(orderId);
      await loadAllData();
      if (res && res.stockAlert) {
        const order = orders.find(o => o.id === orderId);
        if (res.stockAlert.type === "stock_epuise") {
          setOutOfStockProduct({
            id: res.stockNotification?.productId || (order as any)?.productId || orderId,
            title: (order as any)?.productTitle || "Création Artisanale",
          });
        }
      }
    } catch (err: any) {
      if (err.stockCheck || err.actionRequired === "increment_stock" || err.message?.includes("stock") || err.message?.includes("المخزون")) {
        const order = orders.find(o => o.id === orderId);
        setOutOfStockProduct({
          id: err.stockCheck?.productId || (order as any)?.productId || orderId,
          title: (order as any)?.productTitle || "Création Artisanale",
        });
      } else {
        alert(err.message || "Erreur lors de l'acceptation.");
      }
    }
  };

  const handleApplyStockAction = async (productId: string, action: string, payload?: any) => {
    await artisanAPI.updateStock(productId, action, payload);
    setOutOfStockProduct(null);
    await loadAllData();
  };

  const handleRefuseOrder = async (orderId: string, reason: string) => {
    await artisanAPI.refuseOrder(orderId, reason);
    await loadAllData();
  };

  const handleUploadPrepPhotos = async (orderId: string, photos: string[]) => {
    await artisanAPI.uploadPrepPhotos(orderId, photos);
    await loadAllData();
  };

  const handleEscrowChoice = async (orderId: string, action: "claim" | "extend", extendDays: number = 7) => {
    const res = await artisanAPI.escrowChoice(orderId, action, extendDays);
    await loadAllData();
    return res;
  };

  const handleNudgeClient = async (orderId: string) => {
    const res = await artisanAPI.nudgeClient(orderId);
    await loadAllData();
    return res;
  };

  const handleShipDirect = async (orderId: string, payload: { carrierName: string; trackingNumber: string; days: number }) => {
    const res = await artisanAPI.shipOrder(orderId, {
      carrierName: payload.carrierName,
      trackingNumber: payload.trackingNumber,
      transportDurationDays: payload.days,
    });
    await loadAllData();
    return res;
  };

  const handleCompleteDirectDelivery = async (orderId: string, signaturePhoto: string) => {
    const res = await artisanAPI.completeVendeurDelivery(orderId, signaturePhoto);
    await loadAllData();
    return res;
  };

  const handleConfirmReturn = async (returnId: string) => {
    await artisanAPI.confirmReturn(returnId);
    await loadAllData();
  };

  const handleRespondDispute = async (disputeId: string, text: string, photos: string[]) => {
    await artisanAPI.respondDispute(disputeId, text, photos);
    await loadAllData();
  };

  const handleRequestWithdrawal = async (amount: number, rib: string) => {
    await artisanAPI.requestWithdrawal(amount, rib);
    await loadAllData();
  };

  const handleCreateProduct = async (productData: any) => {
    await artisanAPI.createProduct(productData);
    await loadAllData();
  };

  const handleUpdateProduct = async (productData: any) => {
    await artisanAPI.createProduct(productData);
    await loadAllData();
  };

  const handleSubmitQuote = async (requestId: string, price: number, days: number, note: string) => {
    await artisanAPI.submitCustomQuote(requestId, price, days, note);
    await loadAllData();
  };

  const handleUpdateProfile = async (details: Partial<ArtisanProfileDetails>) => {
    const updated = await artisanAPI.updateProfileDetails(details);
    setProfileDetails(updated);
  };

  const { t } = useI18n();

  const getHeaderTitle = () => {
    switch (currentTab) {
      case "home": return t("header_workshop");
      case "market": return t("header_market");
      case "create": return t("create_post_title");
      case "posts": return t("header_posts");
      case "profile": return t("header_profile");
    }
  };

  const pendingOrdersCount = orders.filter(o => ["acompte_verse", "payee_integralement"].includes(o.status)).length;
  const openDisputesCount = disputes.filter(d => !d.status.startsWith("resolu") && d.status !== "rejete").length;
  const pendingReturnsCount = returns.filter(r => r.status === "initie").length;
  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  if (checkingAuth) {
    return (
      <div className="phone-shell" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <div style={{ width: 36, height: 36, border: "3px solid rgba(184,98,63,0.2)", borderTopColor: "var(--accent-warm)", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontFamily: "var(--font-display)", color: "var(--primary)", fontWeight: 700, fontSize: 14 }}>
            {t("loading")}
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="phone-shell">
        <div className="pattern-corner pattern-top-right" />
        <div className="pattern-corner pattern-bottom-left" />
        <ArtisanAuthView onAuthSuccess={handleAuthSuccess} />
      </div>
    );
  }

  return (
    <div className="phone-shell">
      {/* Pattern Corners matching Client App */}
      <div className="pattern-corner pattern-top-right" />
      <div className="pattern-corner pattern-bottom-left" />

      {/* Top Mobile Header */}
      <ArtisanMobileHeader
        title={getHeaderTitle()}
        onRefresh={loadAllData}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        unreadNotifsCount={unreadNotifsCount}
        loading={loading}
        shopStatus={health?.suspensionStatus || "active"}
        warningCount={health?.warningCountCurrentMonth || 0}
      />

      {/* Scrollable View Area */}
      <main className="app-content">
        {currentTab === "home" && (
          <ArtisanHomeDashboardView
            wallet={wallet}
            orders={orders}
            onOpenWithdrawalModal={() => setShowWithdrawalModal(true)}
            onAccept={handleAcceptOrder}
            onOpenRefuseModal={setRefuseOrderId}
            onOpenPrepPhotosModal={setPrepPhotosOrderId}
            onOpenDirectDeliveryModal={setDirectDeliveryOrder}
            onEscrowChoice={handleEscrowChoice}
            onNudgeClient={handleNudgeClient}
          />
        )}

        {currentTab === "market" && (
          <ArtisanMarketplaceView
            customRequests={customRequests}
            onSubmitQuote={handleSubmitQuote}
          />
        )}

        {currentTab === "posts" && (
          <ArtisanPostsView
            products={products}
            onOpenCreateModal={() => setShowCreatePostModal(true)}
            onUpdateProduct={handleUpdateProduct}
          />
        )}

        {currentTab === "profile" && (
          <ArtisanProfileView
            profileDetails={profileDetails}
            health={health}
            stats={stats}
            returns={returns}
            disputes={disputes}
            currentUser={currentUser}
            onLogout={handleLogout}
            onUpdateProfile={handleUpdateProfile}
            onOpenReturns={() => setShowReturnsDrawer(true)}
            onOpenDisputes={() => setShowDisputesDrawer(true)}
            onOpenCGV={() => setShowCGVModal(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <ArtisanBottomNav
        currentTab={currentTab}
        onTabChange={handleTabChange}
        pendingOrdersCount={pendingOrdersCount}
        openDisputesCount={openDisputesCount}
        returnsCount={pendingReturnsCount}
      />

      {/* ─── Modals & Bottom Sheet Drawers ───────────────────────────────── */}

      {/* Central Button Action: Create Post Modal Sheet */}
      {showCreatePostModal && (
        <CreatePostModalSheet
          onClose={() => setShowCreatePostModal(false)}
          onCreateProduct={handleCreateProduct}
        />
      )}

      {/* Notifications Drawer */}
      {showNotificationsModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "#FCFBF9", width: "100%", maxWidth: 440, maxHeight: "82vh", borderRadius: "24px 24px 0 0", padding: "20px", overflowY: "auto", boxShadow: "0 -10px 30px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 36, height: 4, background: "rgba(0,0,0,0.15)", borderRadius: 2, margin: "0 auto 16px" }} />
            <ArtisanNotificationsView
              notifications={notifications}
              onNavigateTab={(tab) => {
                setShowNotificationsModal(false);
                if (tab === "retours") setShowReturnsDrawer(true);
                else if (tab === "litiges") setShowDisputesDrawer(true);
                else setCurrentTab(tab as MobileArtisanTab);
              }}
            />
            <button onClick={() => setShowNotificationsModal(false)} className="btn-mobile-outline" style={{ width: "100%", marginTop: 14 }}>
              {t("close")}
            </button>
          </div>
        </div>
      )}

      {/* Returns Drawer from Profile */}
      {showReturnsDrawer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "#FCFBF9", width: "100%", maxWidth: 440, maxHeight: "82vh", borderRadius: "24px 24px 0 0", padding: "20px", overflowY: "auto", boxShadow: "0 -10px 30px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 36, height: 4, background: "rgba(0,0,0,0.15)", borderRadius: 2, margin: "0 auto 16px" }} />
            <ReturnsWorkshopView
              returns={returns}
              onConfirmReturn={handleConfirmReturn}
            />
            <button onClick={() => setShowReturnsDrawer(false)} className="btn-mobile-outline" style={{ width: "100%", marginTop: 14 }}>
              {t("close")}
            </button>
          </div>
        </div>
      )}

      {/* Disputes Drawer from Profile */}
      {showDisputesDrawer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "#FCFBF9", width: "100%", maxWidth: 440, maxHeight: "82vh", borderRadius: "24px 24px 0 0", padding: "20px", overflowY: "auto", boxShadow: "0 -10px 30px rgba(0,0,0,0.2)" }}>
            <div style={{ width: 36, height: 4, background: "rgba(0,0,0,0.15)", borderRadius: 2, margin: "0 auto 16px" }} />
            <DisputesWorkshopView
              disputes={disputes}
              onOpenReplyModal={(d) => {
                setShowDisputesDrawer(false);
                setReplyDispute(d);
              }}
            />
            <button onClick={() => setShowDisputesDrawer(false)} className="btn-mobile-outline" style={{ width: "100%", marginTop: 14 }}>
              {t("close")}
            </button>
          </div>
        </div>
      )}

      {prepPhotosOrderId && (
        <PrepPhotosModal
          orderId={prepPhotosOrderId}
          onClose={() => setPrepPhotosOrderId(null)}
          onUpload={handleUploadPrepPhotos}
        />
      )}


      {directDeliveryOrder && (
        <DirectDeliveryModal
          order={directDeliveryOrder}
          onClose={() => setDirectDeliveryOrder(null)}
          onShipDirect={handleShipDirect}
          onCompleteDelivery={handleCompleteDirectDelivery}
        />
      )}

      {refuseOrderId && (
        <RefuseOrderModal
          orderId={refuseOrderId}
          onClose={() => setRefuseOrderId(null)}
          onRefuse={handleRefuseOrder}
        />
      )}

      {outOfStockProduct && (
        <OutOfStockActionModal
          product={outOfStockProduct}
          onClose={() => setOutOfStockProduct(null)}
          onApplyAction={handleApplyStockAction}
        />
      )}

      {replyDispute && (
        <DisputeReplyModal
          dispute={replyDispute}
          onClose={() => setReplyDispute(null)}
          onRespond={handleRespondDispute}
        />
      )}

      {showWithdrawalModal && wallet && (
        <WithdrawalModal
          availableBalance={wallet.availableBalance}
          defaultRib={profileDetails?.defaultRib}
          onClose={() => setShowWithdrawalModal(false)}
          onRequestWithdrawal={handleRequestWithdrawal}
        />
      )}

      {showCGVModal && (
        <CGVModalSheet
          onClose={() => setShowCGVModal(false)}
        />
      )}
    </div>
  );
};
