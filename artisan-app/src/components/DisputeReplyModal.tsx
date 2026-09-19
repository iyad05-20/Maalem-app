import React, { useState } from "react";
import { motion } from "framer-motion";
import { Scale, X, Send, Plus, Camera } from "lucide-react";
import type { ArtisanDispute } from "../types/artisanTypes";
import { useI18n } from "../services/i18n";

interface DisputeReplyModalProps {
  dispute: ArtisanDispute;
  onClose: () => void;
  onRespond: (disputeId: string, responseText: string, photos: string[]) => Promise<any>;
}

export const DisputeReplyModal: React.FC<DisputeReplyModalProps> = ({
  dispute,
  onClose,
  onRespond,
}) => {
  const { lang, t } = useI18n();
  const [responseText, setResponseText] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && photoUrls.length < 3) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setPhotoUrls(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPhoto = () => {
    if (photoInput.trim() && photoUrls.length < 3) {
      setPhotoUrls([...photoUrls, photoInput.trim()]);
      setPhotoInput("");
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responseText.trim()) return;
    setLoading(true);
    try {
      await onRespond(dispute.id, responseText, photoUrls);
      onClose();
    } catch (err: any) {
      alert(err.message || "Erreur soumission défense.");
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
          maxWidth: 580,
          padding: 24,
          background: "#FFF",
          borderRadius: 20,
          border: "1px solid rgba(220, 53, 69, 0.3)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(220, 53, 69, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Scale size={20} color="#DC3545" />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--primary)", margin: 0 }}>
                {t("disputes_banner_title")}
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                {t("disputes_dossier")}<strong style={{ color: "#DC3545" }}>{dispute.id}</strong> ({t("disputes_order_label")}{dispute.orderId})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-outline" style={{ padding: 6, borderRadius: 8 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ background: "rgba(220, 53, 69, 0.08)", border: "1px solid rgba(220, 53, 69, 0.25)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#DC3545", margin: "0 0 4px" }}>
            {t("disputes_client_reason")}
          </p>
          <p style={{ fontSize: 12, color: "var(--primary)", margin: 0, fontStyle: "italic" }}>
            "{dispute.reason}"
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label className="form-label">
              {t("dispute_reply_label")}
            </label>
            <textarea
              required
              rows={4}
              className="form-input"
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder={t("dispute_reply_placeholder")}
              style={{ resize: "vertical" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label className="form-label">
              {t("dispute_evidence_label")}
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
              {photoUrls.map((url, i) => (
                <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", height: 80 }}>
                  <img src={url} alt={`Preuve ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#FFF", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>

            {photoUrls.length < 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1.5px dashed var(--border)",
                  background: "var(--surface)",
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--primary)"
                }}>
                  <Camera size={16} color="var(--accent-warm)" />
                  <span>{t("dispute_take_photo")}</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                </label>

                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder={t("dispute_url_placeholder")}
                    value={photoInput}
                    onChange={(e) => setPhotoInput(e.target.value)}
                    className="form-input"
                    style={{ flex: 1, fontSize: 11 }}
                  />
                  <button type="button" onClick={handleAddPhoto} className="btn-outline" style={{ fontSize: 11 }}>
                     <Plus size={14} /> {t("dispute_add_btn")}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button type="button" onClick={onClose} className="btn-outline">{t("cancel")}</button>
            <button type="submit" disabled={loading || !responseText.trim()} className="btn-terracotta">
              <Send size={15} />
              <span>{loading ? t("loading") : t("dispute_submit_btn")}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
