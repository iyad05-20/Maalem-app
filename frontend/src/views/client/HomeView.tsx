
import React from 'react';
import { Zap, ChevronRight, Star, ShieldCheck } from 'lucide-react';
import { Category, Artisan, View, Coordinates } from '../../types';
import { getFormattedDistance } from '../../services/location.service';
import { CATEGORIES } from '../../data/mockData';
import { CategoryIcon } from '../../components/Shared/CategoryIcon';
import { SmartAvatar } from '../../components/Shared/SmartAvatar';

interface Props {
  userRole?: 'user' | 'artisan';
  setView: (v: View) => void;
  artisans: Artisan[];
  userLocation: Coordinates | null;
  setSelectedArtisan: (a: Artisan) => void;
  openCategory: (c: Category, source: View) => void;
  onReserve: (a: Artisan) => void;
  onOpenAllCategories: () => void;
}

const SectionHeader = ({ title, onSeeAll }: { title: string, onSeeAll?: () => void }) => (
  <div className="flex justify-between items-end mb-4 px-6">
    <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
    {onSeeAll && (
      <button onClick={onSeeAll} className="text-[#a855f7] text-sm font-semibold flex items-center gap-1 hover:text-[#ec4899] transition-colors">
        Voir tout <ChevronRight className="w-4 h-4" />
      </button>
    )}
  </div>
);

const ArtisanCard: React.FC<{ art: Artisan, userLocation: Coordinates | null, onSelect: () => void, onReserve: (a: Artisan) => void }> = ({ art, userLocation, onSelect, onReserve }) => {
  const displayDistance = getFormattedDistance(userLocation, art.locationCoords) || art.distance;
  return (
    <div
      onClick={onSelect}
      className="relative glass-card rounded-[2.5rem] p-6 shadow-2xl border border-white/5 hover:border-[#a855f7]/20 transition-all cursor-pointer group bg-[#121214]/60"
    >
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#a855f7]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#a855f7]/15 transition-colors"></div>
      <div className="flex flex-col gap-6 relative z-10">
        <div className="flex justify-between items-start">
          <div className="flex gap-4">
            <div className="relative">
              <div className="w-[72px] h-[72px] rounded-full border-2 border-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.2)] overflow-hidden">
                <SmartAvatar src={art.image} name={art.name} initialsClassName="text-xl font-black text-white" />
              </div>
              {art.available && (
                <div className="absolute -bottom-0.5 -right-0.5 bg-[#0a0a0c] rounded-full p-1 z-20">
                  <div className="w-3.5 h-3.5 bg-[#34d399] rounded-full border border-[#0a0a0c]"></div>
                </div>
              )}
            </div>
            <div className="pt-1">
              <h3 className="text-white text-lg font-black leading-tight tracking-tight mb-1">{art.name}</h3>
              <p className="text-[#6366f1] text-[10px] font-black uppercase tracking-[0.1em]">{art.category} Expert</p>
              <div className="flex items-center gap-1 mt-2">
                <Star className="w-3 h-3 text-yellow-400 fill-current" />
                <span className="text-yellow-400 text-xs font-black">{art.rating}</span>
              </div>
            </div>
          </div>
          <div className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">{displayDistance}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-1">
          <ShieldCheck className="w-4 h-4 text-[#34d399]" />
          <span className="text-[#34d399] text-[10px] font-bold uppercase tracking-widest">VORK Verified Expert</span>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
            className="flex-1 bg-white/5 py-4 rounded-2xl font-black text-[11px] text-white uppercase tracking-widest hover:bg-white/10 transition-colors border border-white/5"
          >
            Profil
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReserve(art); }}
            className="flex-1 bg-gradient-to-br from-[#a855f7] to-[#ec4899] py-4 rounded-2xl font-black text-[11px] text-white uppercase tracking-widest shadow-xl shadow-purple-500/20 active:scale-95 transition-all"
          >
            Réserver
          </button>
        </div>
      </div>
    </div>
  );
}

export const HomeView: React.FC<Props> = ({ userRole, setView, artisans, userLocation, setSelectedArtisan, openCategory, onReserve, onOpenAllCategories }) => {
  // Strict Role Check to hide Urgent Banner for Artisans
  const showUrgentBanner = userRole !== 'artisan';

  return (
    <div className="pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-40">
      {showUrgentBanner && (
        <div className="px-6 mb-10">
          <button
            onClick={() => setView('urgent')}
            className="relative w-full glass-card p-8 rounded-[2.5rem] border border-red-500/20 flex flex-col items-start gap-4 active:scale-[0.98] transition-all overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 blur-3xl"></div>
            <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-600/40">
              <Zap className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="text-left relative z-10">
              <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-1">BESOIN URGENT ?</h3>
              <p className="text-red-200/60 font-medium">Réponse d'experts en 2 min chrono</p>
            </div>
          </button>
        </div>
      )}

      <div className="mb-10">
        <SectionHeader title="Catégories" onSeeAll={onOpenAllCategories} />
        <div className="flex overflow-x-auto gap-4 px-6 hide-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => openCategory(cat, 'home')}
              className="flex flex-col items-center gap-3 min-w-[100px] p-5 glass-card rounded-[2rem] hover:bg-white/10 transition-all active:scale-90"
            >
              <div className={`${cat.color.split(' ')[0]} w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl shadow-white/5`}>
                <CategoryIcon name={cat.icon} className={cat.color.split(' ')[1]} />
              </div>
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <SectionHeader title="Top Artisans Pro" onSeeAll={() => setView('search')} />
        <div className="grid grid-cols-1 gap-6 px-6">
          {artisans.slice(0, 5).map(art => (
            <ArtisanCard key={art.id} art={art} userLocation={userLocation} onSelect={() => { setSelectedArtisan(art); setView('artisan-detail'); }} onReserve={onReserve} />
          ))}
        </div>
      </div>
    </div>
  );
};
