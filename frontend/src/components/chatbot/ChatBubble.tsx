import React from 'react';
import { RefreshCw } from 'lucide-react';
import { ChatMessage } from '../../types';

interface Props {
    message: ChatMessage;
    onSuggestionClick?: (text: string) => void;
    onRetakePhoto?: () => void;
    isLastBotMessage?: boolean;
    hideSuggestions?: boolean;
}

export const ChatBubble: React.FC<Props> = ({ message, onSuggestionClick, onRetakePhoto, isLastBotMessage, hideSuggestions }) => {
    const isBot = message.role === 'bot';

    if (message.type === 'image' && message.imageUrl) {
        return (
            <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-3 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className="max-w-[80%]">
                    <img
                        src={message.imageUrl}
                        alt="Visual"
                        className="rounded-2xl border border-white/10 max-w-full shadow-xl"
                    />
                    {isBot && (
                        <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-1 ml-1">
                            Vork AI
                        </p>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} mb-4 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isBot
                    ? 'bg-white/8 border border-white/10 text-slate-100 rounded-tl-sm'
                    : 'bg-gradient-to-r from-purple-700 to-purple-500 text-white rounded-tr-sm shadow-lg shadow-purple-900/30'
                    }`}
            >
                {message.text}
            </div>

            {/* Safety Warning */}
            {isBot && message.safetyWarning && (
                <div
                    className={`max-w-[85%] px-3 py-2 rounded-xl text-[13px] leading-snug mt-1 font-medium ${message.riskLevel === 'high'
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                        : 'bg-orange-500/10 border border-orange-500/20 text-orange-400'
                        }`}
                >
                    {message.safetyWarning}
                </div>
            )}


            {/* Suggestions Chips — only for the LAST bot message and if suggestions exist */}
            {isBot && isLastBotMessage && !hideSuggestions && message.suggestions && message.suggestions.length > 0 && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar w-full pb-1 mt-1 px-1">
                    {message.suggestions.map((sug, i) => (
                        <button
                            key={i}
                            onClick={() => onSuggestionClick?.(sug)}
                            className="shrink-0 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 text-[13px] font-black uppercase tracking-tight hover:bg-purple-500/20 active:scale-95 transition-all whitespace-nowrap max-w-[160px] truncate shadow-lg shadow-purple-900/10"
                        >
                            {sug}
                        </button>
                    ))}
                </div>
            )}

            {/* Retake Photo Button — if photo quality was bad */}
            {isBot && isLastBotMessage && message.isPhotoError && (
                <button
                    onClick={onRetakePhoto}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-500 text-white text-[12px] font-black uppercase tracking-widest hover:bg-orange-600 active:scale-95 transition-all shadow-lg shadow-orange-900/30 mt-1"
                >
                    <RefreshCw size={14} />
                    Reprendre la photo
                </button>
            )}
        </div>
    );
};
