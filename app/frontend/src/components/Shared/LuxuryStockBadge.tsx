import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Clock, AlertCircle } from 'lucide-react';
import { useClientI18n } from '../../services/i18n';

export interface LuxuryStockBadgeProps {
  stock?: number | null;
  initialStock?: number | null;
  isOutOfStock?: boolean;
  stockPolicy?: {
    showStockToClient?: boolean;
    allowOrderExceedingStock?: boolean;
    autoAcceptExceedingStock?: boolean;
  };
  variant?: 'card' | 'detail' | 'compact';
  style?: React.CSSProperties;
}

/**
 * LuxuryStockBadge - Vork Moroccan Artisan Haute Ébénisterie & Zellige Aesthetics
 * Conçu spécifiquement selon le Vork Luxury Design System (.agents/skills/vork-design-system/SKILL.md)
 * Évite tout aspect "urgence promo e-commerce bas de gamme".
 * Valorise la rareté, l'artisanat d'art et l'exclusivité d'atelier.
 */
export const LuxuryStockBadge: React.FC<LuxuryStockBadgeProps> = ({
  stock,
  initialStock,
  isOutOfStock,
  stockPolicy,
  variant = 'card',
  style = {},
}) => {
  const { isRTL } = useClientI18n();
  const shouldReduceMotion = useReducedMotion();

  // Si le suivi de stock n'est pas activé sur cette création, ne rien afficher
  if (stock === undefined || stock === null) {
    return null;
  }

  const currentStock = Number(stock);
  const refStock = Number(initialStock) > 0 ? Number(initialStock) : Math.max(currentStock, 1);
  const stockRatio = currentStock / refStock;

  // Règle Décision 36 & P5 : Stock Limité quand stock ≤ 20% du stock de référence ou ≤ 2 unités
  const isStockLimited = currentStock > 0 && (stockRatio <= 0.20 || currentStock <= 2);
  const isDepleted = Boolean(isOutOfStock) || currentStock <= 0;

  // Si le stock est confortable (> 20%), pas de badge d'alerte pour préserver la pureté visuelle
  if (!isStockLimited && !isDepleted) {
    return null;
  }

  const showStockCount = stockPolicy?.showStockToClient !== false;
  const allowOnDemand = Boolean(stockPolicy?.allowOrderExceedingStock);

  // 1. Cas : Rupture de stock
  if (isDepleted) {
    if (allowOnDemand) {
      // Option artisan : Sur commande / confection à la demande
      return (
        <motion.div
          dir={isRTL ? 'rtl' : 'ltr'}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25 }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: variant === 'detail' ? '6px 14px' : '4px 10px',
            borderRadius: 20,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(212, 175, 55, 0.45)', // Or Zellige
            boxShadow: '0 4px 14px rgba(26, 42, 58, 0.08)',
            ...style,
          }}
        >
          <Clock size={variant === 'detail' ? 14 : 12} color="#8B6914" />
          <span
            style={{
              fontFamily: 'var(--font-display, serif)',
              fontWeight: 700,
              fontSize: variant === 'detail' ? 12 : 10.5,
              color: 'var(--primary, #1A2A3A)',
              letterSpacing: '0.2px',
            }}
          >
            {isRTL ? 'صنع عند الطلب · حِرفية الورشة' : 'Confection sur commande · Pièce d’Atelier'}
          </span>
        </motion.div>
      );
    }

    // Épuisé temporairement
    return (
      <motion.div
        dir={isRTL ? 'rtl' : 'ltr'}
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: variant === 'detail' ? '6px 14px' : '4px 10px',
          borderRadius: 20,
          background: 'rgba(26, 42, 58, 0.06)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(184, 98, 63, 0.35)', // Terre cuite réelle
          boxShadow: '0 2px 8px rgba(26, 42, 58, 0.04)',
          ...style,
        }}
      >
        <AlertCircle size={variant === 'detail' ? 14 : 12} color="var(--accent-warm, #B8623F)" />
        <span
          style={{
            fontFamily: 'var(--font-body, sans-serif)',
            fontWeight: 700,
            fontSize: variant === 'detail' ? 12 : 10.5,
            color: 'var(--accent-warm, #B8623F)',
          }}
        >
          {isRTL ? 'نفدت الكمية المتوفرة مؤقتاً' : 'Édition épuisée · Victime de son succès'}
        </span>
      </motion.div>
    );
  }

  // 2. Cas : Stock Limité (≤ 20% ou ≤ 2)
  return (
    <motion.div
      dir={isRTL ? 'rtl' : 'ltr'}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: variant === 'detail' ? '7px 16px' : '4px 11px',
        borderRadius: 22,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(250, 248, 244, 0.95))',
        backdropFilter: 'blur(12px)',
        border: '1.2px solid rgba(212, 175, 55, 0.65)', // Or Zellige Métallique Vork
        boxShadow: '0 6px 16px rgba(212, 175, 55, 0.16)',
        ...style,
      }}
    >
      {/* Sceau Zellige Or */}
      <span
        style={{
          color: '#C4A96A',
          fontSize: variant === 'detail' ? 13 : 11,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        ✦
      </span>

      <span
        style={{
          fontFamily: 'var(--font-display, serif)',
          fontWeight: 700,
          fontSize: variant === 'detail' ? 12.5 : 11,
          color: 'var(--primary, #1A2A3A)',
          letterSpacing: '0.25px',
        }}
      >
        {showStockCount ? (
          isRTL ? (
            <>
              إصدار محدود · <strong style={{ color: 'var(--accent-warm, #B8623F)' }}>بقي {currentStock} فقط</strong>
            </>
          ) : (
            <>
              Série Limitée · <strong style={{ color: 'var(--accent-warm, #B8623F)' }}>Plus que {currentStock} pièce{currentStock > 1 ? 's' : ''}</strong>
            </>
          )
        ) : (
          isRTL ? (
            'إصدار محدود · قطعة نادرة'
          ) : (
            'Série Limitée · Pièce d’Exception'
          )
        )}
      </span>
    </motion.div>
  );
};
