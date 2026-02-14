
import React, { useState } from 'react';
import { Package, Clock, CheckCircle, ChevronRight, Plus, Star, Users, MapPin, X, TrendingUp, Calendar, CreditCard, Activity, Zap, Trash2, Loader2, AlertCircle, Check, Maximize2 } from 'lucide-react';
import { View, Order, Artisan } from '../../types';

interface Props {
  setView: (v: View) => void;
  orders: Order[];
  archivedOrders?: Order[];
  onDeleteOrder?: (order: Order) => Promise<void> | void;
  onArchiveOrder?: (order: Order) => Promise<void> | void;
  onSelectOrder?: (order: Order) => void;
  onOpenChat?: (artisan: Partial<Artisan>) => void;
}

export const OrdersView: React.FC<Props> = ({ setView, orders, archivedOrders = [], onDeleteOrder, onArchiveOrder, onSelectOrder, onOpenChat }) => {
  const [activeTab, setActiveTab] = useState<'En cours' | 'Terminé'>('En cours');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  // STRICT SEPARATION:
  // 'En cours' tab shows only the 'orders' collection (Active)
  // 'Terminé' tab shows only the 'archivedOrders' collection (History)
  const filteredOrders = activeTab === 'En cours' ? orders : archivedOrders;

  const handleExecuteDelete = async (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();
    setConfirmDeleteId(null);
    setDeletingId(order.id);
    try {
      if (onDeleteOrder) {
        await onDeleteOrder(order);
      }
    } catch (err) {
      console.error("Critical failure deleting order:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] animate-in slide-in-from-right duration-500 pb-32">
      <header className="px-6 pt-12 pb-6 sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-xl z-50 border-b border-white/5 flex items-center justify-between">
        <h1 className="text-2xl font-black text-white tracking-tight uppercase">Mes Commandes</h1>
        <div className="flex gap-2">
          <button
            className="size-11 bg-white/5 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)] active:scale-90 transition-all"
          >
            <Clock size={20} />
          </button>
        </div>
      </header>

      <div className="px-6 mt-6 flex gap-2">
        {(['En cours', 'Terminé'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest border transition-all ${activeTab === tab
                ? 'bg-[#1a1a20] border-white/20 text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
                : 'bg-transparent border-transparent text-slate-600'
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="px-6 mt-8 space-y-6">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => {
            const hasResponses = order.responses && order.responses.length > 0;
            const isDeleting = deletingId === order.id;
            const isConfirming = confirmDeleteId === order.id;

            const isEnCours = order.status === 'En cours' || order.status === 'Accepté';
            const isPendingClosure = order.status === 'En attente de clôture';
            const isWaiting = order.status === "EN ATTENTE D'EXPERT";

            // Only allow deletion of pending requests in the active tab
            const canDelete = activeTab === 'En cours' && isWaiting && !hasResponses;
            const showArtisanName = activeTab === 'Terminé' || isEnCours || isPendingClosure;

            // Result Images for Archived Orders
            const resultImages = order.resultImages || order.finalReview?.images || [];

            return (
              <div key={order.id} className={`flex flex-col gap-2 transition-all duration-300 ${isDeleting ? 'opacity-0 scale-90 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
                <div
                  onClick={() => onSelectOrder?.(order)}
                  className={`glass-card p-6 rounded-[2.5rem] bg-[#121214]/60 border border-white/5 relative group transition-all active:scale-[0.98] hover:border-purple-500/30 ${order.isUrgent ? 'border-red-500/30' : ''}`}
                >
                  {order.isUrgent && activeTab !== 'Terminé' && (
                    <div className="absolute -top-3 left-8 px-3 py-1 bg-red-600 text-white rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-red-600/30 border border-white/20">
                      <Zap size={10} className="fill-current" />
                      Urgence {order.priority}
                    </div>
                  )}

                  {isConfirming && (
                    <div
                      className="absolute inset-0 z-[70] bg-[#121214] rounded-[2.5rem] p-6 flex flex-col justify-center items-center text-center animate-in fade-in zoom-in-95 duration-200"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    >
                      <div className="size-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500 mb-3">
                        <AlertCircle size={24} />
                      </div>
                      <h4 className="text-white font-black text-sm uppercase tracking-tight mb-1">Annuler la demande ?</h4>
                      <div className="flex gap-3 w-full mt-4">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmDeleteId(null); }}
                          className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400"
                        >
                          Retour
                        </button>
                        <button
                          onClick={(e) => handleExecuteDelete(e, order)}
                          className="flex-1 py-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                        >
                          Confirmer
                        </button>
                      </div>
                    </div>
                  )}

                  {isDeleting && (
                    <div className="absolute inset-0 z-[70] bg-[#121214]/80 backdrop-blur-sm rounded-[2.5rem] flex items-center justify-center">
                      <Loader2 className="animate-spin text-purple-500" size={32} />
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`size-2.5 rounded-full ${isEnCours ? 'bg-emerald-500' : (order.isUrgent && activeTab !== 'Terminé' ? 'bg-red-500 animate-pulse' : (activeTab === 'Terminé' ? 'bg-slate-700' : 'bg-purple-500'))}`}></span>
                        <h3 className="text-white font-black text-base uppercase tracking-tight">{order.category}</h3>
                      </div>
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{order.date}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="flex gap-2">
                        {canDelete && !isConfirming && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setConfirmDeleteId(order.id);
                            }}
                            className="p-1.5 bg-red-500/10 rounded-lg text-red-500 border border-red-500/30 z-[60]"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      <div className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border ${activeTab === 'Terminé' ? 'bg-white/5 text-slate-500 border-white/10' :
                          isWaiting ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                            isEnCours ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              (isPendingClosure ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')
                        }`}>
                        {activeTab === 'Terminé'
                          ? 'ARCHIVÉ'
                          : (isWaiting ? "EN ATTENTE" : (isEnCours ? "ACCEPTÉ" : (isPendingClosure ? 'VALIDATION...' : order.status)))}
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm mb-5 line-clamp-1 italic font-medium leading-relaxed bg-white/5 p-3 rounded-2xl border border-white/5">
                    "{order.description}"
                  </p>

                  {/* Result Images Thumbnail Strip */}
                  {activeTab === 'Terminé' && resultImages.length > 0 && (
                    <div className="mb-5">
                      <p className="text-[8px] font-black text-emerald-500/70 uppercase tracking-widest mb-2 pl-1">Photos du résultat</p>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {resultImages.map((img, idx) => (
                          <div
                            key={idx}
                            onClick={(e) => { e.stopPropagation(); setFullScreenImage(img); }}
                            className="relative size-14 shrink-0 rounded-xl overflow-hidden border border-white/10 group cursor-pointer hover:border-emerald-500/50 transition-all bg-[#121214]"
                          >
                            <img src={img} className="w-full h-full object-cover" alt="Result thumbnail" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-all">
                              <Maximize2 size={12} className="text-white" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div
                      onClick={(e) => {
                        if (order.artisanId) {
                          e.stopPropagation();
                          onOpenChat?.({
                            id: order.artisanId,
                            name: order.artisanName,
                            image: order.artisanImage,
                            category: order.category
                          });
                        }
                      }}
                      className="flex items-center gap-2.5 text-slate-400 group/artisan hover:text-purple-400 transition-colors cursor-pointer"
                    >
                      <div className="size-8 bg-white/5 rounded-lg flex items-center justify-center group-hover/artisan:bg-purple-500/10 transition-colors">
                        {showArtisanName ? <Users className="size-4 text-emerald-500" /> : <Users className="size-4 text-purple-400" />}
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${hasResponses || showArtisanName ? 'text-purple-400' : 'text-slate-500'}`}>
                        {showArtisanName
                          ? order.artisanName || 'Expert assigné'
                          : (hasResponses ? `${order.responses?.length} experts intéressés` : 'Recherche expert...')}
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-slate-700" />
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-32 opacity-20">
            <Package size={64} className="mb-6 text-slate-500" />
            <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">
              {activeTab === 'En cours' ? 'Aucune commande' : 'Historique vide'}
            </p>
          </div>
        )}
      </div>

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
