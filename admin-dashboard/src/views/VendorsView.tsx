import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, AlertTriangle, CheckCircle2, Lock, Unlock, Plus } from "lucide-react";
import type { VendorProfile, VendorWarning } from "../types/adminTypes";

interface VendorsViewProps {
  profiles: VendorProfile[];
  warnings: VendorWarning[];
  onIssueWarning: (vendorId: string, reason: string, orderId?: string) => Promise<void>;
  onUpdateStatus: (vendorId: string, status: string) => Promise<void>;
}

export const VendorsView: React.FC<VendorsViewProps> = ({ 
  profiles, 
  warnings, 
  onIssueWarning, 
  onUpdateStatus 
}) => {
  const [selectedVendorId, setSelectedVendorId] = useState<string>("artisan-1");
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningReason, setWarningReason] = useState("");
  const [warningOrderId, setWarningOrderId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleIssueWarningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningReason.trim()) return;
    setSubmitting(true);
    try {
      await onIssueWarning(selectedVendorId, warningReason, warningOrderId || undefined);
      setShowWarningModal(false);
      setWarningReason("");
      setWarningOrderId("");
    } catch (e: any) {
      alert(e.message || "Erreur émission avertissement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldAlert color="var(--primary-gold)" /> 🛡️ Modération & Santé des Boutiques Maâlems (Art. 6.4, 19, 22)
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Compteur d'avertissements mensuel (Max 10/mois) et gestion des suspensions automatiques et manuelles.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20 }}>
        
        {/* Left Column : Vendor Profiles Table */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--primary-gold)", margin: "0 0 14px" }}>
            Boutiques Enregistrées sur la Plateforme
          </h4>

          <table className="data-table">
            <thead>
              <tr>
                <th>Boutique / Maâlem</th>
                <th>Avertissements (Mois)</th>
                <th>Statut CGV</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const isHighWarning = p.warningCountCurrentMonth >= 5;

                return (
                  <tr key={p.id}>
                    <td>
                      <p style={{ fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text-main)", margin: 0 }}>{p.id}</p>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>Maâlem Artisan Qualifié</p>
                    </td>
                    <td>
                      <span style={{ 
                        fontFamily: "var(--font-display)", 
                        fontWeight: 800, 
                        fontSize: 14, 
                        color: isHighWarning ? "#F87171" : "#FBBF24" 
                      }}>
                        {p.warningCountCurrentMonth} / 10
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.suspensionStatus === "active" ? "badge-success" : "badge-urgent"}`}>
                        {p.suspensionStatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => {
                            setSelectedVendorId(p.id);
                            setShowWarningModal(true);
                          }}
                          className="btn-outline"
                          style={{ padding: "4px 8px", fontSize: 10 }}
                        >
                          <Plus size={12} /> Avertissement
                        </button>

                        {p.suspensionStatus === "active" ? (
                          <button
                            onClick={() => onUpdateStatus(p.id, "suspended_7d")}
                            className="btn-danger"
                            style={{ padding: "4px 8px", fontSize: 10 }}
                          >
                            <Lock size={12} /> Suspendre 7j
                          </button>
                        ) : (
                          <button
                            onClick={() => onUpdateStatus(p.id, "active")}
                            className="btn-success"
                            style={{ padding: "4px 8px", fontSize: 10 }}
                          >
                            <Unlock size={12} /> Réactiver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right Column : Warnings History */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "#FBBF24", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={18} /> Journal des Avertissements Formels Émis
          </h4>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto" }}>
            {warnings.length > 0 ? (
              warnings.map((w) => (
                <div key={w.id} style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-color)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary-gold)", fontFamily: "var(--font-display)" }}>{w.vendorRef}</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{new Date(w.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-main)", margin: "0 0 4px", lineHeight: 1.4 }}>"{w.reason}"</p>
                  {w.orderId && <span style={{ fontSize: 9, color: "var(--text-muted)", background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: 4 }}>Commande : {w.orderId}</span>}
                </div>
              ))
            ) : (
              <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: 20 }}>
                Aucun avertissement émis pour le moment.
              </p>
            )}
          </div>
        </div>

      </div>

      {/* Warning Issue Modal */}
      {showWarningModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,15,29,0.8)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: 20 }}>
          <form onSubmit={handleIssueWarningSubmit} className="glass-panel" style={{ width: "100%", maxWidth: 500, padding: 24, border: "1px solid var(--border-gold)" }}>
            <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--primary-gold)", margin: "0 0 12px" }}>
              ⚠️ Émettre un Avertissement Formel CGV (Art. 19)
            </h4>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 14px" }}>
              Boutique ciblée : <strong style={{ color: "var(--text-main)" }}>{selectedVendorId}</strong>
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>N° de commande liée (optionnel)</label>
              <input type="text" value={warningOrderId} onChange={(e) => setWarningOrderId(e.target.value)} placeholder="ex: 541179ee-..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-main)", fontSize: 12 }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Motif Réglementaire de l'Avertissement (CGV Art. 6.4 / 19) *</label>
              <select value={warningReason} onChange={(e) => setWarningReason(e.target.value)} required style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-main)", fontSize: 12, marginBottom: 8 }}>
                <option value="">Sélectionner un motif prédéfini...</option>
                <option value="Refus abusif de commande ou absence d'acceptation dans le délai de 72h (Art. 6.4)">Refus abusif de commande (&gt;72h)</option>
                <option value="Retard de livraison non justifié supérieur à 5 jours ouvrés">Retard de livraison &gt; 5 jours</option>
                <option value="Colis non conforme par rapport aux spécifications du devis">Non-conformité du produit</option>
                <option value="Absence de transmission de la preuve de signature manuscrite à la livraison">Manque preuve de signature</option>
              </select>
              <textarea rows={2} value={warningReason} onChange={(e) => setWarningReason(e.target.value)} placeholder="Ou précisez le motif personnalisé..." style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-main)", fontSize: 12 }} />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setShowWarningModal(false)} className="btn-outline">Annuler</button>
              <button type="submit" disabled={submitting || !warningReason.trim()} className="btn-gold">
                Émettre l'Avertissement Formel
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
