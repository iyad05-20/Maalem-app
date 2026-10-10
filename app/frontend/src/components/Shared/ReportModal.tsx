import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, CheckCircle2, ShieldAlert, Send } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'product' | 'custom_request' | 'artisan_post';
  targetId: string;
  targetTitle?: string;
  targetOwnerId?: string;
  reporterId?: string;
  reporterType?: 'client' | 'artisan';
}

const REPORT_CATEGORIES = [
  { id: 'plagiat', label: 'Plagiat ou copie non-autorisée de modèle', labelAr: 'سرقة فكرية أو نسخ غير مصرح لتصميم' },
  { id: 'image_inappropriee', label: 'Image trompeuse ou non-conforme à la réalité', labelAr: 'صورة مضللة أو غير مطابقة للواقع' },
  { id: 'non_conformite_artisanale', label: 'Produit industriel vendu comme artisanal', labelAr: 'منتج صناعي معروض على أنه يدوي تقليدي' },
  { id: 'abus_droits', label: 'Atteinte aux droits d\'auteur ou propriété', labelAr: 'انتهاك حقوق الملكية أو التخصيص' },
  { id: 'autre', label: 'Autre motif grave', labelAr: 'سبب آخر' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  targetOwnerId,
  reporterId = 'client-me',
  reporterType = 'client',
}) => {
  const [category, setCategory] = useState(REPORT_CATEGORIES[0].id);
  const [reason, setReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 10) {
      setError('Veuillez fournir un motif explicatif détaillé (au moins 10 caractères).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        targetType,
        targetId,
        targetTitle: targetTitle || 'Création signalée',
        targetOwnerId: targetOwnerId || null,
        category,
        reason: reason.trim(),
        evidenceUrls: evidenceUrl.trim() ? [evidenceUrl.trim()] : [],
        reporterId,
        reporterType,
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de l\'envoi du signalement.');
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReason('');
        setEvidenceUrl('');
        onClose();
      }, 2200);
    } catch (err: any) {
      setError(err.message || 'Impossible d\'enregistrer le signalement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
          }}
        />

        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 480,
            background: '#FFFFFF',
            borderRadius: 28,
            boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.35)',
            overflow: 'hidden',
            border: '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #FFFDF8 0%, #F8FAFC 100%)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                }}
              >
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    fontFamily: 'var(--font-display, inherit)',
                  }}
                >
                  Signaler un contenu
                </h3>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                  Modération & Respect de la Charte Vork
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 6,
                borderRadius: 8,
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form or Success State */}
          <div style={{ padding: 24 }}>
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '24px 8px' }}
              >
                <CheckCircle2 size={52} color="#16A34A" style={{ margin: '0 auto 16px auto' }} />
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>
                  Signalement transmis avec succès
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5 }}>
                  L'équipe de modération Vork examine le dossier avec impartialité. Une enquête contradictoire est ouverte.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {targetTitle && (
                  <div
                    style={{
                      background: '#F8FAFC',
                      padding: '10px 14px',
                      borderRadius: 14,
                      fontSize: '0.8rem',
                      color: '#334155',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>Cible : </span>
                    {targetTitle}
                  </div>
                )}

                {/* Motif catégorie */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#1E293B',
                      marginBottom: 6,
                    }}
                  >
                    Motif du signalement <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '0.85rem',
                      color: '#0F172A',
                      outline: 'none',
                    }}
                  >
                    {REPORT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Explication */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#1E293B',
                      marginBottom: 6,
                    }}
                  >
                    Explications & Faits constatés <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Décrivez précisément la violation constatée (date, plagiat d'un modèle précis, contrefaçon, etc.)..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '0.85rem',
                      color: '#0F172A',
                      outline: 'none',
                      resize: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Preuve / URL */}
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: '#1E293B',
                      marginBottom: 6,
                    }}
                  >
                    Lien de preuve ou photo comparative (Optionnel)
                  </label>
                  <input
                    type="url"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://... lien vers le modèle original ou justificatif"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '0.85rem',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {error && (
                  <div
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 12,
                      padding: '10px 14px',
                      color: '#DC2626',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div
                  style={{
                    background: '#FEF9C3',
                    border: '1px solid #FDE047',
                    borderRadius: 12,
                    padding: '10px 12px',
                    fontSize: '0.72rem',
                    color: '#854D0E',
                    lineHeight: 1.4,
                  }}
                >
                  ⚖️ Tout signalement abusif ou malveillant fait l'objet de sanctions conformément aux Conditions Générales de Vork.
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      color: '#64748B',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 12,
                      border: 'none',
                      background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: submitting ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                    }}
                  >
                    <Send size={15} />
                    {submitting ? 'Transmission...' : 'Envoyer le signalement'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
