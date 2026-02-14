
import React, { useState, useEffect } from 'react';
import { Zap, MapPin, Clock, Send, ChevronRight, X, DollarSign, Loader2, Sparkles, Globe, Target, LayoutGrid, Maximize2, Image as ImageIcon } from 'lucide-react';
import { Order, Artisan, Quote } from '../../types';
import { db, auth } from '../../services/firebase.config';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { SmartAvatar } from '../../components/Shared/SmartAvatar';
import { sanitizeFirestoreData } from '../../utils';

interface Props {
  artisan: Artisan;
}

export const MarketplaceView: React.FC<Props> = ({ artisan }) => {
  const [activeTab, setActiveTab] = useState<'targeted' | 'public'>('public'); // Default to public to show market immediately
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [bidDescription, setBidDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [repliedOrderIds, setRepliedOrderIds] = useState<Set<string>>(new Set());
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    let q;

    if (activeTab === 'targeted') {
      // Commandes ciblant spécifiquement cet artisan
      q = query(
        collection(db, "orders"),
        where("status", "==", "EN ATTENTE D'EXPERT"),
        where("targetedArtisans", "array-contains", artisan.id)
      );
    } else {
      // Commandes publiques : On récupère tout "EN ATTENTE" et on filtre côté client
      // Cela évite les erreurs d'index composite manquant (Category + Status)
      q = query(
        collection(db, "orders"),
        where("status", "==", "EN ATTENTE D'EXPERT")
      );
    }

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const list = snapshot.docs.map(doc => ({ ...sanitizeFirestoreData(doc.data()), id: doc.id })) as Order[];

      const finalOrders: Order[] = [];
      const replied = new Set<string>();

      const artisanCity = (artisan.city || 'Dakar').toLowerCase().trim();
      const artisanCategory = (artisan.category || '').toLowerCase().trim();

      // Filter loop handling async check for existing quotes
      for (const order of list) {
        // Check if already quoted
        const quotesSnap = await getDocs(query(collection(db, "orders", order.id, "quotes"), where("artisanId", "==", artisan.id)));

        if (!quotesSnap.empty) {
          replied.add(order.id);
        }

        // VISIBILITY LOGIC
        if (activeTab === 'public') {
          // LE MARCHÉ: Only show orders that are NOT direct bookings
          if (order.isDirect) continue;

          // 1. Category Match
          if (order.category.toLowerCase().trim() !== artisanCategory) continue;

          // 2. Location Match
          const orderCity = (order.city || 'Dakar').toLowerCase().trim();
          const orderLoc = (order.location || '').toLowerCase().trim();

          const isSameCity = orderCity === artisanCity;
          const isLocationMatch = orderLoc.includes(artisanCity);
          const isDakarDefault = orderLoc.includes('dakar') || orderCity === 'dakar';

          if (artisanCity === 'dakar' && !isDakarDefault) continue;
          if (artisanCity !== 'dakar' && !isSameCity && !isLocationMatch) continue;

          finalOrders.push(order);
        } else {
          // POUR MOI: Only Specific/Direct bookings intended for this artisan
          if (!order.isDirect || !order.targetedArtisans?.includes(artisan.id)) continue;
          finalOrders.push(order);
        }
      }

      setRepliedOrderIds(replied);
      setOrders(finalOrders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [artisan.id, artisan.category, artisan.city, activeTab]);

  const handleSendQuote = async () => {
    if (!selectedOrder || !bidPrice) return;
    setIsSubmitting(true);

    try {
      const quoteData: Omit<Quote, 'id'> = {
        artisanId: artisan.id,
        artisanName: artisan.name,
        // Safety check: ensure undefined is handled as empty string or 0
        artisanImage: artisan.image || '',
        artisanRating: artisan.rating || 0,
        price: `${bidPrice} FCFA`,
        description: bidDescription,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };

      await addDoc(collection(db, "orders", selectedOrder.id, "quotes"), quoteData);

      setSelectedOrder(null);
      setBidPrice('');
      setBidDescription('');
      alert("Votre devis a été envoyé au client !");
    } catch (err) {
      console.error("Error sending quote:", err);
      alert("Erreur lors de l'envoi du devis. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] animate-in fade-in duration-500 pb-32">
      <header className="px-6 pt-12 pb-6 sticky top-0 bg-[#0a0a0c]/80 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="size-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight uppercase">Le Marché Vork</h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Opportunités</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('targeted')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'targeted' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            <Target size={14} /> Pour Moi
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'public' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            <Globe size={14} /> Public
          </button>
        </div>
      </header>

      <div className="px-6 mt-8 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="size-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chargement...</p>
          </div>
        ) : orders.length > 0 ? (
          orders.map((order) => {
            const hasReplied = repliedOrderIds.has(order.id);
            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`glass-card p-6 rounded-[2.5rem] bg-[#121214] border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer relative overflow-hidden group ${hasReplied ? 'opacity-60 grayscale-[0.5]' : ''}`}
              >
                {order.isUrgent && (
                  <div className="absolute top-4 right-4 px-2 py-1 bg-red-600/20 text-red-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-red-500/20 animate-pulse">
                    Urgent
                  </div>
                )}

                {hasReplied && (
                  <div className="absolute top-4 left-4 px-2 py-1 bg-emerald-500/20 text-emerald-500 rounded-lg text-[8px] font-black uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1">
                    <Sparkles size={8} /> Offre envoyée
                  </div>
                )}

                {activeTab === 'targeted' && (
                  <div className="absolute top-0 right-0 size-24 bg-indigo-500/10 blur-2xl rounded-full pointer-events-none"></div>
                )}

                <div className="flex flex-col gap-4 relative z-10 pt-4">
                  <div className="flex items-center gap-3">
                    <div className={`size-12 rounded-2xl flex items-center justify-center border ${activeTab === 'targeted' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/20' : 'bg-white/5 text-slate-400 border-white/5'}`}>
                      {activeTab === 'targeted' ? <Sparkles size={24} /> : <LayoutGrid size={24} />}
                    </div>
                    <div>
                      <h3 className="text-white font-black text-lg leading-none uppercase tracking-tight">{order.category}</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                        <MapPin size={10} /> {order.city || 'Dakar'} • {order.searchRadius || 1} km
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm font-medium line-clamp-2 italic leading-relaxed">
                    "{order.description}"
                  </p>
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {activeTab === 'targeted' ? 'Réservation Directe' : 'Offre Publique'}
                      </span>
                    </div>
                    <div className="flex items-center text-indigo-400 font-black text-[10px] uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                      {hasReplied ? 'Voir mon offre' : 'Proposer un devis'} <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-40 opacity-20 text-center">
            {activeTab === 'targeted' ? <Target size={64} className="mb-6 text-slate-500" /> : <Globe size={64} className="mb-6 text-slate-500" />}
            <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">
              {activeTab === 'targeted' ? 'Aucune réservation' : 'Aucune offre publique'}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mt-2">
              {activeTab === 'targeted'
                ? "Les clients peuvent vous réserver depuis votre profil"
                : `Aucune mission ${artisan.category} disponible à ${artisan.city || 'Dakar'}`}
            </p>
          </div>
        )}
      </div>

      {/* Modal Devis */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-md bg-[#0a0a0c] rounded-t-[3rem] p-8 pb-safe-bottom animate-in slide-in-from-bottom duration-500 border-t border-white/10 max-h-[90vh] overflow-y-auto no-scrollbar">
            <header className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tight">Faire une offre</h2>
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1">Missions : {selectedOrder.category}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
            </header>

            <div className="space-y-6">
              {/* Images Section */}
              {selectedOrder.images && selectedOrder.images.length > 0 ? (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Photos du problème</label>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {selectedOrder.images.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setFullScreenImage(img)}
                        className="relative size-20 shrink-0 rounded-2xl overflow-hidden border border-white/10 group cursor-pointer bg-[#121214]"
                      >
                        <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt="Preview" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-all duration-300">
                          <Maximize2 size={16} className="text-white drop-shadow-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-500">
                  <ImageIcon size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">Aucune photo fournie</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prix proposé (FCFA)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-600" />
                  <input
                    type="number"
                    value={bidPrice}
                    onChange={(e) => setBidPrice(e.target.value)}
                    placeholder="Ex: 15000"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Message pour le client</label>
                <textarea
                  value={bidDescription}
                  onChange={(e) => setBidDescription(e.target.value)}
                  placeholder="Expliquez brièvement votre approche..."
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <button
                onClick={handleSendQuote}
                disabled={isSubmitting || !bidPrice}
                className="w-full py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : <>Envoyer le devis <Send size={18} /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300 backdrop-blur-sm"
          onClick={() => setFullScreenImage(null)}
        >
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-6 right-6 size-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors active:scale-90"
          >
            <X size={20} />
          </button>
          <img
            src={fullScreenImage}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            alt="Full screen view"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
