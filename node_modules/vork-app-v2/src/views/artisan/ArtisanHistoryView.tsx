
import React from 'react';
import { ChevronLeft, History, MapPin, Calendar, Star, Hammer } from 'lucide-react';
import { Order } from '../../types';
import { SmartAvatar } from '../../components/Shared/SmartAvatar';

interface Props {
    orders: Order[];
    onBack: () => void;
    onViewOrder: (order: Order) => void;
}

export const ArtisanHistoryView: React.FC<Props> = ({ orders, onBack, onViewOrder }) => {
    return (
        <div className="min-h-screen bg-[#0a0a0c] pb-24 animate-in slide-in-from-right duration-500">
            <header className="px-6 pt-12 pb-6 flex items-center gap-4 sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-xl z-50 border-b border-white/5">
                <button onClick={onBack} className="p-2 bg-white/5 rounded-xl border border-white/10 text-white hover:bg-white/10 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-black text-white uppercase tracking-tight">Historique</h1>
            </header>

            <div className="px-6 py-6">
                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 opacity-20">
                        <History size={64} className="mb-6 text-slate-500" />
                        <p className="font-black uppercase tracking-[0.4em] text-xs text-center leading-relaxed">Aucune mission <br />terminée</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.id}
                                onClick={() => onViewOrder(order)}
                                className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-6 relative group cursor-pointer active:scale-[0.98] transition-all shadow-2xl"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-4">
                                        <div className="size-14 rounded-2xl overflow-hidden border border-white/10">
                                            <SmartAvatar src={order.artisanImage} name={order.artisanName || 'Artisan'} initialsClassName="text-lg font-black text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-black text-base uppercase tracking-tight mb-1">{order.category}</h3>
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar size={12} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">{order.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                                        <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Terminé</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 py-4 border-y border-white/5 mb-4">
                                    <div className="flex items-center gap-2 flex-1">
                                        <MapPin size={14} className="text-slate-600" />
                                        <span className="text-[11px] text-slate-400 font-bold truncate">{order.location}</span>
                                    </div>
                                    <div className="text-white font-black text-sm">{order.assignedPrice || 'Vork Pay'}</div>
                                </div>

                                {order.finalReview && (
                                    <div className="flex items-center gap-2 bg-yellow-400/5 border border-yellow-400/10 p-3 rounded-2xl">
                                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                        <span className="text-[11px] text-yellow-500 font-black uppercase tracking-widest">{order.finalReview.rating} / 5</span>
                                        <p className="text-[10px] text-slate-500 font-medium italic truncate flex-1 ml-2">"{order.finalReview.comment}"</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
