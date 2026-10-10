import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  Eye, 
  Trash2, 
  Ban, 
  Filter, 
  RefreshCw,
  Search,
  Flag
} from "lucide-react";

interface ReportItem {
  id: string;
  reporterId: string;
  reporterType: "client" | "artisan";
  targetType: "product" | "custom_request" | "artisan_post";
  targetId: string;
  targetTitle: string | null;
  targetOwnerId: string | null;
  category: string;
  reason: string;
  evidenceUrls: string[] | string | null;
  status: "en_attente_admin" | "resolu" | "rejete" | "sanction_appliquee";
  adminDecision: string | null;
  adminNotes: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export const ReportsModerationView: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  
  // Resolution form state
  const [adminAction, setAdminAction] = useState<"delete_post" | "ban_vendor" | "dismiss">("delete_post");
  const [adminNotes, setAdminNotes] = useState("");
  const [resolving, setResolving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token") || "";
      const res = await fetch("/api/reports", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.reports)) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    setResolving(true);
    try {
      const token = localStorage.getItem("adminToken") || localStorage.getItem("token") || "";
      const res = await fetch(`/api/reports/${selectedReport.id}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: adminAction,
          adminNotes: adminNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la résolution.");
      }

      setFeedbackMsg(`Signalement résolu avec succès (Décision : ${adminAction})`);
      setSelectedReport(null);
      setAdminNotes("");
      fetchReports();
      setTimeout(() => setFeedbackMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || "Erreur d'arbitrage du signalement.");
    } finally {
      setResolving(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTarget = (r.targetTitle || "").toLowerCase().includes(q) || r.targetId.toLowerCase().includes(q);
      const matchReason = (r.reason || "").toLowerCase().includes(q);
      const matchOwner = (r.targetOwnerId || "").toLowerCase().includes(q);
      return matchTarget || matchReason || matchOwner;
    }
    return true;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "plagiat":
        return { label: "Plagiat de modèle", bg: "rgba(239, 68, 68, 0.15)", color: "#EF4444" };
      case "image_inappropriee":
        return { label: "Image trompeuse", bg: "rgba(245, 158, 11, 0.15)", color: "#F59E0B" };
      case "non_conformite_artisanale":
        return { label: "Non-conformité artisanale", bg: "rgba(168, 85, 247, 0.15)", color: "#A855F7" };
      default:
        return { label: category || "Autre", bg: "rgba(100, 116, 139, 0.15)", color: "#94A3B8" };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "en_attente_admin":
        return { label: "En attente modération", bg: "rgba(245, 158, 11, 0.2)", color: "#F59E0B" };
      case "sanction_appliquee":
        return { label: "Sanction appliquée", bg: "rgba(239, 68, 68, 0.2)", color: "#EF4444" };
      case "resolu":
        return { label: "Traité & Résolu", bg: "rgba(34, 197, 94, 0.2)", color: "#22C55E" };
      case "rejete":
        return { label: "Rejeté sans suite", bg: "rgba(148, 163, 184, 0.2)", color: "#94A3B8" };
      default:
        return { label: status, bg: "rgba(100, 116, 139, 0.2)", color: "#94A3B8" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Header Card */}
      <div
        style={{
          background: "var(--card-bg, #1F2937)",
          borderRadius: 20,
          padding: "24px 28px",
          border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "rgba(239, 68, 68, 0.15)",
                color: "#EF4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#FFFFFF" }}>
              Modération des Signalements
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "#9CA3AF" }}>
            Protection de l'authenticité artisanale, détection du plagiat et sanctions administratives.
          </p>
        </div>

        <button
          onClick={fetchReports}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#FFFFFF",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </div>

      {feedbackMsg && (
        <div
          style={{
            background: "rgba(34, 197, 94, 0.12)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: 14,
            padding: "12px 18px",
            color: "#4ADE80",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          ✓ {feedbackMsg}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "all", label: `Tous (${reports.length})` },
            { id: "en_attente_admin", label: `En attente (${reports.filter(r => r.status === "en_attente_admin").length})` },
            { id: "sanction_appliquee", label: `Sanctions (${reports.filter(r => r.status === "sanction_appliquee").length})` },
            { id: "rejete", label: `Rejetés (${reports.filter(r => r.status === "rejete").length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "none",
                background: statusFilter === tab.id ? "#3B82F6" : "rgba(255,255,255,0.06)",
                color: statusFilter === tab.id ? "#FFFFFF" : "#9CA3AF",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", minWidth: 260 }}>
          <Search size={16} color="#9CA3AF" style={{ position: "absolute", left: 12, top: 12 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, cible, motif..."
            style={{
              width: "100%",
              padding: "10px 14px 10px 36px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(17, 24, 39, 0.8)",
              color: "#FFFFFF",
              fontSize: "0.82rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </div>

      {/* Reports Table / Grid */}
      {filteredReports.length === 0 ? (
        <div
          style={{
            background: "var(--card-bg, #1F2937)",
            borderRadius: 20,
            padding: "60px 20px",
            textAlign: "center",
            color: "#9CA3AF",
            border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
          }}
        >
          <Flag size={42} style={{ margin: "0 auto 12px auto", opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Aucun signalement correspondant</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredReports.map((r) => {
            const catBadge = getCategoryBadge(r.category);
            const statBadge = getStatusBadge(r.status);
            const isPending = r.status === "en_attente_admin";

            return (
              <div
                key={r.id}
                style={{
                  background: "var(--card-bg, #1F2937)",
                  borderRadius: 16,
                  padding: "20px 22px",
                  border: isPending ? "1.5px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: catBadge.bg,
                          color: catBadge.color,
                        }}
                      >
                        {catBadge.label}
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: statBadge.bg,
                          color: statBadge.color,
                        }}
                      >
                        {statBadge.label}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                        ID: {r.id} • {new Date(r.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF" }}>
                      Cible : {r.targetTitle || r.targetId} ({r.targetType})
                    </h3>

                    <div style={{ fontSize: "0.78rem", color: "#9CA3AF" }}>
                      Signalé par : <strong style={{ color: "#E5E7EB" }}>{r.reporterId}</strong> ({r.reporterType}) 
                      {r.targetOwnerId && <> • Propriétaire : <strong style={{ color: "#E5E7EB" }}>{r.targetOwnerId}</strong></>}
                    </div>
                  </div>

                  {isPending && (
                    <button
                      onClick={() => {
                        setSelectedReport(r);
                        setAdminAction("delete_post");
                        setAdminNotes("");
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 10,
                        border: "none",
                        background: "#3B82F6",
                        color: "#FFFFFF",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      Arbitrer le signalement
                    </button>
                  )}
                </div>

                {/* Explication & Faits */}
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.25)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: "0.82rem",
                    color: "#D1D5DB",
                    lineHeight: 1.5,
                  }}
                >
                  <strong>Motif / Faits allégués :</strong> {r.reason}
                </div>

                {/* Preuves / Liens */}
                {r.evidenceUrls && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.78rem" }}>
                    <span style={{ color: "#9CA3AF" }}>Preuves fournies :</span>
                    {(Array.isArray(r.evidenceUrls) ? r.evidenceUrls : [r.evidenceUrls]).map((url, idx) => (
                      <a
                        key={idx}
                        href={String(url)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          color: "#60A5FA",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          textDecoration: "none",
                        }}
                      >
                        <ExternalLink size={12} />
                        Lien justificatif #{idx + 1}
                      </a>
                    ))}
                  </div>
                )}

                {/* Décision déjà prise si résolu */}
                {r.adminDecision && (
                  <div
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                      paddingTop: 10,
                      fontSize: "0.78rem",
                      color: "#9CA3AF",
                    }}
                  >
                    Décision admin : <strong style={{ color: "#F3F4F6" }}>{r.adminDecision}</strong>
                    {r.adminNotes && <> — <em>{r.adminNotes}</em></>}
                    {r.resolvedAt && <> ({new Date(r.resolvedAt).toLocaleDateString("fr-FR")})</>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL D'ARBITRAGE DU SIGNALEMENT ══ */}
      {selectedReport && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#1F2937",
              borderRadius: 20,
              width: "100%",
              maxWidth: 520,
              border: "1px solid rgba(255,255,255,0.12)",
              padding: 24,
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "1.15rem", fontWeight: 800, color: "#FFFFFF" }}>
                  Sanction & Modération Vork
                </h3>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#9CA3AF" }}>
                  Décision administrative contradictoire sur le dossier #{selectedReport.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Choix de la sanction */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#E5E7EB", marginBottom: 8 }}>
                  Mesure administrative à ordonner :
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    {
                      id: "delete_post",
                      title: "1. Supprimer le post / Masquer le produit",
                      desc: "Le produit est immédiatement retiré du catalogue public ou la demande annulée.",
                      icon: Trash2,
                      color: "#EF4444",
                    },
                    {
                      id: "ban_vendor",
                      title: "2. Suspendre / Bloquer la boutique du vendeur",
                      desc: "La boutique de l'artisan est bloquée sur Vork (suspension status = blocked).",
                      icon: Ban,
                      color: "#DC2626",
                    },
                    {
                      id: "dismiss",
                      title: "3. Rejeter le signalement sans suite",
                      desc: "Le signalement est jugé infondé. Aucune sanction n'est appliquée à la cible.",
                      icon: CheckCircle2,
                      color: "#9CA3AF",
                    },
                  ].map((act) => {
                    const isSelected = adminAction === act.id;
                    const Icon = act.icon;
                    return (
                      <div
                        key={act.id}
                        onClick={() => setAdminAction(act.id as any)}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 12,
                          border: isSelected ? `1.5px solid ${act.color}` : "1px solid rgba(255,255,255,0.08)",
                          background: isSelected ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.2)",
                          cursor: "pointer",
                          display: "flex",
                          gap: 12,
                          alignItems: "flex-start",
                        }}
                      >
                        <Icon size={18} color={act.color} style={{ marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: "0.86rem", fontWeight: 700, color: isSelected ? "#FFFFFF" : "#E5E7EB" }}>
                            {act.title}
                          </div>
                          <div style={{ fontSize: "0.74rem", color: "#9CA3AF", marginTop: 2 }}>
                            {act.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Justification écrite obligatoire */}
              <div>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "#E5E7EB", marginBottom: 6 }}>
                  Motif officiel de la décision admin :
                </label>
                <textarea
                  rows={3}
                  required
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Justification enregistrée dans le registre d'audit légal..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.15)",
                    background: "rgba(17, 24, 39, 0.8)",
                    color: "#FFFFFF",
                    fontSize: "0.82rem",
                    outline: "none",
                    resize: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  disabled={resolving}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "transparent",
                    color: "#9CA3AF",
                    fontWeight: 600,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    border: "none",
                    background: adminAction === "dismiss" ? "#3B82F6" : "#EF4444",
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: resolving ? "wait" : "pointer",
                  }}
                >
                  {resolving ? "Exécution..." : "Valider la décision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
