import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Product } from '../../types';
import { recSession } from '../../services/recommendationSession';
import { useClientI18n } from '../../services/i18n';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (product: Product) => void;
}

const getFallbackImage = (category_group?: string) => {
  const images: Record<string, string> = {
    bijouterie: 'https://images.unsplash.com/photo-1599643478524-fb66f70d00f0?w=500&q=80',
    ceramique: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&q=80',
    dinanderie: 'https://images.unsplash.com/photo-1577907577587-f70b7794bfa2?w=500&q=80',
    broderie: 'https://images.unsplash.com/photo-1605276374104-a628b0fae742?w=500&q=80',
    tissage: 'https://images.unsplash.com/photo-1574635882662-7e0e7a2b9d0b?w=500&q=80',
    maroquinerie: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&q=80',
    menuiserie: 'https://images.unsplash.com/photo-1582260655353-83802ceafc0c?w=500&q=80',
    poterie: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&q=80',
    verrerie: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=500&q=80',
    vetement: 'https://images.unsplash.com/photo-1574635882662-7e0e7a2b9d0b?w=500&q=80',
    zellige: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&q=80',
  };
  return (category_group && images[category_group]) || 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=500&q=80';
};

const formatPrice = (priceVal: any): string => {
  if (priceVal === null || priceVal === undefined) return '';
  if (typeof priceVal === 'number') return `${priceVal.toLocaleString('fr-FR')}`;
  if (typeof priceVal === 'string') return priceVal.replace(' DH', '').replace(' MAD', '').replace(' د.م', '');
  return '';
};

const extractProductTags = (p: any): string[] => {
  const tags: string[] = [];
  if (Array.isArray(p.tags)) tags.push(...p.tags);
  if (p.rec_tags) {
    if (Array.isArray(p.rec_tags.style)) tags.push(...p.rec_tags.style);
    if (Array.isArray(p.rec_tags.material)) tags.push(...p.rec_tags.material);
    if (Array.isArray(p.rec_tags.color_vibe)) tags.push(...p.rec_tags.color_vibe);
  }
  if (p.category_group) tags.push(p.category_group);
  if (p.identity?.category_group) tags.push(p.identity.category_group);
  return Array.from(new Set(tags));
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect, isFavorite, onToggleFavorite }) => {
  const { t } = useClientI18n();
  const [isFav, setIsFav] = useState(isFavorite || false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const favBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsFav(isFavorite || false);
  }, [isFavorite]);

  const pAny = product as any;
  const tags = extractProductTags(pAny);

  const handleCardClick = () => {
    // 1. Queue VIEW action (+2.0 pts)
    recSession.trackAction('VIEW', tags);
    onSelect?.(product);
  };

  const handleFavClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFav && favBtnRef.current) {
      favBtnRef.current.style.transform = 'scale(0.8)';
      setTimeout(() => { if (favBtnRef.current) favBtnRef.current.style.transform = 'scale(1.15)'; }, 100);
      setTimeout(() => { if (favBtnRef.current) favBtnRef.current.style.transform = 'scale(1)'; }, 200);
    }

    const nextFavState = !isFav;
    setIsFav(nextFavState);

    if (onToggleFavorite) {
      onToggleFavorite(product);
    } else {
      if (nextFavState) {
        // 2. Queue BOOKMARK action (+10.0 pts)
        recSession.trackAction('BOOKMARK', tags);
      }
    }
  }, [isFav, product, onToggleFavorite, tags]);

  const handleOrderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 3. Queue ORDER action (+8.0 pts)
    recSession.trackAction('ORDER', tags);
    console.log(`[CARD] 🛒 ORDER queued for ${product.title} on tags [${tags.join(', ')}]`);
    alert(`${t('product_order')} : "${product.title}"`);
  };

  const categoryGroup = pAny.category_group || pAny.identity?.category_group;
  const displayImg = pAny.image || pAny.imageUrl || pAny.image_url || getFallbackImage(categoryGroup);
  const formattedPrice = formatPrice(product.price) || t('product_on_demand');
  const displayRating = product.rating || 4.8;
  const rawBadge = product.badgeLabel || product.badge || (pAny._rec?.isExplore ? 'Sélection IA' : null);
  const displayBadge = rawBadge === 'Dans votre style' ? t('product_in_your_style') : rawBadge === 'Sélection IA' ? t('product_ai_pick') : rawBadge;

  return (
    <div className="product-card" onClick={handleCardClick}>
      {/* Image area */}
      <div className={`card-img-wrap ${!imgLoaded ? 'skeleton-box' : ''}`}>
        <img
          src={displayImg}
          alt={product.title}
          className={`card-img ${imgLoaded ? 'img-loaded' : 'img-loading'}`}
          onLoad={() => setImgLoaded(true)}
          loading="lazy"
        />
        {/* Discreet Badge */}
        {displayBadge && (
          <span className={`discreet-badge ${rawBadge === 'Dans votre style' ? 'badge-style' : rawBadge === 'Sélection IA' ? 'badge-ai-discreet' : 'badge-default'}`}>
            {rawBadge === 'Dans votre style' && '✦ '}
            {rawBadge === 'Sélection IA' && '✦ '}
            {displayBadge}
          </span>
        )}

        {/* Fav button (BOOKMARK) */}
        <button
          ref={favBtnRef}
          className="fav-btn"
          aria-label={isFav ? t('product_remove_favorite') : t('product_add_favorite')}
          onClick={handleFavClick}
        >
          <svg width="14" height="14" viewBox="0 0 24 24"
            fill={isFav ? '#CC7755' : 'none'}
            stroke={isFav ? '#CC7755' : '#6B7280'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="card-info">
        <p className="card-title">{product.title}</p>
        <div className="card-footer">
          <span className="card-price">
            {formattedPrice} <span className="currency">{t('currency_mad')}</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="card-rating">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#D4AF37" stroke="#D4AF37" strokeWidth="0">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              {displayRating}
            </span>
            <button
              onClick={handleOrderClick}
              title={t('product_order')}
              style={{
                background: 'rgba(26, 42, 58, 0.08)',
                border: '1px solid rgba(26, 42, 58, 0.15)',
                borderRadius: 8,
                padding: '3px 7px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#1A2A3A',
                cursor: 'pointer'
              }}
            >
              {t('product_order')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
