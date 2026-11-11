import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, CheckCircle2, ShieldAlert, Send } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { artisanAuthService } from '../services/artisanAuthService';
import { getBackendUrl } from '../services/artisanApi';

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
  { id: 'plagiat', fr: 'Plagiat ou copie non-autorisée de modèle original', ar: 'سرقة فكرية أو نسخ غير مصرح لنموذج' },
  { id: 'image_inappropriee', fr: 'Image trompeuse ou non-conforme aux normes', ar: 'صورة مضللة أو غير مطابقة للمعايير' },
  { id: 'non_conformite_artisanale', fr: 'Produit industriel vendu comme artisanal', ar: 'منتج صناعي معروض على أنه يدوي تقليدي' },
  { id: 'abus_droits', fr: 'Atteinte aux droits d\'auteur ou de propriété', ar: 'انتهاك حقوق الملكية الفكرية' },
  { id: 'autre', fr: 'Autre motif grave', ar: 'سبب آخر' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  targetOwnerId,
  reporterId,
  reporterType = 'artisan',
}) => {
  const { lang, isRTL } = useI18n();
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
      setError(
        isRTL
          ? 'يرجى تقديم سبب توضيحي مفصل (10 أحرف على الأقل).'
          : 'Veuillez fournir un motif explicatif détaillé (au moins 10 caractères).'
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const token = artisanAuthService.getToken() || '';
      const payload = {
        targetType,
        targetId,
        targetTitle: targetTitle || 'Contenu signalé',
        targetOwnerId: targetOwnerId || null,
        category,
        reason: reason.trim(),
        evidenceUrls: evidenceUrl.trim() ? [evidenceUrl.trim()] : [],
        reporterId: reporterId || 'artisan-me',
        reporterType,
      };

      const res = await fetch(`${getBackendUrl()}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      }, 2000);
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
            maxWidth: 440,
            background: '#FFFFFF',
            borderRadius: 24,
            boxShadow: '0 24px 60px -12px rgba(15, 23, 42, 0.35)',
            maxHeight: '90vh',
            overflowY: 'auto',
            border: '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                }}
              >
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0F172A' }}>
                  {isRTL ? 'إبلاغ عن محتوى غير لائق' : 'Signaler un contenu'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>
                  {isRTL ? 'لجنة الوساطة والحفاظ على الحرفة' : 'Commission de modération Vork'}
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
                padding: 4,
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: 20 }}>
            {success ? (
              <div style={{ textAlign: 'center', padding: '20px 8px' }}>
                <CheckCircle2 size={46} color="#16A34A" style={{ margin: '0 auto 12px auto' }} />
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1.02rem', fontWeight: 700, color: '#0F172A' }}>
                  {isRTL ? 'تم إرسال البلاغ بنجاح' : 'Signalement transmis'}
                </h4>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B', lineHeight: 1.45 }}>
                  {isRTL
                    ? 'ستقوم إدارة المنصة بدراسة الشكوى والتحقق من الأدلة.'
                    : 'L\'équipe de médiation examine votre dossier et prendra les sanctions adaptées si l\'infraction est avérée.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {targetTitle && (
                  <div style={{ background: '#F8FAFC', padding: '8px 12px', borderRadius: 10, fontSize: '0.78rem', color: '#475569' }}>
                    <strong>{isRTL ? 'الهدف :' : 'Objet :'}</strong> {targetTitle}
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>
                    {isRTL ? 'سبب الإبلاغ *' : 'Motif du signalement *'}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                    }}
                  >
                    {REPORT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'ar' ? c.ar : c.fr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>
                    {isRTL ? 'توضيح الوقائع *' : 'Explications & Constatations *'}
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                      isRTL
                        ? 'وضح سبب المخالفة أو النقل غير المصرح...'
                        : 'Précisez l\'infraction ou le plagiat constaté...'
                    }
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                      resize: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>
                    {isRTL ? 'رابط الدليل (اختياري)' : 'Lien de preuve (Optionnel)'}
                  </label>
                  <input
                    type="url"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid #CBD5E1',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {error && (
                  <div style={{ color: '#DC2626', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={13} />
                    <span>{error}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isRTL ? 'إلغاء' : 'Annuler'}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      border: 'none',
                      background: '#DC2626',
                      color: '#FFFFFF',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: submitting ? 'wait' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Send size={13} />
                    {submitting ? (isRTL ? 'جارٍ الإرسال...' : 'Envoi...') : (isRTL ? 'تأكيد البلاغ' : 'Signaler')}
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
