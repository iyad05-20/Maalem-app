
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, Share2, MapPin, ShieldCheck, Star, Phone, Mail, X, Info, MessageCircle, Heart, MessageSquareText, MessageSquare, Users, CheckCircle2 } from 'lucide-react';
import { Artisan, View, PortfolioItem, Order, Review } from '../../types';
import { isImageUrl, getInitials, sanitizeFirestoreData, migrateUrl } from '../../utils';
import { SmartAvatar } from '../../components/Shared/SmartAvatar';
import { uploadToSupabase, deleteFromSupabase, extractPathFromUrl } from '../../services/supabase.config';
import { db } from '../../services/firebase.config';
import { doc, updateDoc, collection, query, where, onSnapshot, orderBy, limit, documentId } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

interface Props {
  art: Artisan;
  setView: (v: View) => void;
  onBack: () => void;
  onOpenChats: () => void;
  reviewRatingFilter: number | 'Tous';
  setReviewRatingFilter: (r: number | 'Tous') => void;
  onSelectWork: (item: PortfolioItem) => void;
  onReserve: (art: Artisan) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

interface ShareBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  artisan: Artisan;
  onShareViaDM: () => void;
}

const ShareBottomSheet: React.FC<ShareBottomSheetProps> = ({ isOpen, onClose, artisan, onShareViaDM }) => {
  if (!isOpen) return null;

  const handleShareDM = () => {
    onShareViaDM();
    onClose();
  };

  const handleSocialShare = (platform: string) => {
    console.log(`Sharing ${artisan.name}'s profile on ${platform}`);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md bg-[#0a0a0c] glass-card rounded-t-[3rem] p-8 pb-safe-bottom shadow-2xl animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-500 mb-6">Partager le Profil</h3>
          <div className="size-24 rounded-full overflow-hidden border-4 border-white/10 shadow-xl mb-4">
            <SmartAvatar src={artisan.image} name={artisan.name} initialsClassName="text-3xl font-black text-white" />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">{artisan.name}</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{artisan.category} Expert</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleShareDM}
            className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black text-sm uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(168,85,247,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <MessageSquareText size={20} />
            Envoyer en Message Direct
          </button>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4 text-center">Partager sur les Réseaux</p>
            <div className="flex justify-center gap-4">
              {[
                { icon: <MessageSquare size={22} />, platform: 'WhatsApp' },
                { icon: <Share2 size={22} />, platform: 'Facebook' },
                { icon: <Share2 size={22} />, platform: 'X' },
                { icon: <Users size={22} />, platform: 'Instagram' },
                { icon: <Users size={22} />, platform: 'LinkedIn' },
              ].map((social, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSocialShare(social.platform)}
                  className="size-12 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-90"
                >
                  {social.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ArtisanDetailView: React.FC<Props> = ({ art, setView, onBack, onOpenChats, reviewRatingFilter, setReviewRatingFilter, onSelectWork, onReserve, isFavorite, onToggleFavorite }) => {
  const [showContactOverlay, setShowContactOverlay] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);

  // LIVE ARTISAN STATE
  const [liveArtisan, setLiveArtisan] = useState<Artisan>(art);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "artisans", art.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = sanitizeFirestoreData(docSnap.data());
        // Correctly map avatar to image using migration utility
        const imgUrl = migrateUrl(data.image || data.avatar);
        setLiveArtisan({ ...data, id: docSnap.id, image: imgUrl } as Artisan);
      }
    });
    return () => unsub();
  }, [art.id]);

  // 1. Fetch Archived Orders for Portfolio
  useEffect(() => {
    const q = query(
      collection(db, "archivedOrders"),
      where("artisanId", "==", art.id),
      orderBy(documentId(), 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        ...sanitizeFirestoreData(doc.data()),
        id: doc.id
      })) as Order[];

      const items: PortfolioItem[] = orders
        .filter(o => (o.resultImages && o.resultImages.length > 0) || (o.images && o.images.length > 0))
        .map(o => ({
          id: `job-${o.id}`,
          title: `Mission ${o.category}`,
          // Prioritize result images (the final work) over initial problem images
          image: (o.resultImages && o.resultImages.length > 0) ? o.resultImages[0] : o.images![0],
          description: o.description,
          customerReview: o.finalReview ? {
            id: `rev-${o.id}`,
            userName: 'Client Vork',
            userAvatar: 'CV',
            rating: o.finalReview.rating,
            date: o.completedAt ? new Date(o.completedAt).toLocaleDateString() : 'Récemment',
            comment: o.finalReview.comment
          } : undefined
        }));
      setPortfolioItems(items);
    });
    return () => unsubscribe();
  }, [art.id]);

  // 2. Fetch Recent Reviews
  useEffect(() => {
    const q = query(
      collection(db, "reviews"),
      where("artisanId", "==", art.id),
      orderBy(documentId(), 'desc'),
      limit(3)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const revs = snapshot.docs.map(doc => ({
        ...sanitizeFirestoreData(doc.data()),
        id: doc.id
      })) as Review[];
      setRecentReviews(revs);
    });
    return () => unsubscribe();
  }, [art.id]);

  const displayPortfolio = [...portfolioItems, ...(liveArtisan.portfolio || [])];

  const displayReviews = recentReviews.length > 0
    ? recentReviews
    : (liveArtisan.reviews || []);

  const displayRating = liveArtisan.rating ? liveArtisan.rating.toFixed(1) : '5.0';
  const displayCount = liveArtisan.reviewsCount || 0;
  const displayJobs = liveArtisan.jobsDone || 0;

  return (
    <div className="min-h-screen bg-[#0a0a0c] animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar pb-40">
      <div className="relative h-[420px] w-full overflow-hidden">
        <SmartAvatar
          src={liveArtisan.image}
          name={liveArtisan.name}
          className="w-full h-full transform scale-105"
          initialsClassName="text-8xl font-black text-white/10 select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-black/10"></div>

        <div className="absolute top-12 left-6 right-6 flex justify-between items-center z-40">
          <button
            onClick={onBack}
            className="size-10 bg-black/30 backdrop-blur-xl rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-black/50 transition-all active:scale-90"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }}
              className={`size-10 bg-black/30 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/10 hover:bg-black/50 transition-all active:scale-90 ${isFavorite ? 'text-red-500' : 'text-white'}`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={() => setShowShareSheet(true)}
              className="size-10 bg-black/30 backdrop-blur-xl rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-black/50 transition-all active:scale-90"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-20 relative z-30">
        <div className="glass-card p-6 rounded-[2.8rem] bg-[#121214]/60 backdrop-blur-3xl border border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden min-h-[220px] flex flex-col justify-center">

          {showContactOverlay && (
            <div className="absolute inset-0 bg-[#0a0a0c] z-[50] p-6 flex flex-col justify-center items-center animate-in fade-in zoom-in-95 duration-300">
              <button
                onClick={() => setShowContactOverlay(false)}
                className="absolute top-4 right-4 size-8 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90 shadow-xl"
              >
                <X size={16} />
              </button>
              <h4 className="text-[9px] font-black uppercase tracking-[0.4em] text-purple-500 mb-6 text-center">Contact Direct</h4>
              <div className="w-full max-w-sm space-y-3">
                {liveArtisan.phone && (
                  <a href={`tel:${liveArtisan.phone}`} className="flex items-center gap-4 group bg-white/[0.03] p-3.5 rounded-[1.5rem] border border-white/5 hover:bg-purple-600/10 transition-all shadow-xl">
                    <div className="size-10 bg-purple-600 rounded-xl flex items-center justify-center text-white"><Phone size={18} /></div>
                    <div className="flex-1"><p className="text-[7px] text-slate-500 font-black uppercase tracking-[0.15em]">Appeler</p><p className="text-white font-black text-sm tracking-tight">{liveArtisan.phone}</p></div>
                  </a>
                )}
                {liveArtisan.email && (
                  <a href={`mailto:${liveArtisan.email}`} className="flex items-center gap-4 group bg-white/[0.03] p-3.5 rounded-[1.5rem] border border-white/5 hover:bg-blue-600/10 transition-all shadow-xl">
                    <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Mail size={18} /></div>
                    <div className="flex-1 min-w-0"><p className="text-[7px] text-slate-500 font-black uppercase tracking-[0.15em]">Email</p><p className="text-white font-black text-sm truncate tracking-tight">{liveArtisan.email}</p></div>
                  </a>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex items-center gap-1.5 bg-[#1a2e26]/80 px-2 py-0.5 rounded-md border border-[#34d399]/20">
                    <div className="size-1.5 bg-[#34d399] rounded-full animate-pulse"></div>
                    <span className="text-[7px] text-[#34d399] font-black uppercase tracking-widest">Disponible</span>
                  </div>
                  <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 text-[#34d399]">
                    <ShieldCheck className="size-2.5" />
                    <span className="text-[7px] font-black uppercase tracking-widest">Vérifié</span>
                  </div>
                </div>

                <>
                  <h2 className="text-[1.8rem] font-black text-white tracking-tighter leading-[0.85] mb-1">
                    {liveArtisan.name.split(' ')[0]}<br />
                    <span className="text-slate-500">{liveArtisan.name.split(' ').slice(1).join(' ')}</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <div className="bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                      <span className="text-purple-400 font-black text-[7px] uppercase tracking-[0.2em]">{liveArtisan.category}</span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <MapPin className="size-3 text-slate-600" />
                      <span className="text-[10px] font-bold tracking-tight">{liveArtisan.location}</span>
                    </div>
                  </div>
                </>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setShowContactOverlay(true)}
                  className="size-11 bg-white/[0.04] border border-white/10 rounded-xl flex items-center justify-center text-slate-300 shadow-xl active:scale-90 transition-transform group"
                  title="Voir contact"
                >
                  <Info size={20} className="group-hover:scale-110 transition-transform" />
                </button>
                <button
                  onClick={onOpenChats}
                  className="size-11 bg-white/[0.04] border border-white/10 rounded-xl flex items-center justify-center text-blue-400 shadow-xl active:scale-90 transition-transform group"
                  title="Envoyer un message"
                >
                  <MessageCircle size={20} className="fill-blue-400/5 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => onReserve(liveArtisan)}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-[0_10px_20px_rgba(168,85,247,0.3)] active:scale-[0.98] transition-all relative overflow-hidden group"
              >
                <span className="relative z-10">Réserver l'expert</span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 grid grid-cols-3 gap-3 mt-8 relative z-20">
        {[
          { label: 'Note', value: displayRating, icon: <Star className="size-3 fill-current" />, color: 'text-yellow-400' },
          { label: 'Exp.', value: `${liveArtisan.experience} ans`, icon: null, color: 'text-white' },
          { label: 'Missions', value: displayJobs, icon: null, color: 'text-white' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-[#121214]/90 backdrop-blur-xl border border-white/5 p-5 rounded-[2.2rem] flex flex-col items-center justify-center gap-1 shadow-2xl transition-transform hover:-translate-y-1">
            <div className={`flex items-center gap-1 ${stat.color}`}>
              <span className="text-lg font-black tracking-tighter">{stat.value}</span>
              {stat.icon}
            </div>
            <span className="text-[8px] text-slate-500 font-black uppercase tracking-[0.2em]">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-14 px-6">
        <div className="flex justify-between items-end mb-6 px-1">
          <div className="space-y-0.5">
            <h3 className="text-xl font-black text-white tracking-tighter uppercase">Réalisations</h3>
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Travaux récents ({displayPortfolio.length})</p>
          </div>
          <button
            onClick={() => setView('portfolio')}
            className="text-purple-500 text-[9px] font-black hover:text-white transition-colors uppercase tracking-[0.2em] bg-purple-500/10 px-3 py-1.5 rounded-full"
          >
            Voir Tout
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x">
          {displayPortfolio.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectWork(item)}
              className="min-w-[200px] h-[140px] rounded-[2.2rem] overflow-hidden relative group cursor-pointer shadow-xl border border-white/5 snap-center"
            >
              <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s]" alt={item.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <span className="text-white text-[9px] font-black uppercase tracking-tight line-clamp-1">{item.title}</span>
              </div>
            </div>
          ))}
          {displayPortfolio.length === 0 && (
            <div className="min-w-[200px] h-[140px] rounded-[2.2rem] border border-dashed border-white/10 flex flex-col items-center justify-center opacity-40">
              <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Aucune photo</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-6 mt-12 pb-32">
        <div className="flex justify-between items-end mb-6 px-1">
          <div className="space-y-0.5">
            <h3 className="text-xl font-black text-white tracking-tighter uppercase">Témoignages</h3>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 text-yellow-400">
                <Star className="size-2.5 fill-current" />
                <span className="text-[9px] font-black">{displayRating}</span>
              </div>
              <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">• {displayCount} avis</span>
            </div>
          </div>
          <button
            onClick={() => setView('reviews')}
            className="text-purple-500 text-[9px] font-black hover:text-white transition-colors uppercase tracking-[0.2em] bg-purple-500/10 px-3 py-1.5 rounded-full"
          >
            Voir Tout
          </button>
        </div>

        <div className="space-y-4">
          {displayReviews.slice(0, 3).map(rev => (
            <div key={rev.id} className="glass-card p-5 rounded-[2.2rem] bg-[#121214]/40 border border-white/5 shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs">
                    {rev.userAvatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-tight">{rev.userName}</h4>
                    <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">{rev.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-lg border border-white/5">
                  <Star className="size-3 text-yellow-400 fill-current" />
                  <span className="text-[10px] font-black text-white">{rev.rating}</span>
                </div>
              </div>
              <div className="relative pl-3 border-l border-purple-500/20">
                <p className="text-slate-400 text-xs leading-relaxed font-medium italic">
                  "{rev.comment}"
                </p>
              </div>
            </div>
          ))}
          {displayReviews.length === 0 && (
            <div className="py-10 text-center opacity-40">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Aucun avis pour le moment</p>
            </div>
          )}
        </div>
      </div>

      <ShareBottomSheet
        isOpen={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        artisan={liveArtisan}
        onShareViaDM={onOpenChats}
      />
    </div>
  );
};
