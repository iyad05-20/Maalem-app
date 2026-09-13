import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, X, Ban } from "lucide-react";
import { useI18n } from "../services/i18n";

interface RefuseOrderModalProps {
  orderId: string;
  onClose: () => void;
  onRefuse: (orderId: string, reason: string) => Promise<any>;
}

export const RefuseOrderModal: React.FC<RefuseOrderModalProps> = ({ orderId, onClose, onRefuse }) => {
  const { lang, t } = useI18n();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await onRefuse(orderId, reason);
      onClose();
    } catch (err: any) {
      alert(err.message || "Erreur lors du refus.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(11, 15, 25, 0.85)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      padding: 20,
    }}>
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: 480,
          padding: 24,
          background: "#FFF",
          borderRadius: 20,
          border: "1px solid rgba(220, 53, 69, 0.25)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(220, 53, 69, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={20} color="#DC3545" />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--primary)", margin: 0 }}>
                {t("refuse_modal_title")}
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                {t("refuse_order_ref")} <strong style={{ color: "#DC3545" }}>{orderId}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-outline" style={{ padding: 6, borderRadius: 8 }}>
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.4 }}>
          {t("refuse_modal_desc")}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="form-label">
              {t("refuse_reason_label")} *
            </label>
            <textarea
              required
              rows={4}
              className="form-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("refuse_reason_placeholder")}
              style={{ resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={onClose} className="btn-outline">{t("cancel")}</button>
            <button type="submit" disabled={loading || !reason.trim()} className="btn-danger">
              <Ban size={16} />
              <span>{loading ? t("loading") : t("refuse_submit")}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
