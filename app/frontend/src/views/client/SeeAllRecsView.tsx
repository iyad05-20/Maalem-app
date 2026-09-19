import React from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import type { Product } from '../../types';
import { ProductCard } from '../../components/Shared/ProductCard';

interface SeeAllRecsViewProps {
  products: Product[];
  title: string;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  favoritesList: string[];
  onToggleFavorite: (product: Product) => void;
}

export const SeeAllRecsView: React.FC<SeeAllRecsViewProps> = ({
  products,
  title,
  onClose,
  onSelectProduct,
  favoritesList,
  onToggleFavorite,
}) => {
  return (
    <motion.div
      className="search-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ zIndex: 220 }}
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
          <button className="search-back-btn" onClick={onClose} aria-label="Fermer">
            <X size={18} strokeWidth={2} />
          </button>
          
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)', margin: 0 }}>
            {title}
          </h2>

          <div style={{ width: 36, display: 'flex', justifyContent: 'flex-end', color: 'var(--accent-warm)' }}>
            <Sparkles size={18} fill="currentColor" />
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 80px 20px' }}>
          
          {/* Subtitle / Counter */}
          <div style={{ marginBottom: 20, textAlign: 'left' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>
              Sélection complète
            </p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', margin: '4px 0 0 0' }}>
              {products.length} créations trouvées
            </h3>
          </div>

          {/* Grid Layout of Cards */}
          {products.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                paddingBottom: '20px'
              }}
            >
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={onSelectProduct}
                  isFavorite={favoritesList.includes(product.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div style={{ background: '#FFFFFF', border: '1px dashed var(--border)', borderRadius: 24, padding: '48px 24px', textAlign: 'center', marginTop: 40 }}>
              <Sparkles size={32} color="var(--text-secondary)" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)', margin: '0 0 4px 0' }}>Aucun produit</p>
            </div>
          )}

        </div>
      </motion.div>
    </motion.div>
  );
};
