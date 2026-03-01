
import React, { useEffect, useMemo } from 'react';
import { Hammer, MessageSquare, Loader2, Bell } from 'lucide-react';

import { CATEGORIES } from './data/mockData';
import { SmartAvatar } from './components/Shared/SmartAvatar';
import { Navbar } from './components/Navigation/Navbar';
import { useAppLogic } from './hooks/useAppLogic';
import { db } from './services/firebase.config';
import { AuthProvider, useAuth } from './context/AuthContext';
import { updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import InstallPWA from './components/common/InstallPWA';
import { OfflineView } from './views/common/OfflineView';
import { Toast } from './components/common/Toast';

// --- Lazy-loaded Views (code-split into separate chunks) ---
const HomeView = React.lazy(() => import('./views/client/HomeView').then(m => ({ default: m.HomeView })));
const ArtisanDashboardView = React.lazy(() => import('./views/artisan/ArtisanDashboardView').then(m => ({ default: m.ArtisanDashboardView })));
const SearchView = React.lazy(() => import('./views/client/SearchView').then(m => ({ default: m.SearchView })));
const ArtisanDetailView = React.lazy(() => import('./views/client/ArtisanDetailView').then(m => ({ default: m.ArtisanDetailView })));
const AllCategoriesView = React.lazy(() => import('./views/client/AllCategoriesView').then(m => ({ default: m.AllCategoriesView })));
const CategoryDetailView = React.lazy(() => import('./views/client/CategoryDetailView').then(m => ({ default: m.CategoryDetailView })));
const PortfolioView = React.lazy(() => import('./views/client/PortfolioView').then(m => ({ default: m.PortfolioView })));
const WorkDetailView = React.lazy(() => import('./views/client/WorkDetailView').then(m => ({ default: m.WorkDetailView })));
const AllReviewsView = React.lazy(() => import('./views/client/AllReviewsView').then(m => ({ default: m.AllReviewsView })));
const UrgentView = React.lazy(() => import('./views/client/UrgentView').then(m => ({ default: m.UrgentView })));
const OrdersView = React.lazy(() => import('./views/client/OrdersView').then(m => ({ default: m.OrdersView })));
const CreateOrderView = React.lazy(() => import('./views/client/CreateOrderView').then(m => ({ default: m.CreateOrderView })));
const ClientOrderDetailView = React.lazy(() => import('./views/client/ClientOrderDetailView').then(m => ({ default: m.ClientOrderDetailView })));
const ArtisanOrderDetailView = React.lazy(() => import('./views/artisan/ArtisanOrderDetailView').then(m => ({ default: m.ArtisanOrderDetailView })));
const ChatListView = React.lazy(() => import('./views/client/ChatListView').then(m => ({ default: m.ChatListView })));
const ChatDetailView = React.lazy(() => import('./views/client/ChatDetailView').then(m => ({ default: m.ChatDetailView })));
const ProfileView = React.lazy(() => import('./views/client/ProfileView').then(m => ({ default: m.ProfileView })));
const FavoritesListView = React.lazy(() => import('./views/client/FavoritesListView').then(m => ({ default: m.FavoritesListView })));
const SettingsView = React.lazy(() => import('./views/client/SettingsView').then(m => ({ default: m.SettingsView })));
const MarketplaceView = React.lazy(() => import('./views/artisan/MarketplaceView').then(m => ({ default: m.MarketplaceView })));
const LoginView = React.lazy(() => import('./views/auth/LoginView').then(m => ({ default: m.LoginView })));
const RegisterClientView = React.lazy(() => import('./views/auth/RegisterClientView').then(m => ({ default: m.RegisterClientView })));
const RegisterArtisanView = React.lazy(() => import('./views/auth/RegisterArtisanView').then(m => ({ default: m.RegisterArtisanView })));
const VerifyEmailView = React.lazy(() => import('./views/auth/VerifyEmailView').then(m => ({ default: m.VerifyEmailView })));
const UpdateEmailView = React.lazy(() => import('./views/auth/UpdateEmailView').then(m => ({ default: m.UpdateEmailView })));
const ArtisanHistoryView = React.lazy(() => import('./views/artisan/ArtisanHistoryView').then(m => ({ default: m.ArtisanHistoryView })));
const NotificationCenter = React.lazy(() => import('./views/common/NotificationCenter').then(m => ({ default: m.NotificationCenter })));

// --- Loading Spinner for Suspense fallback ---
const ViewLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
);

