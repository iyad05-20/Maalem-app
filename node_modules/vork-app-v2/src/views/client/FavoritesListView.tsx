
import React from 'react';
import { ChevronLeft, Star, Heart, ShieldCheck, MapPin } from 'lucide-react';
import { Artisan } from '../../types';
import { ARTISANS } from '../../data/mockData';
import { SmartAvatar } from '../../components/Shared/SmartAvatar';

interface Props {
  favoriteIds: string[];
  artisans: Artisan[];
  onBack: () => void;
  onSelectArtisan: (art: Artisan) => void;
}

export const FavoritesListView: React.FC<Props> = ({ favoriteIds, artisans, onBack, onSelectArtisan }) => {
  const favoriteArtisans = artisans.filter(art => favoriteIds.includes(art.id));

  return (
    <div className="min-h-screen bg-[#0a0a0c] animate-in slide-in-from-right duration-500 pb-32 overflow-y-auto no-scrollbar">
      <header className="px-6 pt-12 pb-6 sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-xl z-50 border-b border-white/5 flex items-center gap-4">
        <button
          onClick={onBack}
          className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-white/10 transition-colors active:scale-90"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">Mes Favoris</h1>
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">{favoriteIds.length} Experts</p>
        </div>
      </header>

      <div className="px-6 mt-8 space-y-4">
        {favoriteArtisans.length > 0 ? (
          favoriteArtisans.map((art) => (
            <div
              key={art.id}
              onClick={() => onSelectArtisan(art)}
              className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-5 relative transition-all hover:border-purple-500/20 group cursor-pointer active:scale-[0.98] shadow-2xl"
            >
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="size-20 rounded-[1.8rem] overflow-hidden border border-white/10 group-hover:scale-105 transition-transform duration-500 shadow-xl">
                    <SmartAvatar src={art.image} name={art.name} initialsClassName="text-2xl font-black text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 size-7 bg-red-500 rounded-full border-4 border-[#121214] flex items-center justify-center text-white">
                    <Heart size={10} className="fill-current" />
                  </div>
                  {art.available && (
                    <div className="absolute -bottom-1 -left-1 size-4 bg-emerald-500 rounded-full border-2 border-[#121214]"></div>
                  )}
                </div>

                <div className="flex-1 py-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-black text-lg uppercase tracking-tight group-hover:text-purple-400 transition-colors leading-none mb-1">{art.name}</h3>
                      <p className="text-purple-400 text-[10px] font-black uppercase tracking-[0.1em]">{art.category} Expert</p>
                    </div>
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                      <Star className="size-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-white text-[10px] font-black">{art.rating}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <ShieldCheck className="size-4 text-emerald-500" />
                    <span className="text-emerald-500 text-[9px] font-bold uppercase tracking-widest">Vérifié par VORK</span>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1 text-slate-500">
                      <MapPin className="size-3" />
                      <span className="text-[10px] font-bold">{art.location}</span>
                    </div>
                    <div className="h-1 w-1 bg-slate-800 rounded-full"></div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{art.distance}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-40 opacity-20">
            <Heart size={64} className="mb-6 text-slate-500" />
            <p className="font-black uppercase tracking-[0.4em] text-xs text-center leading-relaxed">Ta liste de favoris <br />est vide</p>
          </div>
        )}
      </div>
    </div>
  );
};
