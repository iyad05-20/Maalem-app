import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, MapPin, Clock, DollarSign, CheckCircle, Send, Tag } from "lucide-react";
import type { CustomOrderRequest } from "../types/artisanTypes";
import { useI18n } from "../services/i18n";

interface Props {
  customRequests: CustomOrderRequest[];
  onSubmitQuote: (requestId: string, price: number, days: number, note: string) => Promise<void>;
}

export const ArtisanMarketplaceView: React.FC<Props> = ({ customRequests, onSubmitQuote }) => {
  const { isRTL, t } = useI18n();
  const [category, setCategory] = useState("all");
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [quoteForm, setQuoteForm] = useState<{ price: string; days: string; note: string }>({ price: "", days: "", note: "" });
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);

  const CATEGORIES = [
    { id: "all", label: t("market_cat_all") },
    { id: "Cuivre", label: t("market_cat_cuivre") },
    { id: "Zellige", label: t("market_cat_zellige") },
    { id: "Tapis", label: t("market_cat_tapis") },
    { id: "Cuir", label: t("market_cat_cuir") },
    { id: "Bois", label: t("market_cat_bois") },
    { id: "Textile", label: t("market_cat_textile") },
    { id: "Céramique", label: t("market_cat_ceramique") },
  ];

  const filtered = customRequests.filter(r =>
    category === "all" || r.category === category
  );

  const handleSubmitQuote = async (requestId: string) => {
    const price = Number(quoteForm.price);
    const days = Number(quoteForm.days);
    if (!price || !days) return;
    setSubmittingId(requestId);
    try {
      await onSubmitQuote(requestId, price, days, quoteForm.note);
      setActiveQuoteId(null);
      setQuoteForm({ price: "", days: "", note: "" });
    } catch (e: any) { alert(e.message); }
    finally { setSubmittingId(null); }
  };

  return (
    <div className="app-view">
      <div className="pattern-corner pattern-top-right" />

      {/* Category Pills */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 14, scrollbarWidth: "none", marginBottom: 4 }}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} className={`pill-tab ${category === cat.id ? "active" : ""}`} onClick={() => setCategory(cat.id)}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Section Header */}
      <div className="section-header">
        <div>
          <div className="section-title">{t("market_title")}</div>
          <div className="section-subtitle">{filtered.length} {t("market_subtitle")}</div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="artisan-card" style={{ padding: "48px 20px", textAlign: "center" }}>
          <ShoppingBag size={38} color="var(--text-placeholder)" style={{ marginBottom: 10 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>{t("market_empty_title")}</p>
          <p style={{ fontSize: 12, color: "var(--text-placeholder)", marginTop: 4 }}>{t("market_empty_sub")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((req, i) => {
            const hasAlreadyQuoted = req.quotes?.some(q => q.artisanName);
            const isExpanded = activeQuoteId === req.id;

            return (
              <motion.div
                key={req.id}
                className="artisan-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{ overflow: "hidden" }}
              >
                {/* Card header row */}
                <div style={{ display: "flex", gap: 12, padding: 14, alignItems: "stretch" }}>
                  {/* Thumbnail */}
                  <div style={{ width: 72, height: 72, borderRadius: 14, overflow: "hidden", flexShrink: 0 }} className="artisan-photo-wrapper">
                    {req.image ? (
                      <img src={req.image} alt={req.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div className="skeleton-box" style={{ width: "100%", height: "100%", borderRadius: 0, background: "var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Tag size={20} color="var(--text-placeholder)" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--primary)", marginBottom: 4, lineHeight: 1.3 }}>
                      {req.title}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
                      <span className="badge badge-info"><Tag size={9} /> {req.category}</span>
                      {req.deliveryCity && (
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <MapPin size={10} color="var(--text-secondary)" />
                          <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{req.deliveryCity}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {req.budget && (
                        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <DollarSign size={10} color="var(--accent-warm)" />
                          <span style={{ fontSize: 10, color: "var(--accent-warm)", fontWeight: 700 }}>{t("market_budget")} : {req.budget} {t("currency_mad")}</span>
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <Clock size={10} color="var(--text-secondary)" />
                        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                        {new Date(req.createdAt).toLocaleDateString(isRTL ? "ar-MA" : "fr-FR", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {req.description && (
                  <div style={{ paddingInlineStart: 14, paddingInlineEnd: 14, paddingBottom: 10 }}>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                      {req.description}
                    </p>
                  </div>
                )}

                {/* Existing quotes count */}
                {req.quotes?.length > 0 && (
                  <div style={{ paddingInlineStart: 14, paddingInlineEnd: 14, paddingBottom: 10 }}>
                    <span className="badge badge-gold">
                      <CheckCircle size={9} /> {req.quotes.length} {t("market_quotes_count")}
                    </span>
                  </div>
                )}

                {/* Quote Form (expandable) */}
                {isExpanded ? (
                  <div style={{ borderTop: "1px solid var(--border)", padding: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div>
                        <label className="form-label">{t("market_quote_price")}</label>
                        <input
                          type="number" className="form-input" placeholder="1000" min={50}
                          value={quoteForm.price} onChange={e => setQuoteForm(p => ({ ...p, price: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="form-label">{t("market_quote_days")}</label>
                        <input
                          type="number" className="form-input" placeholder="7" min={1}
                          value={quoteForm.days} onChange={e => setQuoteForm(p => ({ ...p, days: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label className="form-label">{t("market_quote_note")}</label>
                      <textarea
                        className="form-input" rows={2} style={{ resize: "none" }}
                        placeholder={t("market_note_placeholder")}
                        value={quoteForm.note} onChange={e => setQuoteForm(p => ({ ...p, note: e.target.value }))}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-outline" style={{ flex: 1 }} onClick={() => setActiveQuoteId(null)}>{t("cancel")}</button>
                      <button className="btn-terracotta" style={{ flex: 2 }} onClick={() => handleSubmitQuote(req.id)} disabled={submittingId === req.id}>
                        <Send size={14} /> {submittingId === req.id ? t("loading") : t("market_submit_quote")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "10px 14px" }}>
                    <button
                      className={hasAlreadyQuoted ? "btn-outline" : "btn-primary"}
                      style={{ fontSize: 12, padding: "9px 14px" }}
                      onClick={() => setActiveQuoteId(req.id)}
                    >
                      <Send size={14} /> {hasAlreadyQuoted ? t("market_quote_edit") : t("market_propose_quote")}
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
