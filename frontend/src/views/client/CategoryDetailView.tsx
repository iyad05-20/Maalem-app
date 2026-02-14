
import React, { useState } from 'react';
import { ChevronLeft, Search, SlidersHorizontal, MapPin, ShieldCheck, Star } from 'lucide-react';
import { Category, Artisan, View } from '../../types';
import { SmartAvatar } from '../../components/Shared/SmartAvatar';

interface Props {
  category: Category;
  artisans: Artisan[];
  onBack: () => void;
  onSelectArtisan: (art: Artisan) => void;
}

export const CategoryDetailView: React.FC<Props> = ({ category, artisans, onBack, onSelectArtisan }) => {
  const [activeTab, setActiveTab] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter artisans by category and search query
  const filteredArtisans = artisans.filter(a => {
    const matchesCategory = a.category === category.name;
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0c] pb-24 animate-in slide-in-from-right duration-500">
      <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-[#0a0a0c]/95 backdrop-blur-md z-50 border-b border-white/5">
        <button onClick={onBack} className="p-2 bg-white/5 rounded-xl border border-white/10">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black text-white uppercase tracking-tight">{category.name}</h1>
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">{filteredArtisans.length} Experts</p>
        </div>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      <div className="px-6 mt-6 mb-6 flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom..."
            className="w-full bg-[#121214] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        <button className="p-4 bg-[#121214] border border-white/5 rounded-2xl">
          <SlidersHorizontal className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="px-6 flex gap-3 overflow-x-auto no-scrollbar mb-8">
        {['Tous', 'Mieux notés', 'Plus proche'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${activeTab === tab
                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                : 'bg-[#121214] border-white/5 text-slate-500'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="px-6 space-y-4">
        {filteredArtisans.length > 0 ? (
          filteredArtisans.map((art) => (
            <div
              key={art.id}
              className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-5 relative group hover:border-purple-500/20 transition-all shadow-xl"
            >
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="size-16 rounded-2xl overflow-hidden border border-white/10 group-hover:scale-105 transition-transform">
                    <SmartAvatar src={art.image} name={art.name} initialsClassName="text-lg font-black text-white" />
                  </div>
                  {art.available && (
                    <div className="absolute -bottom-1 -right-1 size-4 bg-emerald-500 rounded-full border-2 border-[#121214]"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-black text-base uppercase tracking-tight">{art.name}</h3>
                      <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest">{art.services?.[0] || art.category}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                      <Star className="size-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-white text-[10px] font-black">{art.rating}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <ShieldCheck className="size-4 text-emerald-500" />
                    <span className="text-emerald-500 text-[9px] font-bold uppercase tracking-widest">Vérifié par VORK</span>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1 text-slate-500">
                      <MapPin className="size-3" />
                      <span className="text-[10px] font-bold">{art.distance} • {art.location}</span>
                    </div>
                    <button
                      onClick={() => onSelectArtisan(art)}
                      className="bg-gradient-to-r from-purple-600 to-pink-500 px-6 py-2.5 rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.1em] shadow-lg active:scale-95 transition-all"
                    >
                      Profil
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
            <Search className="size-12 text-slate-500" />
            <p className="font-black uppercase tracking-[0.3em] text-[10px]">Aucun expert disponible</p>
          </div>
        )}
      </div>
    </div>
  );
};
