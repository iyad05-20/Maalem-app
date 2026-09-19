import React, { useState } from 'react';

interface SearchProduct {
  id: string;
  title: string;
  category_group: string;
  price?: number;
}

interface SearchProductCardProps {
  product: SearchProduct;
  onSelect?: (product: SearchProduct) => void;
}

const getFallbackImage = (category_group: string) => {
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
  return images[category_group] || 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=500&q=80';
};

export const SearchProductCard: React.FC<SearchProductCardProps> = ({ product, onSelect }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  
  const formattedPrice = product.price ? product.price.toLocaleString('fr-FR') : 'Sur demande';

  return (
    <div className="product-card" onClick={() => onSelect?.(product)}>
      {/* Image area */}
      <div className={`card-img-wrap ${!imgLoaded ? 'skeleton-box' : ''}`}>
        <img
          src={getFallbackImage(product.category_group)}
          alt={product.title}
          className={`card-img ${imgLoaded ? 'img-loaded' : 'img-loading'}`}
          onLoad={() => setImgLoaded(true)}
          loading="lazy"
        />
        {/* Simplified badge for category */}
        <span className="badge-premium" style={{ color: '#CC7755', background: 'rgba(255, 255, 255, 0.9)' }}>
          {product.category_group || 'Divers'}
        </span>
      </div>

      {/* Info */}
      <div className="card-info">
        <p className="card-title">{product.title}</p>
        <div className="card-footer">
          <span className="card-price">
            {formattedPrice} <span className="currency">MAD</span>
          </span>
          <span >
            —
          </span>
        </div>
      </div>
    </div>
  );
};
