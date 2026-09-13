import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { artisanAuthService, type ArtisanUser } from "../services/artisanAuthService";
import { useI18n } from "../services/i18n";
import { ShieldCheck, Hammer, Globe, ArrowRight } from "lucide-react";

interface ArtisanAuthViewProps {
  onAuthSuccess: (user: ArtisanUser) => void;
}

export const ArtisanAuthView: React.FC<ArtisanAuthViewProps> = ({ onAuthSuccess }) => {
  const { lang, isRTL, changeLanguage, t } = useI18n();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [workshopName, setWorkshopName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("Fès");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg(t("auth_error_required"));
      return;
    }

    if (password.length < 6) {
      setErrorMsg(t("auth_error_password_length"));
      return;
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const res = await artisanAuthService.login(email, password);
        if (res.success && res.user) {
          onAuthSuccess(res.user);
        } else {
          setErrorMsg(res.error || t("auth_error_invalid"));
        }
      } else {
        const res = await artisanAuthService.signup(email, password, fullName, workshopName, specialty, city);
        if (res.success && res.user) {
          onAuthSuccess(res.user);
        } else if (res.success) {
          setSuccessMsg(t("auth_success_created"));
          setMode("login");
        } else {
          setErrorMsg(res.error || t("auth_error_signup"));
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || t("auth_error_server"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="phone-shell auth-view"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FCFBF9 0%, #F5F1EB 100%)",
        position: "relative",
      }}
    >
      {/* Pattern Corners */}
      <div className="pattern-corner pattern-top-right" />
      <div className="pattern-corner pattern-bottom-left" />

      {/* Top Bar: Language Switcher */}
      <div style={{ display: "flex", justifyContent: "flex-end", width: "100%", maxWidth: 390, marginBottom: 16, zIndex: 10 }}>
        <button
          type="button"
          onClick={() => changeLanguage(lang === "ar" ? "fr" : "ar")}
          style={{
            background: "rgba(255, 255, 255, 0.9)",
            border: "1px solid rgba(212, 175, 55, 0.4)",
            borderRadius: 20,
            padding: "6px 14px",
            fontSize: "0.82rem",
            fontWeight: 700,
            color: "#1A2A3A",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <Globe size={14} color="#D4AF37" />
          <span>{lang === "ar" ? "Français" : "العربية الفصحى"}</span>
        </button>
      </div>

      {/* Header Brand */}
      <div style={{ textAlign: "center", marginBottom: 20, zIndex: 10 }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #1A2A3A 0%, #2A3A4A 100%)",
          margin: "0 auto 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid rgba(212, 175, 55, 0.5)",
          boxShadow: "0 8px 20px rgba(26, 42, 58, 0.15)",
        }}>
          <Hammer size={26} color="#D4AF37" />
        </div>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.6rem",
          fontWeight: 800,
          color: "var(--primary)",
          letterSpacing: "0.08em",
          margin: 0,
        }}>
          {t("auth_welcome_title")}
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 4 }}>
          {t("auth_welcome_sub")}
        </p>
      </div>

      {/* Auth Panel Card */}
      <div
        className="artisan-card"
        style={{
          width: "100%",
          maxWidth: 390,
          padding: "24px 20px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(16px)",
          borderRadius: 24,
          border: "1px solid rgba(212, 175, 55, 0.3)",
          boxShadow: "0 16px 36px rgba(26, 42, 58, 0.08)",
          zIndex: 10,
        }}
      >
        {/* Mode Switcher */}
        <div
          style={{
            display: "flex",
            background: "rgba(235, 230, 220, 0.5)",
            borderRadius: 14,
            padding: 3,
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => { setMode("login"); setErrorMsg(null); }}
            style={{
              flex: 1,
              padding: "9px 0",
              border: "none",
              background: mode === "login" ? "#FFF" : "transparent",
              borderRadius: 11,
              fontWeight: mode === "login" ? 700 : 500,
              color: mode === "login" ? "var(--primary)" : "var(--text-secondary)",
              fontSize: "0.86rem",
              cursor: "pointer",
              boxShadow: mode === "login" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            {t("auth_login_tab")}
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setErrorMsg(null); }}
            style={{
              flex: 1,
              padding: "9px 0",
              border: "none",
              background: mode === "signup" ? "#FFF" : "transparent",
              borderRadius: 11,
              fontWeight: mode === "signup" ? 700 : 500,
              color: mode === "signup" ? "var(--primary)" : "var(--text-secondary)",
              fontSize: "0.86rem",
              cursor: "pointer",
              boxShadow: mode === "signup" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            {t("auth_register_tab")}
          </button>
        </div>

        {/* Alerts */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{
                background: "rgba(220, 53, 69, 0.08)",
                border: "1px solid rgba(220, 53, 69, 0.25)",
                color: "#b02a37",
                padding: "10px 12px",
                borderRadius: 12,
                fontSize: "0.82rem",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              ⚠️ {errorMsg}
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{
                background: "rgba(45, 106, 79, 0.08)",
                border: "1px solid rgba(45, 106, 79, 0.25)",
                color: "#2D6A4F",
                padding: "10px 12px",
                borderRadius: 12,
                fontSize: "0.82rem",
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              ✅ {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (
            <>
              <div>
                <label className="form-label">{t("auth_fullname_label")} *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder={t("auth_placeholder_name")}
                />
              </div>

              <div>
                <label className="form-label">{t("auth_workshop_label")}</label>
                <input
                  type="text"
                  className="form-input"
                  value={workshopName}
                  onChange={e => setWorkshopName(e.target.value)}
                  placeholder={t("auth_placeholder_workshop")}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
                <div>
                  <label className="form-label">{t("auth_specialty_label")}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={specialty}
                    onChange={e => setSpecialty(e.target.value)}
                    placeholder={t("auth_placeholder_specialty")}
                  />
                </div>
                <div>
                  <label className="form-label">{t("auth_city_label")}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder={isRTL ? "فاس، مراكش..." : "Fès, Marrakech..."}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="form-label">{t("auth_email_label")} *</label>
            <input
              type="email"
              required
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="artisan.atelier@exemple.ma"
            />
          </div>

          <div>
            <label className="form-label">{t("auth_password_label")} *</label>
            <input
              type="password"
              required
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-terracotta"
            style={{
              marginTop: 10,
              padding: "12px",
              fontSize: "0.92rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? t("loading") : mode === "login" ? t("auth_submit_login") : t("auth_submit_register")}
            <ArrowRight size={16} style={{ transform: isRTL ? "rotate(180deg)" : "none" }} />
          </button>

          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            marginTop: 8,
            color: "var(--text-secondary)",
            fontSize: "0.75rem",
            textAlign: "center",
          }}>
            <ShieldCheck size={14} color="#2D6A4F" />
            <span>{t("auth_secure_note")}</span>
          </div>
        </form>
      </div>

      <p style={{ marginTop: 20, fontSize: "0.75rem", color: "var(--text-placeholder)", textAlign: "center", zIndex: 10 }}>
        {t("auth_footer")}
      </p>
    </motion.div>
  );
};
