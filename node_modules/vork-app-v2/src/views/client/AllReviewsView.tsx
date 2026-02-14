
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Star, Loader2, Filter, BarChart3 } from 'lucide-react';
import { Artisan, Review } from '../../types';
import { db } from '../../services/firebase.config';
import { collection, query, where, orderBy, limit, startAfter, getDocs, onSnapshot, doc, documentId } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { sanitizeFirestoreData } from '../../utils';

interface Props {
  art: Artisan;
  onBack: () => void;
}

export const AllReviewsView: React.FC<Props> = ({ art: initialArtisan, onBack }) => {
  // Live Artisan State for Real-time Stats
  const [liveArtisan, setLiveArtisan] = useState<Artisan>(initialArtisan);

  // Reviews List State
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<number | 'Tous'>('Tous');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Pagination Refs
  const lastDocRef = useRef<any>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollTriggerRef = useRef<HTMLDivElement>(null);

  // 1. Real-time Listener for Header Stats (Rating/Count)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "artisans", initialArtisan.id), (docSnap) => {
      if (docSnap.exists()) {
        // Fix: sanitizeFirestoreData ensures we don't put circular refs into state
        setLiveArtisan({ ...sanitizeFirestoreData(docSnap.data()), id: docSnap.id } as Artisan);
      }
    });
    return () => unsub();
  }, [initialArtisan.id]);

  // 2. Fetch Reviews (Paginated)
  const fetchReviews = useCallback(async (isInitial = false) => {
    if (isLoading || (!isInitial && !hasMore)) return;

    setIsLoading(true);

    try {
      // Query the 'reviews' collection directly.
      // We use documentId() desc for sorting (assuming ids are 'rev-{timestamp}')
      // which allows filtering by 'rating' without composite indexes involving timestamp fields.
      const constraints: any[] = [
        where("artisanId", "==", initialArtisan.id),
        orderBy(documentId(), "desc"),
        limit(5)
      ];

      if (filter !== 'Tous') {
        constraints.splice(1, 0, where("rating", "==", filter));
      }

      if (!isInitial && lastDocRef.current) {
        constraints.push(startAfter(lastDocRef.current));
      }

      const q = query(collection(db, "reviews"), ...constraints);
      const snapshot = await getDocs(q);

      const newReviews: Review[] = snapshot.docs
        .map(doc => {
          const data = sanitizeFirestoreData(doc.data()) as Review;
          return {
            id: doc.id,
            userName: data.userName || 'Client Vork',
            userAvatar: data.userAvatar || 'CV',
            rating: data.rating,
            date: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Récemment',
            comment: data.comment
          };
        });

      if (isInitial) {
        setReviews(newReviews);
      } else {
        setReviews(prev => [...prev, ...newReviews]);
      }

      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      setHasMore(snapshot.docs.length === 5);

    } catch (error) {
      console.error("Error fetching reviews:", error);
      // Fallback: If DB query fails, show static reviews if initial
      if (isInitial && filter === 'Tous') {
        setReviews(initialArtisan.reviews || []);
        setHasMore(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, [initialArtisan.id, filter, isLoading, hasMore, initialArtisan.reviews]);

  // 3. Reset and Refetch when filter changes
  useEffect(() => {
    setReviews([]);
    lastDocRef.current = null;
    setHasMore(true);
    fetchReviews(true);
  }, [filter]);

  // 4. Infinite Scroll Observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      // Pre-fetch earlier using rootMargin
      if (entries[0].isIntersecting && hasMore && !isLoading) {
        fetchReviews(false);
      }
    }, {
      threshold: 0.1,
      rootMargin: '500px' // Load next page when 500px away from bottom
    });

    if (scrollTriggerRef.current) observerRef.current.observe(scrollTriggerRef.current);

    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoading, fetchReviews]);

  // Calculate histogram based on Live Artisan Rating (Approximation for UX)
  const getSimulatedPercent = (star: number) => {
    const avg = liveArtisan.rating || 5;
    if (Math.round(avg) === star) return 70;
    if (Math.round(avg) === star + 1 || Math.round(avg) === star - 1) return 20;
    return 5;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] animate-in slide-in-from-right duration-500 pb-32 overflow-y-auto no-scrollbar">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-xl z-50 border-b border-white/5 shadow-2xl">
        <button
          onClick={onBack}
          className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-white/10 transition-colors active:scale-90"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">Avis Clients</h1>
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">{liveArtisan.name}</p>
        </div>
      </header>

      {/* Rating Summary Section (Live Data) */}
      <div className="px-6 pt-8 pb-10">
        <div className="flex gap-8 items-center bg-[#121214] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 blur-3xl rounded-full pointer-events-none"></div>

          <div className="text-center relative z-10">
            <h2 className="text-5xl font-black text-white tracking-tighter mb-1 transition-all duration-500">
              {liveArtisan.rating ? liveArtisan.rating.toFixed(1) : '5.0'}
            </h2>
            <div className="flex items-center justify-center gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`size-3 ${i < Math.round(liveArtisan.rating || 5) ? 'text-yellow-400 fill-current' : 'text-slate-800'}`} />
              ))}
            </div>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest whitespace-nowrap animate-pulse">
              {liveArtisan.reviewsCount || 0} avis
            </p>
          </div>

          <div className="flex-1 space-y-2 relative z-10 border-l border-white/5 pl-8">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 w-2">{star}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full opacity-80"
                    style={{ width: `${getSimulatedPercent(star)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-6 mb-8 overflow-x-auto no-scrollbar flex gap-2">
        {['Tous', 5, 4, 3, 2, 1].map((val) => (
          <button
            key={val}
            onClick={() => setFilter(val as any)}
            className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap active:scale-95 ${filter === val
                ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/20'
                : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
              }`}
          >
            {val === 'Tous' ? 'TOUS' : `${val} ÉTOILES`}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      <div className="px-6 space-y-4 min-h-[300px]">
        {reviews.length > 0 ? (
          reviews.map((rev, idx) => (
            <div
              key={`${rev.id}-${idx}`}
              className="glass-card p-6 rounded-[2.5rem] bg-[#121214] border border-white/5 shadow-lg transition-all hover:border-white/10 hover:bg-[#16161a] animate-in slide-in-from-bottom-2 duration-500"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center text-indigo-400 font-black text-sm shadow-inner">
                    {rev.userAvatar}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">{rev.userName}</h4>
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-0.5">{rev.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                  <Star className="size-3 text-yellow-400 fill-current" />
                  <span className="text-[10px] font-bold text-white">{rev.rating}</span>
                </div>
              </div>
              <div className="relative pl-4 border-l-2 border-purple-500/20">
                <p className="text-slate-300 text-xs leading-relaxed font-medium italic">
                  "{rev.comment}"
                </p>
              </div>
            </div>
          ))
        ) : !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
            <div className="size-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Filter className="size-8 text-slate-500" />
            </div>
            <p className="font-black uppercase tracking-[0.2em] text-xs text-slate-400">Aucun avis trouvé</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mt-2">Essayez un autre filtre</p>
          </div>
        )}

        {/* Loading / End Indicators */}
        <div ref={scrollTriggerRef} className="h-24 flex items-center justify-center w-full">
          {isLoading && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-purple-500" size={24} />
              <span className="text-[9px] font-black text-purple-500/50 uppercase tracking-widest">Chargement...</span>
            </div>
          )}
          {!hasMore && reviews.length > 0 && !isLoading && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
              <div className="size-2 bg-emerald-500 rounded-full"></div>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tous les avis affichés</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
