import React, { useState } from "react";
import { motion } from "framer-motion";
import { Landmark, X, Check, Calendar } from "lucide-react";
import { useI18n } from "../services/i18n";

interface WithdrawalModalProps {
  availableBalance: number;
  defaultRib?: string;
  onClose: () => void;
  onRequestWithdrawal: (amount: number, rib: string) => Promise<any>;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
  availableBalance,
  defaultRib = "",
  onClose,
  onRequestWithdrawal,
}) => {
  const { t } = useI18n();
  const [amount, setAmount] = useState<string>(String(Math.floor(availableBalance)));
  const [rib, setRib] = useState<string>(defaultRib);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0 || num > availableBalance) {
      alert(t("withdrawal_error_amount"));
      return;
    }
    if (rib.length !== 24 || !/^\d+$/.test(rib)) {
      alert(t("withdrawal_error_rib"));
      return;
    }

    setLoading(true);
    try {
      await onRequestWithdrawal(num, rib);
      onClose();
    } catch (err: any) {
      alert(err.message || t("auth_error_server"));
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
          border: "1px solid var(--border-gold)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(212, 175, 55, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Landmark size={20} color="var(--accent-premium)" />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--primary)", margin: 0 }}>
                {t("withdrawal_modal_title")}
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                {t("withdrawal_available_label")} <strong style={{ color: "var(--accent-warm)" }}>{availableBalance} {t("currency_mad")}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-outline" style={{ padding: 6, borderRadius: 8 }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">
              {t("withdrawal_amount_label")}
            </label>
            <input
              type="number"
              min={100}
              max={availableBalance}
              required
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ fontWeight: 700, fontSize: 15 }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="form-label">
              {t("withdrawal_rib_label")}
            </label>
            <input
              type="text"
              maxLength={24}
              required
              className="form-input"
              value={rib}
              onChange={(e) => setRib(e.target.value.replace(/\D/g, ""))}
              placeholder="230780000123456789012345"
              style={{ letterSpacing: 1 }}
            />
            <span style={{ fontSize: 10, color: rib.length === 24 ? "#2D6A4F" : "var(--text-secondary)", marginTop: 4, display: "block" }}>
              {rib.length} / 24 {t("withdrawal_digits")} {rib.length === 24 ? "✓" : ""}
            </span>
          </div>

          {/* Friday 10h00 Batch Notice */}
          <div style={{
            background: "rgba(212, 175, 55, 0.08)",
            border: "1px solid rgba(212, 175, 55, 0.3)",
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 16,
            fontSize: 11,
            color: "var(--primary)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <Calendar size={16} color="var(--accent-premium)" />
            <span>{t("withdrawal_friday_notice")}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={onClose} className="btn-outline">{t("cancel")}</button>
            <button type="submit" disabled={loading || availableBalance <= 0 || rib.length !== 24} className="btn-terracotta">
              <Check size={16} />
              <span>{loading ? t("loading") : t("withdrawal_submit")}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
