import React from 'react';
import { Loader2 } from 'lucide-react';
import { View, Artisan, Order, Chat, Notification, Category, PortfolioItem, Coordinates } from '../../types';
import { CATEGORIES } from '../../data/mockData';
import { db } from '../../services/firebase.config';
import { doc, updateDoc } from "firebase/firestore";

// --- Lazy-loaded Views (code-split into separate chunks) ---
const HomeView = React.lazy(() => import('../../views/client/HomeView').then(m => ({ default: m.HomeView })));
const ArtisanDashboardView = React.lazy(() => import('../../views/artisan/ArtisanDashboardView').then(m => ({ default: m.ArtisanDashboardView })));
const SearchView = React.lazy(() => import('../../views/client/SearchView').then(m => ({ default: m.SearchView })));
const ArtisanDetailView = React.lazy(() => import('../../views/client/ArtisanDetailView').then(m => ({ default: m.ArtisanDetailView })));
const AllCategoriesView = React.lazy(() => import('../../views/client/AllCategoriesView').then(m => ({ default: m.AllCategoriesView })));
const CategoryDetailView = React.lazy(() => import('../../views/client/CategoryDetailView').then(m => ({ default: m.CategoryDetailView })));
const PortfolioView = React.lazy(() => import('../../views/client/PortfolioView').then(m => ({ default: m.PortfolioView })));
const WorkDetailView = React.lazy(() => import('../../views/client/WorkDetailView').then(m => ({ default: m.WorkDetailView })));
const AllReviewsView = React.lazy(() => import('../../views/client/AllReviewsView').then(m => ({ default: m.AllReviewsView })));
const UrgentView = React.lazy(() => import('../../views/client/UrgentView').then(m => ({ default: m.UrgentView })));
const OrdersView = React.lazy(() => import('../../views/client/OrdersView').then(m => ({ default: m.OrdersView })));
const CreateOrderView = React.lazy(() => import('../../views/client/CreateOrderView').then(m => ({ default: m.CreateOrderView })));
const ClientOrderDetailView = React.lazy(() => import('../../views/client/ClientOrderDetailView').then(m => ({ default: m.ClientOrderDetailView })));
const ArtisanOrderDetailView = React.lazy(() => import('../../views/artisan/ArtisanOrderDetailView').then(m => ({ default: m.ArtisanOrderDetailView })));
const ChatListView = React.lazy(() => import('../../views/client/ChatListView').then(m => ({ default: m.ChatListView })));
const ChatDetailView = React.lazy(() => import('../../views/client/ChatDetailView').then(m => ({ default: m.ChatDetailView })));
const ProfileView = React.lazy(() => import('../../views/client/ProfileView').then(m => ({ default: m.ProfileView })));
const FavoritesListView = React.lazy(() => import('../../views/client/FavoritesListView').then(m => ({ default: m.FavoritesListView })));
const SettingsView = React.lazy(() => import('../../views/client/SettingsView').then(m => ({ default: m.SettingsView })));
const MarketplaceView = React.lazy(() => import('../../views/artisan/MarketplaceView').then(m => ({ default: m.MarketplaceView })));
const UpdateEmailView = React.lazy(() => import('../../views/auth/UpdateEmailView').then(m => ({ default: m.UpdateEmailView })));
const ArtisanHistoryView = React.lazy(() => import('../../views/artisan/ArtisanHistoryView').then(m => ({ default: m.ArtisanHistoryView })));
const NotificationCenter = React.lazy(() => import('../../views/common/NotificationCenter').then(m => ({ default: m.NotificationCenter })));

