/**
 * src/views/client/AtelierView.tsx
 * ═══════════════════════════════════════════════════════════════════════
 * Atelier Co-Creation View — Vork Visual Assistant
 *
 * Conversation-first architecture per UX/UI Spec:
 * - Gate 0  : Initial invitation — natural language OR suggestion chip
 * - Gate 1  : Product discovery (Meilisearch rail) → bottom-sheet preview → silent anchor
 * - Gate 2  : Co-creation conversation (contextual chips from backend by gate)
 *             → Creation Specification Card (structured modifications[])
 * - Gate 3  : Adaptive FLUX simulation with pulse shimmer state
 * - Gate 4  : Artisan submission
 *
 * Design rules followed:
 * - User never sees internal LLM terms (rec_tags, style, etc.)
 * - Chips accelerate interaction — never replace free text
 * - Conversation state drives UI; visual components express it
 * ═══════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, RefreshCw, X, ShoppingBag, Palette } from 'lucide-react';
import {
  VorkMessageBlock,
  UserMessageBubble,
  SuggestionChips,
  AtelierProductRail,
  ActiveContextCard,
  SpecificationCard,
  SimulationCard,
} from './components/AtelierComponents';
import { atelierApi } from '../../services/atelierService';
import { authService, type UserProfile } from '../../services/authService';
import type { AtelierMode, Modification, CustomizationSpec } from '../../services/atelierService';
import type { View } from '../../types';

// ─── Message item in the conversation feed ────────────────────────────────────
interface MessageItem {
  id: string;
  sender: 'vork' | 'user';
  text: string;
  variant?: 'default' | 'recovery';
  // Product Rail
  previews?: any[];
  // In-feed chips (contextual answers mid-conversation)
  inlineChips?: string[];
  // Spec Card (Gate 2)
  isSpecCard?: boolean;
  specData?: {
    baseProduct?: { title: string; price?: string; image?: string; imageUrl?: string } | null;
    modifications: Modification[];
    preservedProperties: string[];
    summary?: string | null;
  };
  // Simulation (Gate 3)
  isSimulation?: boolean;
  simulationUrl?: string | null;
  simulationDescription?: string | null;
  generationMode?: 'image_to_image' | 'text_to_image';
  sourceImageUsed?: boolean;
  referenceImageUrl?: string | null;
}

// ─── Gate 0 invitation chips ──────────────────────────────────────────────────
const INITIAL_SUGGESTIONS = [
  'Trouver une inspiration',
  'Personnaliser une création',
  'Créer quelque chose de nouveau',
];

// ─── AtelierView ──────────────────────────────────────────────────────────────
export const AtelierView: React.FC<{
  currentUser?: UserProfile | null;
  onNavigate?: (view: View) => void;
  onModalStateChange?: (isOpen: boolean) => void;
}> = ({ currentUser, onNavigate, onModalStateChange }) => {
  const [sessionId, setSessionId] = useState<string>(() => `sess_${Date.now()}`);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'init-1',
      sender: 'vork',
      text: "Qu'est-ce que tu aimerais créer ?",
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [footerSuggestions, setFooterSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const [activeProduct, setActiveProduct] = useState<any | null>(null);
  // Track current gate mode (ref — does not trigger re-render)
  const currentModeRef = useRef<AtelierMode>('searching');
  const setCurrentMode = (m: AtelierMode) => { currentModeRef.current = m; };
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Bottom Sheet Preview Modal (Gate 1)
  const [previewModalProduct, setPreviewModalProduct] = useState<any | null>(null);

  useEffect(() => {
    if (onModalStateChange) {
      onModalStateChange(!!previewModalProduct);
    }
  }, [previewModalProduct, onModalStateChange]);

  const mainRef = useRef<HTMLElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (mainRef.current) {
      mainRef.current.scrollTop = mainRef.current.scrollHeight;
    }
  };

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    scrollToBottom();
    const t1 = setTimeout(scrollToBottom, 50);
    const t2 = setTimeout(scrollToBottom, 150);
    const t3 = setTimeout(scrollToBottom, 350);
    const t4 = setTimeout(scrollToBottom, 700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [messages, isTyping, isGenerating]);

  // ──────────────────────────────────────────────────────────────────────────
  // Send a message turn to the Atelier backend
  // ──────────────────────────────────────────────────────────────────────────
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping || isGenerating) return;

    setInputText('');
    setFooterSuggestions([]); // clear chips during thinking
    const userMsgId = `user_${Date.now()}`;

    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text }]);
    setIsTyping(true);

    try {
      const res = await atelierApi.sendMessage({
        sessionId,
        message: text,
        approvedProductId: activeProduct?.id,
      });

      setIsTyping(false);
      setCurrentMode(res.mode);
      
      // Active product sync from backend (preserve existing if already set)
      const baseProd = res.activeProduct || activeProduct;
      if (res.activeProduct) {
        setActiveProduct(res.activeProduct);
      }

      // Determine if Gate 2 approval is triggered (strict Gate guard with multi-signal fallback)
      const hasSimChip = (res.suggestions || []).some(s => {
        const low = (s || '').toLowerCase();
        return low.includes('générer') || low.includes('generer') || low.includes('simulation');
      });

      const isApprovalReady = Boolean(
        (res.sufficient === true || 
         res.mode === 'awaiting_generation_approval' || 
         Boolean(res.summary) ||
         hasSimChip ||
         Boolean(res.customizationSpec?.modifications && res.customizationSpec.modifications.length > 0)) &&
        res.mode !== 'searching'
      );

      // Suggestions handling
      if (isApprovalReady) {
        setFooterSuggestions(res.suggestions && res.suggestions.length > 0 ? res.suggestions : ['Modifier', 'Générer la simulation']);
      } else {
        setFooterSuggestions(res.suggestions || []);
      }

      const newItems: MessageItem[] = [];

      // ── Gate 2: Creation Specification Card (when sufficient/approval is true) ──
      if (isApprovalReady) {
        const spec: CustomizationSpec = res.customizationSpec || {
          modifications: [],
          preservedProperties: [],
        };
        newItems.push({
          id: `spec_${Date.now()}`,
          sender: 'vork',
          text: res.reply || 'Voici le récapitulatif de votre création artisanale sur mesure :',
          isSpecCard: true,
          specData: {
            baseProduct: baseProd
              ? { title: baseProd.title, price: baseProd.price, image: baseProd.image || baseProd.imageUrl }
              : { title: "Création sur mesure (Ex Nihilo)", price: "Sur devis", image: undefined },
            modifications: Array.isArray(spec.modifications) ? spec.modifications : [],
            preservedProperties: Array.isArray(spec.preservedProperties) ? spec.preservedProperties : ["Savoir-faire artisanal marocain"],
            summary: res.summary || (baseProd ? `• Base: ${baseProd.title}\n• Spécifications enregistrées` : "• Base: Création sur mesure (Ex Nihilo)\n• Spécifications enregistrées."),
          },
        });
      } else {
        // Standard Vork reply (with Product Rail if search results found)
        const hasResults = (res.previews?.length ?? 0) > 0;
        const isEmptySearch = !hasResults && res.mode === 'searching' && !res.sufficient;
        newItems.push({
          id: `vork_${Date.now()}`,
          sender: 'vork',
          text: res.reply || (res.mode === 'searching' ? "Voici les créations artisanales correspondant à votre recherche :" : "Je suis à votre écoute pour personnaliser cette création."),
          variant: isEmptySearch ? 'recovery' : 'default',
          previews: res.previews,
        });
      }

      setMessages(prev => [...prev, ...newItems]);
    } catch {
      setIsTyping(false);
      setFooterSuggestions(INITIAL_SUGGESTIONS);
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'vork',
          text: 'Je rencontre une légère difficulté. Tu peux reformuler ton idée ?',
          variant: 'recovery',
        },
      ]);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Gate 1 — Silent product anchor (no generic user message)
  // The user clicks "Personnaliser" in the bottom sheet.
  // We call select-product silently, then Vork opens the co-creation dialogue.
  // ──────────────────────────────────────────────────────────────────────────
  const handleAnchorProduct = async (product: any) => {
    setPreviewModalProduct(null);
    setActiveProduct(product);
    setFooterSuggestions([]);

    // Show a natural user message: what the user "said" by tapping Personnaliser
    setMessages(prev => [
      ...prev,
      {
        id: `user_anchor_${Date.now()}`,
        sender: 'user',
        text: `Je voudrais personnaliser : "${product.title}"`,
      },
    ]);

    setIsTyping(true);

    try {
      // 1. Silently anchor the product in the session
      await atelierApi.selectProduct(sessionId, product.id);

      // 2. Trigger Vork's opening co-creation question
      const res = await atelierApi.sendMessage({
        sessionId,
        message: `J'ai sélectionné "${product.title}" comme base de personnalisation.`,
        approvedProductId: product.id,
      });

      setIsTyping(false);
      setCurrentMode(res.mode);
      setFooterSuggestions(
        res.suggestions?.length
          ? res.suggestions
          : ['Modifier la couleur', 'Ajouter une gravure', 'Changer la matière', 'Appliquer une patine'],
      );

      setMessages(prev => [
        ...prev,
        {
          id: `vork_anchor_${Date.now()}`,
          sender: 'vork',
          text: res.reply,
        },
      ]);
    } catch {
      setIsTyping(false);
      setFooterSuggestions(['Modifier la couleur', 'Changer la matière', 'Ajuster les dimensions']);
      setMessages(prev => [
        ...prev,
        {
          id: `vork_anchor_err_${Date.now()}`,
          sender: 'vork',
          text: `Parfait. Qu'aimerais-tu modifier sur "${product.title}" ?`,
        },
      ]);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Gate 3 — Adaptive simulation generation
  // ──────────────────────────────────────────────────────────────────────────
  const handleGenerateSimulation = async () => {
    // Strict Gate 3 Guard: Cannot generate without anchor piece or specification card
    if (currentModeRef.current === 'searching' || (!activeProduct && !messages.some(m => m.isSpecCard))) {
      setMessages(prev => [
        ...prev,
        {
          id: `warn_${Date.now()}`,
          sender: 'vork',
          variant: 'recovery',
          text: "Pour générer une simulation, veuillez d'abord sélectionner une création dans le catalogue ou indiquer la pièce que vous souhaitez personnaliser.",
        },
      ]);
      return;
    }

    setIsGenerating(true);
    setFooterSuggestions([]);
    const simTempId = `sim_loading_${Date.now()}`;

    // Find latest specData / summary
    const lastSpec = messages.slice().reverse().find(m => m.isSpecCard && m.specData)?.specData;
    const initialDesc =
      lastSpec?.summary ||
      (activeProduct
        ? `Création personnalisée sur la base de "${activeProduct.title}".`
        : 'Création artisanale sur mesure.');

    setMessages(prev => [
      ...prev,
      {
        id: simTempId,
        sender: 'vork',
        text: 'Je prépare une simulation de ta création...',
        isSimulation: true,
        simulationUrl: null,
        simulationDescription: initialDesc,
      },
    ]);

    try {
      const simRes = await atelierApi.generateSimulation(sessionId);
      setIsGenerating(false);
      setCurrentMode('awaiting_submission');
      setFooterSuggestions(['Modifier la création', 'Présenter à un artisan']);

      setMessages(prev =>
        prev.map(item =>
          item.id === simTempId
            ? {
                ...item,
                text: 'Voilà ce que donnerait ta création.',
                simulationUrl: simRes.imageUrl,
                simulationDescription: initialDesc,
                generationMode: simRes.generationMode,
                sourceImageUsed: simRes.sourceImageUsed,
                referenceImageUrl: simRes.referenceImageUrl,
              }
            : item,
        ),
      );
    } catch {
      setIsGenerating(false);
      setFooterSuggestions(['Modifier', 'Réessayer la simulation']);
      setMessages(prev =>
        prev.map(item =>
          item.id === simTempId
            ? {
                ...item,
                text: 'La simulation a rencontré un délai. Nous pouvons réessayer ou transmettre ton descriptif directement à l\'artisan.',
                isSimulation: false,
                variant: 'recovery',
              }
            : item,
        ),
      );
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Gate 4 — Submit made-to-order to artisan
  // ──────────────────────────────────────────────────────────────────────────
  const handleSubmitToArtisan = async () => {
    try {
      const activeUser = currentUser || authService.getStoredUser();
      const userId = activeUser?.id || 'client-me';
      const simItem = messages.find(m => m.isSimulation && m.simulationUrl);

      await atelierApi.submitCustomRequest({
        sessionId,
        userId,
        requestType: activeProduct ? 'customize' : 'scratch',
        generatedImageUrl: simItem?.simulationUrl || undefined,
        targetArtisanId: activeProduct?.artisanId || activeProduct?.identity?.artisan_id || 'artisan-1',
      });

      setIsSubmitted(true);
      setCurrentMode('complete');
      setFooterSuggestions([]);
      setMessages(prev => [
        ...prev,
        {
          id: `submit_done_${Date.now()}`,
          sender: 'vork',
          text:
            "Ta demande de co-création est transmise avec succès ! L'artisan va examiner tes spécifications et te recontacter sous 24h. Tu peux retrouver le suivi dans tes commandes.",
        },
      ]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `submit_err_${Date.now()}`,
          sender: 'vork',
          variant: 'recovery',
          text: `La transmission de votre demande a rencontré une difficulté (${err.message || 'erreur réseau'}). Vous pouvez cliquer à nouveau sur "Présenter à un artisan" pour réessayer.`,
        },
      ]);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Reset
  // ──────────────────────────────────────────────────────────────────────────
  const handleResetSession = () => {
    const oldSessId = sessionId;
    const newSessId = `sess_${Date.now()}`;
    // Silently notify backend to clean up RAM
    atelierApi.resetSession(oldSessId).catch(() => {});

    setSessionId(newSessId);
    setActiveProduct(null);
    setIsSubmitted(false);
    setCurrentMode('searching');
    setFooterSuggestions(INITIAL_SUGGESTIONS);
    setMessages([
      {
        id: 'init-fresh',
        sender: 'vork',
        text: "Nouvelle session. Qu'est-ce que tu aimerais créer ?",
      },
    ]);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        height: '100%',
        minHeight: 0,
        width: '100%',
        backgroundColor: '#FCFBF9',
        position: 'relative',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <header
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          backgroundColor: 'rgba(252,251,249,0.96)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 2px 8px rgba(217,119,6,0.3)',
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <h1
              style={{
                fontSize: '17px',
                fontFamily: 'var(--heading, system-ui, serif)',
                fontWeight: 600,
                color: '#1C1917',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              L'Atelier
            </h1>
            <span style={{ fontSize: '11px', color: '#78716C' }}>
              Co-création avec Vork
            </span>
          </div>
        </div>

        <button
          onClick={handleResetSession}
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '999px',
            padding: '6px 12px',
            fontSize: '11.5px',
            fontWeight: 600,
            color: '#78716C',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={12} />
          <span>Nouvelle session</span>
        </button>
      </header>

      {/* ─── Pinned Active Product Sub-header ─────────────────────────────────── */}
      <AnimatePresence>
        {activeProduct && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{
              padding: '6px 16px',
              backgroundColor: 'rgba(252,251,249,0.98)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(217,119,6,0.15)',
              zIndex: 9,
              flexShrink: 0,
            }}
          >
            <ActiveContextCard
              product={activeProduct}
              onChangeBase={() => {
                setActiveProduct(null);
                setCurrentMode('searching');
                setFooterSuggestions(INITIAL_SUGGESTIONS);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Scrollable Conversation Feed ───────────────────────────────────── */}
      <main
        ref={mainRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '14px 16px 28px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Message feed */}
        {messages.map(item => {
          if (item.sender === 'user') {
            return <UserMessageBubble key={item.id} text={item.text} />;
          }

          if (item.isSpecCard && item.specData) {
            return (
              <div key={item.id} style={{ width: '100%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <VorkMessageBlock text={item.text} />
                <SpecificationCard
                  baseProduct={item.specData.baseProduct}
                  modifications={item.specData.modifications}
                  preservedProperties={item.specData.preservedProperties}
                  summary={item.specData.summary}
                  onModify={() => {
                    setInputText('Je souhaite modifier ');
                    inputRef.current?.focus();
                  }}
                  onGenerate={handleGenerateSimulation}
                  isGenerating={isGenerating}
                />
              </div>
            );
          }

          if (item.isSimulation) {
            return (
              <div key={item.id} style={{ width: '100%', flexShrink: 0 }}>
                <SimulationCard
                  imageUrl={item.simulationUrl}
                  isLoading={isGenerating && !item.simulationUrl}
                  productTitle={activeProduct?.title || "Création sur mesure"}
                  description={item.simulationDescription}
                  summary={item.simulationDescription}
                  generationMode={item.generationMode}
                  sourceImageUsed={item.sourceImageUsed}
                  referenceImageUrl={item.referenceImageUrl}
                  onModify={() => {
                    setInputText('Je souhaite modifier ');
                    inputRef.current?.focus();
                  }}
                  onSubmitToArtisan={handleSubmitToArtisan}
                  isSubmitted={isSubmitted}
                />
              </div>
            );
          }

          // Standard Vork message (with optional product rail + inline chips)
          return (
            <React.Fragment key={item.id}>
              <VorkMessageBlock text={item.text} variant={item.variant} />
              {item.previews && item.previews.length > 0 && (
                <AtelierProductRail
                  products={item.previews}
                  onSelectProduct={p => setPreviewModalProduct(p)}
                />
              )}
              {/* In-feed chips for mid-conversation contextual answers */}
              {item.inlineChips && item.inlineChips.length > 0 && (
                <SuggestionChips
                  chips={item.inlineChips}
                  onSelect={handleSendMessage}
                  variant="inline"
                  disabled={isTyping || isGenerating}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Vork thinking indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 4px',
              color: '#B45309',
              fontSize: '12.5px',
              fontWeight: 600,
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
            >
              <Sparkles size={13} />
            </motion.div>
            <span>Vork réfléchit...</span>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </main>

      {/* ─── Sticky Composer Footer ─────────────────────────────────────────── */}
      <footer
        style={{
          padding: '8px 16px 82px 16px',
          backgroundColor: '#FCFBF9',
          borderTop: '1px solid rgba(0,0,0,0.05)',
          position: 'relative',
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        {/* Footer suggestion chips */}
        <SuggestionChips
          chips={footerSuggestions}
          onSelect={chip => {
            if (chip === 'Générer la simulation') {
              handleGenerateSimulation();
            } else if (chip === 'Présenter à un artisan') {
              handleSubmitToArtisan();
            } else if (chip === 'Modifier' || chip === 'Modifier la création') {
              setInputText('Je souhaite modifier ');
              inputRef.current?.focus();
            } else {
              handleSendMessage(chip);
            }
          }}
          disabled={isTyping || isGenerating}
          variant="footer"
        />

        {/* Input bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            border: `1.5px solid rgba(217,119,6,${inputText.trim() ? '0.45' : '0.22'})`,
            padding: '4px 6px 4px 16px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            transition: 'border-color 0.2s ease',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSendMessage();
            }}
            placeholder={
              activeProduct
                ? 'Précise tes souhaits de personnalisation...'
                : 'Écrire à Vork...'
            }
            disabled={isTyping || isGenerating}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '13.5px',
              color: '#1C1917',
              backgroundColor: 'transparent',
              fontFamily: 'var(--sans, system-ui, sans-serif)',
            }}
          />

          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isTyping || isGenerating}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: inputText.trim() ? '#D97706' : '#E5E7EB',
              color: '#FFFFFF',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() && !isTyping ? 'pointer' : 'default',
              transition: 'background-color 0.18s ease',
              flexShrink: 0,
            }}
          >
            <Send size={15} />
          </motion.button>
        </div>
      </footer>

      {/* ─── Bottom Sheet Product Preview (Gate 1) ──────────────────────────── */}
      <AnimatePresence>
        {previewModalProduct && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.52)',
              zIndex: 110,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
            }}
            onClick={() => setPreviewModalProduct(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '20px 20px 32px 20px',
                maxHeight: '82vh',
                overflowY: 'auto',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div
                style={{
                  width: '36px',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: '#E5E7EB',
                  margin: '0 auto 16px auto',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#D97706' }}>
                  Aperçu de la création
                </span>
                <button
                  onClick={() => setPreviewModalProduct(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Product Image */}
              <div style={{ width: '100%', height: '240px', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#F3F4F6', marginBottom: '14px' }}>
                <img
                  src={
                    previewModalProduct.image ||
                    previewModalProduct.imageUrl ||
                    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600'
                  }
                  alt={previewModalProduct.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <h2 style={{ fontSize: '19px', fontWeight: 600, color: '#1C1917', margin: '0 0 4px 0', fontFamily: 'var(--heading, serif)' }}>
                {previewModalProduct.title}
              </h2>
              <p style={{ fontSize: '17px', fontWeight: 700, color: '#D97706', margin: '0 0 10px 0' }}>
                {previewModalProduct.price
                  ? typeof previewModalProduct.price === 'number'
                    ? `${previewModalProduct.price} DH`
                    : previewModalProduct.price
                  : 'Sur devis'}
              </p>
              {previewModalProduct.artisanName && (
                <p style={{ fontSize: '12px', color: '#78716C', margin: '0 0 6px 0' }}>
                  Par {previewModalProduct.artisanName}
                </p>
              )}
              <p style={{ fontSize: '13.5px', color: '#6B7280', lineHeight: 1.6, marginBottom: '22px' }}>
                {previewModalProduct.description ||
                  "Pièce d'artisanat marocain authentique, façonnée à la main avec des matériaux nobles."}
              </p>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    setPreviewModalProduct(null);
                    if (onNavigate) onNavigate('cart');
                  }}
                  style={{
                    flex: 1,
                    padding: '13px',
                    borderRadius: '14px',
                    backgroundColor: '#F3F4F6',
                    border: 'none',
                    color: '#374151',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <ShoppingBag size={15} />
                  <span>Acheter tel quel</span>
                </button>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAnchorProduct(previewModalProduct)}
                  style={{
                    flex: 1.6,
                    padding: '13px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #D97706, #B45309)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    boxShadow: '0 3px 10px rgba(180,83,9,0.3)',
                  }}
                >
                  <Palette size={15} />
                  <span>✦ Personnaliser</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AtelierView;
