import React from 'react';
import { motion } from 'framer-motion';
import { X, Heart } from 'lucide-react';
import type { Product } from '../../types';
import { ProductCard } from '../../components/Shared/ProductCard';
import { useClientI18n } from '../../services/i18n';

interface FavoritesViewProps {
  favoritedProducts: Product[];
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onToggleFavorite: (product: Product) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  favoritedProducts,
  onClose,
  onSelectProduct,
  onToggleFavorite,
}) => {
  const { lang, t } = useClientI18n();

  return (
    <motion.div
      className="search-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ zIndex: 250 }}
    >
      {/* Background Blur */}
      <div className="search-bg-blur" style={{ background: 'rgba(26, 42, 58, 0.45)' }} onClick={onClose} />

      {/* Main Slide-Up Panel */}
      <motion.div
        className="search-panel"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        style={{
          borderRadius: 32,
          overflow: 'hidden',
          background: '#FCFBF9',
          display: 'flex',
          flexDirection: 'column',
          height: '92vh',
          marginTop: 'auto'
        }}
      >
        {/* Header Bar */}
        <div className="search-header" style={{ justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <button className="search-back-btn" onClick={onClose} aria-label={lang === 'ar' ? "إغلاق" : "Fermer"}>
            <X size={18} strokeWidth={2} />
          </button>
          
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)', margin: 0 }}>
            {t('favorites_title')}
          </h2>

          <div style={{ width: 36, display: 'flex', justifyContent: 'flex-end', color: 'var(--accent-warm)' }}>
            <Heart size={18} fill="var(--accent-warm)" />
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 80px 20px' }}>
          
          {/* Subtitle / Counter */}
          <div style={{ marginBottom: 20, textAlign: lang === 'ar' ? 'right' : 'left' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
              {lang === 'ar' ? "المختارات المسجلة" : "Sélection enregistrée"}
            </p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', margin: '4px 0 0 0' }}>
              {favoritedProducts.length} {favoritedProducts.length > 1 ? (lang === 'ar' ? t('favorites_count_multi') : 'créations sauvegardées') : (lang === 'ar' ? t('favorites_count_single') : 'création sauvegardée')}
            </h3>
          </div>

          {/* Grid Layout of Cards */}
          {favoritedProducts.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                paddingBottom: '20px'
              }}
            >
              {favoritedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={onSelectProduct}
                  isFavorite={true}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div style={{ background: '#FFFFFF', border: '1px dashed var(--border)', borderRadius: 24, padding: '48px 24px', textAlign: 'center', marginTop: 40 }}>
              <Heart size={32} color="var(--text-secondary)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)', margin: '0 0 4px 0' }}>{t('favorites_empty_title')}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>{t('favorites_empty_sub')}</p>
            </div>
          )}

        </div>
      </motion.div>
    </motion.div>
  );
};
