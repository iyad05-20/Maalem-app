
import React, { useState, useEffect } from 'react';
import { ChevronLeft, Maximize2, Loader2, Image as ImageIcon } from 'lucide-react';
import { Artisan, PortfolioItem, Order } from '../../types';
import { db } from '../../services/firebase.config';
import { collection, query, where, orderBy, onSnapshot, documentId } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { sanitizeFirestoreData } from '../../utils';

interface Props {
  art: Artisan;
  onBack: () => void;
  onSelectWork: (item: PortfolioItem) => void;
}

export const PortfolioView: React.FC<Props> = ({ art, onBack, onSelectWork }) => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We query archivedOrders where the artisan worked.
    // We use documentId() desc as a proxy for time if 'completedAt' isn't indexed.
    const q = query(
      collection(db, "archivedOrders"),
      where("artisanId", "==", art.id),
      orderBy(documentId(), 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems: PortfolioItem[] = snapshot.docs
        .map(doc => {
          const data = sanitizeFirestoreData(doc.data()) as Order;
          return { ...data, id: doc.id };
        })
        // Only keep orders that have either result images OR initial images
        .filter(o => (o.resultImages && o.resultImages.length > 0) || (o.images && o.images.length > 0))
        .map(o => ({
          id: `job-${o.id}`,
          title: `Mission ${o.category}`,
          // Prioritize result images (the final work) over initial problem images
          image: (o.resultImages && o.resultImages.length > 0) ? o.resultImages[0] : o.images![0],
          description: o.description,
          // Map the final review if it exists
          customerReview: o.finalReview ? {
            id: `rev-${o.id}`,
            userName: 'Client Vork',
            userAvatar: 'CV',
            rating: o.finalReview.rating,
            date: o.completedAt ? new Date(o.completedAt).toLocaleDateString() : 'Terminé',
            comment: o.finalReview.comment
          } : undefined
        }));

      setItems(fetchedItems);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching portfolio:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [art.id]);

  // Combine fetched real-time items with any static seed items in the artisan profile
  const combinedItems = [...items, ...(art.portfolio || [])];

  return (
    <div className="min-h-screen bg-[#0a0a0c] animate-in slide-in-from-right duration-500 pb-20 overflow-y-auto no-scrollbar">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center gap-4 sticky top-0 bg-[#0a0a0c]/80 backdrop-blur-xl z-50 border-b border-white/5">
        <button
          onClick={onBack}
          className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 hover:bg-white/10 transition-colors active:scale-90"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Portfolio</h1>
          <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">{art.name}</p>
        </div>
      </header>

      {/* Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-purple-500 mb-2" size={32} />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chargement des projets...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {combinedItems.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectWork(item)}
                className="relative aspect-square rounded-[2.2rem] overflow-hidden border border-white/5 shadow-2xl group cursor-pointer bg-[#121214]"
              >
                <img
                  src={item.image}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  alt={item.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1621905231184-7a9a36ad2960?auto=format&fit=crop&q=80'; // Fallback
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="absolute bottom-3 left-3 right-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-2.5 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <p className="text-white text-[10px] font-black uppercase tracking-tight truncate">{item.title}</p>
                </div>

                <div className="absolute top-3 right-3 size-8 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 size={14} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {!loading && combinedItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-40 opacity-20">
          <div className="size-20 bg-white/5 rounded-3xl flex items-center justify-center mb-4">
            <ImageIcon size={32} className="text-slate-400" />
          </div>
          <p className="font-black uppercase tracking-widest text-xs text-slate-500">Aucun projet à afficher</p>
        </div>
      )}
    </div>
  );
};
