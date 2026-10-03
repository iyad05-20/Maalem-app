import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Scale, X, Send, ImagePlus, ChevronDown, CheckCircle2 } from "lucide-react";
import { useClientI18n } from "../../../services/i18n";
import { API_BASE } from "../../../services/apiConfig";
import { authService } from "../../../services/authService";

interface ClientFormalRequestModalProps {
  isOpen: boolean;
  orderId: string;
  artisanName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClientFormalRequestModal: React.FC<ClientFormalRequestModalProps> = ({
  isOpen,
  orderId,
  artisanName,
  onClose,
  onSuccess,
}) => {
  const { isRTL } = useClientI18n();
  const shouldReduceMotion = useReducedMotion();

  const [category, setCategory] = useState("produit_non_conforme");
  const [customCategory, setCustomCategory] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const categories = [
    { id: "produit_non_conforme", fr: "Produit non conforme à la description", ar: "القطعة غير مطابقة للمواصفات أو الصور" },
    { id: "colis_endommage", fr: "Colis ou pièce endommagée durant le transport", ar: "الشحنة أو القطعة تعرضت لضرر أثناء التوصيل" },
    { id: "retard_critique", fr: "Retard excessif sans réponse de l'artisan", ar: "تأخر غير مبرر وانقطاع تواصل الصانع" },
    { id: "autre", fr: "Autre motif (à préciser ci-dessous)", ar: "سبب آخر (يرجى التحديد أسفله)" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    if (category === "autre" && !customCategory.trim()) return;

    setLoading(true);
    try {
      const finalCategory = category === "autre" ? `autre:${customCategory.trim()}` : category;
      const res = await fetch(`${API_BASE}/formal-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify({
          orderId,
          initiatorType: "client",
          category: finalCategory,
          description: description.trim(),
          evidenceUrls: evidenceUrl ? [evidenceUrl.trim()] : [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Échec de l'envoi de la demande formelle.");
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(err.message || (isRTL ? "حدث خطأ" : "Une erreur est survenue"));
    } finally {
      setLoading(false);
    }
  };

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
            maxWidth: 480,
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
                  background: "rgba(184, 98, 63, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Scale size={22} color="var(--accent-warm, #B8623F)" />
              </div>
              <div>
                <h3 style={{ fontFamily: "var(--font-display, serif)", fontWeight: 700, fontSize: 17, color: "var(--primary, #1A2A3A)", margin: 0 }}>
                  {isRTL ? "تقديم طلب تدخل رسمي" : "Demande Formelle d'Intervention"}
                </h3>
                <p style={{ fontSize: 11, color: "var(--text-secondary, #5C6B78)", margin: "2px 0 0 0" }}>
                  {isRTL ? "طلب رقم :" : "Commande N°"} <strong style={{ color: "var(--accent-warm, #B8623F)" }}>{orderId}</strong>{artisanName ? ` · ${artisanName}` : ""}
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

          {submitted ? (
            <div style={{ textAlign: "center", padding: "30px 10px" }}>
              <CheckCircle2 size={48} color="var(--accent-emerald, #2D6A4F)" style={{ marginBottom: 12 }} />
              <h4 style={{ fontFamily: "var(--font-display, serif)", fontSize: 16, color: "var(--primary, #1A2A3A)", margin: "0 0 6px 0" }}>
                {isRTL ? "تم إرسال الطلب بنجاح" : "Demande formelle enregistrée"}
              </h4>
              <p style={{ fontSize: 12, color: "var(--text-secondary, #5C6B78)", margin: 0 }}>
                {isRTL ? "لدى الطرف الآخر مهلة ٤٨ ساعة للرد وحل الإشكال مباشرة معك." : "L'artisan dispose de 48h pour répondre et chercher un accord amiable."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Note explicative 48h */}
              <div
                style={{
                  background: "var(--bg-primary, #FAFAF8)",
                  border: "1px solid var(--border, #E9E6E1)",
                  borderRadius: 14,
                  padding: "10px 14px",
                  marginBottom: 16,
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: "var(--text-secondary, #5C6B78)",
                }}
              >
                {isRTL
                  ? "⚖️ تمنح منصة ڤورك مهلة ٤٨ ساعة للطرف الآخر للرد وحل الإشكال ودياً. في حال انقضاء المهلة أو استمرار الخلاف بعد رده، يمكنك طلب رأي وملاحظات فريق ڤورك."
                  : "⚖️ L'artisan dispose de 48h pour vous répondre et trouver une solution directe avec vous. Passé ce délai ou si sa réponse ne résout pas le litige, vous pourrez solliciter l'avis d'observation et de médiation de Vork."}
              </div>

              {/* Sélection Catégorie */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--primary, #1A2A3A)", marginBottom: 6 }}>
                  {isRTL ? "تصنيف المشكلة *" : "Motif de la demande *"}
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "11px 14px",
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
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {isRTL ? c.ar : c.fr}
                      </option>
                    ))}
                  </select>
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      transform: "translateY(-50%)",
                      [isRTL ? "left" : "right"]: 12,
                      pointerEvents: "none",
                      color: "var(--text-secondary, #5C6B78)",
                    }}
                  >
                    <ChevronDown size={16} />
                  </div>
                </div>

                {/* Option Autre à écrire (Décision 3.3) */}
                {category === "autre" && (
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder={isRTL ? "يرجى تحديد وتسمية التصنيف الخاص..." : "Précisez l'intitulé de votre motif personnalisé..."}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid var(--border, #E9E6E1)",
                        fontSize: 13,
                        color: "var(--primary, #1A2A3A)",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--primary, #1A2A3A)", marginBottom: 6 }}>
                  {isRTL ? "وصف تفصيلي *" : "Description précise des faits *"}
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={isRTL ? "اشرح ما حدث بدقة لتمكين فريق التحكيم من مراجعة الطلب..." : "Décrivez la situation avec clarté et précision..."}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 14,
                    border: "1px solid var(--border, #E9E6E1)",
                    fontSize: 13,
                    color: "var(--primary, #1A2A3A)",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Lien photo de preuve (optionnel) */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--primary, #1A2A3A)", marginBottom: 6 }}>
                  {isRTL ? "رابط صورة كإثبات (اختياري)" : "Photo de preuve / URL (optionnel)"}
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="url"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    placeholder="https://..."
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 14,
                      border: "1px solid var(--border, #E9E6E1)",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <ImagePlus size={18} color="var(--text-secondary, #5C6B78)" />
                </div>
              </div>

              {/* Boutons d'action */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button
                  type="button"
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
                  {isRTL ? "إلغاء" : "Annuler"}
                </button>
                <button
                  type="submit"
                  disabled={loading || !description.trim()}
                  style={{
                    padding: "12px 22px",
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
                  <Send size={16} />
                  <span>{loading ? (isRTL ? "جاري الإرسال..." : "Envoi...") : (isRTL ? "إرسال الطلب الرسمي" : "Soumettre la demande")}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
