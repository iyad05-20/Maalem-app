import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Upload, CheckCircle2, AlertTriangle, Camera, Send, Users } from "lucide-react";
import { useI18n } from "../services/i18n";
import { artisanAuthService } from "../services/artisanAuthService";
import { getBackendUrl } from "../services/artisanApi";

interface ConvertToCatalogModalSheetProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  { key: "ceramique", fr: "Céramique & Poterie", ar: "فخار وخزف" },
  { key: "cuir", fr: "Cuir & Maroquinerie", ar: "مصنوعات جلدية" },
  { key: "textile", fr: "Textile & Caftans", ar: "نسيج وقفطان" },
  { key: "bois", fr: "Bois & Zellige", ar: "خشب وزليج" },
  { key: "cuivre", fr: "Cuivre & Métal", ar: "نحاسيات ومعادن" },
  { key: "tapis", fr: "Tapis & Broderie", ar: "زرابي وطرز" },
  { key: "bijoux", fr: "Bijoux & Accessoires", ar: "حلي وإكسسوارات" },
];

export const ConvertToCatalogModalSheet: React.FC<ConvertToCatalogModalSheetProps> = ({
  order,
  onClose,
  onSuccess,
}) => {
  const { lang, isRTL } = useI18n();
  const isFromPostWithBaseVendor =
    order.customizationOrigin === "from_post" &&
    Boolean(order.sourceVendorId) &&
    order.sourceVendorId !== order.artisanRef;

  const defaultTitle = order.productTitle || "";
  const defaultConsentMsg = isRTL
    ? `مرحباً، بعد مصادقتكم على استلام طلبية "${defaultTitle || "الإبداع"}"، أود طلب موافقتكم لنشر هذا النموذج في كتالوجي كمنتج "حسب الطلب".`
    : `Bonjour, suite à la validation de la commande "${defaultTitle || "création sur-mesure"}", je souhaite solliciter votre accord pour publier cette réalisation en modèle "Sur Commande" dans ma vitrine Vork.`;

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(order.totalPrice ? String(Math.round(order.totalPrice / 1.06)) : "");
  const [category, setCategory] = useState(CATEGORIES[0].fr);
  const [manufacturingDays, setManufacturingDays] = useState(order.estimatedTransportDays || 7);
  const [image, setImage] = useState(order.productImage || "");
  const [tagsText, setTagsText] = useState(Array.isArray(order.tags) ? order.tags.join(", ") : "");
  const [sizesText, setSizesText] = useState(order.selectedSize || "");
  const [colorsText, setColorsText] = useState(order.selectedColor || "");
  const [consentMessage, setConsentMessage] = useState(defaultConsentMsg);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; requiresSourceVendor: boolean } | null>(null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const splitCsv = (str: string) => str.split(",").map(s => s.trim()).filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image.trim()) {
      setError(
        isRTL
          ? "إضافة صورة حقيقية للقطعة المصنوعة إلزامية."
          : "Une photo réelle du produit confectionné est obligatoire."
      );
      return;
    }
    if (!title.trim() || !price) {
      setError(
        isRTL
          ? "العنوان والسعر الصافي إلزاميّان."
          : "Le titre et le prix net sont obligatoires."
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = artisanAuthService.getToken() || "";
      const res = await fetch(`${getBackendUrl()}/artisan/orders/${order.id}/request-publication-consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          price: Number(price),
          image: image.trim(),
          photos: [image.trim()],
          tags: splitCsv(tagsText),
          sizes: splitCsv(sizesText),
          colors: splitCsv(colorsText),
          manufacturingDays: Number(manufacturingDays) || 7,
          consentMessage: consentMessage.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de l'envoi de la demande d'accord.");
      }

      setSuccessInfo({
        message: (isRTL && data.message_ar) ? data.message_ar : data.message,
        requiresSourceVendor: Boolean(data.requiresSourceVendor),
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || "Impossible d'envoyer la demande d'accord.");
    } finally {
      setLoading(false);
    }
  };

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
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: 460, maxHeight: "90vh", overflowY: "auto" }}
        >
          <div className="sheet-handle" />

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: "rgba(212, 175, 55, 0.15)",
                  color: "#D4AF37",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--primary)" }}>
                  {isRTL ? "طلب الموافقة على النشر" : "Demander l'accord de publication"}
                </h3>
                <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>
                  {isRTL ? "النشر كمنتج حسب الطلب بعد قبول الأطراف" : "Publier en 'Sur Commande' après acceptation"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>

          {successInfo ? (
            <div style={{ textAlign: "center", padding: "30px 10px" }}>
              <CheckCircle2 size={50} color="#16A34A" style={{ margin: "0 auto 12px auto" }} />
              <h4 style={{ margin: "0 0 6px 0", fontSize: 16, fontWeight: 800, color: "var(--primary)" }}>
                {isRTL ? "تم إرسال طلب الموافقة!" : "Demande d'accord envoyée !"}
              </h4>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>
                {successInfo.message}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Destinataires de la demande d'accord */}
              <div
                style={{
                  background: "rgba(212, 175, 55, 0.09)",
                  border: "1px solid rgba(212, 175, 55, 0.35)",
                  borderRadius: 14,
                  padding: "11px 13px",
                  fontSize: 11,
                  color: "#854D0E",
                  lineHeight: 1.45,
                  display: "flex",
                  gap: 8,
                }}
              >
                <Users size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>
                    {isFromPostWithBaseVendor
                      ? (isRTL ? "موافقة ثنائية مطلوبة :" : "Double accord requis (Produit inspiré d'un modèle) :")
                      : (isRTL ? "موافقة الزبون فقط :" : "Accord Client uniquement (Création From Scratch) :")}
                  </strong>{" "}
                  {isFromPostWithBaseVendor
                    ? (isRTL
                        ? "سيتم إشعار الزبون والبائع الأصلي للموافقة أو الرفض. رفض طرف واحد يكفي لإلغاء النشر."
                        : "Le Client ET le Vendeur du produit de base recevront une notification Accepter / Refuser. Un seul refus suffit à bloquer la publication.")
                    : (isRTL
                        ? "لا يوجد بائع أصلي، سيتم استشارة الزبون وحده قبل نشر المنشور."
                        : "Aucun vendeur de base externe : seul le Client recevra votre demande. Le post sera publié automatiquement dès son accord.")}
                </div>
              </div>

              {/* Pop-up Message pré-rédigé modifiable */}
              <div>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 800, color: "var(--primary)" }}>
                  {isRTL ? "رسالة طلب الموافقة (قابلة للتعديل) *" : "Message de demande d'accord (pré-rédigé, modifiable) *"}
                </label>
                <textarea
                  rows={3}
                  required
                  value={consentMessage}
                  onChange={(e) => setConsentMessage(e.target.value)}
                  className="form-input"
                  style={{ fontSize: 12, lineHeight: 1.45, background: "#FFFDF9", border: "1.5px solid rgba(212, 175, 55, 0.45)" }}
                />
              </div>

              {/* Photo obligatoire */}
              <div>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                  <Camera size={14} color="var(--accent-warm)" />
                  <span>{isRTL ? "صورة حقيقية للمنتج المنجز *" : "Photo réelle de confection terminée *"}</span>
                </label>

                {image ? (
                  <div style={{ position: "relative", height: 140, borderRadius: 14, overflow: "hidden", border: "1.5px solid var(--border)" }}>
                    <img src={image} alt="Confection" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => setImage("")}
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        padding: "4px 8px",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      {isRTL ? "تغيير" : "Changer"}
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "16px 14px",
                      borderRadius: 14,
                      border: "2px dashed var(--accent-warm)",
                      background: "rgba(184, 98, 63, 0.04)",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <Upload size={22} color="var(--accent-warm)" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
                      {isRTL ? "انقر لتحميل صورة حقيقية للقطعة" : "Importer la photo du produit fini"}
                    </span>
                    <input type="file" accept="image/*" onChange={handleImageFileChange} style={{ display: "none" }} />
                  </label>
                )}
              </div>

              {/* Titre */}
              <div>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                  {isRTL ? "عنوان المنشور في الكتالوج *" : "Titre du post au catalogue *"}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                  style={{ fontSize: 13 }}
                />
              </div>

              {/* Catégorie et Délai */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                    {isRTL ? "التصنيف" : "Catégorie"}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-input"
                    style={{ fontSize: 12 }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={lang === "ar" ? c.ar : c.fr}>
                        {lang === "ar" ? c.ar : c.fr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                    {isRTL ? "مدة الصنع (أيام)" : "Délai confection (j)"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={manufacturingDays}
                    onChange={(e) => setManufacturingDays(Number(e.target.value))}
                    className="form-input"
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>

              {/* Tags, Tailles, Couleurs */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label className="form-label" style={{ fontSize: 10.5, fontWeight: 700 }}>
                    {isRTL ? "المقاسات (مفصولة بفاصلة)" : "Tailles (séparées par ,)"}
                  </label>
                  <input
                    type="text"
                    value={sizesText}
                    onChange={(e) => setSizesText(e.target.value)}
                    placeholder="S, M, L"
                    className="form-input"
                    style={{ fontSize: 11.5 }}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: 10.5, fontWeight: 700 }}>
                    {isRTL ? "الألوان (مفصولة بفاصلة)" : "Couleurs (séparées par ,)"}
                  </label>
                  <input
                    type="text"
                    value={colorsText}
                    onChange={(e) => setColorsText(e.target.value)}
                    placeholder="Terracotta, Bleu Fassi"
                    className="form-input"
                    style={{ fontSize: 11.5 }}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: 10.5, fontWeight: 700 }}>
                  {isRTL ? "الوسوم (Tags)" : "Tags du post (séparés par ,)"}
                </label>
                <input
                  type="text"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="Fait main, Traditionnel, Sur-mesure"
                  className="form-input"
                  style={{ fontSize: 11.5 }}
                />
              </div>

              {/* Prix Net */}
              <div>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                  {isRTL ? "سعرك الصافي (درهم مغربي) *" : "Votre prix NET artisan (MAD) *"}
                </label>
                <input
                  type="number"
                  required
                  min={50}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="form-input"
                  style={{ fontSize: 14, fontWeight: 800, color: "var(--accent-warm)" }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                  {isRTL ? "وصف ومميزات القطعة" : "Description et finitions de la pièce"}
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={isRTL ? "وضح المواد وطريقة الصنع..." : "Détails techniques, matière, fabrication artisanale..."}
                  className="form-input"
                  style={{ fontSize: 12, resize: "none" }}
                />
              </div>

              {error && (
                <div
                  style={{
                    background: "rgba(220, 53, 69, 0.08)",
                    border: "1px solid rgba(220, 53, 69, 0.3)",
                    borderRadius: 12,
                    padding: "10px 12px",
                    color: "#DC2626",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <AlertTriangle size={14} />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "#FFFFFF",
                    color: "var(--text-secondary)",
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {isRTL ? "إلغاء" : "Annuler"}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: 12,
                    borderRadius: 14,
                    border: "none",
                    background: "linear-gradient(135deg, var(--accent-warm), #B8623F)",
                    color: "#FFFFFF",
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: loading ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    boxShadow: "0 4px 14px rgba(184, 98, 63, 0.25)",
                  }}
                >
                  <Send size={14} />
                  {loading
                    ? isRTL ? "جارٍ الإرسال..." : "Envoi en cours..."
                    : isRTL ? "إرسال طلب الموافقة" : "Envoyer la demande d'accord"}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
