import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, X, FileSignature, Clock, Camera } from "lucide-react";
import type { ArtisanOrder } from "../types/artisanTypes";
import { useI18n } from "../services/i18n";

interface DirectDeliveryModalProps {
  order: ArtisanOrder;
  onClose: () => void;
  onShipDirect: (orderId: string, days: number) => Promise<any>;
  onCompleteDelivery: (orderId: string, signaturePhoto: string) => Promise<any>;
}

export const DirectDeliveryModal: React.FC<DirectDeliveryModalProps> = ({
  order,
  onClose,
  onShipDirect,
  onCompleteDelivery,
}) => {
  const { lang, t } = useI18n();
  const isInTransport = order.status === "en_cours_de_transport";
  const [days, setDays] = useState<number>(7);
  const [signaturePhoto, setSignaturePhoto] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleShip = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onShipDirect(order.id, days);
      onClose();
    } catch (err: any) {
      alert(err.message || "Erreur expédition directe.");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signaturePhoto.trim()) return;
    setLoading(true);
    try {
      await onCompleteDelivery(order.id, signaturePhoto);
      onClose();
    } catch (err: any) {
      alert(err.message || "Erreur validation livraison.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setSignaturePhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
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
          maxWidth: 580,
          padding: 24,
          background: "#FFF",
          borderRadius: 20,
          border: "1px solid rgba(212, 175, 55, 0.3)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(212, 175, 55, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileSignature size={20} color="var(--accent-premium)" />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--primary)", margin: 0 }}>
                {t("shipping_direct_title")}
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                {t("shipping_direct_desc")} · {t("direct_order_label")} <strong style={{ color: "var(--accent-warm)" }}>{order.id}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-outline" style={{ padding: 6, borderRadius: 8 }}>
            <X size={16} />
          </button>
        </div>

        {!isInTransport ? (
          <form onSubmit={handleShip}>
            <div style={{ background: "rgba(212, 175, 55, 0.08)", border: "1px solid rgba(212, 175, 55, 0.25)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "var(--primary)", margin: 0, lineHeight: 1.4 }}>
                ℹ️ <strong>{t("direct_rule_9_3")}</strong> {t("direct_rule_9_3_text")}
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">
                {t("shipping_direct_duration")} *
              </label>
              <input
                type="number"
                min={1}
                max={30}
                required
                className="form-input"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={onClose} className="btn-outline">{t("cancel")}</button>
              <button type="submit" disabled={loading} className="btn-terracotta">
                <Clock size={16} />
                <span>{loading ? t("loading") : t("direct_start_btn")}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleComplete}>
            <div style={{ background: "rgba(45, 106, 79, 0.08)", border: "1px solid rgba(45, 106, 79, 0.25)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: "#2D6A4F", margin: 0, lineHeight: 1.4 }}>
                ✍️ <strong>{t("direct_rule_11_5")}</strong> {t("direct_rule_11_5_text")}
              </p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">
                {t("shipping_direct_signature")} *
              </label>

              {signaturePhoto ? (
                <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", maxHeight: 180, marginBottom: 8, textAlign: "center", background: "#000" }}>
                  <img src={signaturePhoto} alt="Bordereau signé" style={{ maxHeight: 180, maxWidth: "100%", objectFit: "contain" }} />
                  <button
                    type="button"
                    onClick={() => setSignaturePhoto("")}
                    style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.65)", color: "#FFF", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "20px 14px",
                  borderRadius: 12,
                  border: "2px dashed var(--border)",
                  background: "var(--surface)",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}>
                  <Camera size={26} color="var(--accent-warm)" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>
                    {t("direct_take_photo")}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                    {t("direct_file_hint")}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={onClose} className="btn-outline">{t("close")}</button>
              <button type="submit" disabled={loading || !signaturePhoto.trim()} className="btn-terracotta">
                <ShieldCheck size={16} />
                <span>{loading ? t("loading") : t("shipping_direct_confirm")}</span>
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
