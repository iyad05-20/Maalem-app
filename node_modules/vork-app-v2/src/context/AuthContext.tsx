
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase.config';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface AuthContextType {
    user: any | null;
    loading: boolean;
    isArtisan: boolean;
    isClient: boolean;
    userRole: 'user' | 'artisan' | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isArtisan: false,
    isClient: false,
    userRole: null
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<any | null>(null);
    const [userRole, setUserRole] = useState<'user' | 'artisan' | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
            setLoading(true);
            if (authUser) {
                // Check artisans collection
                const artisanDoc = await getDoc(doc(db, 'artisans', authUser.uid));
                if (artisanDoc.exists()) {
                    setUser({ ...artisanDoc.data(), id: authUser.uid });
                    setUserRole('artisan');
                } else {
                    // Check users collection
                    const userDoc = await getDoc(doc(db, 'users', authUser.uid));
                    if (userDoc.exists()) {
                        setUser({ ...userDoc.data(), id: authUser.uid });
                        setUserRole('user');
                    } else {
                        setUser(authUser);
                        setUserRole(null);
                    }
                }
            } else {
                setUser(null);
                setUserRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            userRole,
            isArtisan: userRole === 'artisan',
            isClient: userRole === 'user'
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
