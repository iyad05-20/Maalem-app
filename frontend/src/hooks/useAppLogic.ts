
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Category, Artisan, PortfolioItem, Chat, Order, Notification } from '../types';
import { CATEGORIES } from '../data/mockData';
import { sanitizeFirestoreData, migrateUrl } from '../utils';
import { db, auth } from '../services/firebase.config';
import { findBestArtisans } from '../services/recommendation.service';
import { useLocationTracker } from './useLocationTracker';
import {
    collection,
    doc,
    getDoc,
    updateDoc,
    setDoc,
    deleteDoc,
    getDocs,
    onSnapshot,
    query,
    orderBy,
    limit,
    where,
    or
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

export const useAppLogic = () => {
    const [view, setView] = useState<View>('home');
    const [artisans, setArtisans] = useState<Artisan[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [archivedOrders, setArchivedOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('vork-theme');
        return saved === null ? true : saved === 'dark';
    });

    const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [userRole, setUserRole] = useState<'user' | 'artisan'>('user');
    const [showVerifyEmail, setShowVerifyEmail] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const [favorites, setFavorites] = useState<string[]>([]);

    // Initialize Location Tracker
    const { location: userLocation, refreshLocation } = useLocationTracker(userProfile?.id, userRole);

    const [chats, setChats] = useState<Chat[]>([]);
    const [selectedChat, setSelectedChat] = useState<Chat | null>(null);

    const [selectedArtisan, setSelectedArtisan] = useState<Artisan | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [selectedPortfolioItem, setSelectedPortfolioItem] = useState<PortfolioItem | null>(null);

    const [categorySource, setCategorySource] = useState<View>('home');
    const [artisanSource, setArtisanSource] = useState<View>('home');
    const [allCategoriesSource, setAllCategoriesSource] = useState<View>('home');
    const [chatSource, setChatSource] = useState<View>('home');
    const [workSource, setWorkSource] = useState<View>('portfolio');

    const [searchFilterCategory, setSearchFilterCategory] = useState<string>('Tous');
    const [searchFilterRating, setSearchFilterRating] = useState<number | 'Tous'>('Tous');
    const [reviewRatingFilter, setReviewRatingFilter] = useState<number | 'Tous'>('Tous');

    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
    };

    const loadUserProfile = useCallback(async (uid: string, roleToTry: 'user' | 'artisan') => {
        try {
            const collectionName = roleToTry === 'artisan' ? 'artisans' : 'users';
            let docSnap = await getDoc(doc(db, collectionName, uid));

            if (!docSnap.exists()) {
                const otherRole = roleToTry === 'user' ? 'artisan' : 'user';
                const otherCollection = otherRole === 'artisan' ? 'artisans' : 'users';
                docSnap = await getDoc(doc(db, otherCollection, uid));

                if (docSnap.exists()) {
                    setUserRole(otherRole);
                }
            }

            if (docSnap.exists()) {
                const data = sanitizeFirestoreData(docSnap.data());
                const profileData = { ...data, id: docSnap.id };
                profileData.image = migrateUrl(profileData.image || profileData.avatar);
                setUserProfile(profileData);
                setFavorites(data.favorites || []);
            }
        } catch (e) {
            console.error("Error loading profile:", e);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setAuthUser(user);
            if (user) {
                if (!user.emailVerified && false) {
                    setShowVerifyEmail(true);
                } else {
                    setShowVerifyEmail(false);
                    await loadUserProfile(user.uid, userRole);
                }
            } else {
                setUserProfile(null);
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, [userRole, loadUserProfile]);

    useEffect(() => {
        if (!userProfile?.id) return;

        setLoading(true);

        const qArt = query(collection(db, "artisans"), orderBy("rating", "desc"), limit(20));
        const unsubArt = onSnapshot(qArt, (snapshot) => {
            setArtisans(snapshot.docs.map(doc => {
                const data = sanitizeFirestoreData(doc.data());
                const imgUrl = migrateUrl(data.image || data.avatar);
                return { ...data, id: doc.id, image: imgUrl };
            }) as Artisan[]);
            setLoading(false);
        });

        const qOrd = userRole === 'artisan'
            ? query(collection(db, "orders"), or(where("artisanId", "==", userProfile.id), where("targetedArtisans", "array-contains", userProfile.id)))
            : query(collection(db, "orders"), where("userId", "==", userProfile.id));

        const unsubOrd = onSnapshot(qOrd, (snapshot) => {
            const sorted = snapshot.docs
                .map(doc => ({ ...sanitizeFirestoreData(doc.data()), id: doc.id }))
                .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setOrders(sorted as Order[]);
        });

        const qArchived = userRole === 'artisan'
            ? query(collection(db, "archivedOrders"), where("artisanId", "==", userProfile.id))
            : query(collection(db, "archivedOrders"), where("userId", "==", userProfile.id));

        const unsubArchived = onSnapshot(qArchived, (snapshot) => {
            const sorted = snapshot.docs
                .map(doc => ({ ...sanitizeFirestoreData(doc.data()), id: doc.id }))
                .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setArchivedOrders(sorted as Order[]);
        });

        const qChat = userRole === 'artisan'
            ? query(collection(db, "chats"), where("artisanId", "==", userProfile.id))
            : query(collection(db, "chats"), where("userId", "==", userProfile.id));

        const unsubChat = onSnapshot(qChat, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "modified") {
                    const data = change.doc.data();
                    const oldData = snapshot.docs.find(d => d.id === change.doc.id)?.data();
                    const field = userRole === 'artisan' ? 'unreadCountArtisan' : 'unreadCountClient';
                    if (data[field] > (oldData?.[field] || 0)) {
                        showToast(`Nouveau message de ${userRole === 'artisan' ? data.userName : data.artisanName}`, "info");
                    }
                }
            });
            setChats(snapshot.docs.map(doc => ({ ...sanitizeFirestoreData(doc.data()), id: doc.id })) as Chat[]);
        });

        // Query without orderBy to avoid composite index requirement - sort client-side
        const qNotif = query(
            collection(db, "notifications"),
            where("userId", "==", userProfile.id),
            limit(50)
        );
        const unsubNotif = onSnapshot(qNotif, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    // Show toast only for notifications received in last 5 seconds (real-time)
                    if (data.createdAt && new Date().getTime() - new Date(data.createdAt).getTime() < 5000) {
                        showToast(data.title, data.type === 'order_accepted' ? 'success' : 'info');
                    }
                }
            });
            // Sort client-side descending by createdAt
            const sorted = snapshot.docs
                .map(doc => ({ ...sanitizeFirestoreData(doc.data()), id: doc.id }))
                .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setNotifications(sorted as Notification[]);
        });

        return () => { unsubArt(); unsubOrd(); unsubChat(); unsubArchived(); unsubNotif(); };
    }, [userProfile?.id, userRole]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
        document.documentElement.classList.toggle('light', !isDarkMode);
        localStorage.setItem('vork-theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUserProfile(null);
            setView('home');
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    const markNotificationAsRead = async (id: string) => {
        try {
            await updateDoc(doc(db, "notifications", id), { read: true });
        } catch (e) {
            console.error("Error marking notification read", e);
        }
    };

    const markAllNotificationsAsRead = async () => {
        try {
            const unread = notifications.filter(n => !n.read);
            for (const n of unread) {
                await updateDoc(doc(db, "notifications", n.id), { read: true });
            }
        } catch (e) {
            console.error("Error marking all notifications read", e);
        }
    };

    const clearNotifications = async () => {
        try {
            for (const n of notifications) {
                await deleteDoc(doc(db, "notifications", n.id));
            }
        } catch (e) {
            console.error("Error clearing notifications", e);
        }
    };

    const openChatWithArtisan = async (target: Partial<Artisan>) => {
        if (!userProfile) return;

        let clientId: string;
        let artisanId: string;
        let artisanName: string;
        let artisanImage: string;
        let userName: string;
        let userImage: string;

        if (userRole === 'artisan') {
            clientId = target.id || 'unknown';
            userName = target.name || 'Client';
            userImage = target.image || (target as any).avatar || '';

            if (clientId !== 'unknown' && userName === 'Client') {
                try {
                    const userSnap = await getDoc(doc(db, 'users', clientId));
                    if (userSnap.exists()) {
                        const userData = userSnap.data();
                        userName = userData.name || 'Client';
                        userImage = userData.avatar || userData.image || '';
                    }
                } catch (err) {
                    console.warn("Could not fetch user profile for chat", err);
                }
            }

            artisanId = userProfile.id;
            artisanName = userProfile.name;
            artisanImage = userProfile.avatar || userProfile.image;
        } else {
            clientId = userProfile.id;
            userName = userProfile.name;
            userImage = userProfile.avatar || userProfile.image;

            artisanId = target.id || 'unknown';
            artisanName = target.name || 'Expert';
            artisanImage = target.image || '';
        }

        const chatDocId = `${clientId}_${artisanId}`;

        try {
            const chatSnap = await getDoc(doc(db, "chats", chatDocId));
            if (chatSnap.exists()) {
                const existingData = sanitizeFirestoreData(chatSnap.data());
                const updatedChat = {
                    ...existingData,
                    id: chatSnap.id,
                    userName: userName || existingData.userName,
                    userImage: userImage || existingData.userImage,
                    artisanName: artisanName || existingData.artisanName,
                    artisanImage: artisanImage || existingData.artisanImage
                } as Chat;

                if (userName && userName !== existingData.userName) {
                    updateDoc(doc(db, "chats", chatDocId), { userName, userImage });
                }

                setSelectedChat(updatedChat);
                setView('chat-detail');
            } else {
                const newChat: any = {
                    id: chatDocId,
                    userId: clientId,
                    userName: userName || 'Client',
                    userImage: userImage || '',
                    artisanId: artisanId,
                    artisanName: artisanName || 'Expert',
                    artisanImage: artisanImage || '',
                    lastMessage: "Début de la conversation",
                    lastMessageTime: new Date().toISOString(),
                    unreadCount: 0,
                    unreadCountClient: 0,
                    unreadCountArtisan: 0,
                    isArtisanOnline: userRole === 'artisan'
                        ? (userProfile?.isExplicitlyOnline || false)
                        : (artisans.find(a => a.id === artisanId)?.isExplicitlyOnline || false)
                };
                await setDoc(doc(db, "chats", chatDocId), newChat);
                setSelectedChat(newChat as Chat);
                setView('chat-detail');
            }
        } catch (e) {
            console.error("Error opening chat:", e);
        }
    };

    const handleOpenArtisanProfile = async (id: string | undefined) => {
        if (!id || id === 'unknown') return;
        const found = artisans.find(a => a.id === id);
        setArtisanSource(view === 'chat-detail' ? 'chats' : (view === 'order-detail' ? 'bookings' : view));
        if (found) {
            setSelectedArtisan(found);
            setView('artisan-detail');
        } else {
            const docSnap = await getDoc(doc(db, "artisans", id));
            if (docSnap.exists()) {
                const data = sanitizeFirestoreData(docSnap.data());
                const artData = { ...data, id: docSnap.id };
                if (!artData.image && artData.avatar) artData.image = artData.avatar;
                setSelectedArtisan(artData as Artisan);
                setView('artisan-detail');
            }
        }
    };

    const handleCreateOrder = async (newOrder: Order): Promise<void> => {
        if (!userProfile) return;

        let targetedIds = newOrder.targetedArtisans || [];

        if (targetedIds.length === 0) {
            targetedIds = await findBestArtisans(newOrder.category, 1);
        }

        const orderData: any = {
            ...newOrder,
            userId: userProfile.id,
            userName: userProfile.name,
            userAvatar: userProfile.avatar || userProfile.image || '',
            locationCoords: userLocation || newOrder.locationCoords,
            targetedArtisans: Array.isArray(targetedIds) ? targetedIds : [],
            searchRadius: 1,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, "orders", newOrder.id), orderData);
        setView('bookings');
    };

    const handleDeleteOrder = async (order: Order) => {
        if (order.status !== "EN ATTENTE D'EXPERT") {
            showToast("Impossible de supprimer une commande acceptée ou terminée.", "error");
            return;
        }

        try {
            // 1. Delete quotes sub-collection first
            const quotesRef = collection(db, "orders", order.id, "quotes");
            const quotesSnap = await getDocs(quotesRef);
            const deletePromises = quotesSnap.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);

            // 2. Delete the order document
            await deleteDoc(doc(db, "orders", order.id));
            showToast("Commande supprimée avec succès.", "success");
        } catch (e) {
            console.error("Error deleting order:", e);
            showToast("Erreur lors de la suppression de la commande.", "error");
        }
    };

    const toggleFavorite = async (artisanId: string) => {
        if (!userProfile) return;
        const newFavorites = favorites.includes(artisanId) ? favorites.filter(id => id !== artisanId) : [...favorites, artisanId];
        setFavorites(newFavorites);
        const collectionName = userRole === 'artisan' ? 'artisans' : 'users';
        try {
            await updateDoc(doc(db, collectionName, userProfile.id), { favorites: newFavorites });
        } catch (e) {
            console.warn("Fav update failed", e);
            showToast("Impossible de mettre à jour les favoris.", "error");
        }
    };

    const toggleRole = () => {
        const newRole = userRole === 'user' ? 'artisan' : 'user';
        setUserRole(newRole);

        // Reset interactive selection states to avoid stale UI
        setSelectedArtisan(null);
        setSelectedOrder(null);
        setSelectedChat(null);
        setSelectedCategory(null);
        setSelectedPortfolioItem(null);

        loadUserProfile(authUser!.uid, newRole);
        setView('home');
    };

    const handleToggleOnline = async (status: boolean) => {
        if (!userProfile || userRole !== 'artisan') return;
        try {
            await updateDoc(doc(db, "artisans", userProfile.id), {
                isExplicitlyOnline: status
            });

            // Propagation logic for Batch 6
            const myChats = chats.filter(c => c.artisanId === userProfile.id);
            const updatePromises = myChats.map(c =>
                updateDoc(doc(db, "chats", c.id), { isArtisanOnline: status })
            );
            await Promise.all(updatePromises);

            setUserProfile({ ...userProfile, isExplicitlyOnline: status });
            showToast(`Statut mis à jour: ${status ? 'En ligne' : 'Hors ligne'}`, status ? "success" : "info");
        } catch (e) {
            console.error("Error toggling online status", e);
            showToast("Erreur lors de la mise à jour du statut", "error");
        }
    };

    return {
        view, setView,
        artisans,
        orders,
        archivedOrders,
        loading,
        authLoading,
        isDarkMode, setIsDarkMode,
        authUser, setAuthUser,
        userProfile, setUserProfile,
        userRole, setUserRole,
        showVerifyEmail, setShowVerifyEmail,
        favorites, setFavorites,
        chats, setChats,
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
        loadUserProfile,
        handleLogout,
        openChatWithArtisan,
        handleOpenArtisanProfile,
        handleCreateOrder,
        handleDeleteOrder,
        toggleFavorite,
        toggleRole,
        handleToggleOnline,
        userLocation,
        refreshLocation,
        toast,
        showToast,
        setToast,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications
    };
};