export const App = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

const AppContent = () => {
    const {
        view, setView,
        artisans,
        orders,
        archivedOrders,
        loading,
        authLoading,
        isDarkMode, setIsDarkMode,
        authUser,
        userProfile, setUserProfile,
        userRole, setUserRole,
        showVerifyEmail, setShowVerifyEmail,
        favorites,
        chats,
        selectedChat, setSelectedChat,
        selectedArtisan, setSelectedArtisan,
        selectedOrder, setSelectedOrder,
        selectedCategory, setSelectedCategory,
        selectedPortfolioItem, setSelectedPortfolioItem,
        categorySource, setCategorySource,
        artisanSource, setArtisanSource,
        allCategoriesSource, setAllCategoriesSource,
        chatSource, setChatSource,
        workSource, setWorkSource,
        searchFilterCategory, setSearchFilterCategory,
        searchFilterRating, setSearchFilterRating,
        reviewRatingFilter, setReviewRatingFilter,
        handleLogout,
        openChatWithArtisan,
        handleOpenArtisanProfile,
        handleCreateOrder,
        toggleFavorite,
        toggleRole,
        handleToggleOnline,
        userLocation,
        refreshLocation,
        handleDeleteOrder,
        toast,
        setToast,
        showToast,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications
    } = useAppLogic();

    const [authMode, setAuthMode] = React.useState<'login' | 'signup-client' | 'signup-artisan'>('login');
    const [isOnline, setIsOnline] = React.useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => { window.scrollTo(0, 0); }, [view]);

    if (!isOnline) {
        return <OfflineView onRetry={() => setIsOnline(navigator.onLine)} />;
    }

    const liveSelectedOrder = useMemo(() => selectedOrder
        ? (orders.find(o => o.id === selectedOrder.id) || archivedOrders.find(o => o.id === selectedOrder.id) || selectedOrder)
        : null, [selectedOrder, orders, archivedOrders]);

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center">
                <div className="size-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center animate-pulse mb-6 shadow-2xl">
                    <Hammer className="size-10 text-white" />
                </div>
                <h2 className="text-xl font-black text-white uppercase tracking-widest animate-pulse">VORK</h2>
            </div>
        );
    }

    if (!authUser || !userProfile) {
        if (authMode === 'login') {
            return <LoginView
                onLoginSuccess={(data, role) => {
                    setUserProfile(data);
                    setUserRole(role);
                }}
                onSwitchToSignup={() => setAuthMode('signup-client')}
            />;
        }
        if (authMode === 'signup-client') {
            return <RegisterClientView
                onRegisterSuccess={(data, role) => {
                    setUserProfile(data);
                    setUserRole(role);
                }}
                onSwitchToLogin={() => setAuthMode('login')}
            />;
        }
        if (authMode === 'signup-artisan') {
            return <RegisterArtisanView
                onRegisterSuccess={(data, role) => {
                    setUserProfile(data);
                    setUserRole(role);
                }}
                onSwitchToLogin={() => setAuthMode('login')}
            />;
        }
    }

    if (showVerifyEmail) {
        return <VerifyEmailView email={authUser?.email || ''} onBack={() => setShowVerifyEmail(false)} onLogout={handleLogout} />;
    }

    return (
        <div className={`min-h-screen bg-[#0a0a0c] text-slate-200 transition-colors duration-500`}>
            <header className={`px-6 pt-10 pb-4 sticky top-0 z-40 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center ${['artisan-detail', 'urgent', 'create-order', 'order-detail', 'all-categories', 'category-detail', 'search', 'portfolio', 'work-detail', 'reviews', 'chat-detail', 'chats', 'favorites-list', 'settings', 'marketplace', 'update-email', 'artisan-history'].includes(view) ? 'hidden' : ''}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Hammer className="w-6 h-6 text-white" /></div>
                    <div>
                        <h1 className="text-lg font-black tracking-tighter text-white uppercase leading-none">VORK</h1>
                        <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1">
                            {userRole === 'artisan' ? 'EXPERT' : 'CLIENT'} • MARRAKECH
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleRole} className="px-3 py-2 bg-white/5 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-400 border border-white/5 hover:text-white transition-colors">
                        Vers {userRole === 'user' ? 'Artisan' : 'Client'}
                    </button>
                    <button onClick={() => { setChatSource(view); setView('chats'); }} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center relative active:scale-90 transition-all">
                        <MessageSquare className="w-5 h-5 text-slate-400" />
                        {chats.some(c => userRole === 'artisan' ? (c.unreadCountArtisan || 0) > 0 : (c.unreadCountClient || 0) > 0) && (
                            <>
                                <div className="absolute top-2 right-2 size-2 bg-purple-500 rounded-full animate-ping"></div>
                                <div className="absolute top-2 right-2 size-2 bg-purple-500 rounded-full border border-[#0a0a0c]"></div>
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setView('notifications')}
                        className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center relative active:scale-90 transition-all border border-white/5"
                    >
                        <Bell className="w-5 h-5 text-slate-400" />
                        {notifications.some(n => !n.read) && <div className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border border-[#0a0a0c]"></div>}
                    </button>
                </div>
            </header>

            <main className="max-w-md mx-auto relative min-h-screen">
                <React.Suspense fallback={<ViewLoader />}>
                    {view === 'home' && (
                        userRole === 'artisan' ? (
                            <ArtisanDashboardView
                                artisan={userProfile}
                                activeOrders={orders.filter(o => o.status === 'En cours' || o.status === 'Accepté')}
                                archivedOrders={archivedOrders.filter(o => o.artisanId === userProfile.id)}
                                onViewOrder={(o) => { setSelectedOrder(o); setView('order-detail'); }}
                                setView={setView}
                                onToggleOnline={handleToggleOnline}
                            />
                        ) : (
                            <HomeView userRole={userRole || 'user'} setView={setView} artisans={artisans} userLocation={userLocation} setSelectedArtisan={(art) => { setSelectedArtisan(art); setArtisanSource('home'); setView('artisan-detail'); }} openCategory={(cat) => { setSelectedCategory(cat); setCategorySource('home'); setView('create-order'); }} onReserve={(art) => { setSelectedArtisan(art); setSelectedCategory(CATEGORIES.find(c => c.name === art.category)!); setCategorySource('home'); setView('create-order'); }} onOpenAllCategories={() => { setAllCategoriesSource('home'); setView('all-categories'); }} />
                        )
                    )}
                    {view === 'marketplace' && userRole === 'artisan' && userProfile && <MarketplaceView artisan={userProfile} />}
                    {view === 'all-categories' && <AllCategoriesView onBack={() => setView(allCategoriesSource)} onSelectCategory={(cat) => { setSelectedCategory(cat); setCategorySource('all-categories'); setView('create-order'); }} />}
                    {view === 'category-detail' && selectedCategory && <CategoryDetailView category={selectedCategory} artisans={artisans} onBack={() => setView(categorySource)} onSelectArtisan={(art) => { setSelectedArtisan(art); setArtisanSource('category-detail'); setView('artisan-detail'); }} />}
                    {view === 'search' && <SearchView setView={setView} artisans={artisans} userLocation={userLocation} setSelectedArtisan={(art) => { setSelectedArtisan(art); setArtisanSource('search'); setView('artisan-detail'); }} searchFilterCategory={searchFilterCategory} setSearchFilterCategory={setSearchFilterCategory} searchFilterRating={searchFilterRating} setSearchFilterRating={setSearchFilterRating} />}
                    {view === 'chats' && <ChatListView chats={chats} artisans={artisans} onSelectChat={(c) => { setSelectedChat(c); setView('chat-detail'); }} onBack={() => setView(chatSource)} backLabel={view} onHome={() => setView('home')} />}
                    {view === 'chat-detail' && selectedChat && <ChatDetailView chat={selectedChat} onBack={() => setView('chats')} onOpenProfile={handleOpenArtisanProfile} />}
                    {view === 'notifications' && (
                        <NotificationCenter
                            notifications={notifications}
                            onClose={() => setView(chatSource)}
                            onClearAll={clearNotifications}
                            onMarkAllRead={markAllNotificationsAsRead}
                            onMarkAsRead={markNotificationAsRead}
                            onAction={(id, type) => {
                                if (type === 'order_accepted' || type === 'system') {
                                    const ord = orders.find(o => o.id === id) || archivedOrders.find(o => o.id === id);
                                    if (ord) { setSelectedOrder(ord); setView('order-detail'); }
                                } else if (type === 'message') {
                                    const chat = chats.find(c => c.id === id);
                                    if (chat) { setSelectedChat(chat); setView('chat-detail'); }
                                }
                            }}
                        />
                    )}
                    {view === 'bookings' && <OrdersView orders={orders} archivedOrders={archivedOrders} setView={setView} onSelectOrder={(o) => { setSelectedOrder(o); setView('order-detail'); }} onOpenChat={openChatWithArtisan} onDeleteOrder={handleDeleteOrder} />}
                    {view === 'order-detail' && liveSelectedOrder && (
                        userRole === 'artisan'
                            ? <ArtisanOrderDetailView order={liveSelectedOrder} onBack={() => setView('home')} onOpenChat={openChatWithArtisan} />
                            : <ClientOrderDetailView order={liveSelectedOrder} onBack={() => setView('bookings')} onUpdateOrder={async (id, up) => { await updateDoc(doc(db, "orders", id), up); }} onOpenChat={openChatWithArtisan} onOpenArtisanProfile={handleOpenArtisanProfile} showToast={showToast} />
                    )}
                    {view === 'create-order' && selectedCategory && <CreateOrderView category={selectedCategory} userLocation={userLocation} preSelectedArtisan={selectedArtisan && (categorySource === 'artisan-detail' || categorySource === 'home') ? selectedArtisan : undefined} hideArtisanName={categorySource === 'home'} onBack={() => setView(categorySource)} onSubmit={handleCreateOrder} showToast={showToast} />}
                    {view === 'artisan-detail' && selectedArtisan && <ArtisanDetailView art={selectedArtisan} setView={setView} onBack={() => setView(artisanSource)} onOpenChats={() => openChatWithArtisan(selectedArtisan)} reviewRatingFilter={reviewRatingFilter} setReviewRatingFilter={setReviewRatingFilter} onSelectWork={(item) => { setSelectedPortfolioItem(item); setWorkSource('artisan-detail'); setView('work-detail'); }} onReserve={(art) => { setSelectedArtisan(art); setSelectedCategory(CATEGORIES.find(c => c.name === art.category)!); setCategorySource('artisan-detail'); setView('create-order'); }} isFavorite={favorites.includes(selectedArtisan.id)} onToggleFavorite={() => toggleFavorite(selectedArtisan.id)} />}
                    {view === 'portfolio' && selectedArtisan && <PortfolioView art={selectedArtisan} onBack={() => setView('artisan-detail')} onSelectWork={(item) => { setSelectedPortfolioItem(item); setWorkSource('portfolio'); setView('work-detail'); }} />}
                    {view === 'work-detail' && selectedPortfolioItem && selectedArtisan && <WorkDetailView item={selectedPortfolioItem} art={selectedArtisan} onBack={() => setView(workSource)} />}
                    {view === 'reviews' && selectedArtisan && <AllReviewsView art={selectedArtisan} onBack={() => setView('artisan-detail')} />}
                    {view === 'urgent' && <UrgentView userLocation={userLocation} onClose={() => setView('home')} onAddOrder={handleCreateOrder} />}
                    {view === 'profile' && userProfile && <ProfileView user={userProfile} setUser={setUserProfile} onLogout={handleLogout} favoritesCount={favorites.length} onOpenFavorites={() => setView('favorites-list')} onOpenSettings={() => setView('settings')} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} onUpdateEmail={() => setView('update-email')} />}
                    {view === 'favorites-list' && <FavoritesListView favoriteIds={favorites} artisans={artisans} onBack={() => setView('profile')} onSelectArtisan={(art) => { setSelectedArtisan(art); setArtisanSource('favorites-list'); setView('artisan-detail'); }} />}
                    {view === 'settings' && <SettingsView onBack={() => setView('profile')} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />}
                    {view === 'update-email' && <UpdateEmailView onBack={() => setView('profile')} onSuccess={(newEmail) => { setUserProfile({ ...userProfile, email: newEmail }); setView('profile'); }} userRole={userRole} />}
                    {view === 'artisan-history' && <ArtisanHistoryView orders={archivedOrders.filter(o => o.artisanId === userProfile.id)} onBack={() => setView('home')} onViewOrder={(o) => { setSelectedOrder(o); setView('order-detail'); }} />}
                </React.Suspense>
            </main>

            <Navbar
                activeView={view}
                setView={setView}
                onPlusClick={() => { setAllCategoriesSource(view); setView('all-categories'); }}
                userRole={userRole || undefined}
                hasUnread={chats.some(c => userRole === 'artisan' ? (c.unreadCountArtisan || 0) > 0 : (c.unreadCountClient || 0) > 0)}
            />
            <InstallPWA />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};
