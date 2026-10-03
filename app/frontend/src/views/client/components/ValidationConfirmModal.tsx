import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ShieldCheck, CheckCircle2, X } from "lucide-react";
import { useClientI18n } from "../../../services/i18n";

interface ValidationConfirmModalProps {
  isOpen: boolean;
  orderId: string;
  artisanName?: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  loading?: boolean;
}

export const ValidationConfirmModal: React.FC<ValidationConfirmModalProps> = ({
  isOpen,
  orderId,
  artisanName,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const { isRTL } = useClientI18n();
  const shouldReduceMotion = useReducedMotion();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.94, opacity: 0, y: 15 }}
          transition={{ duration: shouldReduceMotion ? 0.15 : 0.25, ease: "easeOut" }}
          style={{
            width: "100%",
            maxWidth: 440,
            padding: 24,
            background: "#FFFFFF",
            borderRadius: 24,
            border: "1px solid var(--border, #E9E6E1)",
            boxShadow: "0 20px 60px rgba(26, 42, 58, 0.3)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: "rgba(45, 106, 79, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={24} color="var(--accent-emerald, #2D6A4F)" />
              </div>
              <div>
                <h3 style={{ fontFamily: "var(--font-display, serif)", fontWeight: 700, fontSize: 17, color: "var(--primary, #1A2A3A)", margin: 0 }}>
                  {isRTL ? "تأكيد معاينة واستلام الطلب" : "Validation de la Réception"}
                </h3>
                <p style={{ fontSize: 11, color: "var(--text-secondary, #5C6B78)", margin: "2px 0 0 0" }}>
                  {isRTL ? "طلب رقم :" : "Commande N°"} <strong style={{ color: "var(--primary, #1A2A3A)" }}>{orderId}</strong>{artisanName ? ` · ${artisanName}` : ""}
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

          {/* Description & Instruction d'inspection */}
          <div
            style={{
              background: "var(--bg-primary, #FAFAF8)",
              border: "1px solid var(--border, #E9E6E1)",
              borderRadius: 16,
              padding: "14px 16px",
              marginBottom: 20,
              fontSize: 13,
              lineHeight: 1.5,
              color: "var(--text-primary, #1A2A3A)",
            }}
          >
            <p style={{ margin: "0 0 8px 0", fontWeight: 600 }}>
              {isRTL ? "🔍 هل قمت بفحص ومعاينة الشحنة؟" : "🔍 Avez-vous bien inspecté votre colis ?"}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary, #5C6B78)" }}>
              {isRTL
                ? "بتأكيد الاستلام، فإنك تصادق على مطابقة القطعة لطلبك وتوافق على تحويل مستحقات الصانع مباشرة إلى حسابه. في حال وجود عيب لاحق، يمكنك دائماً تقديم طلب تدخل رسمي."
                : "En validant, vous confirmez que la pièce est conforme à votre commande et vous libérez les fonds séquestrés à l'artisan. Vous pourrez toujours recourir à une Demande Formelle en cas de besoin."}
            </p>
          </div>

          {/* Boutons d'action */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <motion.button
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              onClick={onConfirm}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 18px",
                borderRadius: 16,
                border: "none",
                background: "var(--accent-emerald, #2D6A4F)",
                color: "#FFFFFF",
                fontFamily: "var(--font-display, serif)",
                fontWeight: 700,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 6px 18px rgba(45, 106, 79, 0.3)",
              }}
            >
              <CheckCircle2 size={18} />
              <span>{loading ? (isRTL ? "جاري التأكيد..." : "Confirmation...") : (isRTL ? "نعم، أؤكد سلامة واستلام الطلب" : "Oui, je valide la réception")}</span>
            </motion.button>

            <motion.button
              whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
              onClick={onClose}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 18px",
                borderRadius: 16,
                border: "1px solid var(--border, #E9E6E1)",
                background: "transparent",
                color: "var(--text-secondary, #5C6B78)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isRTL ? "ليس بعد (أود فحصها أولاً)" : "Pas encore (vérifier d'abord)"}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
