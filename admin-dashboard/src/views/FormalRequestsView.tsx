import React, { useState } from "react";
import { motion } from "framer-motion";
import { Scale, Clock, CheckCircle2, AlertCircle, FileText, Send, Image, MessageSquare, Search } from "lucide-react";
import { adminAPI } from "../services/adminApi";

interface FormalRequestItem {
  id: string;
  orderId: string;
  initiatorType: "client" | "artisan";
  initiatorId: string;
  respondentId: string;
  category: string;
  description: string;
  evidenceUrls: string[];
  status: "en_attente_reponse" | "repondue" | "escaladee_admin" | "observee_admin" | "clos_amiable";
  deadlineRespondentAt: string;
  responseDescription?: string;
  responseEvidenceUrls?: string[];
  respondedAt?: string;
  adminNotes?: string;
  createdAt: string;
  order?: any;
}

interface FormalRequestsViewProps {
  requests: FormalRequestItem[];
  onRefresh: () => void;
}

export const FormalRequestsView: React.FC<FormalRequestsViewProps> = ({ requests, onRefresh }) => {
  const [selectedReq, setSelectedReq] = useState<FormalRequestItem | null>(null);
  const [observationNotes, setObservationNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filtered = requests.filter((r) => {
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      return (
        r.id.toLowerCase().includes(term) ||
        r.orderId.toLowerCase().includes(term) ||
        r.category.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "escaladee_admin":
        return <span className="badge badge-urgent">⚠️ Escaladée Vork (Observation requise)</span>;
      case "observee_admin":
        return <span className="badge badge-success">✓ Avis Vork Enregistré</span>;
      case "repondue":
        return <span className="badge badge-info">Répondue par l'autre partie</span>;
      case "en_attente_reponse":
        return <span className="badge badge-warning">En attente réponse (48h)</span>;
      case "clos_amiable":
        return <span className="badge badge-success">Accord Amiable Trouvé</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  const handleSaveObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !observationNotes.trim()) return;

    setSubmitting(true);
    try {
      await adminAPI.submitFormalRequestObservation(selectedReq.id, observationNotes);
      alert("Observation de médiation Vork enregistrée avec succès.");
      setObservationNotes("");
      setSelectedReq(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <FileText color="#B8623F" /> 📜 Supervision des Demandes Formelles & Médiation Amiable
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "4px 0 0" }}>
            Module de supervision des différends directs (délai 48h) et émission d'observations neutres de Vork (sans arbitrage forcé).
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
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

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-main)", fontSize: 12 }}
        >
          <option value="all">Tous les statuts ({requests.length})</option>
          <option value="escaladee_admin">⚠️ Escaladées pour observation Vork</option>
          <option value="observee_admin">✓ Observées par Vork</option>
          <option value="repondue">Répondues</option>
          <option value="en_attente_reponse">En attente (délai 48h)</option>
        </select>
      </div>

      {/* Table of Requests */}
      <div className="glass-panel" style={{ overflowX: "auto" }}>
        <table className="admin-table" style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-color)", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase" }}>
              <th style={{ padding: "12px 16px" }}>Dossier & Commande</th>
              <th style={{ padding: "12px 16px" }}>Initiateur</th>
              <th style={{ padding: "12px 16px" }}>Catégorie de Problème</th>
              <th style={{ padding: "12px 16px" }}>Statut</th>
              <th style={{ padding: "12px 16px" }}>Délai 48h</th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  Aucune demande formelle trouvée.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const deadline = new Date(r.deadlineRespondentAt);
                const isOverdue = new Date() > deadline && r.status === "en_attente_reponse";
                return (
                  <tr key={r.id} style={{ borderBottom: "1px solid var(--border-color)", fontSize: 13 }}>
                    <td style={{ padding: "12px 16px" }}>
                      <strong style={{ color: "var(--text-main)", display: "block" }}>{r.id}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Cmd: {r.orderId}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{r.initiatorType}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block" }}>{r.initiatorId}</span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ color: "var(--text-main)", fontWeight: 600 }}>
                        {r.category.replace(/^autre:/, "Autre: ")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{getStatusBadge(r.status)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12 }}>
                      {isOverdue ? (
                        <span style={{ color: "#DC3545", fontWeight: 700 }}>Expiré (+48h sans réponse)</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>
                          {deadline.toLocaleDateString()} {deadline.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => setSelectedReq(r)}
                        className="btn-outline-gold"
                        style={{ padding: "6px 12px", fontSize: 12, borderRadius: 8, cursor: "pointer" }}
                      >
                        Examiner & Observer
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal d'examen et d'émission d'avis */}
      {selectedReq && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: "#182230",
              border: "1px solid var(--border-color)",
              borderRadius: 20,
              width: "100%",
              maxWidth: 680,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              color: "#FFFFFF",
            }}
          >
            {/* Header Modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                  Dossier de Demande Formelle {selectedReq.id}
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-muted)" }}>
                  Commande associée : {selectedReq.orderId} • Initiée par {selectedReq.initiatorType} ({selectedReq.initiatorId})
                </p>
              </div>
              <button
                onClick={() => setSelectedReq(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Note pédagogique Vork */}
            <div style={{ background: "rgba(184, 98, 63, 0.12)", border: "1px solid rgba(184, 98, 63, 0.35)", borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 12, lineHeight: 1.45, color: "#E5E7EB" }}>
              <strong>⚖️ Principes Fondamentaux Vork (Décision Q3.5) :</strong>
              <br />
              Vork n'impose pas de sentence contraignante unilatérale. L'administrateur consigne une <strong>observation neutre</strong> et des recommandations de conciliation pour aider les deux parties à trouver une issue mutuelle.
            </div>

            {/* Détails de la réclamation */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>
                Exposé des faits par le demandeur ({selectedReq.initiatorType})
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                {selectedReq.description}
              </p>
              {selectedReq.evidenceUrls && selectedReq.evidenceUrls.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {selectedReq.evidenceUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#D4AF37", textDecoration: "underline" }}>
                      Preuve {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Réponse de l'autre partie */}
            {selectedReq.responseDescription && (
              <div style={{ background: "rgba(45,106,79,0.1)", border: "1px solid rgba(45,106,79,0.3)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#4ADE80", textTransform: "uppercase", marginBottom: 4 }}>
                  Réponse apportée par la partie adverse le {selectedReq.respondedAt ? new Date(selectedReq.respondedAt).toLocaleDateString() : ""}
                </div>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                  {selectedReq.responseDescription}
                </p>
              </div>
            )}

            {/* Historique des observations existantes */}
            {selectedReq.adminNotes && (
              <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: "#FCD34D", textTransform: "uppercase", marginBottom: 4 }}>
                  Historique des observations Vork
                </div>
                <pre style={{ margin: 0, fontSize: 12, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                  {selectedReq.adminNotes}
                </pre>
              </div>
            )}

            {/* Formulaire d'observation */}
            <form onSubmit={handleSaveObservation}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                Nouvelle observation / Recommandation de médiation Vork :
              </label>
              <textarea
                required
                rows={4}
                value={observationNotes}
                onChange={(e) => setObservationNotes(e.target.value)}
                placeholder="Rédigez l'avis d'observation neutre de l'équipe Vork (ex: préconisation de reprise d'atelier, proposition de remise, examen des preuves contradictoires)..."
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid var(--border-color)",
                  background: "rgba(0,0,0,0.25)",
                  color: "#FFFFFF",
                  fontSize: 13,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  marginBottom: 16,
                }}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={submitting || !observationNotes.trim()}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: "#B8623F",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  <Send size={15} />
                  {submitting ? "Enregistrement..." : "Enregistrer l'Avis d'Observation Vork"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
