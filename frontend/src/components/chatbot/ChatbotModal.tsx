import React, { useEffect, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';
import { ChatBubble } from './ChatBubble';
import { ChatInput } from './ChatInput';
import { OrderPreview } from './OrderPreview';
import { useChatbot } from '../../hooks/useChatbot';
import type { Category, Artisan, Coordinates, Order } from '../../types';

interface Props {
    isOpen: boolean;
    initialDescription: string;
    category: Category;
    preSelectedArtisan?: Artisan;
    userLocation?: Coordinates | null;
    onSubmit: (order: Order) => Promise<void>;
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
    onClose: () => void;
}

export const ChatbotModal: React.FC<Props> = ({
    isOpen,
    initialDescription,
    category,
    preSelectedArtisan,
    userLocation,
    onSubmit,
    showToast,
    onClose,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const initializedRef = useRef(false);
    const [inputText, setInputText] = React.useState('');

    const {
        messages,
        isLoading,
        isPublishing,
        isGeneratingImage,
        askForPhoto,
        userPhoto,
        generatedImage,
        orderReady,
        orderTitle,
        orderDescription,
        setOrderTitle,
        setOrderDescription,
        startChatbot,
        handleSendMessage,
        handleSendPhoto,
        publishOrder,
    } = useChatbot({
        category,
        preSelectedArtisan,
        userLocation,
        onSubmit,
        showToast,
        onClose,
    });

    // Start chatbot with initial description when modal opens
    useEffect(() => {
        if (isOpen && initialDescription && !initializedRef.current) {
            initializedRef.current = true;
            startChatbot(initialDescription);
        }
        if (!isOpen) {
            initializedRef.current = false;
        }
    }, [isOpen, initialDescription, startChatbot]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, orderReady]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex flex-col bg-[#0a0a0c] animate-in slide-in-from-bottom duration-400">
            {/* Header */}
            <header className="px-6 pt-12 pb-4 flex items-center gap-4 border-b border-white/5 bg-[#0a0a0c]/95 backdrop-blur-xl shrink-0">
                <div className="size-10 rounded-xl bg-gradient-to-br from-purple-700 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-900/40">
                    <Sparkles className="size-5 text-white" />
                </div>
                <div className="flex-1">
                    <h2 className="text-base font-black text-white uppercase tracking-tight">Vork AI</h2>
                    <p className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">
                        {category.name} · Raffinement en cours
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="size-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                    <X className="size-4" />
                </button>
            </header>

            {/* Messages area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 pt-5 pb-2 space-y-1"
            >
                {/* Loading indicator for first message */}
                {messages.length === 0 && isLoading && (
                    <div className="flex justify-start mb-3">
                        <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                            <span className="size-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="size-2 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="size-2 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <ChatBubble
                        key={msg.id}
                        message={msg}
                        isLastBotMessage={msg.role === 'bot' && idx === messages.length - 1}
                        onSuggestionClick={handleSendMessage}
                        onRetakePhoto={() => {
                            // Handled via askForPhoto in useChatbot
                        }}
                        hideSuggestions={isLoading || inputText.length > 0}
                    />
                ))}

                {/* Loading indicator for subsequent messages */}
                {messages.length > 0 && isLoading && (
                    <div className="flex justify-start mb-3">
                        <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                            <span className="size-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="size-2 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="size-2 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                    </div>
                )}

                {/* Order ready preview */}
                {orderReady && (
                    <div className="pt-2">
                        <OrderPreview
                            orderTitle={orderTitle}
                            orderDescription={orderDescription}
                            userPhoto={userPhoto}
                            generatedImage={generatedImage}
                            isPublishing={isPublishing}
                            isGeneratingImage={isGeneratingImage}
                            onTitleChange={setOrderTitle}
                            onDescriptionChange={setOrderDescription}
                            onPublish={publishOrder}
                        />
                    </div>
                )}
            </div>

            {/* Input — always visible so user can add details even after order card appears */}
            <ChatInput
                isLoading={isLoading}
                askForPhoto={askForPhoto}
                onSendMessage={(t) => {
                    setInputText('');
                    handleSendMessage(t);
                }}
                onSendPhoto={handleSendPhoto}
                text={inputText}
                onTextChange={setInputText}
            />
        </div>
    );
};
