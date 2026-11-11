import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  ShieldCheck,
  Image as ImageIcon,
  Layers,
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Lock,
  Upload,
  Coins,
  MapPin,
  Info,
  Palette,
  Hammer
} from 'lucide-react';
import { authService, type UserProfile } from '../../services/authService';
import { API_BASE } from '../../services/apiConfig';
import type { View } from '../../types';

interface AtelierViewProps {
  currentUser?: UserProfile | null;
  onNavigate?: (view: View) => void;
  onModalStateChange?: (isOpen: boolean) => void;
}

const CRAFT_CATEGORIES = [
  { id: 'ceramique', label: 'Céramique & Poterie', origin: 'Fès, Safi', icon: '🏺' },
  { id: 'maroquinerie', label: 'Cuir & Maroquinerie', origin: 'Marrakech, Fès', icon: '👜' },
  { id: 'textile', label: 'Textile, Caftans & Broderie', origin: 'Rabat, Fès', icon: '🧵' },
  { id: 'bois', label: 'Bois de Cèdre & Menuiserie', origin: 'Meknès, Essaouira', icon: '🪵' },
  { id: 'dinanderie', label: 'Dinanderie & Cuivre Ciselé', origin: 'Fès, Marrakech', icon: '🫖' },
  { id: 'tissage', label: 'Tapis & Tissage Berbère', origin: 'Moyen Atlas, Taznakht', icon: '🧶' },
  { id: 'bijouterie', label: 'Bijouterie & Joaillerie', origin: 'Tiznit, Essaouira', icon: '💍' },
  { id: 'autre', label: 'Autre Savoir-Faire d\'Art', origin: 'Tout le Maroc', icon: '✨' },
];

