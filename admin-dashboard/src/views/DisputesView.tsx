import React, { useState } from "react";
import { motion } from "framer-motion";
import { Scale, Filter, Eye, CheckCircle2, ShieldAlert, Clock, FileText, Search } from "lucide-react";
import type { DisputeDossier } from "../types/adminTypes";

interface DisputesViewProps {
  disputes: DisputeDossier[];
  onOpenWorkbench: (dispute: DisputeDossier) => void;
}

export const DisputesView: React.FC<DisputesViewProps> = ({ disputes, onOpenWorkbench }) => {
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredDisputes = disputes.filter((d) => {
    if (filterType !== "all" && d.type !== filterType) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      return d.id.toLowerCase().includes(term) || d.orderId.toLowerCase().includes(term) || d.reason.toLowerCase().includes(term);
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "en_arbitrage_admin":
        return <span className="badge badge-urgent">En Arbitrage (48h)</span>;
      case "en_attente_artisan":
        return <span className="badge badge-warning">En Attente Artisan</span>;
      case "resolu_remboursement_total":
        return <span className="badge badge-success">Remboursé 100%</span>;
      case "resolu_remboursement_partiel":
        return <span className="badge badge-warning">Remboursé Partiel</span>;
      case "resolu_remplacement":
        return <span className="badge badge-info">Remplacement Accordé</span>;
      case "rejete":
        return <span className="badge badge-info">Rejet Motivé</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      
      {/* View Title & Description */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Scale color="var(--primary-gold)" /> ⚖️ Module Central de Médiation & Arbitrage des Litiges (Art. 20)
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Instructions contradictoires sous 48h (Non-réception, Vices cachés 3 mois, non-conformité au devis).
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: 12, top: 10 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° dossier, N° commande, motif..."
            style={{ width: "100%", padding: "8px 12px 8px 36px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-main)", fontSize: 12 }}
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-main)", fontSize: 12 }}
        >
          <option value="all">Tous les types de litiges</option>
          <option value="non_reception">Non-Réception & Contestation Signature (Art. 11.6)</option>
          <option value="vice_cache_3mois">Garantie Vices Cachés (3 mois - Art. 12.5)</option>
          <option value="non_conformite">Non-Conformité au Devis Sur-Mesure (Art. 12)</option>
          <option value="retractation_bloquee">Forclusion / Blocage Rétractation 7j</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-main)", fontSize: 12 }}
        >
          <option value="all">Tous les statuts</option>
          <option value="en_arbitrage_admin">En Arbitrage Admin (Action requise)</option>
          <option value="en_attente_artisan">En Attente Réponse Artisan</option>
          <option value="resolu_remboursement_total">Résolus (Remboursés 100%)</option>
          <option value="rejete">Résolus (Rejetés)</option>
        </select>
      </div>

      {/* Disputes Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: 16 }}>
        {filteredDisputes.length > 0 ? (
          filteredDisputes.map((d) => {
            const isPending = ["en_arbitrage_admin", "en_attente_artisan"].includes(d.status);

            return (
              <motion.div
                key={d.id}
                whileHover={{ y: -2 }}
                className="glass-card"
                style={{
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  border: isPending ? "1px solid var(--border-gold)" : "1px solid var(--border-color)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Dossier Litige</span>
                      <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--primary-gold)", margin: 0 }}>
                        {d.id}
                      </h4>
                    </div>
                    {getStatusBadge(d.status)}
                  </div>

                  <div style={{ background: "rgba(0,0,0,0.2)", padding: 10, borderRadius: 10, marginBottom: 12, border: "1px solid var(--border-color)" }}>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 4px" }}>
                      Commande : <strong style={{ color: "var(--text-main)" }}>{d.orderId}</strong> · Type : <span style={{ color: "var(--primary-gold)", fontWeight: 600 }}>{d.type}</span>
                    </p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                      Montant Engagé : <strong style={{ color: "var(--text-main)" }}>{d.order?.totalPrice || 0} MAD</strong> · Statut Séquestre : <span style={{ color: d.escrowStatusAtDispute === "already_released" ? "#FBBF24" : "#34D399", fontWeight: 700 }}>{d.escrowStatusAtDispute}</span>
                    </p>
                  </div>

                  <p style={{ fontSize: 12, color: "var(--text-main)", lineHeight: 1.45, margin: "0 0 14px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    "{d.reason}"
                  </p>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    Ouvert le : {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                  </span>
                  <button onClick={() => onOpenWorkbench(d)} className="btn-gold" style={{ padding: "6px 14px", fontSize: 11 }}>
                    <Eye size={14} /> {isPending ? "Ouvrir l'Atelier d'Arbitrage" : "Consulter le Rapport"}
                  </button>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="glass-panel" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px" }}>
            <Scale size={40} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: 12 }} />
            <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--text-main)", margin: "0 0 4px" }}>
              Aucun dossier correspondant trouvé
            </h4>
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
              Modifiez vos filtres de recherche pour afficher les dossiers.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
