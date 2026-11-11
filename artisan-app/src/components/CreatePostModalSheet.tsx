import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Info, ChevronDown, Package, Plus, Upload, Tag, Ruler, Palette, ShieldCheck } from "lucide-react";
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

const TAG_SUGGESTIONS = ["Fait main", "Traditionnel", "Fès", "Marrakech", "Pièce unique", "Artisanat pur"];
const SIZE_SUGGESTIONS = ["Unique", "S", "M", "L", "XL", "40×60 cm", "Sur mesure"];
const COLOR_SUGGESTIONS = ["Terracotta", "Bleu Fassi", "Écru", "Émeraude", "Or", "Noir", "Noyer"];

interface ChipSectionProps {
  label: string;
  icon: React.ReactNode;
  items: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  placeholder: string;
  isRTL: boolean;
}

const ChipSelectorSection: React.FC<ChipSectionProps> = ({
  label,
  icon,
  items,
  onChange,
  suggestions,
  placeholder,
  isRTL,
}) => {
  const [draft, setDraft] = useState("");
  const addChip = (val: string) => {
    const clean = val.trim();
    if (clean && !items.includes(clean)) {
      onChange([...items, clean]);
    }
    setDraft("");
  };
  const toggleChip = (val: string) => {
    if (items.includes(val)) onChange(items.filter(x => x !== val));
    else onChange([...items, val]);
  };

  return (
    <div style={{
      background: "var(--bg-primary, #FAFAF8)",
      border: "1px solid var(--border, #E9E6E1)",
      borderRadius: 14,
      padding: "10px 12px",
    }}>
      <label className="form-label" style={{ fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {icon}
        <span>{label}</span>
      </label>

      {/* Suggestions rapides */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
        {suggestions.map(s => {
          const active = items.includes(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleChip(s)}
              style={{
                padding: "4px 9px",
                borderRadius: 99,
                fontSize: 10.5,
                fontWeight: 700,
                border: active ? "1.5px solid var(--accent-warm)" : "1px solid var(--border)",
                background: active ? "var(--accent-warm)" : "#FFFFFF",
                color: active ? "#FFFFFF" : "var(--text-secondary)",
                cursor: "pointer",
              }}
            >
              {active ? `✓ ${s}` : `+ ${s}`}
            </button>
          );
        })}
      </div>

      {/* Saisie libre */}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              addChip(draft);
            }
          }}
          placeholder={placeholder}
          className="form-input"
          style={{ flex: 1, fontSize: 11.5, padding: "7px 10px" }}
        />
        <button
          type="button"
          onClick={() => addChip(draft)}
          className="btn-outline"
          style={{ padding: "7px 10px", fontSize: 11, borderRadius: 10 }}
        >
          <Plus size={13} />
          <span>{isRTL ? "إضافة" : "Ajouter"}</span>
        </button>
      </div>

      {/* Chips personnalisées ajoutées hors suggestions */}
      {items.filter(x => !suggestions.includes(x)).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {items.filter(x => !suggestions.includes(x)).map(item => (
            <span
              key={item}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 99,
                fontSize: 10.5,
                fontWeight: 700,
                background: "rgba(26, 42, 58, 0.08)",
                color: "var(--primary)",
              }}
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter(x => x !== item))}
                style={{ border: "none", background: "none", cursor: "pointer", padding: 0, color: "#DC2626", display: "flex" }}
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const CreatePostModalSheet: React.FC<CreatePostModalSheetProps> = ({
  onClose,
  onCreateProduct,
}) => {
  const { t, lang, isRTL } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [netPrice, setNetPrice] = useState("");
  const [productType, setProductType] = useState<"standard" | "sur_commande">("standard");
  const [categoryKey, setCategoryKey] = useState(CATEGORIES[0].key);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoUrlDraft, setPhotoUrlDraft] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [manufacturingDays, setManufacturingDays] = useState(5);
  const [length, setLength] = useState("25");
  const [width, setWidth] = useState("25");
  const [height, setHeight] = useState("15");
  const [shippingFee, setShippingFee] = useState("");
  const [shippingThreshold, setShippingThreshold] = useState("3");
  const [hasStockTracking, setHasStockTracking] = useState(true);
  const [stockQty, setStockQty] = useState("10");
  const [showStockToClient, setShowStockToClient] = useState(true);
  const [allowExceedingStock, setAllowExceedingStock] = useState(false);
  const [autoAcceptExceedingStock, setAutoAcceptExceedingStock] = useState(false);
  const [personalizationMode, setPersonalizationMode] = useState<"accept_direct" | "delegate_to_market" | "disabled">("accept_direct");
  const [ipAuthenticityAccepted, setIpAuthenticityAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pricing formula: artisan saisit son prix NET
  // Platform adds: 5% commission HT + 20% TVA on 5% commission
  const numNet = Number(netPrice) || 0;
  const commissionHt = Math.round(numNet * 0.05);   // 5% frais Vork HT
  const tvaVal      = Math.round(commissionHt * 0.20); // 20% TVA sur commission seulement
  const clientPrice = numNet > 0 ? numNet + commissionHt + tvaVal : 0;

  const handleSelectProductType = (nextType: "standard" | "sur_commande") => {
    setProductType(nextType);
    if (nextType === "sur_commande") {
      // Sur Commande => Hors stock immédiat
      setHasStockTracking(false);
    } else {
      setHasStockTracking(true);
    }
  };

  const handleAddPhotoUrl = () => {
    const clean = photoUrlDraft.trim();
    if (clean && photos.length < 5 && !photos.includes(clean)) {
      setPhotos([...photos, clean]);
      setPhotoUrlDraft("");
    }
  };

  const handlePhotoFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.slice(0, 5 - photos.length).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setPhotos(prev => prev.length < 5 ? [...prev, reader.result as string] : prev);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !netPrice) return;
    if (!ipAuthenticityAccepted) {
      alert(isRTL ? "يرجى المصادقة على الأصالة واحترام حقوق الملكية الفكرية." : "Veuillez accepter l'engagement d'authenticité et de propriété intellectuelle.");
      return;
    }
    setLoading(true);
    try {
      const selectedCat = CATEGORIES.find(c => c.key === categoryKey);
      if (Number(shippingFee) > 0 && (!shippingThreshold || Number(shippingThreshold) < 1)) {
        alert(isRTL ? "يرجى تحديد عتبة كمية الشحن (1 على الأقل لكل طرد)" : "Le seuil de quantité pour le transport est obligatoire (minimum 1 article).");
        setLoading(false);
        return;
      }

      const finalPhotos = photos.length > 0 ? photos : (photoUrlDraft.trim() ? [photoUrlDraft.trim()] : []);

      await onCreateProduct({
        title: title.trim(),
        description: description.trim(),
        price: numNet,         // net artisan stocké
        clientPrice,           // prix affiché client
        productType,
        category: selectedCat ? (lang === "ar" ? selectedCat.ar : selectedCat.fr) : categoryKey,
        image: finalPhotos[0] || "",
        photos: finalPhotos,
        tags,
        sizes,
        colors,
        ipAuthenticityAccepted: true,
        manufacturingDays: Number(manufacturingDays),
        dimensions: { length: Number(length), width: Number(width), height: Number(height) },
        shippingFee: Number(shippingFee) || 0,
        shippingThreshold: Number(shippingThreshold) || 1,
        personalizationMode,
        personalization_mode: personalizationMode,
        accept_customization: personalizationMode !== "disabled",
        allow_public_customization: personalizationMode === "delegate_to_market",
        stock: productType === "standard" && hasStockTracking ? Number(stockQty) : null,
        stockPolicy: productType === "sur_commande"
          ? { allow_order_exceeding_stock: true }
          : (hasStockTracking ? {
              show_stock_to_client: showStockToClient,
              allow_order_exceeding_stock: allowExceedingStock,
              auto_accept_exceeding_stock: allowExceedingStock && autoAcceptExceedingStock,
            } : {}),
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

            {/* Type toggle (Standard En stock vs Sur Commande Hors stock) */}
            <div>
              <label className="form-label">{t("create_type_label")}</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["standard", "sur_commande"] as const).map(pType => (
                  <button
                    key={pType}
                    type="button"
                    className={`pill-tab ${productType === pType ? "active" : ""}`}
                    onClick={() => handleSelectProductType(pType)}
                    style={{ flex: 1, padding: "10px 8px", fontSize: 11.5 }}
                  >
                    {pType === "standard" ? t("create_type_standard") : t("create_type_custom")}
                  </button>
                ))}
              </div>
              {productType === "sur_commande" && (
                <p style={{ fontSize: 10.5, color: "#8B6914", background: "rgba(212, 175, 55, 0.1)", borderRadius: 10, padding: "7px 10px", margin: "6px 0 0 0", lineHeight: 1.35 }}>
                  {isRTL
                    ? "هذا المنشور مصنف «حسب الطلب / غير متوفر مسبقاً»: يبدأ التصنيع فقط بعد تأكيد الطلبية وفق المدة المحددة."
                    : "Mode Sur Commande (Hors stock immédiat) : la pièce est fabriquée à la demande dans le délai de confection indiqué."}
                </p>
              )}
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

            {/* ─── GESTION DE STOCK (Post Standard En stock uniquement) ─── */}
            {productType === "standard" && (
            <div style={{
              background: "var(--bg-primary, #FAFAF8)",
              border: "1px solid var(--border, #E9E6E1)",
              borderRadius: 16,
              padding: "12px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: hasStockTracking ? 10 : 0 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--primary, #1A2A3A)", margin: 0 }}>
                    {isRTL ? "تتبع المخزون والسياسات (المادة ٣٦)" : "Suivi de stock « En stock » (Décision 36)"}
                  </label>
                  <p style={{ fontSize: 10, color: "var(--text-secondary, #5C6B78)", margin: "2px 0 0 0" }}>
                    {isRTL ? "حماية ورشتك من الطلبات الزائدة" : "Protège votre atelier des ruptures"}
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
            )}

            {/* ─── TAGS, TAILLES & COULEURS (Diagramme 6 #post-infos) ─── */}
            <ChipSelectorSection
              label={isRTL ? "الوسوم (Tags)" : "Tags & Styles du post"}
              icon={<Tag size={13} color="var(--accent-warm)" />}
              items={tags}
              onChange={setTags}
              suggestions={TAG_SUGGESTIONS}
              placeholder={isRTL ? "أضف وسماً (مثال: زليج فاسي)..." : "Ajouter un tag (Ex: Zellige, Bois de cèdre)..."}
              isRTL={isRTL}
            />

            <ChipSelectorSection
              label={isRTL ? "المقاسات المتوفرة (Tailles)" : "Tailles / Formats disponibles"}
              icon={<Ruler size={13} color="var(--accent-warm)" />}
              items={sizes}
              onChange={setSizes}
              suggestions={SIZE_SUGGESTIONS}
              placeholder={isRTL ? "مقاس خاص (مثال: 60x90 سم)..." : "Ex: S, M, 60×90 cm..."}
              isRTL={isRTL}
            />

            <ChipSelectorSection
              label={isRTL ? "الألوان المتوفرة (Couleurs)" : "Couleurs disponibles"}
              icon={<Palette size={13} color="var(--accent-warm)" />}
              items={colors}
              onChange={setColors}
              suggestions={COLOR_SUGGESTIONS}
              placeholder={isRTL ? "لون إضافي (مثال: أزرق ماغوريل)..." : "Ex: Bleu Majorelle, Ocre..."}
              isRTL={isRTL}
            />

            {/* ─── MULTI-PHOTOS (Diagramme 6) ─── */}
            <div style={{
              background: "var(--bg-primary, #FAFAF8)",
              border: "1px solid var(--border, #E9E6E1)",
              borderRadius: 14,
              padding: "10px 12px",
            }}>
              <label className="form-label" style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                {isRTL ? `صور القطعة (${photos.length}/5)` : `Photos de la création (${photos.length}/5)`}
              </label>

              {photos.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 8 }}>
                  {photos.map((src, idx) => (
                    <div key={idx} style={{ position: "relative", height: 56, borderRadius: 10, overflow: "hidden", border: idx === 0 ? "2px solid var(--accent-warm)" : "1px solid var(--border)" }}>
                      <img src={src} alt={`photo-${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                        style={{ position: "absolute", top: 2, right: 2, background: "rgba(0,0,0,0.65)", color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input
                  type="text"
                  value={photoUrlDraft}
                  onChange={e => setPhotoUrlDraft(e.target.value)}
                  className="form-input"
                  placeholder="https://... (URL photo)"
                  style={{ flex: 1, fontSize: 11.5, padding: "7px 10px" }}
                />
                <button
                  type="button"
                  onClick={handleAddPhotoUrl}
                  disabled={!photoUrlDraft.trim() || photos.length >= 5}
                  className="btn-outline"
                  style={{ padding: "7px 10px", fontSize: 11, borderRadius: 10 }}
                >
                  <Plus size={13} />
                </button>
              </div>

              {photos.length < 5 && (
                <label style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1.5px dashed rgba(184, 98, 63, 0.45)",
                  background: "rgba(184, 98, 63, 0.04)",
                  color: "var(--accent-warm)",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}>
                  <Upload size={14} />
                  <span>{isRTL ? "تحميل صور من الجهاز" : "Importer des photos depuis l'appareil"}</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoFilesUpload} style={{ display: "none" }} />
                </label>
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

            {/* ─── ENGAGEMENT D'AUTHENTICITÉ & PROPRIÉTÉ INTELLECTUELLE (Diagramme 6) ─── */}
            <label style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "11px 12px",
              borderRadius: 14,
              border: ipAuthenticityAccepted ? "1.5px solid #2D6A4F" : "1.5px solid rgba(184, 98, 63, 0.35)",
              background: ipAuthenticityAccepted ? "rgba(45, 106, 79, 0.06)" : "rgba(184, 98, 63, 0.05)",
              cursor: "pointer",
            }}>
              <input
                type="checkbox"
                checked={ipAuthenticityAccepted}
                onChange={e => setIpAuthenticityAccepted(e.target.checked)}
                style={{ width: 17, height: 17, marginTop: 2, accentColor: "#2D6A4F", flexShrink: 0 }}
              />
              <div style={{ fontSize: 11, lineHeight: 1.4, color: "var(--primary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 800, marginBottom: 2 }}>
                  <ShieldCheck size={14} color={ipAuthenticityAccepted ? "#2D6A4F" : "var(--accent-warm)"} />
                  <span>{isRTL ? "التزام الأصالة وحقوق الملكية الفكرية *" : "Engagement d'Authenticité & Propriété intellectuelle *"}</span>
                </div>
                <span style={{ color: "var(--text-secondary)", fontSize: 10.5 }}>
                  {isRTL
                    ? "أشهد وأضمن أن هذا التصميم أصلي ومصنوع يدوياً مع احترام كامل لحقوق الملكية الفكرية."
                    : "Je certifie et garantis l'authenticité artisanale de cette création et le respect des droits de propriété intellectuelle."}
                </span>
              </div>
            </label>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={onClose}>
                {t("cancel")}
              </button>
              <button type="submit" className="btn-terracotta" style={{ flex: 2, opacity: ipAuthenticityAccepted ? 1 : 0.6 }} disabled={loading || !ipAuthenticityAccepted}>
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
