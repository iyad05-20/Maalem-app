
import React, { useEffect, useMemo } from 'react';
import { Hammer, MessageSquare, Loader2, Bell } from 'lucide-react';

import { CATEGORIES } from './data/mockData';
import { SmartAvatar } from './components/Shared/SmartAvatar';
import { Navbar } from './components/Navigation/Navbar';
import { useAppLogic } from './hooks/useAppLogic';
import { db } from './services/firebase.config';
import { AuthProvider, useAuth } from './context/AuthContext';
import { updateDoc, doc } from "firebase/firestore";
import InstallPWA from './components/common/InstallPWA';
import { OfflineView } from './views/common/OfflineView';
import { Toast } from './components/common/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Header } from './components/Navigation/Header';


import { ViewSwitcher } from './components/Navigation/ViewSwitcher';

// Authentication Views (needed for main auth flow)
const LoginView = React.lazy(() => import('./views/auth/LoginView').then(m => ({ default: m.LoginView })));
const RegisterClientView = React.lazy(() => import('./views/auth/RegisterClientView').then(m => ({ default: m.RegisterClientView })));
const RegisterArtisanView = React.lazy(() => import('./views/auth/RegisterArtisanView').then(m => ({ default: m.RegisterArtisanView })));
const VerifyEmailView = React.lazy(() => import('./views/auth/VerifyEmailView').then(m => ({ default: m.VerifyEmailView })));


export const App = () => {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </ErrorBoundary>
    );
};

const AppContent = () => {
    const appLogic = useAppLogic();
    
    const {
        view, setView,
        userRole, setUserRole,
        authUser,
        userProfile, setUserProfile,
        loading,
        artisans,
        userLocation,
        orders,
        archivedOrders,
        chats,
        notifications,
        authMode, setAuthMode,
        showVerifyEmail, setShowVerifyEmail,
        handleLogout,
        handleToggleOnline,
        handleDeleteOrder,
        handleCreateOrder,
        handleOpenArtisanProfile,
        openChatWithArtisan,
        clearNotifications,
        markAllNotificationsAsRead,
        markNotificationAsRead,
        showToast,
        favorites,
        toggleFavorite,
        toggleRole,
        isDarkMode, setIsDarkMode,
        selectedArtisan, setSelectedArtisan,
        selectedCategory, setSelectedCategory,
        selectedChat, setSelectedChat,
        selectedOrder, setSelectedOrder,
        selectedPortfolioItem, setSelectedPortfolioItem,
        categorySource, setCategorySource,
        artisanSource, setArtisanSource,
        allCategoriesSource, setAllCategoriesSource,
        chatSource, setChatSource,
        workSource, setWorkSource,
        searchFilterCategory, setSearchFilterCategory,
        searchFilterRating, setSearchFilterRating,
        reviewRatingFilter, setReviewRatingFilter,
        liveSelectedOrder,
        toast, setToast
    } = appLogic;



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



    const isDarkModeValue = isDarkMode; // Guard for naming

    if (appLogic.authLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center">
                <div className="size-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center animate-pulse mb-6 shadow-2xl overflow-hidden">
                    <img src="/icons/icon-192x192.png" alt="Vork Logo" className="w-12 h-12 object-contain" />
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
            <Header
                view={view}
                userRole={userRole || 'user'}
                userProfile={userProfile}
                chats={chats}
                notifications={notifications}
                onToggleRole={toggleRole}
                onOpenChats={() => { setChatSource(view); setView('chats'); }}
                onOpenNotifications={() => setView('notifications')}
            />

            <main className="max-w-md mx-auto relative min-h-screen">
                <ViewSwitcher {...appLogic} />
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
