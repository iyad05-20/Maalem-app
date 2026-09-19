import React, { useState, useEffect } from "react";
import { ShieldCheck, RefreshCw, UserCheck, Globe, Database, CheckCircle2, AlertCircle } from "lucide-react";
import { getBackendUrl, setBackendUrl, adminAPI } from "../services/adminApi";

interface HeaderProps {
  title: string;
  subtitle: string;
  onRefresh: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onRefresh, loading }) => {
  const [targetUrl, setTargetUrl] = useState<string>(getBackendUrl());
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [showDbModal, setShowDbModal] = useState<boolean>(false);
  const [dbInfo, setDbInfo] = useState<{ activeMode: "dev" | "prod"; sqlite: any; supabase: any } | null>(null);
  const [switchingDb, setSwitchingDb] = useState<boolean>(false);

  const loadDbStatus = async () => {
    try {
      const data = await adminAPI.getDbMode();
      setDbInfo(data);
    } catch (err) {
      console.warn("Could not fetch DB mode:", err);
    }
  };

  useEffect(() => {
    loadDbStatus();
  }, []);

  const handleToggleDbMode = async () => {
    if (!dbInfo) return;
    const nextMode = dbInfo.activeMode === "dev" ? "prod" : "dev";
    setSwitchingDb(true);
    try {
      const res = await adminAPI.setDbMode(nextMode);
      setDbInfo(res);
      setShowDbModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Erreur lors du basculement de BDD.");
    } finally {
      setSwitchingDb(false);
    }
  };

  const handleSaveTarget = () => {
    setBackendUrl(targetUrl);
    setShowConfig(false);
    onRefresh();
  };

  const isLocal = targetUrl.includes("localhost") || targetUrl.includes("127.0.0.1");


  return (
    <header style={{
      height: 70,
      background: "rgba(17, 24, 39, 0.75)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--border-color)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 28px",
      position: "sticky",
      top: 0,
      zIndex: 40,
      marginLeft: 260,
    }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--text-main)", margin: 0 }}>
          {title}
        </h2>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
          {subtitle}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* DB Mode Switcher (Dev SQLite vs Prod Supabase) */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowDbModal(!showDbModal)}
            className="btn-outline"
            style={{ 
              padding: "6px 12px", 
              fontSize: 11, 
              borderColor: dbInfo?.activeMode === "prod" ? "#34D399" : "#F59E0B",
              background: dbInfo?.activeMode === "prod" ? "rgba(52, 211, 153, 0.12)" : "rgba(245, 158, 11, 0.12)",
              color: dbInfo?.activeMode === "prod" ? "#34D399" : "#F59E0B",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <Database size={13} color={dbInfo?.activeMode === "prod" ? "#34D399" : "#F59E0B"} />
            <span>DB: {dbInfo?.activeMode === "prod" ? "🟢 PROD (Supabase)" : "🟡 DEV (SQLite)"}</span>
          </button>

          {showDbModal && (
            <div className="glass-panel" style={{
              position: "absolute",
              top: 44,
              right: 0,
              width: 330,
              padding: 16,
              zIndex: 100,
              border: `1px solid ${dbInfo?.activeMode === "prod" ? "rgba(52,211,153,0.3)" : "rgba(245,158,11,0.3)"}`,
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              borderRadius: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary-gold)", display: "flex", alignItems: "center", gap: 6 }}>
                  <Database size={14} /> Moteur Base de Données
                </span>
                <span style={{ 
                  fontSize: 10, 
                  fontWeight: 800, 
                  padding: "2px 8px", 
                  borderRadius: 12, 
                  background: dbInfo?.activeMode === "prod" ? "rgba(52,211,153,0.2)" : "rgba(245,158,11,0.2)",
                  color: dbInfo?.activeMode === "prod" ? "#34D399" : "#F59E0B"
                }}>
                  {dbInfo?.activeMode === "prod" ? "MODE PROD" : "MODE DEV"}
                </span>
              </div>

              <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 12px", lineHeight: 1.4 }}>
                Basculez entre le stockage local SQLite (développement) et Supabase PostgreSQL Cloud (production).
              </p>

              {/* Status details */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14, fontSize: 10.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", borderRadius: 6, background: "rgba(0,0,0,0.2)" }}>
                  <span style={{ color: "var(--text-muted)" }}>🟡 SQLite Local :</span>
                  <strong style={{ color: dbInfo?.sqlite?.connected ? "#34D399" : "#DC3545" }}>
                    {dbInfo?.sqlite?.connected ? `Connecté (${dbInfo.sqlite.ordersCount} cmd)` : "Inaccessible"}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", borderRadius: 6, background: "rgba(0,0,0,0.2)" }}>
                  <span style={{ color: "var(--text-muted)" }}>🟢 Supabase Cloud :</span>
                  <strong style={{ color: dbInfo?.supabase?.connected ? "#34D399" : "#F59E0B" }}>
                    {dbInfo?.supabase?.connected ? "Connecté" : "Vérification..."}
                  </strong>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleToggleDbMode}
                disabled={switchingDb}
                className={dbInfo?.activeMode === "dev" ? "btn-gold" : "btn-outline"}
                style={{ width: "100%", padding: "8px 12px", fontSize: 11, fontWeight: 700, borderRadius: 8, cursor: "pointer" }}
              >
                {switchingDb 
                  ? "Basculement en cours..." 
                  : dbInfo?.activeMode === "dev" 
                    ? "🚀 Basculer vers PROD (Supabase)" 
                    : "🔄 Revenir en DEV (SQLite Local)"}
              </button>
            </div>
          )}
        </div>

        {/* Environment Badge / Switcher */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="btn-outline"
            style={{ 
              padding: "6px 12px", 
              fontSize: 11, 
              borderColor: isLocal ? "rgba(255,255,255,0.15)" : "var(--primary-gold)",
              background: isLocal ? "transparent" : "var(--primary-gold-light)",
            }}
          >
            <Globe size={14} color={isLocal ? "#34D399" : "var(--primary-gold)"} />
            <span>Target: <strong style={{ color: isLocal ? "#34D399" : "var(--primary-gold)" }}>{isLocal ? "🟢 Local Backend" : "🌐 Production Deploy"}</strong></span>
          </button>

          {showConfig && (
            <div className="glass-panel" style={{
              position: "absolute",
              top: 44,
              right: 0,
              width: 340,
              padding: 16,
              zIndex: 100,
              border: "1px solid var(--border-gold)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 6px", color: "var(--primary-gold)" }}>
                🔗 Serveur Backend Cible :
              </p>
              <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 10px" }}>
                Entrez l'URL de votre backend déployé pour administrer votre application en production depuis cette page locale.
              </p>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://votre-backend-deployer.com/api"
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-main)", fontSize: 11, marginBottom: 10 }}
              />
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    setTargetUrl("http://localhost:3001/api");
                    setBackendUrl("http://localhost:3001/api");
                    setShowConfig(false);
                    onRefresh();
                  }}
                  className="btn-outline"
                  style={{ fontSize: 10, padding: "4px 8px" }}
                >
                  Reset Local
                </button>
                <button
                  type="button"
                  onClick={handleSaveTarget}
                  className="btn-gold"
                  style={{ fontSize: 10, padding: "4px 10px" }}
                >
                  Connecter
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="btn-outline"
          style={{ padding: "8px 14px", fontSize: 12 }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} color="var(--primary-gold)" />
          <span>Actualiser</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 10, background: "rgba(45, 106, 79, 0.15)", border: "1px solid rgba(45, 106, 79, 0.3)", fontSize: 11, color: "#34D399", fontWeight: 600 }}>
          <ShieldCheck size={14} /> Mode Médiation Actif
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingLeft: 10, borderLeft: "1px solid var(--border-color)" }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--primary-gold-dark)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserCheck size={18} color="#FFFFFF" />
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, margin: 0, fontFamily: "var(--font-display)" }}>Médiateur Vork</p>
            <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0 }}>admin@vork.ma</p>
          </div>
        </div>
      </div>
    </header>
  );
};
