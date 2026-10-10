import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Info, ChevronDown, Package } from "lucide-react";
import { useI18n } from "../services/i18n";

interface CreatePostModalSheetProps {
  onClose: () => void;
  onCreateProduct: (productData: any) => Promise<void>;
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

export const CreatePostModalSheet: React.FC<CreatePostModalSheetProps> = ({
  onClose,
  onCreateProduct,
}) => {
  const { t, lang, isRTL } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [netPrice, setNetPrice] = useState("");
  const [productType, setProductType] = useState<"standard" | "personnalise">("standard");
  const [categoryKey, setCategoryKey] = useState(CATEGORIES[0].key);
  const [image, setImage] = useState("");
  const [manufacturingDays, setManufacturingDays] = useState(5);
  const [length, setLength] = useState("25");
  const [width, setWidth] = useState("25");
  const [height, setHeight] = useState("15");
  const [shippingFee, setShippingFee] = useState("");
  const [shippingThreshold, setShippingThreshold] = useState("3");
  const [hasStockTracking, setHasStockTracking] = useState(false);
  const [stockQty, setStockQty] = useState("10");
  const [showStockToClient, setShowStockToClient] = useState(true);
  const [allowExceedingStock, setAllowExceedingStock] = useState(false);
  const [autoAcceptExceedingStock, setAutoAcceptExceedingStock] = useState(false);
  const [personalizationMode, setPersonalizationMode] = useState<"accept_direct" | "delegate_to_market" | "disabled">("accept_direct");
  const [loading, setLoading] = useState(false);

  // Pricing formula: artisan saisit son prix NET
  // Platform adds: 5% commission HT + 20% TVA on 5% commission
  const numNet = Number(netPrice) || 0;
  const commissionHt = Math.round(numNet * 0.05);   // 5% frais Vork HT
  const tvaVal      = Math.round(commissionHt * 0.20); // 20% TVA sur commission seulement
  const clientPrice = numNet > 0 ? numNet + commissionHt + tvaVal : 0;


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !netPrice) return;
    setLoading(true);
    try {
      const selectedCat = CATEGORIES.find(c => c.key === categoryKey);
      if (Number(shippingFee) > 0 && (!shippingThreshold || Number(shippingThreshold) < 1)) {
        alert(isRTL ? "يرجى تحديد عتبة كمية الشحن (1 على الأقل لكل طرد)" : "Le seuil de quantité pour le transport est obligatoire (minimum 1 article).");
        setLoading(false);
        return;
      }

      await onCreateProduct({
        title: title.trim(),
        description: description.trim(),
        price: numNet,         // net artisan stocké
        clientPrice,           // prix affiché client
        productType,
        category: selectedCat ? (lang === "ar" ? selectedCat.ar : selectedCat.fr) : categoryKey,
        image,
        manufacturingDays: Number(manufacturingDays),
        dimensions: { length: Number(length), width: Number(width), height: Number(height) },
        shippingFee: Number(shippingFee) || 0,
        shippingThreshold: Number(shippingThreshold) || 1,
        personalizationMode,
        personalization_mode: personalizationMode,
        accept_customization: personalizationMode !== "disabled",
        allow_public_customization: personalizationMode === "delegate_to_market",
        stock: hasStockTracking ? Number(stockQty) : null,
        stockPolicy: hasStockTracking ? {
          show_stock_to_client: showStockToClient,
          allow_order_exceeding_stock: allowExceedingStock,
          auto_accept_exceeding_stock: allowExceedingStock && autoAcceptExceedingStock,
        } : {},
      });
      onClose();
    } catch (err: any) {
      alert(err.message || t("auth_error_server"));
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
          onClick={e => e.stopPropagation()}
          style={{ maxWidth: 440, maxHeight: "92dvh", overflowY: "auto" }}
        >
          <div className="sheet-handle" />

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                <Package size={16} color="var(--accent-warm)" />
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, color: "var(--primary)" }}>
                  {t("create_post_title")}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                {t("create_post_subtitle")}
              </div>
            </div>
            <button className="icon-btn" onClick={onClose}>
              <X size={17} />
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Title */}
            <div>
              <label className="form-label">{t("create_title_label")}</label>
              <input
                className="form-input"
                type="text"
                required
                placeholder={t("create_title_placeholder")}
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            {/* Type toggle */}
            <div>
              <label className="form-label">{t("create_type_label")}</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["standard", "personnalise"] as const).map(pType => (
                  <button
                    key={pType}
                    type="button"
                    className={`pill-tab ${productType === pType ? "active" : ""}`}
                    onClick={() => setProductType(pType)}
                    style={{ flex: 1, padding: "10px 8px" }}
                  >
                    {pType === "standard" ? t("create_type_standard") : t("create_type_custom")}
                  </button>
                ))}
              </div>
            </div>

            {/* ── TRI-MODE DE PERSONNALISATION (Règle V2 / Décision Ziad) ── */}
            <div style={{
              background: "rgba(212, 175, 55, 0.06)",
              border: "1.5px solid rgba(212, 175, 55, 0.3)",
              borderRadius: 16,
              padding: 14,
            }}>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 800, color: "var(--primary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span>✦ {isRTL ? "خيارات التخصيص للمشتري" : "Options de personnalisation client"}</span>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  {
                    id: "accept_direct",
                    title: isRTL ? "قبول التخصيص المباشر" : "Accepter la personnalisation directe",
                    desc: isRTL ? "أقبل تفصيل هذا المنتج بنفسي. الطلبات توجه حصرياً لورشتي." : "J'accepte de personnaliser ce modèle moi-même. Commandes acheminées directement dans votre atelier.",
                    badge: isRTL ? "مباشر" : "Direct",
                  },
                  {
                    id: "delegate_to_market",
                    title: isRTL ? "تفويض للسوق المفتوح" : "Déléguer au Marché Public",
                    desc: isRTL ? "أرفض التخصيص المباشر ولكن أسمح لصناع آخرين بتنفيذه. ستتلقى إشعاراً عند بدء الصانع الثاني بالعمل." : "Je refuse la personnalisation directe mais j'autorise d'autres artisans à s'inspirer de ce modèle sur le marché public. Vous serez notifié si un artisan démarre sa confection.",
                    badge: isRTL ? "سوق عام" : "Marché Public",
                  },
                  {
                    id: "disabled",
                    title: isRTL ? "تعطيل التخصيص نهائياً" : "Désactiver la personnalisation",
                    desc: isRTL ? "المنتج يباع فقط كما هو. زر التخصيص سيكون مخفياً للمشترين." : "Produit vendu tel quel uniquement. Le bouton 'Personnaliser' sera masqué sur la fiche produit.",
                    badge: isRTL ? "معطل" : "Masqué",
                  },
                ].map(m => (
                  <div
                    key={m.id}
                    onClick={() => setPersonalizationMode(m.id as any)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: personalizationMode === m.id ? "1.5px solid var(--accent-warm)" : "1px solid var(--border)",
                      background: personalizationMode === m.id ? "#FFFFFF" : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: personalizationMode === m.id ? "var(--primary)" : "var(--text-secondary)" }}>
                        {m.title}
                      </span>
                      <span style={{
                        fontSize: 8.5,
                        fontWeight: 800,
                        padding: "2px 6px",
                        borderRadius: 6,
                        background: personalizationMode === m.id ? "var(--accent-warm)" : "rgba(0,0,0,0.06)",
                        color: personalizationMode === m.id ? "#FFFFFF" : "var(--text-secondary)",
                      }}>
                        {m.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: 9.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.35 }}>
                      {m.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── PRICING BOX (core feature) ───────────────────────────── */}
            <div style={{
              background: "rgba(184, 98, 63, 0.05)",
              border: "1px solid rgba(184, 98, 63, 0.2)",
              borderRadius: 18,
              padding: 16,
            }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {/* NET Price (artisan input) */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, color: "var(--accent-warm)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    {t("create_breakdown_net")} *
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="number"
                      required
                      min={50}
                      placeholder="1000"
                      value={netPrice}
                      onChange={e => setNetPrice(e.target.value)}
                      style={{
                        width: "100%",
                        padding: isRTL ? "11px 14px 11px 40px" : "11px 40px 11px 14px",
                        borderRadius: 14,
                        border: "1.5px solid var(--accent-warm)",
                        background: "var(--surface)",
                        fontSize: 18,
                        fontWeight: 900,
                        fontFamily: "var(--font-display)",
                        color: "var(--primary)",
                        outline: "none",
                      }}
                    />
                    <span style={{ position: "absolute", [isRTL ? "left" : "right"]: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>
                      {t("currency_mad")}
                    </span>
                  </div>
                </div>

                {/* Client Displayed Price (computed) */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 800, color: "var(--accent-emerald)", display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    {t("create_breakdown_client")}
                  </label>
                  <div style={{
                    padding: "11px 14px",
                    borderRadius: 14,
                    border: "1.5px solid rgba(45,106,79,0.35)",
                    background: numNet > 0 ? "rgba(45,106,79,0.06)" : "rgba(0,0,0,0.03)",
                    fontSize: 18,
                    fontWeight: 900,
                    fontFamily: "var(--font-display)",
                    color: numNet > 0 ? "var(--accent-emerald)" : "var(--text-placeholder)",
                  }}>
                    {numNet > 0 ? `${clientPrice} ${t("currency_mad")}` : `— ${t("currency_mad")}`}
                  </div>
                </div>
              </div>

              {/* Breakdown detail */}
              {numNet > 0 && (
                <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                    <Info size={12} color="var(--accent-warm)" />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-warm)", textTransform: "uppercase", letterSpacing: 0.3 }}>
                      {t("create_breakdown_title")}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {[
                      { label: t("create_breakdown_net"), value: `${numNet} ${t("currency_mad")}`, color: "var(--primary)" },
                      { label: t("create_breakdown_commission"), value: `+ ${commissionHt} ${t("currency_mad")}`, color: "var(--text-secondary)" },
                      { label: t("create_breakdown_tva"), value: `+ ${tvaVal} ${t("currency_mad")}`, color: "var(--text-secondary)" },
                    ].map(row => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{row.label}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: row.color }}>{row.value}</span>
                      </div>
                    ))}
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 5, marginTop: 2, display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "var(--accent-emerald)" }}>{t("create_breakdown_client")}</span>
                      <span style={{ fontSize: 11, fontWeight: 900, fontFamily: "var(--font-display)", color: "var(--accent-emerald)" }}>{clientPrice} {t("currency_mad")}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Category + Délai */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="form-label">{t("create_category_label")}</label>
                <div style={{ position: "relative" }}>
                  <select
                    value={categoryKey}
                    onChange={e => setCategoryKey(e.target.value)}
                    className="form-input"
                    style={{ [isRTL ? "paddingLeft" : "paddingRight"]: 32, appearance: "none", cursor: "pointer" }}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.key} value={c.key}>
                        {lang === "ar" ? c.ar : c.fr}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} color="var(--text-secondary)" style={{ position: "absolute", [isRTL ? "left" : "right"]: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                </div>
              </div>
              <div>
                <label className="form-label">{t("create_lead_time_label")}</label>
                <input
                  type="number"
                  min={1}
                  value={manufacturingDays}
                  onChange={e => setManufacturingDays(Number(e.target.value))}
                  className="form-input"
                />
              </div>
            </div>

            {/* ─── DIMENSIONS DU COLIS & ÉLIGIBILITÉ SENDIT (RÈGLE ZIAD 11/09/2026) ─── */}
            <div>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700 }}>
                {isRTL ? "أبعاد الطرد (طول × عرض × ارتفاع بالسم)" : "Dimensions du colis (L × l × H en cm)"}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    placeholder="L"
                    value={length}
                    onChange={e => setLength(e.target.value)}
                    className="form-input"
                    style={{ textAlign: "center", fontSize: 12, padding: "8px" }}
                  />
                  <span style={{ fontSize: 9, color: "var(--text-secondary)", display: "block", textAlign: "center", marginTop: 2 }}>
                    {isRTL ? "الطول" : "Longueur"}
                  </span>
                </div>
                <div>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    placeholder="l"
                    value={width}
                    onChange={e => setWidth(e.target.value)}
                    className="form-input"
                    style={{ textAlign: "center", fontSize: 12, padding: "8px" }}
                  />
                  <span style={{ fontSize: 9, color: "var(--text-secondary)", display: "block", textAlign: "center", marginTop: 2 }}>
                    {isRTL ? "العرض" : "Largeur"}
                  </span>
                </div>
                <div>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    placeholder="H"
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    className="form-input"
                    style={{ textAlign: "center", fontSize: 12, padding: "8px" }}
                  />
                  <span style={{ fontSize: 9, color: "var(--text-secondary)", display: "block", textAlign: "center", marginTop: 2 }}>
                    {isRTL ? "الارتفاع" : "Hauteur"}
                  </span>
                </div>
              </div>
            </div>

            {/* ─── FRAIS DE TRANSPORT & SEUIL OBLIGATOIRE (DÉCISION 33 & NOTE P3 / C14) ─── */}
            <div style={{
              background: "var(--bg-primary, #FAFAF8)",
              border: "1px solid var(--border, #E9E6E1)",
              borderRadius: 16,
              padding: "12px 14px",
            }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--primary, #1A2A3A)", display: "block", marginBottom: 8 }}>
                {isRTL ? "مصاريف التوصيل وعتبة الكمية (إلزامية)" : "Frais de livraison & Seuil de quantité (Obligatoire)"}
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-secondary, #5C6B78)", display: "block", marginBottom: 4 }}>
                    {isRTL ? "تكلفة الشحن (درهم)" : "Frais par colis (MAD)"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 30"
                    value={shippingFee}
                    onChange={e => setShippingFee(e.target.value)}
                    className="form-input"
                    style={{ fontSize: 12, padding: "8px 10px" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-secondary, #5C6B78)", display: "block", marginBottom: 4 }}>
                    {isRTL ? "العتبة (عدد القطع) *" : "Seuil (Nb d'articles) *"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required={Number(shippingFee) > 0}
                    placeholder="Ex: 3"
                    value={shippingThreshold}
                    onChange={e => setShippingThreshold(e.target.value)}
                    className="form-input"
                    style={{ fontSize: 12, padding: "8px 10px" }}
                  />
                </div>
              </div>

              {/* Commentaire explicatif détaillé au-dessous (C14) */}
              <div style={{
                background: "rgba(26, 42, 58, 0.04)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 10.5,
                lineHeight: 1.45,
                color: "var(--text-secondary, #5C6B78)",
                border: "1px solid var(--border, #E9E6E1)",
              }}>
                <strong style={{ color: "var(--primary, #1A2A3A)", display: "block", marginBottom: 3 }}>
                  {isRTL ? "💡 كيف تعمل عتبة الشحن في متجرك؟" : "💡 Comment fonctionne le seuil de transport ?"}
                </strong>
                {isRTL
                  ? "تحدد العتبة أقصى عدد من القطع التي يشملها نفس مبلغ الشحن في طرد واحد. عند تجاوز هذا العدد، تُحتسب حصة شحن إضافية لكل حزمة جديدة. مثال: إذا حددت 30 درهم وعتبة 3 قطع، فطلب 1 إلى 3 قطع = 30 درهم، بينما 4 إلى 6 قطع = 60 درهم."
                  : "Le seuil définit le nombre maximal d'articles regroupés dans un même colis pour ce montant de livraison. Au-delà, un colis supplémentaire est facturé proportionnellement. Exemple : 30 MAD pour un seuil de 3 articles signifie que 1 à 3 articles = 30 MAD, 4 à 6 articles = 60 MAD."}
              </div>
            </div>

            {/* ─── GESTION DE STOCK & POLITIQUES DE BOUTIQUE (DÉCISION 36) ─── */}
            <div style={{
              background: "var(--bg-primary, #FAFAF8)",
              border: "1px solid var(--border, #E9E6E1)",
              borderRadius: 16,
              padding: "12px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasStockTracking ? 10 : 0 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--primary, #1A2A3A)", margin: 0 }}>
                    {isRTL ? "تتبع المخزون والسياسات (المادة ٣٦)" : "Suivi de stock & Politiques boutique (Décision 36)"}
                  </label>
                  <p style={{ fontSize: 10, color: "var(--text-secondary, #5C6B78)", margin: "2px 0 0 0" }}>
                    {isRTL ? "اختياري — حماية ورشتك من الطلبات الزائدة" : "Optionnel — Protège votre atelier des ruptures"}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={hasStockTracking}
                  onChange={e => setHasStockTracking(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: "var(--accent-warm, #B8623F)", cursor: "pointer" }}
                />
              </div>

              {hasStockTracking && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border, #E9E6E1)" }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "var(--primary, #1A2A3A)", display: "block", marginBottom: 4 }}>
                      {isRTL ? "الكمية الابتدائية المتوفرة (100% مرجعية) *" : "Quantité disponible initiale (100% de référence) *"}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required={hasStockTracking}
                      value={stockQty}
                      onChange={e => setStockQty(e.target.value)}
                      className="form-input"
                      style={{ fontSize: 12, padding: "8px 10px" }}
                    />
                  </div>

                  {/* 3 Politiques de boutique */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--primary, #1A2A3A)", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={showStockToClient}
                        onChange={e => setShowStockToClient(e.target.checked)}
                        style={{ accentColor: "var(--accent-warm, #B8623F)" }}
                      />
                      <span>{isRTL ? "إظهار كمية المخزون للزبون بالصفحة" : "Afficher la quantité en stock au client"}</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--primary, #1A2A3A)", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={allowExceedingStock}
                        onChange={e => {
                          setAllowExceedingStock(e.target.checked);
                          if (!e.target.checked) setAutoAcceptExceedingStock(false);
                        }}
                        style={{ accentColor: "var(--accent-warm, #B8623F)" }}
                      />
                      <span>{isRTL ? "السماح بالطلب إذا تجاوزت الكمية المخزون" : "Autoriser la commande si quantité > stock"}</span>
                    </label>

                    {allowExceedingStock && (
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "var(--text-secondary, #5C6B78)", paddingInlineStart: 18, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={autoAcceptExceedingStock}
                          onChange={e => setAutoAcceptExceedingStock(e.target.checked)}
                          style={{ accentColor: "var(--accent-warm, #B8623F)" }}
                        />
                        <span>{isRTL ? "القبول التلقائي حتى مع تجاوز المخزون" : "Acceptation auto même en cas de dépassement"}</span>
                      </label>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Image URL */}
            <div>
              <label className="form-label">{t("create_photo_label")}</label>
              <input
                type="text"
                value={image}
                onChange={e => setImage(e.target.value)}
                className="form-input"
                placeholder="https://..."
              />
              {image && (
                <div style={{ marginTop: 8, borderRadius: 12, overflow: "hidden", height: 100 }}>
                  <img src={image} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="form-label">{t("create_description_label")}</label>
              <textarea
                rows={3}
                placeholder={t("create_desc_placeholder")}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="form-input"
                style={{ resize: "none", lineHeight: 1.5 }}
              />
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={onClose}>
                {t("cancel")}
              </button>
              <button type="submit" className="btn-terracotta" style={{ flex: 2 }} disabled={loading}>
                <Check size={16} />
                {loading ? t("create_submitting") : t("create_submit_btn")}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
