
import { useState, useEffect } from 'react';
import { db } from '../services/firebase.config';
import { collection, query, where, onSnapshot, or } from "firebase/firestore";
import { Chat } from '../types';
import { sanitizeFirestoreData } from '../utils';

export const useChatsLogic = (userId: string | undefined) => {
    const [chats, setChats] = useState<Chat[]>([]);
    const [chatsLoading, setChatsLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setChats([]);
            setChatsLoading(false);
            return;
        }

        setChatsLoading(true);
        // Use 'or' query to support both participants array and legacy userId/artisanId fields
        const chatsQuery = query(
            collection(db, "chats"),
            or(
                where("participants", "array-contains", userId),
                where("userId", "==", userId),
                where("artisanId", "==", userId)
            )
        );

        const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => ({
                ...sanitizeFirestoreData(doc.data()),
                id: doc.id
            })) as Chat[];
            setChats(chatsData);
            setChatsLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { chats, chatsLoading };
};
