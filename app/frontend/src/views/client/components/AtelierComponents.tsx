/**
 * src/views/client/components/AtelierComponents.tsx
 * ═══════════════════════════════════════════════════════════════════════
 * Atelier Co-Creation Native Visual Component System
 *
 * Implements the 7 core components from the Atelier UX/UI Specification:
 * 1. VorkMessageBlock  — Curator/guide prose (with recovery variant)
 * 2. UserMessageBubble — Compact user bubble
 * 3. SuggestionChips  — Contextual clickable shortcuts (footer & in-feed)
 * 4. AtelierProductRail — Horizontal product discovery rail
 * 5. ActiveContextCard — Pinned anchor product banner
 * 6. SpecificationCard — Structured multi-mod summary before generation
 * 7. SimulationCard   — AI shimmer → large generated result + artisan CTA
 * ═══════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, CheckCircle2, Edit3, Hammer, AlertCircle } from 'lucide-react';
import type { Modification } from '../../../services/atelierService';

// ─── Colour tokens (matches MAALEM design system) ────────────────────────────
const C = {
  amber:       '#D97706',
  amberDeep:   '#B45309',
  amberDarker: '#78350F',
  warmBg:      '#FCFBF9',
  warmCard:    '#FFFBEB',
  stone:       '#1C1917',
  stoneMid:    '#44403C',
  stoneLight:  '#78716C',
  border:      'rgba(217,119,6,0.22)',
  borderStrong:'rgba(217,119,6,0.38)',
};

// ─── Operation labels (human-readable, never internal terms) ──────────────────
const OP_LABELS: Record<string, string> = {
  ADD:    'Ajout',
  CHANGE: 'Changement',
  MODIFY: 'Modification',
  REMOVE: 'Suppression',
};

// ─── Feature label formatter (never expose internal keys to user) ─────────────
function humanizeFeature(feature?: string | null): string {
  if (!feature || typeof feature !== 'string') return 'Personnalisation';
  const map: Record<string, string> = {
    engraving: 'Gravure',
    gravure:   'Gravure',
    finish:    'Finition',
    finition:  'Finition',
    patine:    'Patine',
    color:     'Couleur',
    couleur:   'Couleur',
    shade:     'Teinte',
    teinte:    'Teinte',
    texture:   'Texture',
    style:     'Style',
    material:  'Matière',
    matiere:   'Matière',
    motif:     'Motif',
    dimension: 'Dimensions',
    form:      'Forme',
    forme:     'Forme',
    size:      'Taille',
    taille:    'Taille',
    structure: 'Structure',
    detail:    'Détail',
  };
  const key = feature.toLowerCase().trim();
  return map[key] || feature.charAt(0).toUpperCase() + feature.slice(1);
}

// ─── 1. Vork Guidance Message Block ──────────────────────────────────────────
export const VorkMessageBlock: React.FC<{
  text: string;
  variant?: 'default' | 'recovery';
}> = ({ text, variant = 'default' }) => {
  const isRecovery = variant === 'recovery';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        margin: '14px 0 8px 0',
        padding: '0 4px',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: isRecovery
            ? 'linear-gradient(135deg, #F3F4F6, #E5E7EB)'
            : 'linear-gradient(135deg, #F59E0B, #D97706)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isRecovery ? C.stoneLight : 'white',
          flexShrink: 0,
          boxShadow: isRecovery ? 'none' : '0 2px 8px rgba(217,119,6,0.28)',
          marginTop: '1px',
        }}
      >
        {isRecovery ? <AlertCircle size={15} /> : <Sparkles size={15} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: isRecovery ? C.stoneLight : C.amberDeep,
            display: 'block',
            marginBottom: '5px',
          }}
        >
          Vork
        </span>
        <p
          style={{
            fontSize: '14.5px',
            lineHeight: 1.6,
            color: C.stone,
            margin: 0,
            fontFamily: 'var(--sans, system-ui, -apple-system, sans-serif)',
          }}
        >
          {text}
        </p>
      </div>
    </motion.div>
  );
};

// ─── 2. User Message Bubble ───────────────────────────────────────────────────
export const UserMessageBubble: React.FC<{ text: string }> = ({ text }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0' }}
  >
    <div
      style={{
        maxWidth: '80%',
        backgroundColor: C.stone,
        color: '#FBFBFA',
        padding: '10px 16px',
        borderRadius: '18px 18px 4px 18px',
        fontSize: '13.5px',
        lineHeight: 1.45,
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        fontFamily: 'var(--sans, system-ui, sans-serif)',
      }}
    >
      {text}
    </div>
  </motion.div>
);

// ─── 3. Contextual Suggestion Chips ──────────────────────────────────────────
export const SuggestionChips: React.FC<{
  chips: string[];
  onSelect: (chip: string) => void;
  disabled?: boolean;
  variant?: 'footer' | 'inline';
}> = ({ chips, onSelect, disabled, variant = 'footer' }) => {
  const safeChips = Array.isArray(chips) ? chips.filter(Boolean) : [];
  if (safeChips.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: variant === 'footer' ? '6px 0 10px 0' : '8px 0',
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        flexWrap: variant === 'inline' ? 'wrap' : 'nowrap',
      }}
    >
      {safeChips.map((chip, idx) => (
        <motion.button
          key={idx}
          whileTap={{ scale: 0.93 }}
          whileHover={{ borderColor: C.amber }}
          onClick={() => !disabled && onSelect(chip)}
          disabled={disabled}
          style={{
            whiteSpace: 'nowrap',
            padding: variant === 'inline' ? '8px 16px' : '7px 14px',
            backgroundColor: '#FFFFFF',
            border: `1.5px solid ${C.border}`,
            borderRadius: '999px',
            color: C.amberDarker,
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'border-color 0.15s ease',
            fontFamily: 'var(--sans, system-ui, sans-serif)',
          }}
        >
          <span>{chip}</span>
          <ArrowRight size={10} color={C.amber} />
        </motion.button>
      ))}
    </motion.div>
  );
};

// ─── 4. Horizontal Product Rail ───────────────────────────────────────────────
export const AtelierProductRail: React.FC<{
  products: any[];
  onSelectProduct: (product: any) => void;
}> = ({ products, onSelectProduct }) => {
  const safeProducts = Array.isArray(products) ? products.filter(Boolean) : [];
  if (safeProducts.length === 0) return null;

  return (
    <div style={{ margin: '4px 0 20px 0' }}>
      <div
        style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '6px',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {safeProducts.map((p) => {
          const imgUrl = p.image || p.imageUrl || 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500';
          const priceDisplay = p.price
            ? (typeof p.price === 'number' ? `${p.price} DH` : p.price)
            : 'Sur devis';

          return (
            <motion.div
              key={p.id || p.title}
              whileTap={{ scale: 0.96 }}
              whileHover={{ y: -2 }}
              onClick={() => onSelectProduct(p)}
              style={{
                flexShrink: 0,
                width: '180px',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid rgba(0,0,0,0.07)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                cursor: 'pointer',
              }}
            >
              {/* Product Image */}
              <div
                style={{
                  height: '115px',
                  backgroundColor: '#F5F4F0',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <img
                  src={imgUrl}
                  alt={p.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease',
                  }}
                />
                {p.badge && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      backgroundColor: 'rgba(255,255,255,0.92)',
                      backdropFilter: 'blur(4px)',
                      color: C.amberDarker,
                      fontSize: '9.5px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {p.badge}
                  </span>
                )}
              </div>

              {/* Product Info */}
              <div style={{ padding: '10px 12px' }}>
                <p
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: C.stone,
                    margin: '0 0 3px 0',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.title}
                </p>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: C.amberDeep,
                  }}
                >
                  {priceDisplay}
                </span>
                <span
                  style={{
                    fontSize: '10.5px',
                    color: C.amber,
                    display: 'block',
                    marginTop: '4px',
                    fontWeight: 600,
                  }}
                >
                  ✦ Personnaliser →
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ─── 5. Pinned Active Context Card ────────────────────────────────────────────
export const ActiveContextCard: React.FC<{
  product: any;
  onChangeBase?: () => void;
}> = ({ product, onChangeBase }) => {
  if (!product) return null;

  const imgUrl = product.image || product.imageUrl || 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=500';
  const priceDisplay = product.price
    ? (typeof product.price === 'number' ? `${product.price} DH` : product.price)
    : 'Sur devis';

  return (
    <div
      style={{
        backgroundColor: '#FFFBEB',
        border: `1.5px solid ${C.borderStrong}`,
        borderRadius: '14px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(217,119,6,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img
          src={imgUrl}
          alt={product.title}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            objectFit: 'cover',
            flexShrink: 0,
            border: '1px solid rgba(217,119,6,0.2)',
          }}
        />
        <div>
          <span
            style={{
              fontSize: '9.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              color: C.amberDeep,
              display: 'block',
              letterSpacing: '0.06em',
            }}
          >
            ✦ Création sélectionnée
          </span>
          <p
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: C.stone,
              margin: '1px 0 0 0',
              lineHeight: 1.25,
            }}
          >
            {product.title}
          </p>
          <span
            style={{
              fontSize: '11px',
              color: C.amberDeep,
              fontWeight: 700,
            }}
          >
            {priceDisplay}
          </span>
        </div>
      </div>

      {onChangeBase && (
        <button
          onClick={onChangeBase}
          style={{
            backgroundColor: '#FFFFFF',
            border: `1px solid ${C.border}`,
            color: C.amberDarker,
            borderRadius: '999px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          Changer
        </button>
      )}
    </div>
  );
};

