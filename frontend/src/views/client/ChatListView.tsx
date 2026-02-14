
import React, { useState } from 'react';
import { Search, ChevronLeft, Edit, Camera, Home, User, X, MessageSquare } from 'lucide-react';
import { Chat } from '../../types';
import { SmartAvatar } from '../../components/Shared/SmartAvatar';
import { auth } from '../../services/firebase.config';

interface Props {
  chats: Chat[];
  onSelectChat: (chat: Chat) => void;
  onBack: () => void;
  backLabel?: string;
  onHome?: () => void;
}

export const ChatListView: React.FC<Props> = ({ chats, onSelectChat, onBack, backLabel = "Précédent", onHome }) => {
  const [showQuickNav, setShowQuickNav] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const currentUserId = auth.currentUser?.uid;

  // Swipe-to-back logic
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchEnd - touchStart;
    const isSwipeRight = distance > 100;

    if (isSwipeRight && touchStart < 50) {
      onBack();
    }
    setTouchStart(null);
  };

  // Filter chats based on search query (focused on names)
  const filteredChats = chats.filter(chat => {
    // Determine name to display for filtering
    const isArtisan = currentUserId === chat.artisanId;
    const display = isArtisan ? (chat.userName || 'Client') : chat.artisanName;
    return display.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div
      className="min-h-screen bg-[#0a0a0c] animate-in slide-in-from-right duration-500 pb-32 overflow-y-auto no-scrollbar"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="px-6 pt-12 pb-6 sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 group relative">
            <button
              onClick={onBack}
              onContextMenu={(e) => { e.preventDefault(); setShowQuickNav(true); }}
              className="flex items-center gap-1 text-white hover:text-purple-400 transition-all active:scale-90 select-none"
            >
              <div className="relative">
                <ChevronLeft size={28} className="group-hover:-translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
              </div>
              <div className="flex flex-col items-start leading-none mt-0.5">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-purple-500 transition-colors">Retour à</span>
                <span className="text-xs font-black uppercase tracking-tight">{backLabel}</span>
              </div>
            </button>

            {showQuickNav && (
              <div className="absolute top-12 left-0 w-48 bg-[#121214] border border-white/10 rounded-[1.8rem] shadow-2xl p-2 animate-in zoom-in-95 duration-200 z-[60]">
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 mb-1">
                  <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Navigation Rapide</span>
                  <button onClick={() => setShowQuickNav(false)}><X size={12} className="text-slate-600" /></button>
                </div>
                <button onClick={() => { setShowQuickNav(false); onHome?.(); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-2xl transition-colors">
                  <Home size={16} className="text-purple-400" />
                  <span className="text-xs font-bold text-white">Aller à l'Accueil</span>
                </button>
                <button onClick={() => { setShowQuickNav(false); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-2xl transition-colors">
                  <User size={16} className="text-slate-400" />
                  <span className="text-xs font-bold text-white">Voir mon Profil</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button className="size-10 bg-white/5 rounded-full flex items-center justify-center text-white border border-white/5 hover:bg-white/10 transition-colors active:scale-90">
              <Camera size={20} />
            </button>
            <button className="size-10 bg-white/5 rounded-full flex items-center justify-center text-white border border-white/5 hover:bg-white/10 transition-colors active:scale-90">
              <Edit size={20} />
            </button>
          </div>
        </div>

        <h1 className="text-3xl font-black text-white tracking-tighter uppercase mt-4">Messages</h1>
      </header>

      <div className="px-6 mt-6">
        <div className="relative group">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${searchQuery ? 'text-purple-400' : 'text-slate-500'} group-focus-within:text-purple-400`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="w-full bg-white/5 border border-white/5 rounded-2xl py-3.5 pl-12 pr-10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/30 focus:bg-white/[0.08] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="px-6 mt-8 space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 ml-1">
          {searchQuery ? `Résultats pour "${searchQuery}"` : 'Récent'}
        </p>
        {filteredChats.map((chat) => {
          // Dynamic display logic
          const isArtisan = currentUserId === chat.artisanId;
          const displayName = isArtisan ? (chat.userName || 'Client') : chat.artisanName;
          const displayImage = isArtisan ? (chat.userImage || '') : chat.artisanImage;

          return (
            <div
              key={chat.id}
              onClick={() => onSelectChat(chat)}
              className="group relative flex items-center gap-4 p-3.5 rounded-[2rem] hover:bg-white/5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <div className="relative shrink-0">
                <div className="size-16 rounded-[1.5rem] overflow-hidden border border-white/10 shadow-lg group-hover:scale-105 transition-transform">
                  <SmartAvatar src={displayImage} name={displayName} initialsClassName="text-lg font-black text-white" />
                </div>
                {chat.isOnline && (
                  <div className="absolute -bottom-1 -right-1 size-4 bg-emerald-500 rounded-full border-2 border-[#0a0a0c]"></div>
                )}
              </div>

              <div className="flex-1 min-w-0 py-1">
                <div className="flex justify-between items-end mb-1">
                  <h3 className="text-white font-black text-sm uppercase tracking-tight truncate group-hover:text-purple-400 transition-colors">
                    {displayName}
                  </h3>
                  <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{chat.timestamp}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-xs truncate max-w-[85%] leading-relaxed ${chat.unreadCount > 0 ? 'text-white font-bold' : 'text-slate-500 font-medium'}`}>
                    {chat.unreadCount > 0 ? 'A envoyé un message' : chat.lastMessage}
                  </p>
                  {chat.unreadCount > 0 && (
                    <div className="size-2.5 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredChats.length === 0 && (
        <div className="flex flex-col items-center justify-center py-40 opacity-10">
          <MessageSquare size={48} className="mb-4" />
          <p className="font-black uppercase tracking-[0.2em] text-xs">
            {searchQuery ? 'Aucun résultat trouvé' : 'Aucune conversation'}
          </p>
        </div>
      )}

      {showQuickNav && (
        <div
          className="fixed inset-0 z-50 bg-transparent"
          onClick={() => setShowQuickNav(false)}
        />
      )}
    </div>
  );
};
