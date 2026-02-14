
import React from 'react';
import { ChevronLeft, Star, Quote } from 'lucide-react';
import { Artisan, PortfolioItem } from '../../types';
import { SmartAvatar } from '../../components/Shared/SmartAvatar';

interface Props {
  item: PortfolioItem;
  art: Artisan;
  onBack: () => void;
}

export const WorkDetailView: React.FC<Props> = ({ item, art, onBack }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0c] animate-in slide-in-from-bottom duration-500 pb-20 overflow-y-auto no-scrollbar">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl overflow-hidden border border-white/10 shadow-lg">
              <SmartAvatar
                src={art.image}
                name={art.name}
                initialsClassName="text-sm font-black text-white"
              />
            </div>
            <div>
              <h1 className="text-sm font-black text-white uppercase tracking-tight truncate max-w-[150px]">{item.title}</h1>
              <p className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">Réalisé par {art.name.split(' ')[0]}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
          <Star className="size-3 text-yellow-400 fill-yellow-400" />
          <span className="text-[10px] font-black text-white">{art.rating}</span>
        </div>
      </header>

      <div className="px-6 pt-4 flex flex-col items-center">
        {/* Main Image Container */}
        <div className="w-full aspect-[4/5] rounded-[3rem] overflow-hidden shadow-[0_0_80px_rgba(168,85,247,0.15)] border border-white/10 mb-10 group relative bg-[#121214]">
          <SmartAvatar
            src={item.image}
            name={item.title}
            className="w-full h-full transition-transform duration-1000 group-hover:scale-105"
            initialsClassName="text-4xl font-black text-white/20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40 pointer-events-none"></div>
        </div>

        {/* Content Container */}
        <div className="w-full space-y-8">
          <div className="text-center px-4">
            <h2 className="text-3xl font-black text-white tracking-tighter uppercase mb-3 leading-none">{item.title}</h2>
            <div className="w-12 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto rounded-full mb-6"></div>
            <p className="text-slate-400 font-medium leading-relaxed">
              {item.description || `Un exemple de l'expertise de ${art.name.split(' ')[0]} dans ses projets récents de ${art.category.toLowerCase()}. Chaque détail a été soigné pour répondre aux exigences du client.`}
            </p>
          </div>

          {/* Review Section */}
          {item.customerReview && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Quote className="size-4 text-purple-400 fill-purple-400" />
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-400">Avis du client</h4>
              </div>

              <div className="glass-card p-6 rounded-[2.5rem] bg-[#121214]/60 border border-white/5 relative overflow-hidden group shadow-2xl">
                <div className="absolute -right-4 -top-4 size-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors"></div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-black text-base shadow-lg overflow-hidden">
                      <SmartAvatar src={item.customerReview.userAvatar} name={item.customerReview.userName} />
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white">{item.customerReview.userName}</h5>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{item.customerReview.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-xl border border-white/5">
                    <Star className="size-3 text-yellow-400 fill-current" />
                    <span className="text-[11px] font-black text-yellow-400">{item.customerReview.rating}.0</span>
                  </div>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed font-medium italic relative z-10">
                  "{item.customerReview.comment}"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