// ─── 6. Creation Specification Card (Gate 2 Approval Container) ───────────────
//   Renders a structured summary and clear action buttons ("Modifier" & "Générer la simulation")
export const SpecificationCard: React.FC<{
  baseProduct?: { title?: string; price?: string | number; image?: string; imageUrl?: string } | null;
  modifications?: Modification[] | null;
  preservedProperties?: string[] | null;
  summary?: string | null;
  onModify: () => void;
  onGenerate: () => void;
  isGenerating?: boolean;
}> = ({
  baseProduct,
  modifications = [],
  preservedProperties = [],
  summary,
  onModify,
  onGenerate,
  isGenerating = false,
}) => {
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const t1 = setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 80);
    const t2 = setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 300);
    const t3 = setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const safeMods = Array.isArray(modifications) ? modifications.filter(Boolean) : [];
  const safePreserved = Array.isArray(preservedProperties) ? preservedProperties.filter(Boolean) : [];
  const hasMods = safeMods.length > 0;

  // Split summary into clean bullet lines if formatted with bullets
  const summaryLines = (summary && typeof summary === 'string')
    ? summary
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      ref={cardRef}
      style={{
        width: '100%',
        minHeight: 'fit-content',
        flexShrink: 0,
        display: 'block',
        boxSizing: 'border-box',
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: `1.5px solid ${C.borderStrong}`,
        overflow: 'hidden',
        margin: '14px 0 16px 0',
        boxShadow: '0 6px 24px rgba(217,119,6,0.09), 0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
          padding: '12px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: 'rgba(217,119,6,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={13} color={C.amberDeep} />
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: C.amberDarker,
            }}
          >
            ✦ Spécifications de votre création
          </span>
        </div>

        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '999px',
            backgroundColor: '#FFFFFF',
            color: C.amberDeep,
            border: `1px solid ${C.border}`,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Prêt pour simulation
        </span>
      </div>

      {/* Body Content */}
      <div style={{ padding: '14px 16px' }}>
        {/* Base Product Info */}
        {baseProduct && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              backgroundColor: '#FAF7F2',
              borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.04)',
              marginBottom: '12px',
            }}
          >
            <div>
              <span
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: C.stoneLight,
                  letterSpacing: '0.06em',
                  display: 'block',
                }}
              >
                {baseProduct.image ? 'Pièce de base' : 'Projet de création'}
              </span>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: C.stone,
                  margin: '1px 0 0 0',
                }}
              >
                {baseProduct.title}
              </p>
            </div>
            {baseProduct.price && (
              <span style={{ fontSize: '12px', fontWeight: 700, color: C.amberDeep }}>
                {typeof baseProduct.price === 'number' ? `${baseProduct.price} DH` : baseProduct.price}
              </span>
            )}
          </div>
        )}

        {/* Structured Modifications if present */}
        {hasMods ? (
          <div style={{ marginBottom: '12px' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: C.stoneLight,
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: '6px',
              }}
            >
              Modifications souhaitées
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {safeMods.map((mod, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '8px 10px',
                    backgroundColor: '#FAF7F2',
                    borderRadius: '10px',
                    border: '1px solid rgba(217,119,6,0.12)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#FFFBEB',
                      color: C.amberDeep,
                      border: `1px solid ${C.border}`,
                      flexShrink: 0,
                      marginTop: '1px',
                    }}
                  >
                    {OP_LABELS[mod.operation] || mod.operation || 'Détail'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 600,
                        color: C.stoneLight,
                        display: 'block',
                      }}
                    >
                      {humanizeFeature(mod.feature)}
                      {mod.location && mod.location !== 'surface' && mod.location !== 'all'
                        ? ` · ${mod.location}`
                        : ''}
                    </span>
                    <span
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: C.stone,
                      }}
                    >
                      {mod.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : summary ? (
          /* Plain / Formatted Summary fallback */
          <div
            style={{
              backgroundColor: '#FAF7F2',
              borderRadius: '12px',
              padding: '10px 12px',
              border: '1px solid rgba(217,119,6,0.14)',
              marginBottom: '12px',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: C.stoneLight,
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: '5px',
              }}
            >
              Détails de la personnalisation
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {summaryLines.map((line, idx) => (
                <p
                  key={idx}
                  style={{
                    fontSize: '12.5px',
                    lineHeight: 1.5,
                    color: C.stone,
                    margin: 0,
                    fontWeight: line.startsWith('•') ? 500 : 400,
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        ) : (
          /* Safe default fallback */
          <div
            style={{
              backgroundColor: '#FAF7F2',
              borderRadius: '12px',
              padding: '10px 12px',
              border: '1px solid rgba(0,0,0,0.04)',
              marginBottom: '12px',
            }}
          >
            <p style={{ fontSize: '12.5px', color: C.stone, margin: 0, lineHeight: 1.5 }}>
              Vos critères de personnalisation artisanale sont enregistrés et prêts à être simulés.
            </p>
          </div>
        )}

        {/* Preserved Properties */}
        {safePreserved.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <span
              style={{
                fontSize: '9.5px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: C.stoneLight,
                letterSpacing: '0.06em',
                display: 'block',
                marginBottom: '5px',
              }}
            >
              Éléments préservés
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {safePreserved.map((prop, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: C.stoneMid,
                    backgroundColor: '#F3F4F6',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: '1px solid rgba(0,0,0,0.05)',
                  }}
                >
                  {prop}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Action Buttons (Modifier / Générer la simulation) ── */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <button
            onClick={onModify}
            disabled={isGenerating}
            style={{
              flex: 1,
              padding: '11px 12px',
              borderRadius: '12px',
              backgroundColor: '#F3F4F6',
              border: '1px solid rgba(0,0,0,0.06)',
              color: '#374151',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: isGenerating ? 'default' : 'pointer',
              opacity: isGenerating ? 0.6 : 1,
              transition: 'background-color 0.15s ease',
            }}
          >
            <Edit3 size={13} />
            <span>Modifier</span>
          </button>

          <motion.button
            whileTap={{ scale: isGenerating ? 1 : 0.97 }}
            onClick={onGenerate}
            disabled={isGenerating}
            style={{
              flex: 2,
              padding: '11px 16px',
              borderRadius: '12px',
              background: isGenerating
                ? 'linear-gradient(135deg, #92400E, #78350F)'
                : 'linear-gradient(135deg, #D97706, #B45309)',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: isGenerating ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 3px 12px rgba(180,83,9,0.28)',
              opacity: isGenerating ? 0.85 : 1,
            }}
          >
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}
                >
                  <Sparkles size={14} />
                </motion.div>
                <span>Façonnage en cours...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>✦ Générer la simulation</span>
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

// ─── 7. Simulation & Order Preview Container (Gate 3 → Gate 4) ────────────────
//   Displays the generated FLUX preview, editable description ready to publish, and artisan CTA
export const SimulationCard: React.FC<{
  imageUrl?: string | null;
  isLoading: boolean;
  productTitle?: string;
  summary?: string | null;
  description?: string | null;
  onModify: () => void;
  onSubmitToArtisan: () => void;
  isSubmitted?: boolean;
  generationMode?: 'image_to_image' | 'text_to_image';
  sourceImageUsed?: boolean;
  referenceImageUrl?: string | null;
}> = ({
  imageUrl,
  isLoading,
  productTitle,
  summary,
  description,
  onModify,
  onSubmitToArtisan,
  isSubmitted = false,
  generationMode,
  sourceImageUsed,
  referenceImageUrl,
}) => {
  const [isEditingDesc, setIsEditingDesc] = React.useState(false);
  const [descText, setDescText] = React.useState<string>(
    description ||
      summary ||
      `Création personnalisée de ${productTitle || "pièce d'artisanat marocain"} façonnée sur mesure par nos maîtres artisans.`
  );

  const simRef = React.useRef<HTMLDivElement>(null);

  // Sync state if prop changes
  React.useEffect(() => {
    if (description || summary) {
      setDescText(description || summary || '');
    }
  }, [description, summary]);

  React.useEffect(() => {
    if (!isLoading && imageUrl) {
      const timer = setTimeout(() => {
        simRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [imageUrl, isLoading]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          width: '100%',
          minHeight: 'fit-content',
          flexShrink: 0,
          boxSizing: 'border-box',
          borderRadius: '20px',
          overflow: 'hidden',
          backgroundColor: C.warmCard,
          border: `1.5px dashed ${C.borderStrong}`,
          padding: '36px 20px',
          textAlign: 'center',
          margin: '16px 0',
          boxShadow: '0 4px 20px rgba(217,119,6,0.06)',
        }}
      >
        {/* Pulsing shimmer icon */}
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          style={{ display: 'inline-flex', marginBottom: '14px' }}
        >
          <Hammer size={34} color={C.amber} />
        </motion.div>

        <h4
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#92400E',
            margin: '0 0 6px 0',
          }}
        >
          Vork façonne votre simulation...
        </h4>
        <p
          style={{
            fontSize: '12px',
            color: C.amberDeep,
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          L'IA d'artisanat affine les matières, gravures et reflets marocains de votre pièce.
        </p>

        {/* Animated progress shimmer bar */}
        <div
          style={{
            marginTop: '18px',
            height: '3px',
            backgroundColor: 'rgba(217,119,6,0.15)',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            style={{
              width: '50%',
              height: '100%',
              background: `linear-gradient(90deg, transparent, ${C.amber}, transparent)`,
              borderRadius: '999px',
            }}
          />
        </div>
      </motion.div>
    );
  }

  if (!imageUrl) return null;

  // ── Result state ──
  return (
    <div
      ref={simRef}
      style={{
        width: '100%',
        minHeight: 'fit-content',
        flexShrink: 0,
        boxSizing: 'border-box',
        borderRadius: '20px',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        border: `1.5px solid ${C.borderStrong}`,
        boxShadow: '0 10px 36px rgba(217,119,6,0.12), 0 2px 8px rgba(0,0,0,0.04)',
        margin: '16px 0 20px 0',
      }}
    >
      {/* Simulation Image Showcase */}
      <div
        style={{
          width: '100%',
          height: '280px',
          position: 'relative',
          backgroundColor: C.stone,
          overflow: 'hidden',
        }}
      >
        <img
          src={imageUrl}
          alt="Simulation de création Vork"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />

        {/* Top-left exclusivity badge */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: 'rgba(28,25,23,0.85)',
            backdropFilter: 'blur(8px)',
            color: '#F59E0B',
            padding: '5px 12px',
            borderRadius: '999px',
            fontSize: '10.5px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          <Sparkles size={11} />
          <span>✦ Simulation exclusive</span>
        </div>

        {/* Top-right custom order badge */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            backgroundColor: 'rgba(217,119,6,0.9)',
            backdropFilter: 'blur(8px)',
            color: '#FFFFFF',
            padding: '5px 10px',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Pièce Unique
        </div>

        {/* Bottom-left reference origin badge */}
        {generationMode && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              backgroundColor: 'rgba(28,25,23,0.85)',
              backdropFilter: 'blur(8px)',
              color: sourceImageUsed ? '#FBBF24' : '#34D399',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '10px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            {sourceImageUsed && referenceImageUrl && (
              <img
                src={referenceImageUrl}
                alt="Source"
                style={{ width: '14px', height: '14px', borderRadius: '50%', objectFit: 'cover' }}
              />
            )}
            <span>{sourceImageUsed ? '🖼️ Basé sur pièce catalogue' : '✨ Création 100% Ex Nihilo'}</span>
          </div>
        )}
      </div>

      {/* Info, Description Ready to Publish, & Actions */}
      <div style={{ padding: '16px' }}>
        {/* Title */}
        <div style={{ marginBottom: '12px' }}>
          <span
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: C.amberDeep,
              fontWeight: 700,
              display: 'block',
            }}
          >
            ✦ Projet de création prêt pour réalisation
          </span>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: C.stone,
              margin: '3px 0 0 0',
              lineHeight: 1.3,
            }}
          >
            {productTitle ? `${productTitle} (Sur Mesure)` : 'Création Artisanale Personnalisée'}
          </h3>
        </div>

        {/* Description / Summary Box (Ready for artisan) */}
        <div
          style={{
            backgroundColor: '#FAF7F2',
            borderRadius: '14px',
            padding: '12px 14px',
            border: '1px solid rgba(217,119,6,0.16)',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                color: C.amberDarker,
                letterSpacing: '0.06em',
              }}
            >
              Descriptif pour l'artisan
            </span>
            <button
              onClick={() => setIsEditingDesc(!isEditingDesc)}
              style={{
                background: 'none',
                border: 'none',
                color: C.amberDeep,
                fontSize: '11px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                cursor: 'pointer',
                padding: '2px 4px',
              }}
            >
              <Edit3 size={11} />
              <span>{isEditingDesc ? 'Valider' : 'Modifier'}</span>
            </button>
          </div>

          {isEditingDesc ? (
            <textarea
              value={descText}
              onChange={e => setDescText(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                border: `1.5px solid ${C.amber}`,
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '12px',
                color: C.stone,
                fontFamily: 'var(--sans, system-ui, sans-serif)',
                lineHeight: 1.45,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <p
              style={{
                fontSize: '12.5px',
                lineHeight: 1.55,
                color: '#332F2E',
                margin: 0,
                whiteSpace: 'pre-line',
              }}
            >
              {descText}
            </p>
          )}
        </div>

        {/* ── Action buttons / Success confirmation ── */}
        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '14px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#065F46',
            }}
          >
            <CheckCircle2 size={22} color="#059669" style={{ flexShrink: 0 }} />
            <div>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  display: 'block',
                  color: '#065F46',
                }}
              >
                Demande transmise avec succès !
              </span>
              <span style={{ fontSize: '11.5px', color: '#047857', lineHeight: 1.4 }}>
                L'artisan va examiner vos spécifications et vous recontacter sous 24h. Suivez votre commande dans l'onglet Commandes.
              </span>
            </div>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onModify}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: '#F3F4F6',
                border: '1px solid rgba(0,0,0,0.06)',
                color: '#374151',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <Edit3 size={13} />
              <span>Modifier</span>
            </button>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onSubmitToArtisan}
              style={{
                flex: 2,
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #059669, #047857)',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 3px 14px rgba(4,120,87,0.28)',
              }}
            >
              <span>✦ Présenter à un artisan</span>
              <ArrowRight size={13} />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};
