import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '../../types';
import { ProductCard } from '../Shared/ProductCard';
import { useClientI18n } from '../../services/i18n';

interface OccasionsModuleProps {
  occasionsData: {
    cadeaux: Product[];
    maison: Product[];
    cuisine: Product[];
  };
  onSelectProduct?: (product: Product) => void;
  favoritesList?: string[];
  onToggleFavorite?: (product: Product) => void;
}

type TabType = 'cadeaux' | 'maison' | 'cuisine';

export const OccasionsModule: React.FC<OccasionsModuleProps> = ({
  occasionsData,
  onSelectProduct,
  favoritesList = [],
  onToggleFavorite,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('cadeaux');
  const { t } = useClientI18n();

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'cadeaux', label: t('home_tab_gifts'), icon: '🎁' },
    { id: 'maison', label: t('home_tab_home'), icon: '🛋️' },
    { id: 'cuisine', label: t('home_tab_cuisine'), icon: '🍲' },
  ];

  const currentProducts = (occasionsData[activeTab] || []).slice(0, 4);

  return (
    <div className="occasions-module">
      {/* 3 Pills Tabs */}
      <div className="occasions-tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`occasion-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-bullet">{isActive ? '●' : '○'}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Animated 2x2 Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="occasions-grid-2x2"
        >
          {currentProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onSelectProduct}
              isFavorite={favoritesList.includes(product.id)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
