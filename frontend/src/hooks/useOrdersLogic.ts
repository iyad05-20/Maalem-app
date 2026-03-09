
import { useState, useEffect } from 'react';
import { db } from '../services/firebase.config';
import { collection, query, where, onSnapshot, orderBy, or } from "firebase/firestore";
import { Order, Notification } from '../types';
import { sanitizeFirestoreData } from '../utils';

export const useOrdersLogic = (userId: string | undefined, userRole: 'user' | 'artisan') => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [archivedOrders, setArchivedOrders] = useState<Order[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setOrders([]);
            setArchivedOrders([]);
            setNotifications([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        // Active Orders Listener
        const ordersQuery = userRole === 'artisan'
            ? query(collection(db, "orders"), or(where("artisanId", "==", userId), where("isPublic", "==", true)))
            : query(collection(db, "orders"), where("userId", "==", userId));

        const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
            const ordersData = snapshot.docs.map(doc => ({
                ...sanitizeFirestoreData(doc.data()),
                id: doc.id
            })) as Order[];
            setOrders(ordersData);
            setLoading(false);
        });

        // Archived Orders Listener
        const archivedQuery = userRole === 'artisan'
            ? query(collection(db, "archivedOrders"), where("artisanId", "==", userId))
            : query(collection(db, "archivedOrders"), where("userId", "==", userId));

        const unsubArchived = onSnapshot(archivedQuery, (snapshot) => {
            const archivedData = snapshot.docs.map(doc => ({
                ...sanitizeFirestoreData(doc.data()),
                id: doc.id
            })) as Order[];
            setArchivedOrders(archivedData);
        });

        // Notifications Listener
        const notifsQuery = query(
            collection(db, "notifications"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const unsubNotifs = onSnapshot(notifsQuery, (snapshot) => {
            const notifsData = snapshot.docs.map(doc => ({
                ...sanitizeFirestoreData(doc.data()),
                id: doc.id
            })) as Notification[];
            setNotifications(notifsData);
        });

        return () => {
            unsubOrders();
            unsubArchived();
            unsubNotifs();
        };
    }, [userId, userRole]);

    return { orders, archivedOrders, notifications, ordersLoading: loading };
};