interface ViewSwitcherProps {
    view: View;
    userRole: 'user' | 'artisan';
    userProfile: any;
    artisans: Artisan[];
    userLocation: Coordinates | null;
    orders: Order[];
    archivedOrders: Order[];
    chats: Chat[];
    notifications: Notification[];
    setView: (view: View) => void;
    setSelectedArtisan: (art: Artisan) => void;
    setArtisanSource: (view: View) => void;
    setSelectedCategory: (cat: Category) => void;
    setCategorySource: (view: View) => void;
    setAllCategoriesSource: (view: View) => void;
    setSelectedChat: (chat: Chat) => void;
    setSelectedOrder: (order: Order) => void;
    setSelectedPortfolioItem: (item: PortfolioItem) => void;
    setWorkSource: (view: View) => void;
    handleLogout: () => void;
    handleToggleOnline: (online: boolean) => void;
    handleDeleteOrder: (order: Order) => Promise<void> | void;
    handleCreateOrder: (order: any) => Promise<void>;
    handleOpenArtisanProfile: (id: string) => void;
    openChatWithArtisan: (artisan: Artisan) => void;
    clearNotifications: () => void;
    markAllNotificationsAsRead: () => void;
    markNotificationAsRead: (id: string) => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
    favorites: string[];
    toggleFavorite: (id: string) => void;
    isDarkMode: boolean;
    setIsDarkMode: (dark: boolean) => void;
    reviewRatingFilter: number | 'Tous';
    setReviewRatingFilter: (n: number | 'Tous') => void;
    allCategoriesSource: View;
    categorySource: View;
    artisanSource: View;
    chatSource: View;
    workSource: View;
    loading: boolean;
    searchFilterCategory: string;
    setSearchFilterCategory: (c: string) => void;
    searchFilterRating: number | 'Tous';
    setSearchFilterRating: (n: number | 'Tous') => void;
    liveSelectedOrder: Order | null;
    selectedCategory: Category | null;
    selectedArtisan: Artisan | null;
    selectedChat: Chat | null;
    selectedPortfolioItem: PortfolioItem | null;
    setUserProfile: (profile: any) => void;
}

const ViewLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
    </div>
);

export const ViewSwitcher: React.FC<ViewSwitcherProps> = (props) => {
    const {
        view, userRole, userProfile, artisans, userLocation, orders, archivedOrders,
        chats, notifications, setView, setSelectedArtisan, setArtisanSource,
        setSelectedCategory, setCategorySource, setAllCategoriesSource,
        setSelectedChat, setSelectedOrder, setSelectedPortfolioItem, setWorkSource,
        handleLogout, handleToggleOnline, handleDeleteOrder, handleCreateOrder,
        handleOpenArtisanProfile, openChatWithArtisan, clearNotifications,
        markAllNotificationsAsRead, markNotificationAsRead, showToast, favorites,
        toggleFavorite, isDarkMode, setIsDarkMode, reviewRatingFilter,
        setReviewRatingFilter, allCategoriesSource, categorySource, artisanSource,
        chatSource, workSource, loading, searchFilterCategory,
        setSearchFilterCategory, searchFilterRating, setSearchFilterRating,
        liveSelectedOrder, selectedCategory, selectedArtisan, selectedChat,
        selectedPortfolioItem, setUserProfile
    } = props;

    return (
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
                    <HomeView userRole={userRole || 'user'} setView={setView} artisans={artisans} userLocation={userLocation} setSelectedArtisan={(art) => { setSelectedArtisan(art); setArtisanSource('home'); setView('artisan-detail'); }} openCategory={(cat) => { setSelectedCategory(cat); setCategorySource('home'); setView('create-order'); }} onReserve={(art) => { setSelectedArtisan(art); setSelectedCategory(CATEGORIES.find(c => c.name === art.category)!); setCategorySource('home'); setView('create-order'); }} onOpenAllCategories={() => { setAllCategoriesSource('home'); setView('all-categories'); }} loading={loading} />
                )
            )}
            {view === 'marketplace' && userRole === 'artisan' && userProfile && <MarketplaceView artisan={userProfile} />}
            {view === 'all-categories' && <AllCategoriesView onBack={() => setView(allCategoriesSource)} onSelectCategory={(cat) => { setSelectedCategory(cat); setCategorySource('all-categories'); setView('create-order'); }} />}
            {view === 'category-detail' && selectedCategory && <CategoryDetailView category={selectedCategory} artisans={artisans} onBack={() => setView(categorySource)} onSelectArtisan={(art) => { setSelectedArtisan(art); setArtisanSource('category-detail'); setView('artisan-detail'); }} />}
            {view === 'search' && <SearchView setView={setView} artisans={artisans} userLocation={userLocation} setSelectedArtisan={(art) => { setSelectedArtisan(art); setArtisanSource('search'); setView('artisan-detail'); }} searchFilterCategory={searchFilterCategory} setSearchFilterCategory={setSearchFilterCategory} searchFilterRating={searchFilterRating} setSearchFilterRating={setSearchFilterRating} loading={loading} />}
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
    );
};
