import React from "react";
import { motion } from "framer-motion";
import { Layers, Eye, Edit2, Package, Plus, Tag } from "lucide-react";
import type { ArtisanProduct } from "../types/artisanTypes";
import { useI18n } from "../services/i18n";

interface Props {
  products: ArtisanProduct[];
  onOpenCreateModal: () => void;
  onUpdateProduct: (productData: any) => Promise<void>;
}

export const ArtisanPostsView: React.FC<Props> = ({ products, onOpenCreateModal, onUpdateProduct }) => {
  const { t } = useI18n();

  const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    active:       { label: t("posts_status_active"),       className: "badge-success" },
    hidden:       { label: t("posts_status_hidden"),       className: "badge-info" },
    out_of_stock: { label: t("posts_status_out_of_stock"), className: "badge-urgent" },
  };

  const activePosts = products.filter(p => p.status === "active").length;
  const avgPrice = products.length > 0 ? Math.round(products.reduce((acc, p) => acc + p.price, 0) / products.length) : 0;

  return (
    <div className="app-view">
      <div className="pattern-corner pattern-top-right" />

      {/* Stats Row */}
      {products.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
          {[
            { icon: <Layers size={16} color="var(--primary)" />, label: t("posts_active"), value: activePosts },
            { icon: <Package size={16} color="var(--accent-warm)" />, label: t("posts_total"), value: products.length },
            { icon: <Tag size={16} color="var(--accent-emerald)" />, label: t("posts_avg_price"), value: `${avgPrice} ${t("currency_mad")}` },
          ].map(stat => (
            <div key={stat.label} className="artisan-card" style={{ padding: "12px 10px", textAlign: "center" }}>
              <div style={{ marginBottom: 4 }}>{stat.icon}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 800, color: "var(--primary)" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 9, color: "var(--text-secondary)", fontWeight: 600, marginTop: 1 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Section Header */}
      <div className="section-header">
        <div>
          <div className="section-title">{t("posts_title")}</div>
          <div className="section-subtitle">{products.length} {t("posts_subtitle")}</div>
        </div>
        <button
          className="btn-terracotta"
          onClick={onOpenCreateModal}
          style={{ width: "auto", padding: "9px 14px", fontSize: 12, borderRadius: 16 }}
        >
          <Plus size={15} /> {t("posts_new_btn")}
        </button>
      </div>

      {/* Posts List */}
      {products.length === 0 ? (
        <div className="artisan-card" style={{ padding: "48px 20px", textAlign: "center" }}>
          <Layers size={40} color="var(--text-placeholder)" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)" }}>{t("posts_empty_title")}</p>
          <p style={{ fontSize: 12, color: "var(--text-placeholder)", margin: "4px 0 16px" }}>{t("posts_empty_sub")}</p>
          <button className="btn-terracotta" onClick={onOpenCreateModal} style={{ width: "auto", padding: "11px 20px" }}>
            <Plus size={15} /> {t("posts_publish_first")}
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {products.map((product, i) => {
            const status = STATUS_CONFIG[product.status ?? "active"] ?? { label: product.status, className: "badge-info" };
            return (
              <motion.div
                key={product.id}
                className="artisan-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{ display: "flex", padding: 12, gap: 12, alignItems: "stretch" }}
              >
                {/* Thumbnail */}
                <div style={{ width: 80, height: 80, borderRadius: 14, overflow: "hidden", flexShrink: 0 }} className="artisan-photo-wrapper">
                  {product.image ? (
                    <img src={product.image} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div className="skeleton-box" style={{ width: "100%", height: "100%", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Package size={24} color="var(--text-placeholder)" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {product.title}
                    </div>
                    <span className={`badge ${status.className}`}>{status.label}</span>
                  </div>

                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, color: "var(--primary)" }}>
                      {product.price}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-secondary)", marginInlineStart: 4 }}>
                      {t("currency_mad")} {t("posts_price_net")}
                    </span>
                  </div>

                  {product.category && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                      <Tag size={10} color="var(--text-secondary)" />
                      <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{product.category}</span>
                      {product.manufacturingDays && (
                        <>
                          <span style={{ fontSize: 10, color: "var(--border)" }}>·</span>
                          <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                            {product.manufacturingDays} {t("posts_days_confection")}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-outline"
                      style={{ flex: 1, padding: "7px 10px", fontSize: 11, borderRadius: 12 }}
                      onClick={() => onUpdateProduct(product)}
                    >
                      <Edit2 size={12} /> {t("posts_edit_btn")}
                    </button>
                    <button
                      className="btn-outline"
                      style={{ flex: 1, padding: "7px 10px", fontSize: 11, borderRadius: 12, borderColor: product.status === "hidden" ? "rgba(45,106,79,0.4)" : "rgba(107,114,128,0.3)" }}
                      onClick={() => onUpdateProduct({ ...product, status: product.status === "hidden" ? "active" : "hidden" })}
                    >
                      <Eye size={12} /> {product.status === "hidden" ? t("posts_show_btn") : t("posts_hide_btn")}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
