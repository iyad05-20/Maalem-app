
import React from 'react';
import { Home, Search, MessageSquare, User, PlusCircle, Calendar, Zap } from 'lucide-react';
import { View } from '../../types';

export const Navbar = ({ activeView, setView, onPlusClick, userRole }: { activeView: View; setView: (v: View) => void; onPlusClick: () => void, userRole?: string }) => {
    const isNavVisible = !['urgent', 'create-order', 'order-detail', 'generic-form', 'chat-detail', 'artisan-detail', 'category-detail', 'all-categories', 'portfolio', 'work-detail', 'reviews', 'favorites-list', 'settings', 'update-email', 'notifications', 'artisan-history'].includes(activeView);
    if (!isNavVisible) return null;

    return (
        <nav className="fixed bottom-0 left-0 right-0 glass border-t border-white/5 safe-bottom z-50 rounded-t-[20px]">
            <div className="flex justify-around items-center h-20 px-4">
                {userRole === 'artisan' ? (
                    <>
                        <NavItem icon={<Home />} label="Stats" active={activeView === 'home'} onClick={() => setView('home')} />
                        <NavItem icon={<Zap />} label="Marché" active={activeView === 'marketplace'} onClick={() => setView('marketplace')} />
                        <NavItem icon={<MessageSquare />} label="Messages" active={activeView === 'chats'} onClick={() => { setView('chats'); }} />
                        <NavItem icon={<User />} label="Profil" active={activeView === 'profile'} onClick={() => setView('profile')} />
                    </>
                ) : (
                    <>
                        <NavItem icon={<Home />} label="Accueil" active={activeView === 'home'} onClick={() => setView('home')} />
                        <NavItem icon={<Search />} label="Chercher" active={activeView === 'search'} onClick={() => setView('search')} />
                        <div className="relative -top-8 group">
                            <div className="absolute inset-0 bg-purple-500/40 blur-xl rounded-full opacity-60 group-hover:opacity-100 transition-opacity"></div>
                            <button
                                onClick={onPlusClick}
                                className={`relative w-16 h-16 rounded-full bg-gradient-to-br from-[#a855f7] to-[#ec4899] shadow-2xl flex items-center justify-center text-white border-4 border-[#0a0a0c] transform transition hover:scale-105 active:scale-95`}
                            >
                                <PlusCircle className="w-8 h-8" />
                            </button>
                        </div>
                        <NavItem icon={<Calendar />} label="Missions" active={activeView === 'bookings'} onClick={() => setView('bookings')} />
                        <NavItem icon={<User />} label="Moi" active={activeView === 'profile'} onClick={() => setView('profile')} />
                    </>
                )}
            </div>
        </nav>
    );
};

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-[#34d399]' : 'text-slate-500 hover:text-slate-300'}`}>
        <div className="relative">
            {React.cloneElement(icon as React.ReactElement<any>, { size: 28, className: active ? 'fill-current' : '' })}
            {active && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#34d399] rounded-full shadow-[0_0_5px_#34d399]"></div>}
        </div>
        <span className={`text-[10px] font-bold mt-0.5 tracking-tight ${active ? 'text-[#34d399]' : ''}`}>{label}</span>
    </button>
);
