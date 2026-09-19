import React, { useState } from "react";
import { Wallet, CheckCircle2, XCircle, ArrowUpRight, DollarSign, Building } from "lucide-react";
import type { WithdrawalRequest, LedgerEntry } from "../types/adminTypes";

interface EscrowLedgerViewProps {
  withdrawals: WithdrawalRequest[];
  ledger: LedgerEntry[];
  onProcessWithdrawal: (id: string, status: "processed" | "rejected") => Promise<void>;
}

export const EscrowLedgerView: React.FC<EscrowLedgerViewProps> = ({ 
  withdrawals, 
  ledger, 
  onProcessWithdrawal 
}) => {
  const [activeTab, setActiveTab] = useState<"withdrawals" | "ledger">("withdrawals");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleProcess = async (id: string, status: "processed" | "rejected") => {
    setProcessingId(id);
    try {
      await onProcessWithdrawal(id, status);
    } catch (e: any) {
      alert(e.message || "Erreur lors du traitement.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      
      {/* Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Wallet color="var(--primary-gold)" /> 💰 Séquestre Financier & Retraits Bancaires (Art. 14 bis)
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Traçabilité du grand livre comptable et validation des demandes de virements des Maâlems.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: 6, background: "rgba(0,0,0,0.3)", padding: 4, borderRadius: 12, border: "1px solid var(--border-color)" }}>
          <button
            onClick={() => setActiveTab("withdrawals")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: activeTab === "withdrawals" ? "var(--primary-gold)" : "transparent",
              color: activeTab === "withdrawals" ? "#FFF" : "var(--text-muted)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Demandes de Virement ({withdrawals.filter(w => w.status === "pending").length})
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: activeTab === "ledger" ? "var(--primary-gold)" : "transparent",
              color: activeTab === "ledger" ? "#FFF" : "var(--text-muted)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Grand Livre Escrow (Ledger)
          </button>
        </div>
      </div>

      {activeTab === "withdrawals" ? (
        <div className="glass-panel" style={{ padding: 20 }}>
          <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--primary-gold)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <Building size={18} /> Demandes de Virements Bancaires des Artisans (RIB Marocain)
          </h4>

          <table className="data-table">
            <thead>
              <tr>
                <th>Réf. Demande</th>
                <th>Artisan / Utilisateur</th>
                <th>Montant</th>
                <th>RIB Bancaire (24 ch)</th>
                <th>Date Demande</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.length > 0 ? (
                withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--primary-gold)" }}>{w.id}</td>
                    <td>{w.userId}</td>
                    <td style={{ fontWeight: 800, fontSize: 14, color: "#34D399" }}>{w.amount} MAD</td>
                    <td><code style={{ fontSize: 11, background: "rgba(0,0,0,0.3)", padding: "2px 6px", borderRadius: 4 }}>{w.rib}</code></td>
                    <td>{new Date(w.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td>
                      <span className={`badge ${w.status === "processed" ? "badge-success" : w.status === "rejected" ? "badge-urgent" : "badge-warning"}`}>
                        {w.status}
                      </span>
                    </td>
                    <td>
                      {w.status === "pending" ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => handleProcess(w.id, "processed")}
                            disabled={processingId === w.id}
                            className="btn-success"
                            style={{ padding: "4px 8px", fontSize: 10 }}
                          >
                            <CheckCircle2 size={12} /> Valider Virement
                          </button>
                          <button
                            onClick={() => handleProcess(w.id, "rejected")}
                            disabled={processingId === w.id}
                            className="btn-danger"
                            style={{ padding: "4px 8px", fontSize: 10 }}
                          >
                            <XCircle size={12} /> Rejeter
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Traité le {w.processedAt ? new Date(w.processedAt).toLocaleDateString("fr-FR") : "-"}</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
                    Aucune demande de virement bancaire enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: 20 }}>
          <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--primary-gold)", margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <DollarSign size={18} /> Grand Livre Comptable des Mouvements du Séquestre
          </h4>

          <table className="data-table">
            <thead>
              <tr>
                <th>Réf. Écriture</th>
                <th>Commande</th>
                <th>Compte Débit</th>
                <th>Compte Crédit</th>
                <th>Montant</th>
                <th>Type de Mouvement</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length > 0 ? (
                ledger.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--primary-gold)" }}>{l.id}</td>
                    <td>{l.orderId || "-"}</td>
                    <td style={{ fontSize: 11, color: "#F87171" }}>{l.compteDebit}</td>
                    <td style={{ fontSize: 11, color: "#34D399" }}>{l.compteCredit}</td>
                    <td style={{ fontWeight: 800, fontSize: 13 }}>{l.montant} MAD</td>
                    <td><span className="badge badge-info">{l.type}</span></td>
                    <td>{new Date(l.createdAt).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
                    Aucun mouvement comptable répertorié.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};
