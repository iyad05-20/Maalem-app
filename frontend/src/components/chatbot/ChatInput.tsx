import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { PhotoUploadButton } from './PhotoUploadButton';

interface Props {
    isLoading: boolean;
    askForPhoto: boolean;
    text: string;
    onTextChange: (val: string) => void;
    onSendMessage: (text: string) => void;
    onSendPhoto: (file: File) => void;
}

export const ChatInput: React.FC<Props> = ({
    isLoading,
    askForPhoto,
    text,
    onTextChange,
    onSendMessage,
    onSendPhoto,
}) => {
    const handleSubmit = () => {
        const trimmed = text.trim();
        if (!trimmed || isLoading) return;
        onSendMessage(trimmed);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="px-4 pb-6 pt-3 border-t border-white/5 bg-[#0a0a0c]">
            {/* Photo upload row — only shown when Gemini asks for one */}
            {askForPhoto && (
                <div className="mb-3">
                    <PhotoUploadButton onPhotoSelected={onSendPhoto} disabled={isLoading} />
                </div>
            )}

            <div className="flex items-end gap-3">
                <textarea
                    value={text}
                    onChange={(e) => onTextChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder="Répondez à Vork…"
                    rows={1}
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:border-purple-500/50 transition-all max-h-32 disabled:opacity-50"
                    style={{ minHeight: 44 }}
                />
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !text.trim()}
                    className="size-11 rounded-xl bg-gradient-to-br from-purple-700 to-purple-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-900/30 disabled:opacity-40 active:scale-95 transition-all"
                >
                    {isLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Send className="size-4" />
                    )}
                </button>
            </div>
        </div>
    );
};
