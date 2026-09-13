import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ArtisanProfile } from '../../types';
import { useClientI18n } from '../../services/i18n';

interface ArtisanAtelierModalProps {
  isOpen: boolean;
  onClose: () => void;
  artisan: ArtisanProfile;
}

export const ArtisanAtelierModal: React.FC<ArtisanAtelierModalProps> = ({
  isOpen,
  onClose,
  artisan,
}) => {
  const { lang } = useClientI18n();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-backdrop" onClick={onClose}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="atelier-modal-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header bar */}
            <div className="modal-drag-handle" />
            <div className="modal-header">
              <div>
                <span className="modal-kicker">{lang === 'ar' ? "في قلب الورشة" : "Immersion Atelier"}</span>
                <h3 className="modal-title">{artisan.name}</h3>
                <p className="modal-subtitle">{artisan.title} — {artisan.city}</p>
              </div>
              <button className="modal-close-btn" onClick={onClose} aria-label={lang === 'ar' ? "إغلاق" : "Fermer"}>
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="modal-scroll-content">
              {/* Workshop Gallery */}
              <div className="atelier-gallery">
                {artisan.workshopImages.map((imgUrl, idx) => (
                  <img
                    key={idx}
                    src={imgUrl}
                    alt={`Atelier ${artisan.name} - ${idx + 1}`}
                    className="atelier-gallery-img"
                  />
                ))}
              </div>

              {/* Bio & Philosophy */}
              <div className="atelier-section">
                <h4 className="atelier-subhead">{lang === 'ar' ? "أصالة الحرفة والذاكرة" : "Le geste & la mémoire"}</h4>
                <p className="atelier-text">{artisan.bio}</p>
              </div>

              {/* Quote banner */}
              <div className="atelier-quote-box">
                <p>{artisan.quote}</p>
              </div>

              {/* Key metrics */}
              <div className="atelier-stats-row">
                <div className="stat-card">
                  <span className="stat-value">{artisan.experienceYears} {lang === 'ar' ? "سنوات" : "ans"}</span>
                  <span className="stat-label">{lang === 'ar' ? "خبرة متوارثة" : "Savoir-faire transmis"}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{artisan.creationsCount}</span>
                  <span className="stat-label">{lang === 'ar' ? "إبداعات مسجلة" : "Œuvres répertoriées"}</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">100%</span>
                  <span className="stat-label">{lang === 'ar' ? "صنع يدوي بالمدينة العتيقة" : "Fait main à la médina"}</span>
                </div>
              </div>
            </div>

            {/* Footer action */}
            <div className="modal-footer">
              <button className="modal-primary-btn" onClick={onClose}>
                {lang === 'ar' ? `مشاهدة كامل إبداعاته (${artisan.creationsCount})` : `Voir toute sa collection (${artisan.creationsCount})`}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
