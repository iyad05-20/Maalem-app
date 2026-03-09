
import React, { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase.config';
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, signOut, User as FirebaseUser } from "firebase/auth";
import { sanitizeFirestoreData, migrateUrl } from '../utils';

export const useAuthLogic = () => {
    const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [userRole, setUserRole] = useState<'user' | 'artisan'>('user');
    const [authLoading, setAuthLoading] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('vork-theme');
        return saved === null ? true : saved === 'dark';
    });
    const [showVerifyEmail, setShowVerifyEmail] = useState(false);
    const [favorites, setFavorites] = useState<string[]>([]);

    const loadUserProfile = async (uid: string) => {
        try {
            // Check users collection
            let docSnap = await getDoc(doc(db, 'users', uid));
            let role: 'user' | 'artisan' = 'user';

            if (!docSnap.exists()) {
                // Check artisans collection
                docSnap = await getDoc(doc(db, 'artisans', uid));
                role = 'artisan';
            }

            if (docSnap.exists()) {
                const data = sanitizeFirestoreData(docSnap.data());
                const profileData = { ...data, id: docSnap.id };
                profileData.image = migrateUrl(profileData.image || profileData.avatar);
                setUserProfile(profileData);
                setUserRole(role);
                setFavorites(data.favorites || []);
            }
        } catch (e) {
            console.error("Error loading profile:", e);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setAuthUser(user);
            if (user) {
                if (!user.emailVerified) {
                    setShowVerifyEmail(true);
                }
                await loadUserProfile(user.uid);
            } else {
                setUserProfile(null);
                setFavorites([]);
                setShowVerifyEmail(false);
            }
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (e) {
            console.error("Logout error:", e);
        }
    };

    return {
        authUser,
        setAuthUser,
        userProfile,
        setUserProfile,
        userRole,
        setUserRole,
        authLoading,
        showVerifyEmail,
        setShowVerifyEmail,
        favorites,
        setFavorites,
        isDarkMode,
        setIsDarkMode,
        handleLogout
    };
};
