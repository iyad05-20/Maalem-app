import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Scale, FileText, CheckCircle2, ShieldAlert, Check, RefreshCw } from "lucide-react";
import type { DisputeDossier } from "../types/adminTypes";

interface DisputeWorkbenchModalProps {
  dispute: DisputeDossier;
  onClose: () => void;
  onResolve: (id: string, resolutionType: "refund_total" | "refund_partial" | "replacement" | "rejected", decisionText: string, amount?: number) => Promise<void>;
}

export const DisputeWorkbenchModal: React.FC<DisputeWorkbenchModalProps> = ({ 
  dispute, 
  onClose, 
  onResolve 
}) => {
  const [resolutionType, setResolutionType] = useState<"refund_total" | "refund_partial" | "replacement" | "rejected">("refund_total");
  const [decisionText, setDecisionText] = useState<string>("");
  const [partialAmount, setPartialAmount] = useState<number>(Math.round((dispute.order?.totalPrice || 0) * 0.5));
  const [submitting, setSubmitting] = useState(false);

  const order = dispute.order;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionText.trim()) return;
    setSubmitting(true);
    try {
      await onResolve(dispute.id, resolutionType, decisionText, resolutionType === "refund_partial" ? partialAmount : 0);
      onClose();
    } catch (e: any) {
      alert(e.message || "Erreur lors de l'enregistrement de la décision.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 15, 29, 0.85)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: 960,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid var(--border-gold)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(17, 24, 39, 0.8)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--accent-crimson-light)", border: "1px solid rgba(220,53,69,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Scale size={22} color="#F87171" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--text-main)", margin: 0 }}>
                  Dossier d'Arbitrage N° {dispute.id}
                </h3>
                <span className="badge badge-urgent">{dispute.type.replace(/_/g, " ")}</span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                Commande liée : <strong style={{ color: "var(--primary-gold)" }}>{dispute.orderId}</strong> · Montant : <strong style={{ color: "var(--text-main)" }}>{order?.totalPrice || 0} MAD</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-outline" style={{ padding: 8, borderRadius: 10 }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* Section 1 : Statut du Séquestre & Avertissement CGV */}
          <div style={{
            padding: 14,
            borderRadius: 12,
            background: dispute.escrowStatusAtDispute === "already_released" ? "var(--accent-amber-light)" : "var(--accent-emerald-light)",
            border: `1px solid ${dispute.escrowStatusAtDispute === "already_released" ? "rgba(212,175,55,0.3)" : "rgba(45,106,79,0.3)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: dispute.escrowStatusAtDispute === "already_released" ? "#FBBF24" : "#34D399" }}>
                📌 Statut des Fonds : {dispute.escrowStatusAtDispute === "already_released" ? "FONDS DÉJÀ LIBÉRÉS AU VENDEUR (Cas Art. 11.6)" : "SÉQUESTRE BLOQUÉ ACTIF (Art. 14 bis)"}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                {dispute.escrowStatusAtDispute === "already_released" 
                  ? "Un remboursement entraînera un ordre de recouvrement automatique sur les ventes futures du Maâlem + un avertissement formel."
                  : "Le montant est sécurisé sous séquestre. L'arbitrage peut exécuter un débit direct."}
              </p>
            </div>
          </div>

          {/* Section 2 : Comparatif des Signatures (Art. 11.2 vs 11.5) */}
          <div className="glass-card" style={{ padding: 16 }}>
            <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--primary-gold)", margin: "0 0 12px" }}>
              ✍️ Atelier de Comparaison des Signatures (Art. 11.2 vs Art. 11.5)
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Signature Checkout Client */}
              <div style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", margin: "0 0 6px" }}>1. Signature Électronique Checkout (Art. 11.2)</p>
                {order?.clientSignature ? (
                  <img src={order.clientSignature} alt="Signature Client" style={{ width: "100%", height: 90, objectFit: "contain", background: "#FFF", borderRadius: 8, border: "1px solid #CCC" }} />
                ) : (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>Pas de signature enregistrée</p>
                )}
              </div>

              {/* Signature Manuscrite Livraison */}
              <div style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 10, border: "1px solid var(--border-color)" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", margin: "0 0 6px" }}>2. Reçu Signé à la Livraison (Art. 11.5)</p>
                {order?.vendeurDeliverySignaturePhoto ? (
                  <img src={order.vendeurDeliverySignaturePhoto} alt="Reçu Signé" style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 8 }} />
                ) : (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>Photo de reçu non transmise</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3 : Preuves Contradictoires (Photos Client vs Photos Maâlem) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Preuves Client */}
            <div className="glass-card" style={{ padding: 16 }}>
              <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#F87171", margin: "0 0 8px" }}>
                📸 Preuves & Motif du Client
              </h4>
              <p style={{ fontSize: 12, color: "var(--text-main)", lineHeight: 1.4, margin: "0 0 10px" }}>{dispute.reason}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {dispute.clientEvidencePhotos.map((img, i) => (
                  <img key={i} src={img} alt="Preuve client" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border-color)" }} />
                ))}
              </div>
            </div>

            {/* Preuves Maâlem */}
            <div className="glass-card" style={{ padding: 16 }}>
              <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#34D399", margin: "0 0 8px" }}>
                📸 4 Photos de Préparation & Réponse Maâlem
              </h4>
              <p style={{ fontSize: 12, color: "var(--text-main)", lineHeight: 1.4, margin: "0 0 10px" }}>{dispute.artisanResponse || "Pas de réponse écrite soumise."}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(order?.prepPhotos && order.prepPhotos.length > 0 ? order.prepPhotos : dispute.artisanEvidencePhotos).map((img, i) => (
                  <img key={i} src={img} alt="Preuve artisan" style={{ width: 70, height: 70, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border-color)" }} />
                ))}
              </div>
            </div>
          </div>

          {/* Section 4 : Formulaire de Décision d'Arbitrage Officiel (Art. 20.5) */}
          <form onSubmit={handleSubmit} className="glass-card" style={{ padding: 20, border: "1px solid var(--border-gold)" }}>
            <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--primary-gold)", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={18} /> Formulaire de Décision d'Arbitrage Officiel Vork (Art. 20.5)
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, border: resolutionType === "refund_total" ? "2px solid #F87171" : "1px solid var(--border-color)", background: resolutionType === "refund_total" ? "var(--accent-crimson-light)" : "transparent", cursor: "pointer" }}>
                <input type="radio" name="resType" checked={resolutionType === "refund_total"} onChange={() => setResolutionType("refund_total")} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: "#F87171" }}>Remboursement Total (100%)</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>Débit séquestre / Recouvrement Vendeur</p>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, border: resolutionType === "refund_partial" ? "2px solid #FBBF24" : "1px solid var(--border-color)", background: resolutionType === "refund_partial" ? "var(--accent-amber-light)" : "transparent", cursor: "pointer" }}>
                <input type="radio" name="resType" checked={resolutionType === "refund_partial"} onChange={() => setResolutionType("refund_partial")} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: "#FBBF24" }}>Remboursement Partiel (Négocié)</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>Geste commercial partagé</p>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, border: resolutionType === "replacement" ? "2px solid #60A5FA" : "1px solid var(--border-color)", background: resolutionType === "replacement" ? "rgba(59, 130, 246, 0.15)" : "transparent", cursor: "pointer" }}>
                <input type="radio" name="resType" checked={resolutionType === "replacement"} onChange={() => setResolutionType("replacement")} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: "#60A5FA" }}>Remplacement par l'Artisan</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>Engagement de réfection de la pièce</p>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, border: resolutionType === "rejected" ? "2px solid #34D399" : "1px solid var(--border-color)", background: resolutionType === "rejected" ? "var(--accent-emerald-light)" : "transparent", cursor: "pointer" }}>
                <input type="radio" name="resType" checked={resolutionType === "rejected"} onChange={() => setResolutionType("rejected")} />
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, margin: 0, color: "#34D399" }}>Rejet Motivé de la Réclamation</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>Libération immédiate des fonds au Maâlem</p>
                </div>
              </label>
            </div>

            {resolutionType === "refund_partial" && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Montant à rembourser au Client (MAD)</label>
                <input type="number" value={partialAmount} onChange={(e) => setPartialAmount(Number(e.target.value))} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-main)", fontSize: 13 }} />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>
                Motivation Juridique Officielle du Rapport d'Arbitrage (Art. 20.5) *
              </label>
              <textarea
                required
                rows={3}
                value={decisionText}
                onChange={(e) => setDecisionText(e.target.value)}
                placeholder="Rédigez la motivation claire qui sera notifiée par e-mail et In-App au Client et à l'Artisan..."
                style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-main)", fontSize: 12, fontFamily: "var(--font-body)" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={onClose} className="btn-outline">Annuler</button>
              <button type="submit" disabled={submitting || !decisionText.trim()} className="btn-gold">
                {submitting ? <RefreshCw size={16} className="spin" /> : <Check size={16} />}
                <span>Rendre la Décision d'Arbitrage (Art. 20.5)</span>
              </button>
            </div>
          </form>

        </div>
      </motion.div>
    </motion.div>
  );
};
