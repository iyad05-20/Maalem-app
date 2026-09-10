import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const AtelierView: React.FC = () => {
  const [activeMessage, setActiveMessage] = useState(
    "Découvrez une nouvelle manière d'explorer les textures marocaines. Choisissez une création pour débuter la personnalisation avec nos Maâlems."
  );

  const simulateChat = (preset: 'zellige' | 'moucharabieh') => {
    if (preset === 'zellige') {
      setActiveMessage("Harmonisation des proportions géométriques pour l'étoile à 8 branches. Les dimensions du zellige bleu de Fès sont optimisées pour la découpe artisanale.");
    } else {
      setActiveMessage("Conception du motif en bois de cèdre noble. La structure du moucharabieh laissera passer la lumière douce tout en préservant l'intimité.");
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="view-container"
      style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#D97706', fontWeight: 700, display: 'block' }}>
            Artisanat Marocain d'Exception
          </span>
          <h2 style={{ fontSize: '24px', fontFamily: 'var(--font-heading)', fontWeight: 600, color: '#1A1A19', marginTop: '4px' }}>
            MAALEM
          </h2>
        </div>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '14px' }}>✨</span>
        </div>
      </div>

      {/* Editorial Card */}
      <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-30px', top: '-30px', width: '100px', height: '100px', border: '1px solid rgba(217,119,6,0.1)', borderRadius: '50%' }}></div>
        <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: '#FFFBEB', color: '#B45309', padding: '4px 8px', borderRadius: '999px', fontWeight: 700 }}>
          L'Atelier Sur-Mesure
        </span>
        <h3 style={{ fontSize: '16px', fontFamily: 'var(--font-heading)', fontWeight: 500, marginTop: '12px', color: '#1A1A19' }}>
          Votre Bureau de Création Artisanale
        </h3>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '6px', lineHeight: 1.5 }}>
          Associez l'élégance de la géométrie traditionnelle marocaine au savoir-faire de nos Maâlems d'exception pour concevoir vos pièces uniques.
        </p>
      </div>

      {/* Interactive Selection Simulators */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '11px', fontWeight: 600, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>
          Explorer une confection d'atelier
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          <div 
            onClick={() => simulateChat('zellige')}
            style={{ backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.05)', padding: '14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.2s ease' }}
          >
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A19', margin: 0 }}>Ciseler un zellige bleu</p>
              <p style={{ fontSize: '11px', color: '#8E8E93', marginTop: '4px', margin: 0 }}>Calculer l'angle d'une étoile à 8 branches...</p>
            </div>
            <span style={{ fontSize: '14px', color: '#4DA3FF' }}>➔</span>
          </div>

          <div 
            onClick={() => simulateChat('moucharabieh')}
            style={{ backgroundColor: 'white', border: '1px solid rgba(0,0,0,0.05)', padding: '14px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.2s ease' }}
          >
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A19', margin: 0 }}>Structure en bois de cèdre</p>
              <p style={{ fontSize: '11px', color: '#8E8E93', marginTop: '4px', margin: 0 }}>Générer un moucharabieh asymétrique...</p>
            </div>
            <span style={{ fontSize: '14px', color: '#4DA3FF' }}>➔</span>
          </div>

        </div>
      </div>

      {/* Active Dialogue Box */}
      <div style={{ marginTop: 'auto', paddingBottom: '80px' }}>
        <div style={{ backgroundColor: 'rgba(77, 163, 255, 0.05)', backdropFilter: 'blur(10px)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(77, 163, 255, 0.2)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4DA3FF', animation: 'pulse 2s infinite' }}></div>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#4DA3FF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Atelier Connecté
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#333', lineHeight: 1.6, margin: 0 }}>
            "{activeMessage}"
          </p>
        </div>
      </div>

    </motion.div>
  );
};
