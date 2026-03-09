import { useState, useCallback, useRef } from 'react';
import { ChatMessage, GeminiResponse, Order } from '../types';
import { sendMessage, sendMessageWithPhoto, resetSession, ORDER_CHANGE_KEYWORDS } from '../services/ai/geminiService';
import { generateImage, resizeForFlux2dev, fileToBase64 } from '../services/ai/imageGenService';
import { uploadToSupabase } from '../services/supabase.config';
import { getInitialArtisans } from '../services/recommendation.service';
import { reverseGeocode, MARRAKECH_CENTER } from '../services/location.service';
import type { Category, Artisan, Coordinates } from '../types';

interface UseChatbotOptions {
    category: Category;
    preSelectedArtisan?: Artisan;
    userLocation?: Coordinates | null;
    onSubmit: (order: Order) => Promise<void>;
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
    onClose: () => void;
}

let msgCounter = 0;
const newId = () => `msg-${++msgCounter}`;

function botTextMessage(text: string): ChatMessage {
    return { id: newId(), role: 'bot', type: 'text', text };
}

export function useChatbot({
    category,
    preSelectedArtisan,
    userLocation,
    onSubmit,
    showToast,
    onClose,
}: UseChatbotOptions) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [askForPhoto, setAskForPhoto] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [orderReady, setOrderReady] = useState(false);
    const [orderTitle, setOrderTitle] = useState('');
    const [orderDescription, setOrderDescription] = useState('');
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [userPhoto511, setUserPhoto511] = useState<string | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    // Multi-order tracking
    const [pendingOrders, setPendingOrders] = useState<string[] | null>(null);
    const [orderSequence, setOrderSequence] = useState<'first' | 'second' | null>(null);

    const imageGenTriggeredRef = useRef(false);

    const addMessage = (msg: ChatMessage) =>
        setMessages((prev) => [...prev, msg]);

    // ─── Handle Gemini Response ─────────────────────────────────────────────

    const handleGeminiResponse = useCallback(
        async (json: GeminiResponse) => {
            // 1. Parse suggestions (pipe-separated)
            const suggestions = json.suggestion
                ? json.suggestion.split('|').map((s) => s.trim()).filter(Boolean)
                : undefined;

            // 2. Add message with suggestions (Fixes two-bubble bug)
            addMessage({
                id: newId(),
                role: 'bot',
                type: 'text',
                text: json.message_to_user,
                suggestions,
                isPhotoError: json.photo_quality === 'bad',
                safetyWarning: json.safety_warning,
                riskLevel: json.risk_level
            });

            // Photo quality bad — retake needed
            if (json.photo_quality === 'bad') {
                setAskForPhoto(true); // Re-enable photo button for retake
                return;
            }

            // Request photo upload button
            if (json.ask_for_photo) {
                setAskForPhoto(true);
            }

            // Trigger image generation
            if (json.needs_image_gen && json.image_prompt && json.model && !imageGenTriggeredRef.current) {
                imageGenTriggeredRef.current = true;
                setIsGeneratingImage(true);
                const loadingId = newId();
                addMessage({ id: loadingId, role: 'bot', type: 'text', text: '🎨 Génération de l\'image en cours…' });

                try {
                    const steps = json.image_steps ?? 8;
                    const photo = json.model === 'flux-2-dev' ? userPhoto511 ?? undefined : undefined;
                    const imageUrl = await generateImage(json.image_prompt, steps, json.model, photo);
                    setGeneratedImage(imageUrl);
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === loadingId
                                ? { id: loadingId, role: 'bot', type: 'image', imageUrl }
                                : m,
                        ),
                    );
                } catch (err) {
                    console.error('[useChatbot] Image gen failed:', err);
                    imageGenTriggeredRef.current = false; // Allow retrying if AI triggers it again
                    setMessages((prev) => prev.filter((m) => m.id !== loadingId));
                    addMessage(botTextMessage("La génération d'image a échoué. Vous pouvez publier maintenant sans image ou essayer de me donner plus de détails."));
                } finally {
                    setIsGeneratingImage(false);
                }
            }

            // Order ready
            if (json.order_ready) {
                setOrderReady(true);
                setOrderTitle(json.order_title ?? '');
                setOrderDescription(json.order_description ?? '');
            }

            // Track multi-order state
            if (json.multi_order_detected) {
                setPendingOrders(json.pending_orders);
                setOrderSequence(json.order_sequence);
            }

            // If invalid category and user hasn't forced it, stop here
            if (!json.category_valid && json.suggested_category) {
                // The bot message already explains this and suggests changing category.
                // We'll intercept the user's specific chip choice if they pick "Changer de catégorie".
            }
        },
        [userPhoto511],
    );

    // ─── Send Text ──────────────────────────────────────────────────────────

    const handleSendMessage = useCallback(
        async (text: string) => {
            if (!text.trim() || isLoading) return;

            // Intercept category rejection if user taps "Changer de catégorie"
            // Let the UI handle closing, we don't send this to Gemini
            if (text === "Changer de catégorie") {
                onClose();
                return;
            }

            addMessage({ id: newId(), role: 'user', type: 'text', text });
            setIsLoading(true);
            imageGenTriggeredRef.current = false;

            try {
                // Check if the user is changing their mind (e.g. "finalement, ...")
                const lowerText = text.toLowerCase();
                const isChangingOrder = ORDER_CHANGE_KEYWORDS.some(kw => lowerText.includes(kw));

                // If changing order, send the reset instruction to Gemini before the real message
                const payloadText = isChangingOrder
                    ? `Nouvelle commande. Oublie la conversation précédente.\n\n${text}`
                    : text;

                const json = await sendMessage(payloadText);
                await handleGeminiResponse(json);
            } catch (err) {
                console.error('[useChatbot] sendMessage error:', err);
                addMessage(botTextMessage('Une erreur est survenue, veuillez réessayer.'));
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading, handleGeminiResponse, onClose],
    );

    // ─── Send Photo ─────────────────────────────────────────────────────────

    const handleSendPhoto = useCallback(
        async (file: File) => {
            if (isLoading) return;
            setAskForPhoto(false);

            // Show preview in UI
            const previewUrl = URL.createObjectURL(file);
            addMessage({ id: newId(), role: 'user', type: 'image', imageUrl: previewUrl });

            setIsLoading(true);
            imageGenTriggeredRef.current = false;

            try {
                // Read original photo for Gemini (no resize)
                const originalBase64 = await fileToBase64(file);
                setUserPhoto(originalBase64);

                // Resize to 511px for flux-2-dev
                const resized = await resizeForFlux2dev(file);
                setUserPhoto511(resized);

                const json = await sendMessageWithPhoto('Voici ma photo.', originalBase64);
                await handleGeminiResponse(json);
            } catch (err) {
                console.error('[useChatbot] sendPhoto error:', err);
                addMessage(botTextMessage('Une erreur est survenue avec la photo. Veuillez réessayer.'));
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading, handleGeminiResponse],
    );

    // ─── Start (called with initial description) ────────────────────────────

    const startChatbot = useCallback(
        async (description: string) => {
            imageGenTriggeredRef.current = false;
            const firstMessage = `[Catégorie choisie par l'utilisateur dans l'app: ${category.name}]\nDescription: ${description}`;
            addMessage({ id: newId(), role: 'user', type: 'text', text: description });
            setIsLoading(true);

            try {
                const json = await sendMessage(firstMessage);
                await handleGeminiResponse(json);
            } catch (err) {
                console.error('[useChatbot] startChatbot error:', err);
                addMessage(botTextMessage('Une erreur est survenue, veuillez réessayer.'));
            } finally {
                setIsLoading(false);
            }
        },
        [category.name, handleGeminiResponse],
    );

    // ─── Publish Order ──────────────────────────────────────────────────────

    const publishOrder = useCallback(async () => {
        setIsPublishing(true);
        const effectiveLocation = userLocation || MARRAKECH_CENTER;

        try {
            const orderId = `ord-${Date.now()}`;
            const imageUrls: string[] = [];

            // Upload user photo if present
            if (userPhoto) {
                try {
                    const blob = await fetch(`data:image/jpeg;base64,${userPhoto}`).then((r) => r.blob());
                    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
                    const url = await uploadToSupabase('vork-profilepic-bucket', `orders/${orderId}/user_photo.jpg`, file);
                    imageUrls.push(url);
                } catch (e) {
                    console.warn('Photo upload failed, continuing without it:', e);
                }
            }

            // Upload generated image if present
            if (generatedImage) {
                try {
                    const blob = await fetch(generatedImage).then((r) => r.blob());
                    const file = new File([blob], `generated_${Date.now()}.png`, { type: 'image/png' });
                    const url = await uploadToSupabase('vork-profilepic-bucket', `orders/${orderId}/generated.png`, file);
                    imageUrls.push(url);
                } catch (e) {
                    console.warn('Generated image upload failed, continuing without it:', e);
                }
            }

            // Artisan matching
            let targeted: string[] = [];
            if (preSelectedArtisan) {
                targeted = [preSelectedArtisan.id];
            } else {
                targeted = await getInitialArtisans(orderId, category.name, effectiveLocation);
            }

            const city = userLocation
                ? await reverseGeocode(effectiveLocation.lat, effectiveLocation.lng)
                : 'Marrakech';

            const newOrder: Order = {
                id: orderId,
                category: category.name,
                status: "EN ATTENTE D'EXPERT",
                date: new Date().toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                }),
                description: orderDescription,
                title: orderTitle,
                location: userLocation ? 'Ma position actuelle' : 'Marrakech, Centre',
                locationCoords: effectiveLocation,
                city,
                responses: [],
                images: imageUrls,
                targetedArtisans: targeted,
                isDirect: !!preSelectedArtisan,
                contactedArtisanIds: targeted,
                currentRadius: 1,
                rejectedArtisanIds: [],
            };

            await onSubmit(newOrder);

            // Reset order-specific state but NOT messages (for continuity)
            setGeneratedImage(null);
            setOrderReady(false);
            setOrderTitle('');
            setOrderDescription('');
            setUserPhoto(null);
            setUserPhoto511(null);
            setAskForPhoto(false);
            imageGenTriggeredRef.current = false;

            showToast('Demande publiée avec succès !', 'success');

            // Multi-order transition: if this was the first order, auto-kick off the second
            if (orderSequence === 'first' && pendingOrders && pendingOrders.length >= 2) {
                const secondOrderName = pendingOrders[1];
                setOrderSequence('second');
                setPendingOrders(null);
                setMessages([]);
                setIsLoading(true);
                try {
                    // Tell Gemini to start the second order
                    const transitionMsg = `[Transition automatique vers la deuxième demande: ${secondOrderName}]`;
                    const json = await sendMessage(transitionMsg);
                    await handleGeminiResponse(json);
                } catch (err) {
                    console.error('[useChatbot] multi-order transition error:', err);
                    addMessage(botTextMessage('Une erreur est survenue lors du passage à la deuxième demande.'));
                } finally {
                    setIsLoading(false);
                }
                return; // Don't close the chatbot
            }

            // Single order or second order done — reset session and close
            await resetSession();
            setMessages([]);
            setPendingOrders(null);
            setOrderSequence(null);
            onClose();
        } catch (err) {
            console.error('[useChatbot] publishOrder error:', err);
            showToast('Erreur lors de la publication.', 'error');
        } finally {
            setIsPublishing(false);
        }
    }, [
        userLocation, userPhoto, generatedImage, preSelectedArtisan,
        category.name, orderDescription, orderTitle, onSubmit, showToast, onClose,
        orderSequence, pendingOrders, handleGeminiResponse,
    ]);

    return {
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
    };
}
