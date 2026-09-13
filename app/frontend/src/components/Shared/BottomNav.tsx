import React from 'react';
import { motion } from 'framer-motion';
import type { View } from '../../types';
import { useClientI18n } from '../../services/i18n';

// Same SVG data (simplified for brevity here, assuming it's imported or defined above)
const NAV_ITEMS = [
  {
    index: 0, labelKey: 'nav_home' as const, view: 'home',
    outlineIcon: <svg viewBox="0 0 24 24"><path d="M12 5.69l5 4.5V18h-2v-6H9v6H7v-7.81l5-4.5M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>,
    filledIcon: <svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>,
  },
  {
    index: 1, labelKey: 'nav_search' as const, view: 'search',
    outlineIcon: <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>,
    filledIcon: <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5z"/></svg>,
  },
  {
    index: 2, labelKey: 'nav_atelier' as const, view: 'atelier',
    outlineIcon: (
      <svg style={{ color: '#4DA3FF' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 L14.2 7.8 L19 10 L14.2 12.2 L12 17 L9.8 12.2 L5 10 L9.8 7.8 Z"/>
          <path d="M12 8.8 L15 12 L12 15.2 L9 12 Z"/>
      </svg>
    ),
    filledIcon: (
      <svg style={{ color: '#4DA3FF' }} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3 L14.2 7.8 L19 10 L14.2 12.2 L12 17 L9.8 12.2 L5 10 L9.8 7.8 Z"/>
          <path d="M12 8.8 L15 12 L12 15.2 L9 12 Z" fill="white"/>
      </svg>
    ),
  },
  {
    index: 3, labelKey: 'nav_orders' as const, view: 'cart',
    outlineIcon: <svg viewBox="0 0 24 24"><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12z"/></svg>,
    filledIcon: <svg viewBox="0 0 24 24"><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3z"/></svg>,
  },
  {
    index: 4, labelKey: 'nav_profile' as const, view: 'profile',
    outlineIcon: <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 7c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4zm6 5H6v-.99c.2-.72 3.3-2.01 6-2.01s5.8 1.29 6 2v1z"/></svg>,
    filledIcon: <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
  },
];

interface BottomNavProps {
  activeView: View;
  onNavigate: (view: View) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeView, onNavigate }) => {
  const { t } = useClientI18n();

  return (
    <div className="nav-bar-container">
      <nav className="floating-nav" style={{ justifyContent: 'space-between' }}>
        
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.view;
          const isAtelier = item.view === 'atelier';

          if (isAtelier) {
            return (
              <motion.button
                layout
                key={item.index}
                onClick={() => onNavigate(item.view as View)}
                whileTap={{ scale: 0.92 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: isActive 
                    ? 'linear-gradient(180deg, rgba(77,163,255,.16), rgba(77,163,255,.08))' 
                    : 'transparent',
                  padding: '8px 16px', // Constante pour garder les icônes centralisées
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  zIndex: 10,
                  margin: '0 4px',
                  flex: '0 0 auto',
                  transition: 'background 0.3s ease'
                }}
              >
                <motion.div 
                  layout
                  animate={isActive ? { rotate: [0, -20, 0] } : { rotate: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{ 
                    width: '24px', 
                    height: '24px', 
                    color: isActive ? '#4DA3FF' : '#8E8E93' 
                  }}
                >
                  {isActive ? item.filledIcon : item.outlineIcon}
                </motion.div>
                
                <motion.span
                  layout
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isActive ? '#4DA3FF' : '#8E8E93',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.3s ease'
                  }}
                >
                  {t('nav_atelier')}
                </motion.span>
              </motion.button>
            );
          }

          // Standard items — always render the pill div, animate opacity only
          return (
            <motion.button
              layout
              key={item.index}
              onClick={() => onNavigate(item.view as View)}
              whileTap={{ scale: 0.85 }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? '#111' : '#8E8E93',
                position: 'relative',
                zIndex: 10,
                transition: 'color 0.25s ease',
              }}
            >
              <div style={{ width: '22px', height: '22px', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isActive ? item.filledIcon : item.outlineIcon}
              </div>
              <span style={{ fontSize: '10px', fontWeight: 500, zIndex: 1 }}>
                {t(item.labelKey)}
              </span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};
