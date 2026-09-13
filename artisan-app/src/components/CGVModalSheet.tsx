import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Scale, CheckCircle2, Info } from "lucide-react";
import { useI18n } from "../services/i18n";

interface Props {
  onClose: () => void;
}

export const CGVModalSheet: React.FC<Props> = ({ onClose }) => {
  const { t } = useI18n();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="sheet-backdrop"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="sheet-panel"
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: 390 }}
        >
          <div className="sheet-handle" />

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <Scale size={18} color="var(--accent-warm)" />
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--primary)" }}>
                  {t("cgv_title")}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {t("cgv_sub")}
              </div>
            </div>
            <button className="icon-btn" onClick={onClose}>
              <X size={16} />
            </button>
          </div>

          {/* Articles summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>

            {/* Art 5.1 & 7 */}
            <div style={{ background: "rgba(26,42,58,0.04)", borderRadius: 14, padding: 12, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <CheckCircle2 size={14} color="var(--accent-emerald)" />
                <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
                  {t("cgv_art5_title")}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                {t("cgv_art5_desc")}
              </p>
            </div>

            {/* Art 8.1 */}
            <div style={{ background: "rgba(26,42,58,0.04)", borderRadius: 14, padding: 12, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <CheckCircle2 size={14} color="var(--accent-emerald)" />
                <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
                  {t("cgv_art8_title")}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                {t("cgv_art8_desc")}
              </p>
            </div>

            {/* Art 11.4 & 11.5 */}
            <div style={{ background: "rgba(26,42,58,0.04)", borderRadius: 14, padding: 12, border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <CheckCircle2 size={14} color="var(--accent-emerald)" />
                <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
                  {t("cgv_art11_title")}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                {t("cgv_art11_sendit_label")}<br />
                {t("cgv_art11_direct_label")}
              </p>
            </div>

            {/* Commission & TVA */}
            <div style={{ background: "rgba(184,98,63,0.06)", borderRadius: 14, padding: 12, border: "1px solid rgba(184,98,63,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Info size={14} color="var(--accent-warm)" />
                <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "var(--accent-warm)" }}>
                  {t("cgv_commission_title")}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                {t("cgv_commission_desc")}
              </p>
            </div>

            {/* Art 15 */}
            <div style={{ background: "rgba(212,175,55,0.08)", borderRadius: 14, padding: 12, border: "1px solid rgba(212,175,55,0.3)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <ShieldCheck size={14} color="#8B6914" />
                <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "#8B6914" }}>
                  {t("cgv_art15_title")}
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                {t("cgv_art15_desc")}
              </p>
            </div>

          </div>

          <button className="btn-primary" onClick={onClose}>
            {t("cgv_understood_btn")}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
