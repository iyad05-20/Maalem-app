import React, { useState } from "react";
import { motion } from "framer-motion";
import { Camera, X, Check, Plus } from "lucide-react";
import { useI18n } from "../services/i18n";

interface PrepPhotosModalProps {
  orderId: string;
  onClose: () => void;
  onUpload: (orderId: string, photos: string[]) => Promise<void>;
}

export const PrepPhotosModal: React.FC<PrepPhotosModalProps> = ({ orderId, onClose, onUpload }) => {
  const { isRTL, t } = useI18n();
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddPhoto = () => {
    if (photoInput.trim() && photos.length < 4) {
      setPhotos([...photos, photoInput.trim()]);
      setPhotoInput("");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && photos.length < 4) {
        setPhotos(prev => [...prev, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  // ─── PROVISIONAL BYPASS (Facile à éliminer) ──────────────────────────────
  const handleBypass = async () => {
    setSubmitting(true);
    try {
      await onUpload(orderId, ["bypass:prep_photos_waived"]);
      onClose();
    } catch (err: any) {
      alert(err.message || t("auth_error_server"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0) return;
    setSubmitting(true);
    try {
      await onUpload(orderId, photos);
      onClose();
    } catch (err: any) {
      alert(err.message || t("auth_error_server"));
    } finally {
      setSubmitting(false);
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
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(184, 98, 63, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Camera size={20} color="var(--accent-warm)" />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--primary)", margin: 0 }}>
                {t("prep_photos_title")}
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                {t("prep_order_ref")} <strong style={{ color: "var(--accent-warm)" }}>{orderId}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-outline" style={{ padding: 6, borderRadius: 8 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ background: "rgba(184, 98, 63, 0.08)", border: "1px solid rgba(184, 98, 63, 0.25)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: "var(--primary)", lineHeight: 1.4, margin: 0 }}>
            📌 <strong>{t("prep_cgv_rule")}</strong> {t("prep_photos_desc")}
          </p>
        </div>

        {/* ─── VALIDATION DIRECTE D'ATELIER ─── */}
        <div style={{
          background: "rgba(45, 106, 79, 0.08)",
          border: "1px solid rgba(45, 106, 79, 0.25)",
          borderRadius: 12,
          padding: "10px 14px",
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12
        }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#2D6A4F", margin: "0 0 2px" }}>
              ✓ {isRTL ? "اعتماد جاهزية القطعة بالورشة" : "Validation de conformité d'atelier"}
            </p>
            <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: 0, lineHeight: 1.35 }}>
              {isRTL 
                ? "تأكيد جاهزية القطعة ومطابقتها التامة للمواصفات للانتقال المباشر إلى إعداد الشحن." 
                : "Confirmez l'achèvement et la conformité de l'article pour passer directement à l'étape d'expédition."}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={handleBypass}
            style={{
              background: "#2D6A4F",
              color: "#FFF",
              border: "none",
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 2px 6px rgba(45, 106, 79, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: 4
            }}
          >
            {submitting ? "..." : (isRTL ? "تأكيد الجاهزية ✓" : "Valider la conformité ✓")}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Photo Gallery Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 14 }}>
            {photos.length === 0 ? (
              <div style={{
                gridColumn: "span 2",
                padding: "24px 14px",
                textAlign: "center",
                background: "rgba(26,42,58,0.02)",
                borderRadius: 14,
                border: "1.5px dashed var(--border)",
              }}>
                <Camera size={28} color="var(--text-placeholder)" style={{ margin: "0 auto 8px" }} />
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", margin: 0 }}>
                  {t("prep_instruction")}
                </p>
                <label style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 12,
                  padding: "8px 14px",
                  borderRadius: 12,
                  background: "var(--accent-warm)",
                  color: "#FFF",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}>
                  <Camera size={14} />
                  <span>{t("prep_take_photo")}</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                </label>
              </div>
            ) : (
              photos.map((url, i) => (
                <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)", height: 110 }}>
                  <img src={url} alt={`Vue ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#FFF", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <X size={12} />
                  </button>
                  <span style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(0,0,0,0.6)", color: "#FFF", fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
                    {isRTL ? `صورة ${i + 1}` : `Photo ${i + 1}`}
                  </span>
                </div>
              ))
            )}
          </div>

          {photos.length > 0 && photos.length < 4 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <label className="btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, cursor: "pointer" }}>
                <Camera size={14} />
                <span>{t("prep_add_file")}</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
              </label>
              <input
                type="text"
                placeholder={t("prep_url_placeholder")}
                value={photoInput}
                onChange={(e) => setPhotoInput(e.target.value)}
                className="form-input"
                style={{ flex: 1, fontSize: 11 }}
              />
              <button type="button" onClick={handleAddPhoto} className="btn-outline" style={{ fontSize: 11 }}>
                <Plus size={14} /> {t("prep_add_btn")}
              </button>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <button type="button" onClick={onClose} className="btn-outline">{t("cancel")}</button>
            <button type="submit" disabled={submitting || photos.length === 0} className="btn-terracotta">
              <Check size={16} />
              <span>{submitting ? t("loading") : `${t("prep_photos_submit")} (${photos.length})`}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
