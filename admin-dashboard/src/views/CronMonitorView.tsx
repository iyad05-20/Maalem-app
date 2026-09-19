import React, { useState } from "react";
import { Clock, Play, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import type { CronExecution } from "../types/adminTypes";

interface CronMonitorViewProps {
  executions: CronExecution[];
  onTriggerCron: (jobName: string) => Promise<void>;
}

export const CronMonitorView: React.FC<CronMonitorViewProps> = ({ executions, onTriggerCron }) => {
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const handleTrigger = async (jobName: string) => {
    setRunningJob(jobName);
    try {
      await onTriggerCron(jobName);
    } catch (e: any) {
      alert(e.message || "Erreur exécution Cron Job.");
    } finally {
      setRunningJob(null);
    }
  };

  const cronJobs = [
    { id: "relance-j2", title: "Job 1 : Relance Artisan J+2 (10h00)", desc: "Envoie la relance J+2 et annule si >72h sans réponse (Art. 14.6)" },
    { id: "auto-validation", title: "Job 2 : Auto-Validation Réceptions 24h", desc: "Auto-valide à minuit les commandes livrées sans réclamation (Art. 13.3 C)" },
    { id: "release-escrow", title: "Job 3 : Libération Séquestre J+7", desc: "Débloque l'escrow vers l'artisan après les 7 jours de rétractation (Art. 14 bis.4)" },
    { id: "expire-returns", title: "Job 4 : Forclusion Retours 17 jours", desc: "Clôture les demandes de retour sans dépôt sous 10+7 jours (Art. 13.5)" },
    { id: "reset-warnings", title: "Job 5 : Reset Mensuel Avertissements", desc: "Remet à 0 les compteurs mensuels et lève les suspensions expirées (Art. 6.4)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      
      {/* Title */}
      <div>
        <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
          <Clock color="var(--primary-gold)" /> ⏰ Monitoring du Moteur de Cron Jobs CGV
        </h3>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
          Supervision en direct et déclencheur forcé manuel des 5 tâches planifiées de gestion des délais légaux.
        </p>
      </div>

      {/* Manual Trigger Buttons Grid */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--primary-gold)", margin: 0 }}>
            Déclenchement Manuel Réseau à la Demande
          </h4>
          <button
            onClick={() => handleTrigger("run-all")}
            disabled={runningJob !== null}
            className="btn-gold"
          >
            {runningJob === "run-all" ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
            <span>🚀 Exécuter les 5 Jobs Simultanément</span>
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {cronJobs.map((job) => (
            <div key={job.id} className="glass-card" style={{ padding: 14, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text-main)", margin: "0 0 4px" }}>{job.title}</p>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.4 }}>{job.desc}</p>
              </div>
              <button
                onClick={() => handleTrigger(job.id)}
                disabled={runningJob !== null}
                className="btn-outline"
                style={{ width: "100%", justifyContent: "center", fontSize: 11 }}
              >
                {runningJob === job.id ? <RefreshCw size={12} className="spin" /> : <Play size={12} />}
                <span>Exécuter Mainteant</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Executions Audit Log Table */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--text-main)", margin: "0 0 14px" }}>
          Journal d'Audit des Dernières Exécutions
        </h4>

        <table className="data-table">
          <thead>
            <tr>
              <th>Réf. Exécution</th>
              <th>Nom du Job</th>
              <th>Statut</th>
              <th>Éléments Traités</th>
              <th>Horodatage</th>
            </tr>
          </thead>
          <tbody>
            {executions.length > 0 ? (
              executions.map((e) => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--primary-gold)" }}>{e.id}</td>
                  <td><span className="badge badge-info">{e.jobName}</span></td>
                  <td>
                    <span className={`badge ${e.status === "success" ? "badge-success" : "badge-urgent"}`}>
                      {e.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{e.itemsProcessed} commande(s)</td>
                  <td>{new Date(e.executedAt).toLocaleString("fr-FR")}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 30, color: "var(--text-muted)" }}>
                  Aucune exécution enregistrée pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
