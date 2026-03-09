
import React from 'react';
import { MessageSquare, Bell } from 'lucide-react';
import { View } from '../../types';

interface HeaderProps {
    view: View;
    userRole: 'user' | 'artisan';
    userProfile: any;
    chats: any[];
    notifications: any[];
    onToggleRole: () => void;
    onOpenChats: () => void;
    onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    view,
    userRole,
    userProfile,
    chats,
    notifications,
    onToggleRole,
    onOpenChats,
    onOpenNotifications
}) => {
    // Hide header on certain views
    const hiddenViews = [
        'artisan-detail', 'urgent', 'create-order', 'order-detail',
        'all-categories', 'category-detail', 'search', 'portfolio',
        'work-detail', 'reviews', 'chat-detail', 'chats',
        'favorites-list', 'settings', 'marketplace', 'update-email',
        'artisan-history'
    ];

    if (hiddenViews.includes(view)) return null;

    const hasUnreadMessages = chats.some(c =>
        userRole === 'artisan' ? (c.unreadCountArtisan || 0) > 0 : (c.unreadCountClient || 0) > 0
    );

    const hasUnreadNotifications = notifications.some(n => !n.read);

    return (
        <header className="px-6 pt-10 pb-4 sticky top-0 z-40 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                    <img src="/icons/icon-192x192.png" alt="Vork Logo" className="w-7 h-7 object-contain" />
                </div>
                <div>
                    <h1 className="text-lg font-black tracking-tighter text-white uppercase leading-none">VORK</h1>
                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1">
                        {userRole === 'artisan' ? 'EXPERT' : 'CLIENT'}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleRole}
                    className="px-3 py-2 bg-white/5 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-400 border border-white/5 hover:text-white transition-colors"
                >
                    Vers {userRole === 'user' ? 'Artisan' : 'Client'}
                </button>
                <button
                    onClick={onOpenChats}
                    className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center relative active:scale-90 transition-all border border-white/5"
                >
                    <MessageSquare className="w-5 h-5 text-slate-400" />
                    {hasUnreadMessages && (
                        <>
                            <div className="absolute top-2 right-2 size-2 bg-purple-500 rounded-full animate-ping"></div>
                            <div className="absolute top-2 right-2 size-2 bg-purple-500 rounded-full border border-[#0a0a0c]"></div>
                        </>
                    )}
                </button>
                <button
                    onClick={onOpenNotifications}
                    className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center relative active:scale-90 transition-all border border-white/5"
                >
                    <Bell className="w-5 h-5 text-slate-400" />
                    {hasUnreadNotifications && (
                        <div className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border border-[#0a0a0c]"></div>
                    )}
                </button>
            </div>
        </header>
    );
};