export const AtelierView: React.FC<AtelierViewProps> = ({ currentUser, onNavigate, onModalStateChange }) => {
  // Mode : 'entry' | 'manual_wizard'
  const [viewMode, setViewMode] = useState<'entry' | 'manual_wizard'>('entry');

  // Notify App.tsx to hide bottom floating nav bar when wizard is active
  useEffect(() => {
    const isWizardActive = viewMode === 'manual_wizard';
    if (onModalStateChange) {
      onModalStateChange(isWizardActive);
    }
    return () => {
      if (onModalStateChange) onModalStateChange(false);
    };
  }, [viewMode, onModalStateChange]);
  
  // Template product if initiated from product detail
  const [templateProduct, setTemplateProduct] = useState<any | null>(null);

  // Wizard state (Steps 1 to 4)
  const [step, setStep] = useState<number>(1);

  // Step 1 : Safety & charter
  const [safetyAccepted, setSafetyAccepted] = useState(false);

  // Step 2 : Visuals & Inspiration
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');

  // Step 3 : Craft Category
  const [selectedCategory, setSelectedCategory] = useState(CRAFT_CATEGORIES[0].label);

  // Step 4 : Specs & Submission
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [city, setCity] = useState('Casablanca');

  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check for template product from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('vork_atelier_template_product');
      if (stored) {
        const prod = JSON.parse(stored);
        setTemplateProduct(prod);
        if (prod.image || prod.imageUrl) {
          setImageUrl(prod.image || prod.imageUrl);
          setImagePreview(prod.image || prod.imageUrl);
        }
        if (prod.category) {
          const match = CRAFT_CATEGORIES.find(c => prod.category.toLowerCase().includes(c.id));
          if (match) setSelectedCategory(match.label);
          else setSelectedCategory(prod.category);
        }
        setTitle(`Personnalisation de "${prod.title}"`);
        // Directly open wizard if coming with a template
        setViewMode('manual_wizard');
      }
    } catch (e) {
      console.warn('Could not parse template product:', e);
    }
  }, []);

  const handleClearTemplate = () => {
    sessionStorage.removeItem('vork_atelier_template_product');
    setTemplateProduct(null);
    setImageUrl('');
    setImagePreview('');
    setTitle('');
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitRequest = async () => {
    if (!safetyAccepted) {
      setErrorMsg('Veuillez accepter la charte d\'engagement pour continuer.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Veuillez décrire votre projet et vos souhaits techniques.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const isFromPost = Boolean(templateProduct);
    const payload = {
      clientRef: currentUser?.id || 'client-me',
      customizationOrigin: isFromPost ? 'from_post' : 'from_scratch',
      sourceProductId: templateProduct?.id || null,
      sourceVendorId: templateProduct?.artisanRef || templateProduct?.artisan_ref || templateProduct?.facets?.artisan_ref || null,
      categoryName: selectedCategory,
      title: title.trim() || `Création sur-mesure (${selectedCategory})`,
      description: description.trim(),
      budget: budget ? Number(budget) : undefined,
      proofImage: imageUrl.trim() || imagePreview || null,
      selectedSize: templateProduct?.selectedSize || null,
      selectedColor: templateProduct?.selectedColor || null,
      tags: Array.isArray(templateProduct?.tags) ? templateProduct.tags : [],
      photos: Array.isArray(templateProduct?.photos) ? templateProduct.photos : [],
      safetyGuidelinesAccepted: true,
      transportProvider: 'vendeur',
    };

    try {
      const token = authService.getToken() || '';
      const res = await fetch(`${API_BASE}/client/custom-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la soumission de la demande.');
      }

      setSuccessResult(data);
      sessionStorage.removeItem('vork_atelier_template_product');
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="app-view"
      style={{
        minHeight: '100%',
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: '#FAF8F5',
        color: '#1A2A3A',
        fontFamily: 'var(--font-body, system-ui, sans-serif)',
        padding: '0 0 calc(140px + env(safe-area-inset-bottom)) 0',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Moroccan Header Bar */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1A2A3A 0%, #243B53 100%)',
          color: '#FFFFFF',
          padding: '24px 20px 28px 20px',
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          boxShadow: '0 12px 30px rgba(26, 42, 58, 0.15)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(212, 175, 55, 0.2)',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D4AF37',
              }}
            >
              <Hammer size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#D4AF37', fontWeight: 700 }}>
                Atelier Maâlem
              </span>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, fontFamily: 'var(--font-display, serif)' }}>
                Espace Co-Création
              </h1>
            </div>
          </div>

          {viewMode === 'manual_wizard' && (
            <button
              onClick={() => {
                if (window.confirm('Voulez-vous quitter la personnalisation en cours ?')) {
                  handleClearTemplate();
                  setViewMode('entry');
                  setStep(1);
                }
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                borderRadius: 12,
                padding: '6px 12px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <X size={15} />
              Quitter
            </button>
          )}
        </div>

        <p style={{ margin: 0, fontSize: '0.82rem', color: '#CBD5E1', lineHeight: 1.45, maxWidth: 520 }}>
          Donnez vie à vos projets artisanaux uniques avec la garantie d'authenticité et le séquestre protecteur Vork.
        </p>

        {/* Template Banner if active */}
        {templateProduct && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 16,
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(212, 175, 55, 0.35)',
              borderRadius: 18,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
              <img
                src={templateProduct.image || templateProduct.imageUrl}
                alt={templateProduct.title}
                style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ overflow: 'hidden' }}>
                <span style={{ fontSize: '0.68rem', color: '#D4AF37', fontWeight: 600, display: 'block' }}>
                  {templateProduct.personalizationMode === 'delegate_to_market'
                    ? 'Inspiration pour le Marché Public'
                    : 'Modèle de référence sélectionné'}
                </span>
                <span style={{ fontSize: '0.82rem', color: '#FFFFFF', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                  {templateProduct.title}
                </span>
              </div>
            </div>
            <button
              onClick={handleClearTemplate}
              title="Créer plutôt à partir de zéro"
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </div>

      {/* Main Container */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>

        {/* ═══ VIEW 1 : 2-BUTTON / 2-CARD ENTRY VIEW ═══ */}
        {viewMode === 'entry' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <div style={{ textAlign: 'center', margin: '8px 0 16px 0' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1A2A3A', margin: '0 0 6px 0' }}>
                Choisissez votre parcours d'Atelier
              </h2>
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                Sélectionnez le mode de création adapté à vos besoins
              </p>
            </div>

            {/* CARD 1 : ACTIVE MANUAL CUSTOMIZATION */}
            <motion.div
              whileHover={{ scale: 1.015, y: -2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => {
                setViewMode('manual_wizard');
                setStep(1);
              }}
              style={{
                background: '#FFFFFF',
                borderRadius: 24,
                padding: '24px 20px',
                border: '1.5px solid rgba(212, 175, 55, 0.4)',
                boxShadow: '0 10px 30px rgba(212, 175, 55, 0.12)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: 'linear-gradient(135deg, #D4AF37 0%, #B8623F 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: '5px 14px',
                  borderBottomLeftRadius: 16,
                }}
              >
                ✦ Actif · 100% Artisanal
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(184, 98, 63, 0.15) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#B8623F',
                    flexShrink: 0,
                  }}
                >
                  <Palette size={28} />
                </div>

                <div style={{ flex: 1, paddingRight: 60 }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.08rem', fontWeight: 800, color: '#1A2A3A' }}>
                    Création Sur-Mesure Guidée
                  </h3>
                  <p style={{ margin: '0 0 14px 0', fontSize: '0.8rem', color: '#64748B', lineHeight: 1.45 }}>
                    Spécifiez votre projet en 4 étapes simples : charte de sécurité, photos ou croquis d'inspiration, corps de métier et cahier des charges.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#B8623F', fontSize: '0.82rem', fontWeight: 700 }}>
                    <span>Lancer la création guidée</span>
                    <ArrowRight size={15} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* CARD 2 : DISABLED AI CO-CREATION (COMING SOON) */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.65)',
                borderRadius: 24,
                padding: '24px 20px',
                border: '1.5px dashed #CBD5E1',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                position: 'relative',
                overflow: 'hidden',
                opacity: 0.88,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: '#64748B',
                  color: '#FFFFFF',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  padding: '5px 14px',
                  borderBottomLeftRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Lock size={11} />
                Bientôt disponible · V3
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94A3B8',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={28} />
                </div>

                <div style={{ flex: 1, paddingRight: 80 }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: 700, color: '#64748B' }}>
                    Atelier IA & Simulation Photoréaliste
                  </h3>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#94A3B8', lineHeight: 1.45 }}>
                    Génération prédictive par intelligence artificielle (Flux LoRA) et styliste virtuel conversationnel. Actuellement en phase d'entraînement sur nos modèles traditionnels.
                  </p>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#F1F5F9',
                      padding: '4px 10px',
                      borderRadius: 10,
                      color: '#64748B',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                    }}
                  >
                    <Info size={13} />
                    Accessible dans la prochaine version Vork
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ═══ VIEW 2 : 4-STEP GUIDED MANUAL CUSTOMIZATION FORM ═══ */}
        {viewMode === 'manual_wizard' && !successResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            {/* Step Progress Bar */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 20,
                padding: '16px 20px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#B8623F', textTransform: 'uppercase' }}>
                  Étape {step} sur 4
                </span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>
                  {step === 1 && 'Charte & Sécurité'}
                  {step === 2 && 'Image d\'Inspiration'}
                  {step === 3 && 'Catégorie & Métier'}
                  {step === 4 && 'Cahier des Charges'}
                </span>
              </div>
              <div style={{ height: 6, width: '100%', background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #D4AF37 0%, #B8623F 100%)',
                    borderRadius: 99,
                  }}
                  animate={{ width: `${(step / 4) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Error Display */}
            {errorMsg && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 14,
                  padding: '12px 16px',
                  color: '#DC2626',
                  fontSize: '0.82rem',
                }}
              >
                {errorMsg}
              </div>
            )}

            {/* ── STEP 1 : CHARTE & ENGAGEMENT SÉCURITÉ ── */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 24,
                  padding: '24px 20px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: 'rgba(34, 197, 94, 0.1)',
                      color: '#16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1A2A3A' }}>
                      Charte d'Engagement & Sécurité
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                      Obligatoire pour protéger clients et maîtres artisans
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    background: '#F8FAFC',
                    borderRadius: 16,
                    padding: 16,
                    border: '1px solid #E2E8F0',
                    fontSize: '0.82rem',
                    color: '#334155',
                    lineHeight: 1.6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span>⚖️</span>
                    <div>
                      <strong>Propriété et authenticité :</strong> Tout projet doit respecter le savoir-faire authentique. Le plagiat servile ou la contrefaçon de logos protégés sont strictement interdits.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span>🛡️</span>
                    <div>
                      <strong>Garantie Séquestre Vork :</strong> Vos fonds restent consignés sur compte séquestre sécurisé. L'artisan n'est rémunéré qu'après confection et validation de conformité.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <span>🤝</span>
                    <div>
                      <strong>Engagement mutuel :</strong> Dès validation d'un devis et début de fabrication, les matières premières sont engagées. L'annulation est alors encadrée par nos CGV.
                    </div>
                  </div>
                </div>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    cursor: 'pointer',
                    padding: '12px 14px',
                    borderRadius: 14,
                    background: safetyAccepted ? 'rgba(212, 175, 55, 0.08)' : '#FFFFFF',
                    border: safetyAccepted ? '1.5px solid #D4AF37' : '1px solid #CBD5E1',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={safetyAccepted}
                    onChange={(e) => setSafetyAccepted(e.target.checked)}
                    style={{ marginTop: 3, width: 18, height: 18, accentColor: '#B8623F' }}
                  />
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1A2A3A', lineHeight: 1.4 }}>
                    J'ai lu et j'accepte sans réserve la charte de sécurité et les règles de confection sur-mesure Vork.
                  </span>
                </label>

                <div style={{ marginTop: 24, paddingBottom: 8 }}>
                  <button
                    id="atelier-step1-continue-btn"
                    onClick={() => {
                      if (!safetyAccepted) {
                        setErrorMsg('Veuillez cocher la case d\'acceptation pour continuer.');
                        return;
                      }
                      setErrorMsg(null);
                      setStep(2);
                    }}
                    disabled={!safetyAccepted}
                    style={{
                      width: '100%',
                      padding: 16,
                      borderRadius: 16,
                      border: 'none',
                      background: safetyAccepted ? 'linear-gradient(135deg, #1A2A3A 0%, #B8623F 100%)' : '#E2E8F0',
                      color: safetyAccepted ? '#FFFFFF' : '#94A3B8',
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      cursor: safetyAccepted ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: safetyAccepted ? '0 8px 24px rgba(184, 98, 63, 0.25)' : 'none',
                    }}
                  >
                    Étape suivante : Image d'Inspiration
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2 : IMAGE & INSPIRATION ── */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 24,
                  padding: '24px 20px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: 'rgba(184, 98, 63, 0.1)',
                      color: '#B8623F',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ImageIcon size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1A2A3A' }}>
                      Image de Référence ou Croquis
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                      Aidez l'artisan à visualiser exactement votre idée
                    </p>
                  </div>
                </div>

                {/* Preview if image is present */}
                {imagePreview ? (
                  <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', height: 240, marginBottom: 16, border: '1px solid #E2E8F0' }}>
                    <img
                      src={imagePreview}
                      alt="Aperçu inspiration"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      onClick={() => {
                        setImagePreview('');
                        setImageUrl('');
                      }}
                      style={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        background: 'rgba(0, 0, 0, 0.6)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 10,
                        padding: '6px 10px',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <X size={14} />
                      Changer
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                    {/* File Upload Button */}
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        padding: '30px 20px',
                        border: '2px dashed #CBD5E1',
                        borderRadius: 20,
                        background: '#F8FAFC',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <Upload size={32} color="#94A3B8" />
                      <div>
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1A2A3A', display: 'block' }}>
                          Importer une photo ou un croquis
                        </span>
                        <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          PNG, JPG, WebP jusqu'à 15MB
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {/* Or URL input */}
                    <div>
                      <span style={{ display: 'block', fontSize: '0.76rem', color: '#64748B', textAlign: 'center', marginBottom: 8 }}>
                        — OU indiquer une URL d'image en ligne —
                      </span>
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => {
                          setImageUrl(e.target.value);
                          setImagePreview(e.target.value);
                        }}
                        placeholder="https://images.unsplash.com/... ou lien web"
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: 14,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.84rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 12, marginTop: 24, paddingBottom: 8 }}>
                  <button
                    onClick={() => setStep(1)}
                    style={{
                      padding: '14px 20px',
                      borderRadius: 16,
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      color: '#64748B',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <ArrowLeft size={16} />
                    Retour
                  </button>
                  <button
                    onClick={() => {
                      setErrorMsg(null);
                      setStep(3);
                    }}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 16,
                      border: 'none',
                      background: 'linear-gradient(135deg, #1A2A3A 0%, #B8623F 100%)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    Étape suivante : Catégorie
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3 : CATÉGORIE & MÉTIER ── */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 24,
                  padding: '24px 20px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: 'rgba(212, 175, 55, 0.15)',
                      color: '#D4AF37',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Layers size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1A2A3A' }}>
                      Corps de Métier Artisanal
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                      Sélectionnez la filière d'excellence requise
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  {CRAFT_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.label;
                    return (
                      <div
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.label)}
                        style={{
                          borderRadius: 16,
                          padding: '14px 12px',
                          border: isSelected ? '2px solid #D4AF37' : '1px solid #E2E8F0',
                          background: isSelected ? 'rgba(212, 175, 55, 0.08)' : '#F8FAFC',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}
                      >
                        <span style={{ fontSize: '1.5rem' }}>{cat.icon}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isSelected ? '#1A2A3A' : '#475569' }}>
                          {cat.label}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                          {cat.origin}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24, paddingBottom: 8 }}>
                  <button
                    onClick={() => setStep(2)}
                    style={{
                      padding: '14px 20px',
                      borderRadius: 16,
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      color: '#64748B',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <ArrowLeft size={16} />
                    Retour
                  </button>
                  <button
                    onClick={() => {
                      setErrorMsg(null);
                      setStep(4);
                    }}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 16,
                      border: 'none',
                      background: 'linear-gradient(135deg, #1A2A3A 0%, #B8623F 100%)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    Étape suivante : Spécifications
                    <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 4 : CAHIER DES CHARGES & ENVOI ── */}
            {step === 4 && (
              <motion.div
                key="step-4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 24,
                  padding: '24px 20px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      background: 'rgba(26, 42, 58, 0.1)',
                      color: '#1A2A3A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#1A2A3A' }}>
                      Cahier des Charges du Projet
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                      Détails de dimensions, couleurs, matières et budget
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1A2A3A', marginBottom: 6 }}>
                      Titre de la création
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Selham en laine brodé or, Plateau gravé 60cm..."
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 14,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1A2A3A', marginBottom: 6 }}>
                      Description technique & Spécifications <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Indiquez vos dimensions exactes, couleurs souhaitées, motifs spécifiques, finitions et toute instruction utile..."
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: 14,
                        border: '1px solid #CBD5E1',
                        fontSize: '0.84rem',
                        outline: 'none',
                        resize: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1A2A3A', marginBottom: 6 }}>
                        Budget cible estimé (MAD)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Coins size={16} color="#94A3B8" style={{ position: 'absolute', top: 12, left: 12 }} />
                        <input
                          type="number"
                          value={budget}
                          onChange={(e) => setBudget(e.target.value)}
                          placeholder="Ex: 850"
                          style={{
                            width: '100%',
                            padding: '11px 14px 11px 36px',
                            borderRadius: 14,
                            border: '1px solid #CBD5E1',
                            fontSize: '0.84rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1A2A3A', marginBottom: 6 }}>
                        Ville de livraison
                      </label>
                      <div style={{ position: 'relative' }}>
                        <MapPin size={16} color="#94A3B8" style={{ position: 'absolute', top: 12, left: 12 }} />
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Ex: Fès, Marrakech..."
                          style={{
                            width: '100%',
                            padding: '11px 14px 11px 36px',
                            borderRadius: 14,
                            border: '1px solid #CBD5E1',
                            fontSize: '0.84rem',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 24, paddingBottom: 8 }}>
                  <button
                    onClick={() => setStep(3)}
                    disabled={submitting}
                    style={{
                      padding: '14px 20px',
                      borderRadius: 16,
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      color: '#64748B',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <ArrowLeft size={16} />
                    Retour
                  </button>
                  <button
                    onClick={handleSubmitRequest}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      padding: 14,
                      borderRadius: 16,
                      border: 'none',
                      background: 'linear-gradient(135deg, #D4AF37 0%, #B8623F 100%)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      cursor: submitting ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 8px 24px rgba(184, 98, 63, 0.25)',
                    }}
                  >
                    {submitting ? 'Publication en cours...' : '✦ Publier la demande artisanale'}
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ═══ SUCCESS SCREEN ═══ */}
        {successResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{
              background: '#FFFFFF',
              borderRadius: 28,
              padding: '36px 24px',
              border: '1.5px solid rgba(212, 175, 55, 0.5)',
              boxShadow: '0 16px 40px rgba(26, 42, 58, 0.12)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(34, 197, 94, 0.2))',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1A2A3A', margin: '0 0 10px 0' }}>
              Projet Transmis avec Succès !
            </h2>

            <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.55, margin: '0 0 24px 0', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
              {successResult.message || 'Votre demande personnalisée a été enregistrée. Les Maâlems vous feront parvenir leurs devis détaillés.'}
            </p>

            <div
              style={{
                background: '#FAF8F5',
                borderRadius: 18,
                padding: '16px',
                textAlign: 'left',
                border: '1px solid #E2E8F0',
                marginBottom: 24,
                fontSize: '0.82rem',
                color: '#334155',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div><strong>N° Demande :</strong> {successResult.customRequest?.id}</div>
              <div><strong>Filière :</strong> {selectedCategory}</div>
              {budget && <div><strong>Budget Indicatif :</strong> {budget} MAD</div>}
              <div><strong>Statut :</strong> En attente d'offres artisanales</div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  setSuccessResult(null);
                  setViewMode('entry');
                  setStep(1);
                  handleClearTemplate();
                }}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 16,
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Nouvelle création
              </button>
              <button
                onClick={() => {
                  if (onNavigate) onNavigate('profile');
                }}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 16,
                  border: 'none',
                  background: 'linear-gradient(135deg, #1A2A3A 0%, #243B53 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Voir mes commandes
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
