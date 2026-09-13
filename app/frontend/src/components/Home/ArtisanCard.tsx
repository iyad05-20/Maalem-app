import React from 'react';
import type { ArtisanProfile } from '../../types';
import { useClientI18n } from '../../services/i18n';

interface ArtisanCardProps {
  artisan: ArtisanProfile;
  onOpenAtelier: () => void;
}

export const ArtisanCard: React.FC<ArtisanCardProps> = ({ artisan, onOpenAtelier }) => {
  const { t } = useClientI18n();

  return (
    <div className="artisan-editorial-card">
      <div className="artisan-portrait-frame">
        <img
          src={artisan.portrait}
          alt={artisan.name}
          className="artisan-portrait-img"
          loading="lazy"
        />
        <div className="artisan-badge-tag">{t('home_artisan_badge')}</div>
      </div>

      <div className="artisan-card-body">
        <div className="artisan-header-info">
          <span className="artisan-city">📍 {artisan.city}</span>
          <h4 className="artisan-name">{artisan.name}</h4>
          <p className="artisan-title">{artisan.title}</p>
        </div>

        <blockquote className="artisan-quote">
          {artisan.quote}
        </blockquote>

        <div className="artisan-footer">
          <div className="artisan-meta">
            <span className="meta-item">
              <strong>{artisan.experienceYears}</strong> {t('home_years_craft')}
            </span>
          </div>

          <button className="artisan-atelier-btn" onClick={onOpenAtelier}>
            {t('home_discover_atelier')}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
