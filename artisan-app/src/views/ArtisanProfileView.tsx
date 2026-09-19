import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, MapPin, Package, Settings, LogOut, Shield, FileText, ChevronRight, Award, Phone, Mail, Edit3, AlertTriangle, RotateCcw, MessageSquare, PauseCircle, PlayCircle, Landmark, Truck, X, Check, ShieldCheck } from "lucide-react";
import type { ArtisanProfileDetails, ArtisanProfileHealth, ArtisanStats, ArtisanReturn, ArtisanDispute } from "../types/artisanTypes";
import type { ArtisanUser } from "../services/artisanAuthService";
import { useI18n } from "../services/i18n";

interface Props {
  profileDetails: ArtisanProfileDetails | null;
  health: ArtisanProfileHealth | null;
  stats: ArtisanStats | null;
  returns: ArtisanReturn[];
  disputes: ArtisanDispute[];
  currentUser?: ArtisanUser | null;
  onLogout?: () => void;
  onUpdateProfile: (details: Partial<ArtisanProfileDetails>) => Promise<void>;
  onOpenReturns: () => void;
  onOpenDisputes: () => void;
  onOpenCGV: () => void;
}

export const ArtisanProfileView: React.FC<Props> = ({
  profileDetails, health, stats, returns, disputes,
  currentUser, onLogout,
  onUpdateProfile, onOpenReturns, onOpenDisputes, onOpenCGV,
}) => {
  const { isRTL, t } = useI18n();
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Form state for editing RIB & Address
  const [pickupAddress, setPickupAddress] = useState(profileDetails?.pickupAddress || "");
  const [defaultRib, setDefaultRib] = useState(profileDetails?.defaultRib || "");
  const [specialty, setSpecialty] = useState(profileDetails?.specialty || "");
  const [bio, setBio] = useState(profileDetails?.bio || "");

  const pendingReturns = returns.filter(r => r.status === "initie").length;
  const openDisputes = disputes.filter(d => !d.status.startsWith("resolu") && d.status !== "rejete").length;
  const avgRating = stats?.overallRating ?? 4.7;

  if (!profileDetails) {
    return (
      <div className="app-view">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="skeleton-box" style={{ height: 140, borderRadius: 24 }} />
          <div className="skeleton-box" style={{ height: 24, borderRadius: 8, width: "60%" }} />
          <div className="skeleton-box" style={{ height: 80, borderRadius: 16 }} />
        </div>
      </div>
    );
  }

  const isSuspended = health?.suspensionStatus && health.suspensionStatus !== "active";
  const isVacationMode = profileDetails.isVacationMode ?? false;

  const handleToggleVacation = async () => {
    setUpdating(true);
    try {
      await onUpdateProfile({ isVacationMode: !isVacationMode });
    } catch (e: any) {
      alert(e.message || "Erreur lors du changement de mode.");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await onUpdateProfile({
        pickupAddress,
        defaultRib,
        specialty,
        bio,
      });
      setShowEditModal(false);
    } catch (e: any) {
      alert(e.message || "Erreur sauvegarde.");
    } finally {
      setUpdating(false);
    }
  };

  const artisanDisplayName = currentUser?.fullName || profileDetails.artisanName;
  const artisanDisplaySpecialty = currentUser?.specialty || profileDetails.specialty;

  return (
    <div className="app-view">
      <div className="pattern-corner pattern-top-right" />

      {/* Suspension Warning Banner */}
      {isSuspended && (
        <div style={{
          background: "rgba(220,53,69,0.08)", border: "1px solid rgba(220,53,69,0.25)",
          borderRadius: 14, padding: "10px 14px", marginBottom: 14,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <AlertTriangle size={16} color="#DC3545" />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#DC3545" }}>
              {t("profile_suspension_alert")} ({health.suspensionStatus.replace("_", " ")})
            </div>
            {health.suspendedUntil && (
              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                {t("profile_suspended_until")} {new Date(health.suspendedUntil).toLocaleDateString(isRTL ? "ar-MA" : "fr-FR")}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vacation / Pause Banner */}
      <div className="artisan-card" style={{
        padding: "12px 14px", marginBottom: 16,
        background: isVacationMode ? "rgba(184,98,63,0.08)" : "rgba(45,106,79,0.06)",
        border: `1px solid ${isVacationMode ? "rgba(184,98,63,0.25)" : "rgba(45,106,79,0.2)"}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {isVacationMode ? (
            <PauseCircle size={22} color="var(--accent-warm)" />
          ) : (
            <PlayCircle size={22} color="var(--accent-emerald)" />
          )}
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 800, color: isVacationMode ? "var(--accent-warm)" : "var(--accent-emerald)" }}>
              {isVacationMode ? t("profile_vacation_active") : t("profile_vacation_inactive")}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 1 }}>
              {isVacationMode ? t("profile_vacation_msg_active") : t("profile_vacation_msg_inactive")}
            </div>
          </div>
        </div>

        <button
          className={isVacationMode ? "btn-terracotta" : "btn-outline"}
          style={{ padding: "6px 12px", fontSize: 11, minHeight: 34, borderRadius: 14, width: "auto" }}
          onClick={handleToggleVacation}
          disabled={updating}
        >
          {isVacationMode ? t("profile_vacation_resume") : t("profile_vacation_pause")}
        </button>
      </div>

      {/* Profile Hero Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="artisan-card" style={{ padding: 0, marginBottom: 16, overflow: "hidden" }}>
        {/* Cover */}
        <div style={{ height: 90, background: "linear-gradient(135deg, #1A2A3A 0%, #0F1B26 100%)", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Cg fill='none' stroke='%23D4AF37' stroke-width='1'%3E%3Cpolygon points='14,4 36,4 46,14 46,36 36,46 14,46 4,36 4,14'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "28px 28px", opacity: 0.2,
          }} />
        </div>

        <div style={{ padding: "0 16px 16px", position: "relative" }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "var(--accent-warm)",
            border: "4px solid var(--surface)", marginTop: -36,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(184,98,63,0.3)", overflow: "hidden",
          }}>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26, color: "#FFF" }}>
              {artisanDisplayName?.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Edit button */}
          <button className="icon-btn" style={{ position: "absolute", top: -28, right: 16, background: "rgba(255,255,255,0.9)" }} onClick={() => setShowEditModal(true)}>
            <Edit3 size={15} />
          </button>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, color: "var(--primary)" }}>
              {artisanDisplayName}
            </div>
            {currentUser?.email && (
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>
                {currentUser.email}
              </div>
            )}
            {artisanDisplaySpecialty && (
              <div style={{ fontSize: 12, color: "var(--accent-warm)", fontWeight: 600, marginTop: 2 }}>
                {artisanDisplaySpecialty} {currentUser?.workshopName ? `· ${currentUser.workshopName}` : ""}
              </div>
            )}

            {/* Badges row */}
            <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 9px", borderRadius: 12,
                background: "rgba(45, 106, 79, 0.12)", color: "#2D6A4F",
                fontSize: 10, fontWeight: 700,
              }}>
                <ShieldCheck size={12} /> {t("profile_verified_badge")}
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 9px", borderRadius: 12,
                background: "rgba(212, 175, 55, 0.12)", color: "#8A6D1C",
                fontSize: 10, fontWeight: 700,
              }}>
                <Award size={11} /> {t("profile_partner_badge")}
              </span>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Star size={11} color="var(--accent-premium)" fill="var(--accent-premium)" />
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{avgRating.toFixed(1)} ({stats?.reviewCount ?? 0} {t("profile_reviews_count")})</span>
              </div>
              {profileDetails.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Phone size={11} color="var(--text-secondary)" />
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{profileDetails.phone}</span>
                </div>
              )}
              {profileDetails.yearsOfExperience > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <Award size={11} color="var(--accent-premium)" />
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{profileDetails.yearsOfExperience} {t("profile_experience")}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Address & RIB details cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div className="artisan-card" style={{ padding: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Truck size={13} color="var(--primary)" />
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>{t("profile_address")}</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profileDetails.pickupAddress || t("profile_address_none")}
          </div>
        </div>

        <div className="artisan-card" style={{ padding: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Landmark size={13} color="var(--accent-premium)" />
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>{t("profile_rib")}</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profileDetails.defaultRib ? `•••• ${profileDetails.defaultRib.slice(-4)}` : t("profile_rib_none")}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { value: stats?.totalOrders ?? 0, label: t("profile_stat_orders") },
          { value: stats?.acceptanceRate ? `${Math.round(stats.acceptanceRate * 100)}%` : "—", label: t("profile_stat_acceptance") },
          { value: `${avgRating.toFixed(1)} ★`, label: t("profile_stat_rating") },
        ].map(m => (
          <div key={m.label} className="artisan-card" style={{ padding: "12px 8px", textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--primary)" }}>{m.value}</div>
            <div style={{ fontSize: 9, color: "var(--text-secondary)", fontWeight: 600 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Bio */}
      {profileDetails.bio && (
        <div className="artisan-card" style={{ padding: "14px 16px", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>{profileDetails.bio}</p>
        </div>
      )}

      {/* Returns & Disputes shortcuts — ALWAYS accessible */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <button className="artisan-card" style={{ padding: "12px 14px", border: "none", cursor: "pointer", textAlign: "inherit" }} onClick={onOpenReturns}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <RotateCcw size={14} color="var(--accent-warm)" />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{t("profile_returns_shortcut")}</span>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: pendingReturns > 0 ? "var(--accent-warm)" : "var(--primary)" }}>
            {returns.length}
          </div>
          <div style={{ fontSize: 10, color: pendingReturns > 0 ? "var(--accent-warm)" : "var(--text-secondary)" }}>
            {pendingReturns > 0 ? `${pendingReturns} ${t("profile_pending")}` : t("profile_history")}
          </div>
        </button>

        <button className="artisan-card" style={{ padding: "12px 14px", border: "none", cursor: "pointer", textAlign: "inherit" }} onClick={onOpenDisputes}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <MessageSquare size={14} color={openDisputes > 0 ? "#DC3545" : "var(--primary)"} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>{t("profile_disputes_shortcut")}</span>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: openDisputes > 0 ? "#DC3545" : "var(--primary)" }}>
            {disputes.length}
          </div>
          <div style={{ fontSize: 10, color: openDisputes > 0 ? "#DC3545" : "var(--text-secondary)" }}>
            {openDisputes > 0 ? `${openDisputes} ${t("profile_open")}` : t("profile_history")}
          </div>
        </button>
      </div>

      {/* Menu */}
      <div style={{ marginBottom: 14 }}>
        <div className="section-title" style={{ marginBottom: 8, paddingInlineStart: 4 }}>{t("profile_account_legal")}</div>
        <div className="artisan-card" style={{ overflow: "hidden", padding: 0 }}>
          <button className="menu-row" onClick={onOpenCGV}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div className="menu-icon-wrap" style={{ background: "rgba(184,98,63,0.1)" }}>
                <FileText size={16} color="var(--accent-warm)" />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{t("profile_cgv")}</div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 1 }}>{t("profile_cgv_sub")}</div>
              </div>
            </div>
            <ChevronRight size={15} color="var(--text-secondary)" />
          </button>

          <button className="menu-row" onClick={onOpenCGV}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div className="menu-icon-wrap" style={{ background: "rgba(45,106,79,0.1)" }}>
                <Shield size={16} color="var(--accent-emerald)" />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{t("profile_security")}</div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 1 }}>{t("profile_security_sub")}</div>
              </div>
            </div>
            <ChevronRight size={15} color="var(--text-secondary)" />
          </button>

          <button className="menu-row" onClick={() => setShowEditModal(true)}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div className="menu-icon-wrap" style={{ background: "rgba(107,114,128,0.08)" }}>
                <Settings size={16} color="var(--text-secondary)" />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>{t("profile_settings")}</div>
                <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 1 }}>{t("profile_settings_sub")}</div>
              </div>
            </div>
            <ChevronRight size={15} color="var(--text-secondary)" />
          </button>
        </div>
      </div>

      {/* Logout */}
      {onLogout && (
        <div className="artisan-card" style={{ overflow: "hidden", padding: 0, marginBottom: 8 }}>
          <button className="menu-row" onClick={onLogout}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div className="menu-icon-wrap" style={{ background: "rgba(220,53,69,0.08)" }}>
                <LogOut size={16} color="#DC3545" />
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "#DC3545" }}>{t("profile_logout")}</div>
            </div>
            <ChevronRight size={15} color="#DC3545" />
          </button>
        </div>
      )}

      {/* Edit Settings Modal */}
      {showEditModal && (
        <AnimatePresence>
          <div className="sheet-backdrop" onClick={() => setShowEditModal(false)}>
            <div className="sheet-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 390 }}>
              <div className="sheet-handle" />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--primary)" }}>
                  {t("profile_edit_coords")}
                </span>
                <button className="icon-btn" onClick={() => setShowEditModal(false)}>
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label className="form-label">{t("profile_specialty_label")}</label>
                  <input className="form-input" value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder={t("profile_specialty_placeholder")} />
                </div>

                <div>
                  <label className="form-label">{t("profile_pickup_label")}</label>
                  <input className="form-input" required value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} placeholder={t("profile_pickup_placeholder")} />
                </div>

                <div>
                  <label className="form-label">{t("profile_rib_label")}</label>
                  <input className="form-input" required value={defaultRib} onChange={e => setDefaultRib(e.target.value)} placeholder={t("profile_rib_placeholder")} />
                </div>

                <div>
                  <label className="form-label">{t("profile_bio_label")}</label>
                  <textarea className="form-input" rows={3} style={{ resize: "none" }} value={bio} onChange={e => setBio(e.target.value)} placeholder={t("profile_bio_placeholder")} />
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setShowEditModal(false)}>{t("cancel")}</button>
                  <button type="submit" className="btn-terracotta" style={{ flex: 2 }} disabled={updating}>
                    <Check size={16} /> {updating ? t("saving") : t("save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </AnimatePresence>
      )}

      <div style={{ textAlign: "center", fontSize: 10, color: "var(--text-placeholder)", marginTop: 12 }}>
        {t("profile_footer")}
      </div>
    </div>
  );
};
