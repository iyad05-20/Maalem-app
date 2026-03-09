import React, { useState } from 'react';
import { CheckCircle, Edit3, Loader2 } from 'lucide-react';

interface Props {
    orderTitle: string;
    orderDescription: string;
    userPhoto: string | null;
    generatedImage: string | null;
    isPublishing: boolean;
    isGeneratingImage: boolean;
    onTitleChange: (v: string) => void;
    onDescriptionChange: (v: string) => void;
    onPublish: () => void;
}

export const OrderPreview: React.FC<Props> = ({
    orderTitle,
    orderDescription,
    userPhoto,
    generatedImage,
    isPublishing,
    isGeneratingImage,
    onTitleChange,
    onDescriptionChange,
    onPublish,
}) => {
    const [editing, setEditing] = useState(false);

    return (
        <div className="mx-4 mb-4 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <CheckCircle className="size-5 text-emerald-400" />
                </div>
                <div>
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-widest">Demande prête</p>
                    <p className="text-white font-bold text-sm">Vérifiez avant de publier</p>
                </div>
                <button
                    onClick={() => setEditing((e) => !e)}
                    className="ml-auto size-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    title="Modifier"
                >
                    <Edit3 className="size-4" />
                </button>
            </div>

            {/* Title */}
            {editing ? (
                <input
                    value={orderTitle}
                    onChange={(e) => onTitleChange(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-semibold focus:outline-none focus:border-purple-500/50"
                    placeholder="Titre de la demande"
                />
            ) : (
                <p className="text-white font-bold">{orderTitle}</p>
            )}

            {/* Description */}
            {editing ? (
                <textarea
                    value={orderDescription}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-slate-300 text-sm leading-relaxed resize-none focus:outline-none focus:border-purple-500/50"
                    placeholder="Description de la demande"
                />
            ) : (
                <p className="text-slate-300 text-sm leading-relaxed">{orderDescription}</p>
            )}

            {/* Image thumbnails */}
            {(userPhoto || generatedImage || isGeneratingImage) && (
                <div className="flex gap-3">
                    {userPhoto && (
                        <div className="shrink-0">
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Votre photo</p>
                            <img
                                src={`data:image/jpeg;base64,${userPhoto}`}
                                className="size-16 rounded-xl object-cover border border-white/10"
                                alt="Photo client"
                            />
                        </div>
                    )}
                    {(generatedImage || isGeneratingImage) && (
                        <div className="shrink-0">
                            <p className="text-[10px] text-purple-400 uppercase tracking-widest mb-1">Image IA</p>
                            {isGeneratingImage ? (
                                <div className="size-16 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center animate-pulse">
                                    <Loader2 className="size-4 text-purple-500 animate-spin" />
                                </div>
                            ) : (
                                <img
                                    src={generatedImage!}
                                    className="size-16 rounded-xl object-cover border border-purple-500/30"
                                    alt="Image générée"
                                />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Publish button */}
            <button
                onClick={onPublish}
                disabled={isPublishing || isGeneratingImage}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black text-sm uppercase tracking-widest disabled:opacity-50 active:scale-[0.98] transition-all shadow-xl shadow-emerald-900/30 flex items-center justify-center gap-2"
            >
                {isPublishing ? (
                    <>
                        <Loader2 className="size-4 animate-spin" />
                        Publication…
                    </>
                ) : (
                    'Publier la demande'
                )}
            </button>
        </div>
    );
};
