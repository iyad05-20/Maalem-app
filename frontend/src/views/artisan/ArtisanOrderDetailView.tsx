
import React, { useState } from 'react';
import { ChevronLeft, ImageIcon, MoreVertical, MessageCircle, Phone, MapPin, X, Maximize2, Clock } from 'lucide-react';
import { Order, Artisan } from '../../types';
import { SmartAvatar } from '../../components/Shared/SmartAvatar';

interface Props {
    order: Order;
    onBack: () => void;
    onOpenChat: (artisan: Partial<Artisan>) => void;
    onViewImage?: (url: string) => void;
}

export const ArtisanOrderDetailView: React.FC<Props> = ({ order, onBack, onOpenChat }) => {
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    const handleChatWithClient = () => {
        onOpenChat({
            id: order.userId,
            name: "Client",
            image: ""
        });
    };

    const isPendingClosure = order.status === 'En attente de clôture';
    const isAssigned = ['En cours', 'Accepté', 'Terminé', 'En attente de clôture'].includes(order.status);

    return (
        <div className="min-h-screen bg-[#0a0a0c] flex flex-col animate-in slide-in-from-right duration-500 pb-32">
            <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-xl z-50 border-b border-white/5">
                <button onClick={onBack} className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 active:scale-90"><ChevronLeft className="w-5 h-5" /></button>
                <h1 className="text-[11px] font-black text-white tracking-[0.2em] uppercase">MISSION #{order.id.slice(-5).toUpperCase()}</h1>
                <button className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-500 border border-white/10"><MoreVertical size={20} /></button>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 p-6 bg-[#0a0a0c]">
                {/* Header Info */}
                <div className="glass-card p-6 rounded-[2.5rem] bg-[#1a1a20]/60 border border-white/5">
                    <div className="flex items-center gap-5">
                        <div className="size-16 bg-purple-600/20 rounded-2xl flex items-center justify-center text-purple-500 border border-purple-500/10"><ImageIcon size={28} /></div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{order.category}</h2>
                            <div className="flex items-center gap-2 text-slate-600">
                                <MapPin size={12} /><span className="text-[10px] font-black uppercase tracking-widest">{order.location || 'Localisation inconnue'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">STATUT</span>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${order.status === 'Terminé' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                            <div className={`size-2 rounded-full ${order.status === 'Terminé' ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
                            <span className="text-[9px] font-black uppercase tracking-widest">{isPendingClosure ? 'ACTION REQUISE' : order.status}</span>
                        </div>
                    </div>
                </div>

                {/* Mission Progress Indicator */}
                {(order.status === 'En cours' || order.status === 'Accepté' || isPendingClosure) && (
                    <div className="glass-card p-6 rounded-[2rem] bg-emerald-900/5 border border-emerald-500/20 flex items-center gap-4 shadow-xl">
                        <div className="size-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <Clock size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h4 className="text-white font-black text-sm uppercase tracking-tight">{isPendingClosure ? 'Validation finale...' : 'Mission en cours'}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{isPendingClosure ? 'Validation du paiement et archivage par le client en cours' : 'Attendez la validation du client pour clôturer.'}</p>
                        </div>
                    </div>
                )}

                {/* Client info & Chat */}
                <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">CLIENT</h3>
                    <div className="glass-card p-6 rounded-[2.5rem] bg-[#121214] border border-white/10 shadow-2xl relative overflow-hidden">
                        <div className="flex items-center gap-5">
                            <div className="size-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 border-2 border-slate-700"><span className="text-xl font-black">C</span></div>
                            <div className="flex-1">
                                <h4 className="text-xl font-black text-white tracking-tighter mb-2">Client</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Voir détails dans le chat</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button onClick={handleChatWithClient} className="col-span-2 py-4 bg-indigo-600 rounded-2xl flex items-center justify-center gap-3 text-white font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-indigo-600/20">
                                <MessageCircle size={16} /> Discuter avec le client
                            </button>
                            <a href="tel:+" className="col-span-2 py-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center gap-3 text-slate-300 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all">
                                <Phone size={16} /> Appeler
                            </a>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">DESCRIPTION</h3>
                    <div className="glass-card p-6 rounded-[2rem] bg-[#121214] border border-white/5">
                        <p className="text-slate-400 text-sm font-medium italic leading-relaxed">"{order.description}"</p>
                    </div>
                </div>

                {/* Photos */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">PHOTOS INITIALES</h3>
                    <div className="grid grid-cols-4 gap-2.5">
                        {order.images?.map((url, idx) => (
                            <div key={idx} onClick={() => setFullScreenImage(url)} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group cursor-pointer">
                                <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Detail" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-all"><Maximize2 size={16} className="text-white" /></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Result Photos */}
                {order.resultImages && order.resultImages.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-1">RÉSULTAT FINAL</h3>
                        <div className="grid grid-cols-4 gap-2.5">
                            {order.resultImages.map((url, idx) => (
                                <div key={idx} onClick={() => setFullScreenImage(url)} className="relative aspect-square rounded-2xl overflow-hidden border border-emerald-500/20 group cursor-pointer">
                                    <img src={url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Result" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-all"><Maximize2 size={16} className="text-white" /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {fullScreenImage && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setFullScreenImage(null)}>
                    <button className="absolute top-6 right-6 size-10 bg-white/10 rounded-full flex items-center justify-center text-white"><X size={20} /></button>
                    <img src={fullScreenImage} className="max-w-full max-h-full object-contain rounded-lg animate-in zoom-in-95" alt="Full" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
};
