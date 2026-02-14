
import React from 'react';
// Added LayoutGrid to imports
import { Zap, TrendingUp, CheckCircle, Clock, Star, ArrowRight, Wallet, Activity, Briefcase, LayoutGrid, CheckCircle2 } from 'lucide-react';
import { Artisan, Order, View } from '../../types';
import { SmartAvatar } from '../../components/Shared/SmartAvatar';

interface Props {
    artisan: Artisan;
    activeOrders: Order[];
    archivedOrders: Order[];
    onViewOrder: (o: Order) => void;
    setView: (v: View) => void;
}

export const ArtisanDashboardView: React.FC<Props> = ({ artisan, activeOrders, archivedOrders, onViewOrder, setView }) => {
    // Calculate real earnings from archived orders
    const earnings = archivedOrders.reduce((sum, order) => {
        if (!order.assignedPrice) return sum;
        // Extract numbers from string like "15.000 FCFA" or "15000"
        const price = parseInt(order.assignedPrice.replace(/[^0-9]/g, ''), 10);
        return isNaN(price) ? sum : sum + price;
    }, 0);

    return (
        <div className="pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-40 px-6">
            <div className="mb-10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">TABLEAU DE BORD EXPERT</h2>
                    <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                        EN LIGNE
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#121214] border border-white/5 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 blur-2xl group-hover:bg-emerald-500/10 transition-all"></div>
                        <Wallet size={16} className="text-emerald-500 mb-2" />
                        <h3 className="text-2xl font-black text-white tracking-tighter">{earnings.toLocaleString()} F</h3>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Revenus Estimés</p>
                    </div>
                    <div className="bg-[#121214] border border-white/5 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/5 blur-2xl group-hover:bg-indigo-500/10 transition-all"></div>
                        <Briefcase size={16} className="text-indigo-500 mb-2" />
                        <h3 className="text-2xl font-black text-white tracking-tighter">{artisan.jobsDone}</h3>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Jobs Effectués</p>
                    </div>
                </div>
            </div>

            {/* Quick Action: Marketplace */}
            <div className="mb-10 group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-emerald-600 rounded-[2.6rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                <button
                    onClick={() => setView('marketplace')}
                    className="relative w-full py-8 bg-[#121214] border border-white/10 rounded-[2.5rem] flex items-center justify-between px-8 shadow-2xl active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-5">
                        <div className="size-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                            <Zap size={24} className="fill-current animate-pulse" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Ouvrir le Marché</h3>
                            <p className="text-slate-500 text-[9px] font-bold uppercase tracking-widest">Postulez aux nouvelles offres</p>
                        </div>
                    </div>
                    <ArrowRight className="text-slate-700 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </button>
            </div>

            {/* Active Missions */}
            <div className="space-y-4 mb-10">
                <div className="flex justify-between items-end px-2">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">MISSIONS ACTIVES</h3>
                    <span className="text-[9px] font-black text-indigo-500 uppercase">{activeOrders.length} EN COURS</span>
                </div>

                {activeOrders.length > 0 ? (
                    activeOrders.map(order => (
                        <div
                            key={order.id}
                            onClick={() => onViewOrder(order)}
                            className="bg-[#121214] border border-white/5 p-5 rounded-[2.2rem] flex items-center justify-between group cursor-pointer hover:border-indigo-500/30 transition-all"
                        >
                            <div className="flex items-center gap-4">
                                <div className="size-12 bg-white/5 rounded-xl flex items-center justify-center text-indigo-400">
                                    <Clock size={24} />
                                </div>
                                <div>
                                    <h4 className="text-white font-black text-sm uppercase tracking-tight">{order.category}</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{order.location}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-[8px] font-black px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20">{order.status}</span>
                                <ArrowRight size={14} className="text-slate-700 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-16 bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem] text-center flex flex-col items-center justify-center gap-4">
                        <div className="size-16 bg-white/5 rounded-full flex items-center justify-center text-slate-700">
                            <LayoutGrid size={32} />
                        </div>
                        <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">Aucune mission en cours</p>
                    </div>
                )}
            </div>

            {/* Realizations / Archive */}
            <div className="space-y-4">
                <div className="flex justify-between items-end px-2">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">HISTORIQUE & RÉALISATIONS</h3>
                    <button
                        onClick={() => setView('artisan-history')}
                        className="text-[9px] font-black text-emerald-500 hover:text-emerald-400 uppercase flex items-center gap-1 transition-colors"
                    >
                        Voir tout <ArrowRight size={10} />
                    </button>
                </div>

                {archivedOrders.length > 0 ? (
                    archivedOrders.slice(0, 5).map((order) => (
                        <div
                            key={order.id}
                            onClick={() => onViewOrder(order)}
                            className="bg-[#121214] border border-white/5 p-6 rounded-[2.5rem] flex items-center justify-between group cursor-pointer hover:border-emerald-500/30 transition-all relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 size-20 bg-emerald-500/5 blur-xl pointer-events-none"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="size-14 rounded-2xl overflow-hidden bg-slate-800 border border-white/5 shadow-lg">
                                    {/* Assuming we might want to show client avatar here, or category icon if client info missing */}
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                                        <CheckCircle2 size={24} />
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-white font-black text-sm uppercase tracking-tight">{order.category}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{order.date}</span>
                                        {(order as any).finalReview && (
                                            <div className="flex items-center gap-0.5 bg-white/5 px-1.5 py-0.5 rounded-md">
                                                <Star size={8} className="text-yellow-400 fill-current" />
                                                <span className="text-[8px] font-bold text-white">{(order as any).finalReview.rating}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-emerald-400 font-black text-sm tracking-tight">{order.assignedPrice || 'N/A'}</span>
                                <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest mt-0.5">Gagné</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-10 bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem] text-center flex flex-col items-center justify-center">
                        <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">Aucune réalisation pour le moment</p>
                    </div>
                )}
            </div>
        </div>
    );
};
