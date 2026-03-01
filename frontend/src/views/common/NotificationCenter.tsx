import React from 'react';
import { Bell, X, Check, Trash2, Package, MessageSquare, Info, ChevronLeft, Zap } from 'lucide-react';
import { Notification } from '../../types';

interface Props {
    notifications: Notification[];
    onClose: () => void;
    onClearAll: () => void;
    onMarkAllRead: () => void;
    onMarkAsRead: (id: string) => void;
    onAction?: (relatedId: string, type: string) => void;
}

export const NotificationCenter: React.FC<Props> = ({ notifications, onClose, onClearAll, onMarkAllRead, onMarkAsRead, onAction }) => {
    return (
        <div className="fixed inset-0 z-[120] bg-[#0a0a0c] flex flex-col animate-in slide-in-from-right duration-500">
            <header className="px-6 pt-12 pb-6 flex items-center justify-between border-b border-white/5 bg-[#0a0a0c]/90 backdrop-blur-xl">
                <div className="flex items-center gap-1">
                    <button onClick={onClose} className="p-2 -ml-2 text-white active:scale-90 transition-transform">
                        <ChevronLeft size={28} />
                    </button>
                    <h1 className="text-2xl font-black text-white tracking-tighter uppercase ml-1">Notifications</h1>
                </div>
                <div className="flex items-center gap-2">
                    {notifications.some(n => !n.read) && (
                        <button
                            onClick={onMarkAllRead}
                            className="p-2 text-indigo-400 hover:text-indigo-300 transition-colors active:scale-90"
                            title="Tout marquer comme lu"
                        >
                            <Check size={20} />
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button
                            onClick={onClearAll}
                            className="p-2 text-slate-500 hover:text-red-400 transition-colors active:scale-90"
                            title="Tout effacer"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 opacity-20">
                        <Bell size={64} className="text-slate-500 mb-6" />
                        <p className="text-sm font-black uppercase tracking-widest text-white">Aucune notification</p>
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            onClick={() => {
                                onMarkAsRead(notif.id);
                                if (notif.relatedId) onAction?.(notif.relatedId, notif.type);
                            }}
                            className={`group relative p-5 rounded-[2rem] border transition-all active:scale-[0.98] cursor-pointer ${notif.read
                                ? 'bg-white/[0.02] border-white/5 text-slate-500'
                                : 'bg-white/[0.05] border-purple-500/20 text-white shadow-lg shadow-purple-500/5'
                                }`}
                        >
                            <div className="flex gap-4">
                                <div className={`shrink-0 size-12 rounded-2xl flex items-center justify-center ${notif.type === 'order_accepted' ? 'bg-emerald-500/10 text-emerald-400' :
                                    notif.type === 'message' ? 'bg-indigo-500/10 text-indigo-400' :
                                        'bg-yellow-500/10 text-yellow-400'
                                    }`}>
                                    {notif.type === 'order_accepted' && <Package size={22} />}
                                    {notif.type === 'message' && <MessageSquare size={22} />}
                                    {notif.type === 'system' && <Zap size={22} />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`font-black text-sm uppercase tracking-tight truncate ${notif.read ? 'text-slate-400' : 'text-white'}`}>
                                            {notif.title}
                                        </h3>
                                        <div className="flex items-center gap-2 ml-2">
                                            {!notif.read && <span className="text-[7px] font-black bg-purple-500 text-white px-1.5 py-0.5 rounded-full tracking-widest animate-pulse">NOUVEAU</span>}
                                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest whitespace-nowrap">
                                                {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    <p className={`text-xs leading-relaxed ${notif.read ? 'text-slate-600' : 'text-slate-300'}`}>
                                        {notif.message}
                                    </p>
                                </div>
                            </div>

                            {!notif.read && (
                                <div className="absolute top-4 right-4 size-2.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
