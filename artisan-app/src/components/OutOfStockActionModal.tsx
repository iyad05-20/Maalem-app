import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { PackageX, PlusCircle, Infinity as InfinityIcon, Clock, EyeOff, Trash2, X, Check } from "lucide-react";
import { useI18n } from "../services/i18n";

interface OutOfStockActionModalProps {
  product: {
    id: string;
    title: string;
    imageUrl?: string;
  };
  onClose: () => void;
  onApplyAction: (productId: string, action: string, payload?: any) => Promise<any>;
}

export const OutOfStockActionModal: React.FC<OutOfStockActionModalProps> = ({
  product,
  onClose,
  onApplyAction,
}) => {
  const { lang } = useI18n();
  const isRTL = lang === "ar";
  const shouldReduceMotion = useReducedMotion();

  const [selectedChoice, setSelectedChoice] = useState<number>(1);
  const [stockQty, setStockQty] = useState<number>(5);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(7);
  const [loading, setLoading] = useState(false);

  const choices = [
    {
      id: 1,
      action: "add_stock",
      icon: PlusCircle,
      titleFr: "Réapprovisionner le stock",
      titleAr: "إضافة كمية جديدة إلى المخزون",
      descFr: "Définissez une nouvelle quantité disponible pour réactiver le post immédiatement.",
      descAr: "حدد كمية جديدة متوفرة لإعادة إظهار القطعة بالسوق مباشرة.",
    },
    {
      id: 2,
      action: "disable_tracking",
      icon: InfinityIcon,
      titleFr: "Désactiver le suivi de stock",
      titleAr: "إلغاء تتبع المخزون (صنع مستمر)",
      descFr: "Vendez sans limite de stock, les commandes sont acceptées selon votre politique.",
      descAr: "البيع بدون تحديد كمية مخزون، والقبول بحسب سياسة ورشتك.",
    },
    {
      id: 3,
      action: "switch_to_on_demand",
      icon: Clock,
      titleFr: "Passer en « Sur Commande »",
      titleAr: "التحويل إلى نمط « الصنع عند الطلب »",
      descFr: "Transformez en création sur commande avec un délai de fabrication défini.",
      descAr: "تحويل القطعة لنمط التوصية مع تحديد مهلة صنع بالورشة.",
    },
    {
      id: 4,
      action: "hide_manually",
      icon: EyeOff,
      titleFr: "Garder le post masqué",
      titleAr: "إبقاء القطعة مخفية مؤقتاً",
      descFr: "Le post reste invisible sur le marché mais conservé dans votre atelier.",
      descAr: "تبقى القطعة مخفية عن الزبائن ومحفوظة في سجل ورشتك.",
    },
    {
      id: 5,
      action: "delete_post",
      icon: Trash2,
      titleFr: "Retirer définitivement le post",
      titleAr: "حذف القطعة نهائياً من المتجر",
      descFr: "Supprime la création du catalogue (historique des commandes préservé).",
      descAr: "حذف المعروض من الكتالوج مع الاحتفاظ بسجل الطلبات السابقة.",
    },
  ];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const choice = choices.find((c) => c.id === selectedChoice);
      if (!choice) return;

      let payload: any = {};
      if (choice.action === "add_stock") payload = { stock: stockQty };
      if (choice.action === "switch_to_on_demand") payload = { days: leadTimeDays };

      await onApplyAction(product.id, choice.action, payload);
      onClose();
    } catch (err: any) {
      alert(err.message || (isRTL ? "حدث خطأ" : "Une erreur est survenue"));
    } finally {
      setLoading(false);
    }
  };

  return (
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
        initial={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 15 }}
        transition={{ duration: shouldReduceMotion ? 0.15 : 0.25, ease: "easeOut" }}
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 24,
          background: "#FFFFFF",
          borderRadius: 24,
          border: "1px solid var(--border, #E9E6E1)",
          boxShadow: "0 20px 60px rgba(26, 42, 58, 0.25)",
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
              <PackageX size={22} color="var(--accent-warm, #B8623F)" />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-display, serif)", fontWeight: 700, fontSize: 17, color: "var(--primary, #1A2A3A)", margin: 0 }}>
                {isRTL ? "القطعة نفدت من المخزون (٠ قطع)" : "Produit Hors Stock (Stock = 0)"}
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary, #5C6B78)", margin: "2px 0 0 0" }}>
                {product.title}
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
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-secondary, #5C6B78)", marginBottom: 16, lineHeight: 1.5 }}>
          {isRTL
            ? "تم حجب القطعة تلقائياً من السوق لحمايتك. اختر الإجراء المناسب لورشتك من الخيارات الخمسة التالية (المادة ٤):"
            : "Le produit a été automatiquement masqué du marché. Choisissez l'option qui convient à votre atelier (Décision 4) :"}
        </p>

        {/* 5 Choix */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {choices.map((c) => {
            const Icon = c.icon;
            const isSelected = selectedChoice === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedChoice(c.id)}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 16,
                  border: isSelected ? "2px solid var(--accent-warm, #B8623F)" : "1px solid var(--border, #E9E6E1)",
                  background: isSelected ? "rgba(184, 98, 63, 0.04)" : "var(--bg-primary, #FAFAF8)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: isSelected ? "var(--accent-warm, #B8623F)" : "rgba(26, 42, 58, 0.08)",
                    color: isSelected ? "#FFFFFF" : "var(--primary, #1A2A3A)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary, #1A2A3A)" }}>
                      {isRTL ? c.titleAr : c.titleFr}
                    </span>
                    {isSelected && <Check size={16} color="var(--accent-warm, #B8623F)" />}
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-secondary, #5C6B78)", margin: "3px 0 0 0", lineHeight: 1.4 }}>
                    {isRTL ? c.descAr : c.descFr}
                  </p>

                  {/* Sous-paramètres dynamiques */}
                  {isSelected && c.id === 1 && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 600 }}>{isRTL ? "الكمية الجديدة :" : "Quantité :"}</label>
                      <input
                        type="number"
                        min="1"
                        value={stockQty}
                        onChange={(e) => setStockQty(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{
                          width: 80,
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--border, #E9E6E1)",
                          fontSize: 13,
                        }}
                      />
                    </div>
                  )}

                  {isSelected && c.id === 3 && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <label style={{ fontSize: 12, fontWeight: 600 }}>{isRTL ? "مهلة الصنع (أيام) :" : "Délai (jours) :"}</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={leadTimeDays}
                        onChange={(e) => setLeadTimeDays(Math.max(1, parseInt(e.target.value) || 1))}
                        style={{
                          width: 80,
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid var(--border, #E9E6E1)",
                          fontSize: 13,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Boutons d'action */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
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
            {isRTL ? "إلغاء" : "Fermer"}
          </motion.button>
          <motion.button
            type="button"
            whileTap={shouldReduceMotion ? undefined : { scale: 0.97 }}
            onClick={handleConfirm}
            disabled={loading}
            style={{
              padding: "12px 22px",
              borderRadius: 14,
              border: "none",
              background: "var(--primary, #1A2A3A)",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(26, 42, 58, 0.25)",
            }}
          >
            {loading ? (isRTL ? "جاري التطبيق..." : "En cours...") : (isRTL ? "تأكيد الاختيار" : "Appliquer le choix")}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
