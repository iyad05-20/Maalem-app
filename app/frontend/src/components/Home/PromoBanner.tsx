import React, { useState, useEffect } from 'react';
import type { PromoData } from '../../types';
import { useClientI18n } from '../../services/i18n';

interface PromoBannerProps {
  promo: PromoData;
  onExplore?: () => void;
}

export const PromoBanner: React.FC<PromoBannerProps> = ({ promo, onExplore }) => {
  const { t } = useClientI18n();
  const [timeLeft, setTimeLeft] = useState<{ hours: string; minutes: string; seconds: string }>({
    hours: '05',
    minutes: '48',
    seconds: '32',
  });

  useEffect(() => {
    const updateCountdown = () => {
      const diff = Math.max(0, promo.endTimeMs - Date.now());
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [promo.endTimeMs]);

  return (
    <div className="promo-banner">
      <div className="promo-bg-wrap">
        <img src={promo.image} alt={promo.title} className="promo-bg-img" loading="lazy" />
        <div className="promo-overlay" />
      </div>

      <div className="promo-content">
        <div className="promo-badge">
          <span className="promo-pulse-dot" />
          {promo.badge}
        </div>

        <h3 className="promo-title">{promo.title}</h3>
        <p className="promo-offer">{promo.offer}</p>
        <p className="promo-subtitle">{promo.subtitle}</p>

        <div className="promo-footer">
          <div className="promo-timer">
            <span className="timer-label">{t('home_promo_ends')}</span>
            <div className="timer-digits">
              <span className="timer-box">{timeLeft.hours}h</span>
              <span className="timer-sep">:</span>
              <span className="timer-box">{timeLeft.minutes}m</span>
              <span className="timer-sep">:</span>
              <span className="timer-box">{timeLeft.seconds}s</span>
            </div>
          </div>

          <button className="promo-btn" onClick={onExplore}>
            {promo.cta}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
