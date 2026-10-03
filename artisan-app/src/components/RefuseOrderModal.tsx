import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AlertTriangle, X, Ban, ChevronDown } from "lucide-react";
import { useI18n } from "../services/i18n";

interface RefuseOrderModalProps {
  orderId: string;
  onClose: () => void;
  onRefuse: (orderId: string, category: string, reason: string) => Promise<any>;
}

export const REFUSAL_REASONS = [
  { 
    id: "rupture_matiere", 
    fr: "Rupture de matières premières (cuir, argile, laine...)", 
    ar: "عدم توفر المواد الأولية بالورشة (جلد، صوف، طين...)" 
  },
  { 
    id: "delai_insuffisant", 
    fr: "Délai de confection demandé trop court", 
    ar: "المهلة الزمنية المطلوبة غير كافية للإنجاز المتقن" 
  },
  { 
    id: "surcharge_commandes", 
    fr: "Surcharge temporaire de commandes en atelier", 
    ar: "ضغط كبير في ورشة العمل والطلبات الحالية" 
  },
  { 
    id: "incapacite_technique", 
    fr: "Spécificités techniques non réalisables", 
    ar: "تعذر تنفيذ بعض المواصفات التقنية أو القياسات" 
  },
  { 
    id: "autre", 
    fr: "Autre motif particulier (veuillez préciser)", 
    ar: "سبب آخر خاص (يرجى توضيح السبب بالتفصيل)" 
  },
];

export const RefuseOrderModal: React.FC<RefuseOrderModalProps> = ({ orderId, onClose, onRefuse }) => {
  const { lang, t } = useI18n();
  const isRTL = lang === "ar";
  const shouldReduceMotion = useReducedMotion();

  const [category, setCategory] = useState("rupture_matiere");
  const [customReason, setCustomReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (category === "autre" && !customReason.trim()) return;

    setLoading(true);
    try {
      await onRefuse(orderId, category, category === "autre" ? customReason : "");
      onClose();
    } catch (err: any) {
      alert(err.message || (isRTL ? "حدث خطأ أثناء تسجيل الاعتذار." : "Erreur lors du refus."));
    } finally {
      setLoading(false);
    }
  };

  const selectedReasonObj = REFUSAL_REASONS.find(r => r.id === category);

  return (
    <div 
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(16, 27, 38, 0.75)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 15 }}
        transition={{ duration: shouldReduceMotion ? 0.15 : 0.25, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: 480,
          padding: 24,
          background: "#FFFFFF",
          borderRadius: 24,
          border: "1px solid var(--border, #E9E6E1)",
          boxShadow: "0 20px 60px rgba(26, 42, 58, 0.25)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "rgba(184, 98, 63, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <AlertTriangle size={22} color="var(--accent-warm, #B8623F)" />
            </div>
            <div>
              <h3 style={{ 
                fontFamily: "var(--font-display, serif)", 
                fontWeight: 700, 
                fontSize: 17, 
                color: "var(--primary, #1A2A3A)", 
                margin: 0 
              }}>
                {isRTL ? "الاعتذار عن قبول الطلب" : "Décliner la Commande"}
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary, #5C6B78)", margin: "2px 0 0 0" }}>
                {isRTL ? "طلب رقم :" : "Commande N°"} <strong style={{ color: "var(--accent-warm, #B8623F)" }}>{orderId}</strong>
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            style={{
              background: "none",
              border: "1px solid var(--border, #E9E6E1)",
              borderRadius: 12,
              width: 44,
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-secondary, #5C6B78)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Note bienveillante sans avertissement (Décision 24) */}
        <div style={{
          background: "var(--bg-primary, #FAFAF8)",
          border: "1px solid var(--border, #E9E6E1)",
          borderRadius: 14,
          padding: "12px 14px",
          marginBottom: 18,
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--text-secondary, #5C6B78)",
        }}>
          {isRTL 
            ? "💡 لا توجد أي عقوبة أو إنذار تلقائي على حسابك. سيتم إرجاع المبلغ كاملاً للزبون في محفظته فور تأكيد الاعتذار."
            : "💡 Aucun avertissement ni pénalité n'est émis. Le client sera remboursé à 100% sur son wallet interne dès validation du refus."}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Menu déroulant des motifs (Décision 23) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ 
              display: "block", 
              fontSize: 12, 
              fontWeight: 600, 
              color: "var(--primary, #1A2A3A)", 
              marginBottom: 6 
            }}>
              {isRTL ? "سبب الاعتذار (اختر من القائمة) *" : "Motif du refus (sélectionnez) *"}
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid var(--border, #E9E6E1)",
                  background: "#FFFFFF",
                  fontSize: 13,
                  color: "var(--primary, #1A2A3A)",
                  outline: "none",
                  appearance: "none",
                  cursor: "pointer",
                  fontFamily: isRTL ? "var(--font-arabic, sans-serif)" : "inherit",
                }}
              >
                {REFUSAL_REASONS.map(r => (
                  <option key={r.id} value={r.id}>
                    {isRTL ? r.ar : r.fr}
                  </option>
                ))}
              </select>
              <div style={{
                position: "absolute",
                top: "50%",
                transform: "translateY(-50%)",
                [isRTL ? "left" : "right"]: 12,
                pointerEvents: "none",
                color: "var(--text-secondary, #5C6B78)",
              }}>
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          {/* Champ libre si 'autre' sélectionné */}
          <AnimatePresence>
            {category === "autre" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ marginBottom: 16, overflow: "hidden" }}
              >
                <label style={{ 
                  display: "block", 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: "var(--primary, #1A2A3A)", 
                  marginBottom: 6 
                }}>
                  {isRTL ? "توضيح إضافي للزبون *" : "Explication détaillée pour le client *"}
                </label>
                <textarea
                  required
                  rows={3}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder={isRTL ? "اكتب توضيحاً موجزاً ومحترماً للزبون..." : "Expliquez avec courtoisie la raison du refus..."}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 14,
                    border: "1px solid var(--border, #E9E6E1)",
                    background: "#FFFFFF",
                    fontSize: 13,
                    color: "var(--primary, #1A2A3A)",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Boutons d'action */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 20 }}>
            <motion.button
              type="button"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "12px 18px",
                borderRadius: 14,
                border: "1px solid var(--border, #E9E6E1)",
                background: "transparent",
                color: "var(--text-secondary, #5C6B78)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isRTL ? "تراجع" : "Annuler"}
            </motion.button>
            <motion.button
              type="submit"
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              disabled={loading || (category === "autre" && !customReason.trim())}
              style={{
                padding: "12px 20px",
                borderRadius: 14,
                border: "none",
                background: "var(--accent-warm, #B8623F)",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(184, 98, 63, 0.3)",
              }}
            >
              <Ban size={16} />
              <span>{loading ? (isRTL ? "جاري التسجيل..." : "En cours...") : (isRTL ? "تأكيد الاعتذار" : "Confirmer le refus")}</span>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
