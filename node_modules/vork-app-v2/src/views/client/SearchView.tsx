
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, Search as SearchIcon, SlidersHorizontal, MapPin, ShieldCheck, Star, Hammer, Users, X, Loader2 } from 'lucide-react';
import { Artisan, View, Category, Coordinates } from '../../types';
import { getFormattedDistance, calculateDistanceMeters } from '../../services/location.service';
import { CATEGORIES } from '../../data/mockData';
import { db } from '../../services/firebase.config';
import { collection, getDocs, query, orderBy, limit, startAfter, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { SmartAvatar } from '../../components/Shared/SmartAvatar';
import { sanitizeFirestoreData } from '../../utils';
interface Props {
  setView: (v: View) => void;
  artisans: Artisan[];
  userLocation: Coordinates | null;
  setSelectedArtisan: (a: Artisan) => void;
  searchFilterCategory: string;
  setSearchFilterCategory: (c: string) => void;
  searchFilterRating: number | 'Tous';
  setSearchFilterRating: (r: number | 'Tous') => void;
}

const ArtisanSkeleton = () => (
  <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-5 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="size-20 rounded-[1.8rem] bg-white/5"></div>
      <div className="flex-1 space-y-3 py-1">
        <div className="h-4 bg-white/5 rounded w-3/4"></div>
        <div className="h-3 bg-white/5 rounded w-1/2"></div>
        <div className="flex gap-2">
          <div className="h-3 bg-white/5 rounded w-1/4"></div>
          <div className="h-3 bg-white/5 rounded w-1/4"></div>
        </div>
      </div>
    </div>
  </div>
);

export const SearchView: React.FC<Props> = ({
  setView,
  artisans: initialArtisans,
  userLocation,
  setSelectedArtisan,
  searchFilterCategory,
  setSearchFilterCategory,
  searchFilterRating,
  setSearchFilterRating
}) => {
  const [activeSort, setActiveSort] = useState('Tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbArtisans, setDbArtisans] = useState<Artisan[]>(initialArtisans);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const lastVisibleValueRef = useRef<any>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const fetchArtisans = useCallback(async (isInitial = false) => {
    if (isLoadingMore) return;
    if (!isInitial && !hasMore) return;

    setIsLoadingMore(true);
    const artisansRef = collection(db, "artisans");
    const constraints: any[] = [limit(20)];
    const isCategorized = searchFilterCategory !== 'Tous';

    if (isCategorized) {
      constraints.push(where("category", "==", searchFilterCategory));
    } else {
      if (activeSort === 'Mieux notés') constraints.push(orderBy("rating", "desc"));
      else if (activeSort === 'Plus proche') constraints.push(orderBy("distance", "asc"));
      else constraints.push(orderBy("createdAt", "desc"));
    }

    if (!isInitial && lastVisibleValueRef.current) {
      constraints.push(startAfter(lastVisibleValueRef.current));
    }

    try {
      const q = query(artisansRef, ...constraints);
      const snapshot = await getDocs(q);
      let results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...sanitizeFirestoreData(doc.data())
      })) as Artisan[];

      // Apply Client-Side Sorting if Firestore couldn't do it due to index constraints
      if (isCategorized) {
        if (activeSort === 'Mieux notés') results.sort((a, b) => b.rating - a.rating);
        else if (activeSort === 'Plus proche' && userLocation) {
          results.sort((a, b) => {
            const distA = a.locationCoords ? calculateDistanceMeters(userLocation, a.locationCoords) : Infinity;
            const distB = b.locationCoords ? calculateDistanceMeters(userLocation, b.locationCoords) : Infinity;
            return distA - distB;
          });
        }
        else results.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      }

      const finalResults = searchQuery
        ? results.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : results;

      // Aggressive Deduplication by Name/Category to ensure clean search results
      const deduplicate = (list: Artisan[]) => {
        return list.reduce((acc, current) => {
          const x = acc.find(item => item.name === current.name && item.category === current.category);
          if (!x) return acc.concat([current]);
          return acc;
        }, [] as Artisan[]);
      };

      if (isInitial) {
        setDbArtisans(deduplicate(finalResults));
      } else {
        setDbArtisans(prev => deduplicate([...prev, ...finalResults]));
      }

      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      if (lastDoc) {
        const data = lastDoc.data();
        if (!isCategorized) {
          if (activeSort === 'Mieux notés') lastVisibleValueRef.current = data.rating;
          else if (activeSort === 'Plus proche') lastVisibleValueRef.current = data.distance;
          else lastVisibleValueRef.current = data.createdAt;
        } else {
          lastVisibleValueRef.current = lastDoc;
        }
      } else {
        lastVisibleValueRef.current = null;
      }

      setHasMore(snapshot.docs.length >= 20);
    } catch (error: any) {
      console.error("Error fetching artisans:", error);
      if (isInitial) setDbArtisans(initialArtisans);
    } finally {
      setIsLoadingMore(false);
    }
  }, [searchFilterCategory, searchQuery, activeSort, initialArtisans]);

  useEffect(() => {
    lastVisibleValueRef.current = null;
    setHasMore(true);
    fetchArtisans(true);
  }, [searchFilterCategory, searchQuery, activeSort]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Trigger earlier (500px margin) for smoother experience
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          fetchArtisans(false);
        }
      },
      { threshold: 0.1, rootMargin: '500px' }
    );

    if (scrollEndRef.current) observer.observe(scrollEndRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, fetchArtisans]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c] animate-in slide-in-from-right duration-300 pb-40">
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 sticky top-0 bg-[#0a0a0c]/95 backdrop-blur-md z-[60] border-b border-white/5">
        <button onClick={() => setView('home')} className="p-2 bg-white/5 rounded-xl border border-white/10">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-xl font-black text-white tracking-tight uppercase">Découvrir</h1>
      </header>

      <div className="px-6 mt-6 mb-4 relative z-50">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <SearchIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Chercher un expert ou un service..."
              className="w-full bg-[#121214] border border-white/5 rounded-2xl py-4 pl-12 pr-10 text-sm text-white font-medium placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 transition-all shadow-xl"
            />
          </div>
          <button className="p-4 bg-[#121214] border border-white/5 rounded-2xl shadow-xl hover:bg-white/5 transition-colors">
            <SlidersHorizontal className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="px-6 flex gap-3 overflow-x-auto no-scrollbar mb-6 scroll-smooth">
        {['Tous', 'Mieux notés', 'Plus proche'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSort(tab)}
            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap shadow-xl ${activeSort === tab
              ? 'bg-gradient-to-r from-purple-600 to-pink-500 border-transparent text-white shadow-purple-600/20'
              : 'bg-[#121214] border-white/5 text-slate-500 hover:border-white/10'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="px-6 mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 mb-4 px-1">Filtrer par expertise</p>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {['Tous', ...CATEGORIES.map(c => c.name)].map(cat => (
            <button
              key={cat}
              onClick={() => setSearchFilterCategory(cat)}
              className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shrink-0 ${searchFilterCategory === cat
                ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400 shadow-lg'
                : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10 hover:text-slate-400'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-4">
        {dbArtisans.length > 0 ? dbArtisans.map((art) => (
          <div
            key={art.id}
            onClick={() => { setSelectedArtisan(art); setView('artisan-detail'); }}
            className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-5 relative transition-all hover:border-purple-500/20 group cursor-pointer active:scale-[0.98] shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="size-20 rounded-[1.8rem] overflow-hidden border border-white/10 group-hover:scale-105 transition-transform duration-500 shadow-xl">
                  <SmartAvatar src={art.image} name={art.name} initialsClassName="text-2xl font-black text-white" />
                </div>
                {art.available && (
                  <div className="absolute -bottom-1 -right-1 size-5 bg-emerald-500 rounded-full border-4 border-[#121214]"></div>
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
                  <span className="text-[10px] text-slate-500 font-bold uppercase">
                    {getFormattedDistance(userLocation, art.locationCoords) || art.distance}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )) : !isLoadingMore && (
          <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
            <SearchIcon className="size-12 text-slate-500" />
            <p className="font-black uppercase tracking-[0.3em] text-[10px]">Aucun expert trouvé</p>
          </div>
        )}

        {isLoadingMore && (
          <>
            <ArtisanSkeleton />
            <ArtisanSkeleton />
          </>
        )}

        <div ref={scrollEndRef} className="h-24 flex items-center justify-center pt-4">
          {!hasMore && dbArtisans.length > 0 && !isLoadingMore && (
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
              <div className="size-2 bg-purple-500 rounded-full"></div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fin des résultats</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
