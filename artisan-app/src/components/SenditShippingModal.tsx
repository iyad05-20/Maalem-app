import React, { useState } from "react";
import { motion } from "framer-motion";
import { Truck, X, FileText, Check, Printer, Upload, Camera, Image as ImageIcon } from "lucide-react";
import type { ArtisanOrder } from "../types/artisanTypes";
import { useI18n } from "../services/i18n";
import { getBackendUrl } from "../services/artisanApi";

interface SenditShippingModalProps {
  order: ArtisanOrder;
  defaultAddress?: string;
  onClose: () => void;
  onStep1: (orderId: string, deliveryData: any) => Promise<any>;
  onStep2: (orderId: string, photoUrl: string) => Promise<any>;
}

export const SenditShippingModal: React.FC<SenditShippingModalProps> = ({
  order,
  defaultAddress = "",
  onClose,
  onStep1,
  onStep2,
}) => {
  const { isRTL, t } = useI18n();
  const [step, setStep] = useState<1 | 2>(order.senditDeliveryCode ? 2 : 1);
  const [pickupDistrictId, setPickupDistrictId] = useState<number>(46);
  const [deliveryDistrictId, setDeliveryDistrictId] = useState<number>(1);
  const [artisanAddress, setArtisanAddress] = useState<string>(defaultAddress);
  const [waybillCode, setWaybillCode] = useState<string>(order.senditDeliveryCode || "");
  const [blAttachedPhoto, setBlAttachedPhoto] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const districts = [
    { id: 46, name: isRTL ? "الدار البيضاء" : "Casablanca" },
    { id: 1,  name: isRTL ? "الرباط" : "Rabat" },
    { id: 2,  name: isRTL ? "فاس" : "Fès" },
    { id: 3,  name: isRTL ? "مراكش" : "Marrakech" },
    { id: 4,  name: isRTL ? "طنجة" : "Tanger" },
    { id: 5,  name: isRTL ? "أكادير" : "Agadir" },
    { id: 6,  name: isRTL ? "مكناس" : "Meknès" },
    { id: 7,  name: isRTL ? "وجدة" : "Oujda" },
    { id: 8,  name: isRTL ? "القنيطرة" : "Kénitra" },
    { id: 9,  name: isRTL ? "تطوان" : "Tétouan" },
  ];

  const handleExecuteStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await onStep1(order.id, {
        pickup_district_id: pickupDistrictId,
        district_id: deliveryDistrictId,
        name: "Client Acheteur",
        address: artisanAddress,
      });
      if (res && res.senditDeliveryCode) {
        setWaybillCode(res.senditDeliveryCode);
        setStep(2);
      }
    } catch (err: any) {
      alert(err.message || t("auth_error_server"));
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blAttachedPhoto.trim()) return;
    setLoading(true);
    try {
      await onStep2(order.id, blAttachedPhoto);
      onClose();
    } catch (err: any) {
      alert(err.message || t("auth_error_server"));
    } finally {
      setLoading(false);
    }
  };

  // ─── PROVISIONAL BYPASS (Facile à éliminer) ──────────────────────────────
  const handleBypassStep2 = async () => {
    setLoading(true);
    try {
      await onStep2(order.id, "bypass:sendit_bl_photo_waived");
      onClose();
    } catch (err: any) {
      alert(err.message || t("auth_error_server"));
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setBlAttachedPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(11, 15, 25, 0.85)",
      backdropFilter: "blur(8px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      padding: 20,
    }}>
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: 580,
          padding: 24,
          background: "#FFF",
          borderRadius: 20,
          border: "1px solid rgba(212, 175, 55, 0.3)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(45, 106, 79, 0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Truck size={20} color="#2D6A4F" />
            </div>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--primary)", margin: 0 }}>
                {t("shipping_sendit_title")}
              </h3>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                {isRTL ? `المرحلة ${step} من ٢ · الطلب` : `Étape ${step} sur 2 · Commande`} <strong style={{ color: "var(--accent-warm)" }}>{order.id}</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-outline" style={{ padding: 6, borderRadius: 8 }}>
            <X size={16} />
          </button>
        </div>

        {/* Step Indicator */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: "var(--accent-warm)" }} />
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: step === 2 ? "var(--accent-warm)" : "rgba(0,0,0,0.08)" }} />
        </div>

        {step === 1 ? (
          <form onSubmit={handleExecuteStep1}>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
              {t("shipping_sendit_step1")} :
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label className="form-label">{t("sendit_pickup_city")}</label>
                <select
                  value={pickupDistrictId}
                  onChange={(e) => setPickupDistrictId(Number(e.target.value))}
                  className="form-input"
                >
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label className="form-label">{t("sendit_delivery_city")}</label>
                <select
                  value={deliveryDistrictId}
                  onChange={(e) => setDeliveryDistrictId(Number(e.target.value))}
                  className="form-input"
                >
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">{t("sendit_pickup_address")}</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder={t("sendit_pickup_placeholder")}
                value={artisanAddress}
                onChange={(e) => setArtisanAddress(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={onClose} className="btn-outline">{t("cancel")}</button>
              <button type="submit" disabled={loading || !artisanAddress.trim()} className="btn-terracotta">
                <FileText size={16} />
                <span>{loading ? t("loading") : t("sendit_generate_bl")}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleExecuteStep2}>
            <div style={{ background: "rgba(45, 106, 79, 0.08)", border: "1px solid rgba(45, 106, 79, 0.25)", borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#2D6A4F", margin: "0 0 4px" }}>
                ✓ {isRTL ? `تم إصدار ورقة الإرسال بنجاح : ${waybillCode}` : `Bon de Livraison Généré : ${waybillCode}`}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <a
                  href={`${getBackendUrl()}/artisan/orders/${order.id}/label?code=${waybillCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                  style={{ padding: "6px 12px", fontSize: 11, background: "#FFF", borderColor: "var(--accent-premium)", color: "var(--primary)" }}
                >
                  <Printer size={14} /> {t("shipping_sendit_download")}
                </a>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>
              {t("shipping_sendit_step2")} :
            </p>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">{t("sendit_package_photo_label")}</label>
              
              {blAttachedPhoto ? (
                <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", maxHeight: 180, marginBottom: 8, textAlign: "center", background: "#000" }}>
                  <img src={blAttachedPhoto} alt="Bordereau collé" style={{ maxHeight: 180, maxWidth: "100%", objectFit: "contain" }} />
                  <button
                    type="button"
                    onClick={() => setBlAttachedPhoto("")}
                    style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.65)", color: "#FFF", border: "none", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "20px 14px",
                  borderRadius: 12,
                  border: "2px dashed var(--border)",
                  background: "var(--surface)",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}>
                  <Camera size={26} color="var(--accent-warm)" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)" }}>
                    {t("sendit_take_photo")}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                    {t("sendit_file_hint")}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>

            {/* ─── CONFIRMATION ÉTIQUETAGE D'ATELIER ─── */}
            <div style={{
              background: "rgba(45, 106, 79, 0.08)",
              border: "1px solid rgba(45, 106, 79, 0.25)",
              borderRadius: 10,
              padding: "8px 12px",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8
            }}>
              <p style={{ fontSize: 11, color: "#2D6A4F", margin: 0, fontWeight: 600 }}>
                ✓ {isRTL ? "تم تثبيت بوليصة الشحن بإحكام على الطرد" : "Bordereau apposé et colis scellé"}
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={handleBypassStep2}
                style={{
                  background: "#2D6A4F",
                  color: "#FFF",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 4px rgba(45, 106, 79, 0.2)"
                }}
              >
                {isRTL ? "تأكيد التجهيز ✓" : "Confirmer prêt ✓"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={onClose} className="btn-outline">{t("close")}</button>
              <button type="submit" disabled={loading || !blAttachedPhoto.trim()} className="btn-terracotta">
                <Check size={16} />
                <span>{loading ? t("loading") : t("shipping_sendit_confirm")}</span>
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};
