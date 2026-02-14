
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ImageIcon, CheckCircle2, MoreVertical, Star, UserCheck, Search, Zap, XCircle, Loader2, MessageCircle, X, Maximize2, Clock } from 'lucide-react';
import { Order, Artisan, Quote } from '../../types';
import { SmartAvatar } from '../../components/Shared/SmartAvatar';
import { sanitizeFirestoreData } from '../../utils';
import { findBestArtisans } from '../../services/recommendation.service';
import { db, auth } from '../../services/firebase.config';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc, addDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { rejectQuote, archiveOrder } from '../../services/order.actions';
import { uploadToSupabase } from '../../services/supabase.config';

interface Props {
    order: Order;
    onBack: () => void;
    onUpdateOrder: (id: string, updates: Partial<Order>) => Promise<void>;
    onOpenChat: (artisan: Partial<Artisan>) => void;
    onOpenArtisanProfile: (id: string | undefined) => void;
    onViewImage?: (url: string) => void;
}

// --- COMPLETION MODAL COMPONENT ---
const CompletionModal = ({ isOpen, onClose, onConfirm, artisanName, artisanImage, orderId }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (rating: number, comment: string, images: string[]) => Promise<void>;
    artisanName: string;
    artisanImage?: string;
    orderId: string;
}) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [step, setStep] = useState<'rate' | 'uploading' | 'processing' | 'success'>('rate');
    const [images, setImages] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setImages(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 4));
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        setStep('uploading');
        const imageUrls: string[] = [];

        try {
            if (images.length > 0) {
                for (const [index, file] of images.entries()) {
                    const fileExt = file.name.split('.').pop() || 'jpg';
                    const path = `reviews/${orderId}/result_${index}_${Date.now()}.${fileExt}`;
                    const url = await uploadToSupabase('vork-profilepic-bucket', path, file);
                    imageUrls.push(url);
                }
            }

            setStep('processing');
            await onConfirm(rating, comment, imageUrls);
            setStep('success');
        } catch (error) {
            console.error("Error submitting review:", error);
            setStep('rate');
            alert("Erreur lors de l'envoi. Veuillez réessayer.");
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-end justify-center animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={step === 'rate' ? onClose : undefined} />
            <div className="relative w-full max-w-md bg-[#0a0a0c] border-t border-white/10 rounded-t-[3rem] p-8 pb-safe-bottom shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[90vh] overflow-y-auto no-scrollbar text-center">
                {step === 'rate' && (
                    <div className="space-y-6">
                        <div className="size-16 mx-auto rounded-full overflow-hidden border-4 border-white/10 shadow-2xl">
                            <SmartAvatar src={artisanImage} name={artisanName} initialsClassName="text-xl font-black text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Mission Terminée !</h2>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Notez le travail de {artisanName}</p>
                        </div>

                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} onClick={() => setRating(star)} className="p-1 transition-transform hover:scale-110 focus:outline-none">
                                    <Star size={32} className={`${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-white/10 fill-white/5'} transition-colors`} />
                                </button>
                            ))}
                        </div>

                        <div className="w-full space-y-3 text-left">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Photos du résultat <span className="text-indigo-400">(Requis)</span></label>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                {images.length < 4 && (
                                    <button onClick={() => fileInputRef.current?.click()} className="size-20 shrink-0 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex flex-col items-center justify-center gap-1 group hover:border-indigo-500/50 transition-all">
                                        <ImageIcon size={18} className="text-slate-500 group-hover:text-indigo-400" />
                                        <span className="text-[8px] font-black text-slate-500 group-hover:text-indigo-400 uppercase tracking-widest">Ajouter</span>
                                    </button>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                                {images.map((file, idx) => (
                                    <div key={idx} className="size-20 shrink-0 rounded-2xl relative overflow-hidden border border-white/10 group">
                                        <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />
                                        <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 size-5 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg"><X size={10} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Un commentaire sur la prestation ? (Optionnel)"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none h-20 placeholder:text-slate-600"
                        />

                        <div className="flex w-full gap-3 pt-2">
                            <button onClick={onClose} className="flex-1 py-4 bg-white/5 rounded-2xl text-slate-500 font-black text-[10px] uppercase tracking-widest hover:bg-white/10">Annuler</button>
                            <button onClick={handleSubmit} disabled={rating === 0} className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all">Clôturer la mission</button>
                        </div>
                    </div>
                )}

                {(step === 'uploading' || step === 'processing') && (
                    <div className="flex flex-col items-center justify-center py-10 space-y-6">
                        <div className="size-24 relative">
                            <div className="absolute inset-0 border-4 border-emerald-500/20 rounded-full"></div>
                            <div className="absolute inset-0 border-t-4 border-emerald-500 rounded-full animate-spin"></div>
                        </div>
                        <h3 className="text-white font-black uppercase tracking-widest animate-pulse">{step === 'uploading' ? 'Envoi des photos...' : 'Archivage en cours...'}</h3>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center justify-center py-10 space-y-6 animate-in zoom-in duration-300">
                        <div className="size-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.5)]">
                            <CheckCircle2 size={48} className="text-white animate-bounce" />
                        </div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Succès !</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export const ClientOrderDetailView: React.FC<Props> = ({ order, onBack, onOpenChat, onOpenArtisanProfile }) => {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [isAccepting, setIsAccepting] = useState<string | null>(null);
    const [isRejecting, setIsRejecting] = useState<string | null>(null);
    const [canExpand, setCanExpand] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, "orders", order.id, "quotes"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ ...sanitizeFirestoreData(doc.data()), id: doc.id })) as Quote[];
            setQuotes(list.filter(q => q.status !== 'rejected'));
        });

        const checkExpandTime = () => {
            const createdAt = new Date(order.createdAt || Date.now()).getTime();
            const diffMinutes = (Date.now() - createdAt) / (1000 * 60);
            if (diffMinutes >= 30 && (order.searchRadius || 1) < 2) setCanExpand(true);
        };
        checkExpandTime();
        const interval = setInterval(checkExpandTime, 60000);

        return () => { unsubscribe(); clearInterval(interval); };
    }, [order.id, order.createdAt, order.searchRadius]);

    const handleAcceptQuote = async (quote: Quote) => {
        setIsAccepting(quote.id);
        try {
            await updateDoc(doc(db, "orders", order.id), {
                artisanId: quote.artisanId,
                artisanName: quote.artisanName,
                artisanImage: quote.artisanImage,
                artisanRating: quote.artisanRating,
                assignedPrice: quote.price,
                status: 'En cours',
                updatedAt: new Date().toISOString()
            });

            let myName = 'Client', myImage = '';
            if (auth.currentUser) {
                const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    myName = userData.name || 'Client';
                    myImage = userData.avatar || userData.image || '';
                }
            }

            const chatDocId = `${order.userId}_${quote.artisanId}`;
            await setDoc(doc(db, "chats", chatDocId), {
                id: chatDocId, userId: order.userId, userName: myName, userImage: myImage,
                artisanId: quote.artisanId, artisanName: quote.artisanName, artisanImage: quote.artisanImage,
                lastMessage: `Commande acceptée (${quote.price}).`, timestamp: new Date().toISOString(),
                unreadCount: 0, isOnline: true
            }, { merge: true });

            await addDoc(collection(db, "chats", chatDocId, "messages"), {
                text: `Bonjour ! J'ai accepté votre devis de ${quote.price}. Quand pouvez-vous intervenir ?`,
                sender: 'user', timestamp: new Date().toISOString(), status: 'sent'
            });
        } catch (err) { console.error(err); } finally { setIsAccepting(null); }
    };

    const handleRejectQuote = async (quote: Quote) => {
        if (!confirm("Refuser cette offre ?")) return;
        setIsRejecting(quote.id);
        try { await rejectQuote(order.id, quote.artisanId, quote.id); }
        catch (err) { console.error(err); } finally { setIsRejecting(null); }
    };

    const handleConfirmCompletion = async (rating: number, comment: string, images: string[]) => {
        try {
            await archiveOrder(order, { rating, comment, images });
            if (order.artisanId) {
                const chatDocId = `${order.userId}_${order.artisanId}`;
                await addDoc(collection(db, "chats", chatDocId, "messages"), {
                    text: `✅ Mission terminée et validée ! Note: ${rating}/5. Photos ajoutées au portfolio.`,
                    sender: 'user', timestamp: new Date().toISOString(), status: 'sent'
                });
            }
            await new Promise(resolve => setTimeout(resolve, 1500));
            onBack();
        } catch (err) { console.error(err); alert("Erreur lors de l'archivage."); setShowCompletionModal(false); }
    };

    const handleExpandSearch = async () => {
        try {
            const newRadius = 2;
            const additionalArtisans = await findBestArtisans(order.category, newRadius);
            const newTargetedSet = new Set([...(order.targetedArtisans || []), ...additionalArtisans]);
            await updateDoc(doc(db, "orders", order.id), {
                searchRadius: newRadius, targetedArtisans: Array.from(newTargetedSet), contactedArtisanIds: Array.from(newTargetedSet)
            });
            setCanExpand(false);
            alert("Recherche élargie !");
        } catch (err) { console.error(err); }
    };

    const isAssigned = ['En cours', 'Accepté', 'Terminé', 'En attente de clôture'].includes(order.status);
    const isPendingClosure = order.status === 'En attente de clôture';

    return (
        <div className="min-h-screen bg-[#0a0a0c] flex flex-col animate-in slide-in-from-right duration-500 pb-32">
            <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-[#0a0a0c]/90 backdrop-blur-xl z-50 border-b border-white/5">
                <button onClick={onBack} className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-white border border-white/10 active:scale-90"><ChevronLeft className="w-5 h-5" /></button>
                <h1 className="text-[11px] font-black text-white tracking-[0.2em] uppercase">COMMANDE #{order.id.slice(-5).toUpperCase()}</h1>
                <button className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-500 border border-white/10"><MoreVertical size={20} /></button>
            </header>

            <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 p-6 bg-[#0a0a0c]">
                {/* Header Card */}
                <div className="glass-card p-6 rounded-[2.5rem] bg-[#1a1a20]/60 border border-white/5">
                    <div className="flex items-center gap-5">
                        <div className="size-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/10"><ImageIcon size={28} /></div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{order.category}</h2>
                            <div className="flex items-center gap-2 text-slate-600">
                                <Clock size={12} /><span className="text-[10px] font-black uppercase tracking-widest">{order.date}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">STATUT</span>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${isAssigned ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
                            <div className={`size-2 rounded-full ${order.status === 'Terminé' ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></div>
                            <span className="text-[9px] font-black uppercase tracking-widest">{isPendingClosure ? 'VALIDATION...' : order.status}</span>
                        </div>
                    </div>
                </div>

                {/* Validation Action */}
                {(order.status === 'En cours' || order.status === 'Accepté') && (
                    <div className="glass-card p-6 rounded-[2rem] bg-indigo-900/10 border border-indigo-500/20 flex items-center justify-between shadow-xl">
                        <div className="relative z-10">
                            <h4 className="text-white font-black text-sm uppercase tracking-tight">Travail terminé ?</h4>
                            <p className="text-[10px] text-indigo-400/70 font-bold uppercase tracking-widest mt-0.5">Validez pour clore la mission</p>
                        </div>
                        <button onClick={() => setShowCompletionModal(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center gap-2 hover:bg-indigo-500">
                            <CheckCircle2 size={16} /> Valider la fin
                        </button>
                    </div>
                )}

                {/* Quotes List */}
                {!isAssigned && (
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">DEVIS REÇUS</h3>
                        {quotes.length > 0 ? (
                            <div className="space-y-4">
                                {quotes.map((quote) => (
                                    <div key={quote.id} className="glass-card p-6 rounded-[2.5rem] bg-[#121214] border border-white/10 shadow-2xl">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="size-14 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                                                <SmartAvatar src={quote.artisanImage} name={quote.artisanName} initialsClassName="text-xl font-black text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="text-white font-black text-base uppercase tracking-tight">{quote.artisanName}</h4>
                                                        <div className="flex items-center gap-1 mt-1"><Star className="size-3 text-yellow-400 fill-current" /><span className="text-[10px] font-black text-white">{quote.artisanRating}</span></div>
                                                    </div>
                                                    <span className="text-lg font-black text-emerald-400 tracking-tighter">{quote.price}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-slate-400 text-xs italic mb-6 bg-white/5 p-4 rounded-2xl border border-white/5">"{quote.description}"</p>
                                        <div className="flex gap-3">
                                            <button onClick={() => handleRejectQuote(quote)} disabled={isRejecting === quote.id || isAccepting !== null} className="flex-1 py-4 rounded-2xl bg-white/5 text-red-400 border border-white/5 font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2">
                                                {isRejecting === quote.id ? <Loader2 className="size-4 animate-spin" /> : <><XCircle size={16} /> Refuser</>}
                                            </button>
                                            <button onClick={() => handleAcceptQuote(quote)} disabled={isAccepting !== null || isRejecting === quote.id} className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2">
                                                {isAccepting === quote.id ? <Loader2 className="size-4 animate-spin" /> : <><UserCheck size={16} /> Accepter</>}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-card p-10 rounded-[2.5rem] bg-[#121214]/60 border border-dashed border-white/10 text-center">
                                <Search className="animate-pulse text-slate-700 mx-auto mb-4" size={24} />
                                <p className="text-slate-600 font-black text-[10px] uppercase tracking-widest">Recherche d'experts...</p>
                                {canExpand && (
                                    <button onClick={handleExpandSearch} className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-xl mx-auto mt-4">
                                        <Zap size={14} className="fill-current" /> Élargir la recherche
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Assigned Artisan */}
                {isAssigned && (
                    <div className="space-y-6">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">EXPERT ASSIGNÉ</h3>
                        <div onClick={() => onOpenArtisanProfile(order.artisanId)} className="glass-card p-6 rounded-[2.5rem] bg-[#121214] border border-white/10 shadow-2xl group cursor-pointer active:scale-[0.99] transition-all">
                            <div className="flex items-center gap-5">
                                <div className="size-16 rounded-full border-2 border-indigo-500/30 overflow-hidden shadow-xl">
                                    <SmartAvatar src={order.artisanImage} name={order.artisanName || 'Expert'} initialsClassName="text-xl font-black text-white" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xl font-black text-white tracking-tighter mb-2">{order.artisanName}</h4>
                                    <div className="flex items-center gap-1"><Star className="size-3 text-yellow-400 fill-current" /><span className="text-xs font-black text-white">{order.artisanRating}</span></div>
                                </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onOpenChat({ id: order.artisanId, name: order.artisanName, image: order.artisanImage }); }} className="w-full mt-8 py-4 bg-indigo-600 rounded-2xl flex items-center justify-center gap-3 text-white font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-indigo-600/20">
                                <MessageCircle size={16} /> Discuter avec l'expert
                            </button>
                        </div>
                    </div>
                )}

                {/* Photos Initiales */}
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

            <CompletionModal isOpen={showCompletionModal} onClose={() => setShowCompletionModal(false)} onConfirm={handleConfirmCompletion} artisanName={order.artisanName || 'Expert'} artisanImage={order.artisanImage} orderId={order.id} />

            {fullScreenImage && (
                <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setFullScreenImage(null)}>
                    <button className="absolute top-6 right-6 size-10 bg-white/10 rounded-full flex items-center justify-center text-white"><X size={20} /></button>
                    <img src={fullScreenImage} className="max-w-full max-h-full object-contain rounded-lg animate-in zoom-in-95" alt="Full" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
};
