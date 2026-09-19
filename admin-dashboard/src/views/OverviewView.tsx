import React from "react";
import { motion } from "framer-motion";
import { 
  DollarSign, 
  Scale, 
  ShieldAlert, 
  Wallet, 
  TrendingUp, 
  ArrowUpRight, 
  Clock, 
  AlertTriangle,
  Award
} from "lucide-react";
import type { AdminStats, DisputeDossier, VendorProfile } from "../types/adminTypes";

interface OverviewViewProps {
  stats: AdminStats | null;
  disputes: DisputeDossier[];
  vendors: VendorProfile[];
  onNavigateTab: (tab: any) => void;
  onOpenDispute: (d: DisputeDossier) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ 
  stats, 
  disputes, 
  vendors, 
  onNavigateTab,
  onOpenDispute
}) => {
  const openDisputes = disputes.filter(d => ["en_arbitrage_admin", "en_attente_artisan"].includes(d.status));
  const warnedVendors = vendors.filter(v => v.warningCountCurrentMonth >= 2);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      
      {/* Top Banner Alert */}
      {openDisputes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "16px 20px",
            borderRadius: 16,
            background: "var(--accent-crimson-light)",
            border: "1px solid rgba(220, 53, 69, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#DC3545", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Scale size={20} color="#FFFFFF" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: "#F87171", fontFamily: "var(--font-display)" }}>
                ⚠️ {openDisputes.length} Dossier(s) de Litige(s) sous 48h nécessitent votre Arbitrage !
              </p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                Conformément à l'Art. 20 des CGV, la plateforme Vork doit trancher sous 48h ouvrées.
              </p>
            </div>
          </div>
          <button onClick={() => onNavigateTab("disputes")} className="btn-danger">
            Résoudre Maintenant
          </button>
        </motion.div>
      )}

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {/* Card 1 : GMV */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Volume Transactionnel</span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--primary-gold-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={18} color="var(--primary-gold)" />
            </div>
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: "var(--text-main)", margin: "0 0 4px" }}>
            {stats?.totalGmv || 0} MAD
          </h3>
          <p style={{ fontSize: 11, color: "var(--accent-emerald)", margin: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <TrendingUp size={12} /> {stats?.totalOrdersCount || 0} commande(s) enregistrée(s)
          </p>
        </div>

        {/* Card 2 : Séquestre Bloqué */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Séquestre Actif (Escrow)</span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--accent-emerald-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Wallet size={18} color="#34D399" />
            </div>
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: "#34D399", margin: "0 0 4px" }}>
            {stats?.lockedEscrowAmount || 0} MAD
          </h3>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
            Fonds protégés jusqu'à livraison & rétractation
          </p>
        </div>

        {/* Card 3 : Commissions Vork */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Commissions Vork (10%)</span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--accent-amber-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Award size={18} color="#FBBF24" />
            </div>
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: "#FBBF24", margin: "0 0 4px" }}>
            {stats?.platformCommissionEstimate || 0} MAD
          </h3>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
            Chiffre d'affaires estimé Vork
          </p>
        </div>

        {/* Card 4 : Litiges en Cours */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Dossiers de Litiges</span>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "var(--accent-crimson-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Scale size={18} color="#F87171" />
            </div>
          </div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: openDisputes.length > 0 ? "#F87171" : "var(--text-main)", margin: "0 0 4px" }}>
            {openDisputes.length}
          </h3>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
            {stats?.pendingWithdrawalsCount || 0} demande(s) de retrait en attente
          </p>
        </div>
      </div>

      {/* Main Section Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: 20 }}>
        
        {/* Left Column : Urgent Disputes Table */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--text-main)", margin: 0 }}>
                ⚖️ Litiges Ouverts Nécessitant Instruction (Art. 20)
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
                Non-réception, Vices cachés 3 mois & non-conformités
              </p>
            </div>
            <button onClick={() => onNavigateTab("disputes")} className="btn-outline" style={{ fontSize: 11, padding: "6px 12px" }}>
              Voir Tout <ArrowUpRight size={12} />
            </button>
          </div>

          {openDisputes.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° Dossier</th>
                  <th>Type de Litige</th>
                  <th>Client</th>
                  <th>Montant</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {openDisputes.slice(0, 5).map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--primary-gold)" }}>{d.id}</td>
                    <td><span className="badge badge-urgent">{d.type.replace(/_/g, " ")}</span></td>
                    <td>{d.claimantRef}</td>
                    <td style={{ fontWeight: 700 }}>{d.order?.totalPrice || 0} MAD</td>
                    <td>
                      <button onClick={() => onOpenDispute(d)} className="btn-gold" style={{ padding: "4px 10px", fontSize: 11 }}>
                        Instruire (48h)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Scale size={32} color="var(--text-muted)" style={{ opacity: 0.4, marginBottom: 8 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)", margin: 0 }}>Aucun litige en attente d'arbitrage</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Toutes les commandes se déroulent conformément aux CGV.</p>
            </div>
          )}
        </div>

        {/* Right Column : Maâlems Health Summary & Alerts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Card 1 : Vendors Health */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--text-main)", margin: 0 }}>
                🛡️ Santé des Boutiques Maâlems
              </h3>
              <button onClick={() => onNavigateTab("vendors")} className="btn-outline" style={{ fontSize: 11, padding: "4px 10px" }}>
                Gérer
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {vendors.slice(0, 4).map((v) => (
                <div key={v.id} style={{
                  padding: 12,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: 0, fontFamily: "var(--font-display)" }}>{v.id}</p>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>
                      Avertissements : <strong style={{ color: v.warningCountCurrentMonth >= 5 ? "#F87171" : "#FBBF24" }}>{v.warningCountCurrentMonth}/10</strong> ce mois-ci
                    </p>
                  </div>
                  <span className={`badge ${v.suspensionStatus === "active" ? "badge-success" : "badge-urgent"}`}>
                    {v.suspensionStatus}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2 : Quick Cron Jobs Trigger */}
          <div className="glass-panel" style={{ padding: 20 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--primary-gold)", margin: "0 0 6px" }}>
              ⏰ Moteur de Cron Jobs CGV
            </h3>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 12px" }}>
              Déclencheur rapide des automatisations des délais légaux
            </p>
            <button onClick={() => onNavigateTab("cron")} className="btn-gold" style={{ width: "100%", justifyContent: "center" }}>
              Accéder au Panneau de Monitoring Cron
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
