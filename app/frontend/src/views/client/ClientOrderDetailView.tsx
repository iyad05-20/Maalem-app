import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  XCircle,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  ArrowLeft,
  Package,
  ChevronRight,
  X,
  Bell,
  Clock,
} from "lucide-react";
import type { ClientOrder } from "../../types/clientPayment";
import { clientWalletAPI } from "../../services/clientWalletApi";
import { useClientI18n, getStatusLabel } from "../../services/i18n";

interface ClientOrderDetailViewProps {
  orderId?: string;
  userId?: string;
  onBack?: () => void;
  onNavigateToWallet?: () => void;
  onDetailToggle?: (isOpen: boolean) => void;
}

const STATUS_COLORS: Record<string, string> = {
  en_attente_artisan: "#D4AF37",
  devis_recu: "#2D6A4F",
  en_attente_paiement: "#CC7755",
  paiement_echoue: "#DC3545",
  acompte_verse: "#4A7C59",
  payee_integralement: "#4A7C59",
  en_preparation: "#D4AF37",
  en_cours_de_transport: "#1A2A3A",
  livre: "#2D6A4F",
  auto_valide: "#4A7C59",
  en_reclamation: "#DC3545",
  litige_post_liberation: "#CC7755",
  retour_initie: "#CC7755",
  complete: "#2D6A4F",
  annulee: "#6B7280",
};

const getStatusSteps = (status: string, lang = "fr") => {
  if (status === "en_attente_artisan" || status === "devis_recu") {
    return [
      { label: lang === "ar" ? "المشروع" : "Projet", active: status === "en_attente_artisan", done: status === "devis_recu" },
      { label: lang === "ar" ? "العروض" : "Devis", active: status === "devis_recu", done: false },
      { label: lang === "ar" ? "الورشة" : "Atelier", active: false, done: false },
      { label: lang === "ar" ? "التسليم" : "Remis", active: false, done: false },
    ];
  }

  const steps = [
    { label: lang === "ar" ? "الدفع" : "Paiement", active: false, done: false },
    { label: lang === "ar" ? "الورشة" : "Atelier", active: false, done: false },
    { label: lang === "ar" ? "الشحن" : "Transit", active: false, done: false },
    { label: lang === "ar" ? "التسليم" : "Remis", active: false, done: false },
  ];

  if (status === "en_attente_paiement" || status === "paiement_echoue" || status === "paiement_initie") {
    steps[0].active = true;
  } else if (status === "acompte_verse" || status === "payee_integralement") {
    steps[0].done = true;
    steps[1].active = true;
  } else if (status === "en_preparation" || status === "pret_a_expedier") {
    steps[0].done = true;
    steps[1].active = true;
  } else if (status === "en_cours_de_transport") {
    steps[0].done = true;
    steps[1].done = true;
    steps[2].active = true;
  } else if (status === "livre" || status === "complete" || status === "auto_valide") {
    steps[0].done = true;
    steps[1].done = true;
    steps[2].done = true;
    steps[3].done = true;
  } else if (status === "en_reclamation" || status === "retour_initie" || status === "litige_post_liberation") {
    steps[0].done = true;
    steps[1].done = true;
    steps[2].done = true;
    steps[3].active = true;
  }

  return steps;
};

export const ClientOrderDetailView: React.FC<ClientOrderDetailViewProps> = ({
  orderId,
  userId,
  onBack,
  onNavigateToWallet,
  onDetailToggle,
}) => {
  const { lang, changeLanguage } = useClientI18n();
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<ClientOrder | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modales
  const [showCmiModal, setShowCmiModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [cgvAccepted, setCgvAccepted] = useState(false);
  const [showCgvTextModal, setShowCgvTextModal] = useState(false);

  // Formulaires & Sécurité
  const returnMode: "sendit" | "propres_moyens" = "propres_moyens";
  const [trackingNumber, setTrackingNumber] = useState("");
  const [extendHours, setExtendHours] = useState<24 | 48 | 72>(24);
  const [disputeReasonCategory, setDisputeReasonCategory] = useState("Défaut de structure / assemblage (fissure interne, collage défaillant)");
  const [disputeType, setDisputeType] = useState<string>("vice_cache_3mois");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputePhotoUrl, setDisputePhotoUrl] = useState("");

  // Signature Canvas state (Art. 11.2)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const [paymentChoice, setPaymentChoice] = useState<"deposit" | "total">("deposit");
  const prepPhotos: string[] = selectedOrder && Array.isArray((selectedOrder as any).prepPhotos)
    ? (selectedOrder as any).prepPhotos
    : [];
  const isPrepBypass = prepPhotos.some(url => String(url).startsWith("bypass:"));
  const validPrepPhotos = prepPhotos.filter(url => !String(url).startsWith("bypass:"));


  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHasSignature(false);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = "#1A2A3A";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const VICE_CACHE_REASONS = [
    "Défaut de structure / assemblage (fissure interne, collage défaillant)",
    "Défaut de matière ou de matériau (cuir/bois non traité, vice de fabrication)",
    "Usure anormale ou dégradation précoce après utilisation normale",
    "Non-conformité grave non apparente lors de la livraison initiale",
    "Autre vice caché grave",
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await clientWalletAPI.fetchOrders(userId || "client-me");
      setOrders(list);
      if (orderId) {
        const current = list.find((o: ClientOrder) => o.id === orderId) || null;
        setSelectedOrder(current);
        if (current && ["complete", "annulee"].includes(current.status)) {
          setActiveTab("history");
        } else {
          setActiveTab("active");
        }
      } else {
        setSelectedOrder(null);
      }
    } catch {
      setMessage({ type: "error", text: "Impossible de charger les commandes." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [orderId]);

  useEffect(() => {
    if (onDetailToggle) {
      onDetailToggle(selectedOrder !== null);
    }
  }, [selectedOrder, onDetailToggle]);

  useEffect(() => {
    return () => {
      if (onDetailToggle) {
        onDetailToggle(false);
      }
    };
  }, [onDetailToggle]);

  if (loading && orders.length === 0) {
    return (
      <div className="app-view" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-secondary)" }}>Chargement de vos commandes Vork…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="app-view" style={{ paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={onBack} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
            <ArrowLeft size={18} color="var(--primary)" />
          </button>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--primary)", margin: 0 }}>Mes Commandes</h1>
        </div>

        <div style={{ background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", padding: "32px 20px", textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
          <Package size={36} color="var(--text-secondary)" style={{ marginBottom: 12 }} />
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--primary)", margin: "0 0 6px 0" }}>Aucune commande active</h3>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>Vous n'avez aucune commande pour le moment.</p>
          <button onClick={loadData} style={{ padding: "12px 20px", borderRadius: 14, background: "var(--primary)", color: "#fff", border: "none", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Recharger les données
          </button>
        </div>
      </div>
    );
  }

  const isCustom = selectedOrder ? ["personnalise", "sur_commande"].includes(selectedOrder.productType) : false;
  const isHighAmount = selectedOrder ? selectedOrder.totalPrice >= 1000 : false;
  const depositAmount = selectedOrder ? (isHighAmount ? Math.round(selectedOrder.totalPrice * 0.5) : selectedOrder.totalPrice) : 0;

  let diffMinutes = 0;
  if (selectedOrder && selectedOrder.acceptedAt) {
    diffMinutes = (Date.now() - new Date(selectedOrder.acceptedAt).getTime()) / (1000 * 60);
  }
  const isGracePeriodActive = selectedOrder ? !!(isCustom && selectedOrder.acceptedAt && diffMinutes <= 60) : false;
  const isCustomLocked = selectedOrder ? !!(isCustom && selectedOrder.acceptedAt && diffMinutes > 60) : false;

  let daysSinceDelivery = 0;
  let hoursSinceDelivery = 0;
  if (selectedOrder && selectedOrder.deliveredAt) {
    hoursSinceDelivery = (Date.now() - new Date(selectedOrder.deliveredAt).getTime()) / (1000 * 60 * 60);
    daysSinceDelivery = hoursSinceDelivery / 24;
  }

  // Tâche 2 : Relance J+2 (heures 34h→48h = 10h00 à minuit J+2 - Art. 5.1 & 5.2)
  let hoursSinceCreation = 0;
  if (selectedOrder?.createdAt) {
    hoursSinceCreation = (Date.now() - new Date(selectedOrder.createdAt).getTime()) / (1000 * 60 * 60);
  }
  const showJ2Relance = ["acompte_verse", "payee_integralement"].includes(selectedOrder?.status || "")
    && hoursSinceCreation >= 34
    && hoursSinceCreation < 48;

  // Tâche 3 : Bannière validation réception 24h (Art. 4.3 C)
  const showValidateDeliveryBanner = selectedOrder?.status === "livre" && hoursSinceDelivery < 24;
  const showValidateReminder18h = showValidateDeliveryBanner && hoursSinceDelivery >= 18;
  const hoursLeftToValidate = Math.max(0, 24 - hoursSinceDelivery);

  // Tâche 4 : Déclaration non-réception 24h après validation automatique (Art. 4.3 D)
  let hoursAfterAutoValidation = 0;
  if (selectedOrder?.autoValidatedAt) {
    hoursAfterAutoValidation = (Date.now() - new Date(selectedOrder.autoValidatedAt).getTime()) / (1000 * 60 * 60);
  }
  const canDeclareNotReceived = selectedOrder?.status === "auto_valide" && hoursAfterAutoValidation < 24;

  const canReturn7d = selectedOrder ? (!isCustom && ["livre", "auto_valide"].includes(selectedOrder.status) && daysSinceDelivery <= 7) : false;
  const canDispute90d = selectedOrder ? (
    ["livre", "auto_valide", "complete"].includes(selectedOrder.status) && daysSinceDelivery <= 90
  ) : false;
  const isDisputePostEscrow = selectedOrder ? (canDispute90d && daysSinceDelivery > 15) : false;
  const canCancel = selectedOrder ? (!["en_cours_de_transport", "livre", "auto_valide", "complete", "annulee"].includes(selectedOrder.status)) : false;

  // Actions sécurisées
  const handlePay = async () => {
    if (!selectedOrder || loading) return;
    if (!hasSignature) {
      setMessage({ type: "error", text: "Veuillez apposer votre signature électronique obligatoire (Art. 11.2) sur la zone dédiée avant de valider." });
      return;
    }
    setLoading(true); setMessage(null);
    try {
      const res = await clientWalletAPI.payOrder(selectedOrder.id, paymentChoice);
      setShowCmiModal(false);
      if (res.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else {
        setMessage({ type: "success", text: `Paiement CMI 3D Secure validé (${res.amount} MAD réglés). Signature numérique enregistrée.` });
        await loadData();
      }
    } catch (e: unknown) {
      setMessage({ type: "error", text: (e as Error).message });
    } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!selectedOrder || loading || isCustomLocked) return;
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette commande ?")) return;
    setLoading(true); setMessage(null);
    try {
      const res = await clientWalletAPI.cancelOrder(selectedOrder.id);
      setMessage({ type: "success", text: `Commande annulée. ${res.refundAmount} MAD crédités sur votre Wallet Vork.` });
      await loadData();
    } catch (e: unknown) {
      setMessage({ type: "error", text: (e as Error).message });
    } finally { setLoading(false); }
  };

  const handleReturnSubmit = async () => {
    if (!selectedOrder || loading) return;
    setLoading(true); setMessage(null);
    try {
      await clientWalletAPI.requestReturn(selectedOrder.id, returnMode, 35);
      setShowReturnModal(false);
      setMessage({ type: "success", text: "Demande de retour initiée. L'artisan dispose de 48h à réception." });
      await loadData();
    } catch (e: unknown) {
      setMessage({ type: "error", text: (e as Error).message });
    } finally { setLoading(false); }
  };

  const handleCancelReturn = async () => {
    if (!selectedOrder || loading) return;
    if (!window.confirm("Voulez-vous annuler votre demande de retour et conserver l'article ?")) return;
    setLoading(true); setMessage(null);
    try {
      await clientWalletAPI.cancelReturnRequest(selectedOrder.id);
      setMessage({ type: "success", text: "Demande de retour annulée (Art. 9.5 bis). La commande reprend son cours." });
      await loadData();
    } catch (e: unknown) {
      setMessage({ type: "error", text: (e as Error).message });
    } finally { setLoading(false); }
  };

  const handleExtendSubmit = async () => {
    if (!selectedOrder || loading) return;
    setLoading(true); setMessage(null);
    try {
      await clientWalletAPI.extendSellerDeadline(selectedOrder.id, extendHours);
      setShowExtendModal(false);
      setMessage({ type: "success", text: `Délai accordé au Maâlem prolongé de ${extendHours}h avec succès.` });
      await loadData();
    } catch (e: unknown) {
      setMessage({ type: "error", text: (e as Error).message });
    } finally { setLoading(false); }
  };

  const handleDisputeSubmit = async () => {
    if (!selectedOrder) return;
    const fullReason = `[${disputeReasonCategory}] ${disputeReason.trim()}`.slice(0, 500);
    if (loading) return;
    setLoading(true); setMessage(null);
    try {
      await clientWalletAPI.createDispute(
        selectedOrder.id, 
        fullReason, 
        disputePhotoUrl ? [disputePhotoUrl.trim()] : [],
        disputeType
      );
      setShowDisputeModal(false);
      const msg = isDisputePostEscrow
        ? "Réclamation transmise (Art. 11.6). Les fonds étant déjà libérés, le Vendeur dispose de 15 jours pour vous rembourser directement."
        : "Réclamation transmise à Vork. L'escrow est gelé pour arbitrage.";
      setMessage({ type: "success", text: msg });
      await loadData();
    } catch (e: unknown) {
      setMessage({ type: "error", text: (e as Error).message });
    } finally { setLoading(false); }
  };

  // Tâche 3 : Validation manuelle de la réception (Art. 4.3 C & 13.3)
  const handleValidateDelivery = async () => {
    if (!selectedOrder || loading) return;
    if (!window.confirm("Confirmez-vous la bonne réception de votre commande ?")) return;
    setLoading(true); setMessage(null);
    try {
      await clientWalletAPI.validateDelivery(selectedOrder.id);
      setMessage({ type: "success", text: "Réception confirmée avec succès." });
      await loadData();
    } catch (e: unknown) {
      setMessage({ type: "error", text: (e as Error).message });
    } finally { setLoading(false); }
  };

  // Approbation client de la réception en mains propres (Livraison Vendeur - Priorité 11/09/2026 & Art. 13/18 CGV)
  const handleApproveReceipt = async () => {
    if (!selectedOrder || loading) return;
    if (!window.confirm("Confirmez-vous avoir bien reçu votre commande remise en mains propres par le Maâlem ?")) return;
    setLoading(true); setMessage(null);
    try {
      await clientWalletAPI.approveReceipt(selectedOrder.id);
      const isCustomProd = ["personnalise", "sur_commande"].includes(selectedOrder.productType);
      const successText = isCustomProd
        ? "Réception validée avec succès. S'agissant d'un produit sur-mesure confectionné pour vous, les fonds ont été libérés au Maâlem."
        : "Réception validée avec succès. Votre délai légal de rétractation de 7 jours est désormais ouvert (Art. 18 & 19 CGV).";
      setMessage({ type: "success", text: successText });
      await loadData();
    } catch (e: unknown) {
      setMessage({ type: "error", text: (e as Error).message });
    } finally { setLoading(false); }
  };

  // Tâche 4 : Déclaration de non-réception (Art. 13.3)
  const handleDeclareNotReceived = async () => {
    if (!selectedOrder || loading) return;
    if (!window.confirm("Confirmer que vous n'avez pas reçu ce colis ? Cette déclaration ouvre une enquête.")) return;
    setLoading(true); setMessage(null);
    try {
      await clientWalletAPI.declareNotReceived(selectedOrder.id);
      setMessage({ type: "success", text: "Déclaration de non-réception transmise à Vork. Enquête ouverte." });
      await loadData();
    } catch (e: unknown) {
      setMessage({ type: "error", text: (e as Error).message });
    } finally { setLoading(false); }
  };

  // Acceptation Devis Atelier Sur-Mesure
  const handleAcceptCustomQuote = async (requestId: string, quoteIndex = 0, artisanRef?: string) => {
    setLoading(true); setMessage(null);
    try {
      const res = await clientWalletAPI.acceptCustomQuote(requestId, quoteIndex, artisanRef);
      setMessage({ type: "success", text: res.message || "Devis accepté avec succès ! La commande est en préparation." });
      await loadData();
      const updated = await clientWalletAPI.fetchOrders(userId || "client-me");
      const converted = updated.find(o => o.id === res.orderId || o.id.includes(requestId.replace(/^req_/, '')));
      if (converted) {
        setSelectedOrder(converted);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Erreur lors de l'acceptation du devis." });
    } finally {
      setLoading(false);
    }
  };


  const visibleOrders = activeTab === "active"
    ? orders.filter(o => !["complete", "annulee"].includes(o.status))
    : orders.filter(o => ["complete", "annulee"].includes(o.status));

  const statusColor = selectedOrder ? (STATUS_COLORS[selectedOrder.status] || "#6B7280") : "#6B7280";
  const statusLabel = selectedOrder ? getStatusLabel(selectedOrder.status, lang) : "";

  return (
    <div className="app-view" style={{ paddingTop: 0, position: "relative" }}>

      {/* ── Mobile Top Header (Always list header) ────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, marginBottom: 12 }}>
        <button onClick={onBack} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}>
          <ArrowLeft size={18} color="var(--primary)" style={{ transform: lang === "ar" ? "rotate(180deg)" : "none" }} />
        </button>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--primary)", margin: 0 }}>
          {lang === "ar" ? "قائمة طلباتي" : "Mes Commandes"}
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => changeLanguage(lang === "ar" ? "fr" : "ar")}
            style={{
              background: "rgba(196,169,106,0.18)",
              border: "1px solid rgba(196,169,106,0.45)",
              borderRadius: 8,
              padding: "4px 8px",
              fontFamily: "var(--font-body)",
              fontSize: 10,
              fontWeight: 800,
              color: "#1A2A3A",
              cursor: "pointer",
            }}
          >
            {lang === "ar" ? "Français" : "العربية"}
          </button>
          {onNavigateToWallet ? (
            <button onClick={onNavigateToWallet} style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 12, padding: "6px 10px", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 600, color: "#8B6914", cursor: "pointer" }}>
              Wallet
            </button>
          ) : <div style={{ width: 30 }} />}
        </div>
      </div>

      {/* ── Feedback Banner (Only shown on list page) ─────────────── */}
      <AnimatePresence>
        {message && !selectedOrder && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: "12px 14px", borderRadius: 14, marginBottom: 16, background: message.type === "success" ? "rgba(45,106,79,0.10)" : "rgba(220,53,69,0.10)", border: `1px solid ${message.type === "success" ? "rgba(45,106,79,0.30)" : "rgba(220,53,69,0.30)"}`, display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-body)", fontSize: 12, color: message.type === "success" ? "#2D6A4F" : "#DC3545" }}>
            {message.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span style={{ flex: 1 }}>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Segmented Tab Switcher */}
      <div style={{ display: "flex", background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: 4, marginBottom: 16 }}>
        <button
          onClick={() => setActiveTab("active")}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 10,
            border: "none",
            background: activeTab === "active" ? "#FFFFFF" : "transparent",
            color: activeTab === "active" ? "var(--primary)" : "var(--text-secondary)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            boxShadow: activeTab === "active" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.2s ease"
          }}
        >
          {lang === "ar" ? "الطلبات الجارية" : "En cours"} ({orders.filter(o => !["complete", "annulee"].includes(o.status)).length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          style={{
            flex: 1,
            padding: "8px 0",
            borderRadius: 10,
            border: "none",
            background: activeTab === "history" ? "#FFFFFF" : "transparent",
            color: activeTab === "history" ? "var(--primary)" : "var(--text-secondary)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            boxShadow: activeTab === "history" ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
            transition: "all 0.2s ease"
          }}
        >
          {lang === "ar" ? "سجل الطلبات" : "Historique"} ({orders.filter(o => ["complete", "annulee"].includes(o.status)).length})
        </button>
      </div>

      {/* Vertical scroll list of orders (Premium Minimalist Cards) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", maxHeight: "calc(100vh - 200px)", paddingBottom: 40, scrollbarWidth: "none" }}>
        {visibleOrders.length > 0 ? (
          visibleOrders.map((o) => {
            const getSimpleStatus = (status: string) => {
              switch (status) {
                case "en_attente_artisan":
                  return { dotColor: "#D4AF37", label: lang === "ar" ? "قيد الدراسة" : "En attente devis" };
                case "devis_recu":
                  return { dotColor: "#2D6A4F", label: lang === "ar" ? "تم استلام عرض" : "Devis disponible" };
                case "en_attente_paiement":
                case "paiement_initie":
                case "paiement_echoue":
                  return { dotColor: "#CC7755", label: lang === "ar" ? "الأداء" : "Paiement" };
                case "acompte_verse":
                case "payee_integralement":
                case "en_preparation":
                  return { dotColor: "#D4AF37", label: lang === "ar" ? "قيد الصنع" : "Fabrication" };
                case "en_cours_de_transport":
                  return { dotColor: "#1A2A3A", label: lang === "ar" ? "قيد الشحن" : "Livraison" };
                case "livre":
                case "complete":
                  return { dotColor: "#2D6A4F", label: lang === "ar" ? "تم التسليم" : "Livrée" };
                case "en_reclamation":
                case "retour_initie":
                  return { dotColor: "#DC3545", label: lang === "ar" ? "شكوى / إرجاع" : "Litige" };
                case "annulee":
                default:
                  return { dotColor: "#6B7280", label: lang === "ar" ? "ملغاة" : "Annulée" };
              }
            };
            const statInfo = getSimpleStatus(o.status);

            return (
              <div 
                key={o.id} 
                onClick={() => setSelectedOrder(o)}
                style={{
                  display: 'flex',
                  gap: 16,
                  background: '#FFFEFC',
                  border: '1px solid rgba(196, 169, 106, 0.12)',
                  borderRadius: 16,
                  padding: 16,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(26, 42, 58, 0.02)',
                  alignItems: 'center',
                  textAlign: 'left'
                }}
              >
                {/* Product image (larger, premium) */}
                <img 
                  src={o.productImage || 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=500&q=80'} 
                  alt={o.productTitle} 
                  style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', border: '1px solid rgba(26, 42, 58, 0.05)' }}
                />
                
                {/* Middle details: title and simplified status */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.productTitle}
                  </p>
                  
                  {/* Status text with simple colored dot */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: statInfo.dotColor, flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {statInfo.label}
                    </span>
                  </div>
                </div>

                {/* Right side: price and clickable arrow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary)', margin: 0 }}>
                    {o.totalPrice > 0 ? `${o.totalPrice} ${lang === "ar" ? "د.م" : "MAD"}` : (lang === "ar" ? "على العرض" : "Sur devis")}
                  </p>
                  <ChevronRight size={16} color="var(--text-secondary)" style={{ opacity: 0.6, transform: lang === "ar" ? "rotate(180deg)" : "none" }} />
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ background: "var(--surface)", borderRadius: 20, border: "1px dashed var(--border)", padding: "48px 20px", textAlign: "center", marginTop: 20 }}>
            <Package size={36} color="var(--text-secondary)" style={{ marginBottom: 12, opacity: 0.7 }} />
            <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--primary)", margin: "0 0 6px 0" }}>
              {lang === "ar" ? "لا توجد أي طلبات" : "Aucune commande"}
            </h4>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
              {activeTab === "active" 
                ? (lang === "ar" ? "ليس لديك أي طلبات قيد المعالجة حالياً." : "Vous n'avez pas de commande en cours de traitement.") 
                : (lang === "ar" ? "سجل طلباتك المكتملة فارغ حالياً." : "Votre historique de commande est vide.")}
            </p>
          </div>
        )}
      </div>

      {/* ── PREMIUM DETAILED OVERLAY (slides up from bottom when selectedOrder !== null) ── */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={() => setSelectedOrder(null)}
            style={{ 
              position: "fixed", 
              inset: 0, 
              background: "rgba(26,42,58,0.45)", 
              backdropFilter: "blur(6px)", 
              WebkitBackdropFilter: "blur(6px)", 
              display: "flex", 
              alignItems: "flex-end", 
              justifyContent: "center", 
              zIndex: 80 
            }}
          >
            <motion.div 
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }} 
              transition={{ type: "spring", damping: 25, stiffness: 200 }} 
              onClick={(e) => e.stopPropagation()}
              style={{ 
                background: "#FCFBF9", 
                borderRadius: "32px 32px 0 0", 
                padding: "20px 20px 40px", 
                width: "100%", 
                maxWidth: 640,
                height: "92vh", 
                boxShadow: "0 -10px 40px rgba(0,0,0,0.15)",
                borderTop: "1.5px solid rgba(196, 169, 106, 0.2)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden"
              }}
            >
              {/* Grabber Handle */}
              <div style={{ width: 40, height: 4, background: "rgba(0,0,0,0.1)", borderRadius: 2, margin: "0 auto 16px", flexShrink: 0 }} />

              {/* Overlay Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexShrink: 0 }}>
                <button 
                  onClick={() => setSelectedOrder(null)} 
                  style={{ 
                    background: "var(--surface)", 
                    border: "1px solid var(--border)", 
                    borderRadius: 12, 
                    width: 36, 
                    height: 36, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    cursor: "pointer" 
                  }}
                >
                  <ArrowLeft size={16} color="var(--primary)" />
                </button>
                <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--primary)", margin: 0 }}>
                  {lang === "ar" ? "متابعة إنجاز وتوصيل الطلب" : "Suivi de Création"}
                </h2>
                <button 
                  onClick={() => setSelectedOrder(null)} 
                  style={{ 
                    background: "var(--surface)", 
                    border: "1px solid var(--border)", 
                    borderRadius: 12, 
                    width: 36, 
                    height: 36, 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    cursor: "pointer" 
                  }}
                >
                  <X size={16} color="var(--primary)" />
                </button>
              </div>

              {/* Scrollable Overlay Content */}
              <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, scrollbarWidth: "none" }}>
                
                {/* Stepper Progress Bar */}
                <div style={{ background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", padding: "20px 16px", marginBottom: 16, boxShadow: "var(--shadow-sm)" }}>
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--primary)", margin: "0 0 16px 0" }}>
                    {lang === "ar" ? "مراحل الصنع والتوصيل" : "État de fabrication & livraison"}
                  </p>
                  
                  <div style={{ display: "flex", width: "100%", position: "relative", alignItems: "flex-start", padding: "4px 0" }}>
                    {getStatusSteps(selectedOrder.status, lang).map((step, idx, arr) => {
                      const isLast = idx === arr.length - 1;
                      const isRTL = lang === "ar";
                      return (
                        <div 
                          key={idx} 
                          style={{ 
                            flex: 1, 
                            display: "flex", 
                            flexDirection: "column", 
                            alignItems: "center", 
                            position: "relative",
                            minWidth: 0,
                          }}
                        >
                          {/* Segment de liaison parfaitement aligné de centre à centre (1 à 4) */}
                          {!isLast && (
                            <div 
                              style={{ 
                                position: "absolute", 
                                top: 11.5, 
                                height: 3, 
                                width: "100%", 
                                background: step.done ? "#4A7C59" : "#E5E7EB", 
                                zIndex: 0, 
                                transition: "background 0.4s ease",
                                ...(isRTL 
                                  ? { right: "50%", left: "auto" } 
                                  : { left: "50%", right: "auto" }
                                )
                              }} 
                            />
                          )}

                          {/* Bulle d'étape numérotée (1 à 4) */}
                          <div 
                            style={{ 
                              width: 26, 
                              height: 26, 
                              borderRadius: "50%", 
                              background: step.done ? "#4A7C59" : step.active ? "#D4AF37" : "#FFFFFF", 
                              border: `2px solid ${step.done ? "#4A7C59" : step.active ? "#D4AF37" : "#CBD5E1"}`, 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              fontSize: 10.5, 
                              fontWeight: 700, 
                              color: step.done ? "#FFFFFF" : step.active ? "#FFFFFF" : "#64748B", 
                              boxShadow: step.active 
                                ? "0 0 0 4px rgba(212,175,55,0.22), 0 2px 6px rgba(212,175,55,0.25)" 
                                : step.done 
                                ? "0 2px 6px rgba(45,106,79,0.2)" 
                                : "none", 
                              zIndex: 1, 
                              position: "relative",
                              transition: "all 0.3s ease" 
                            }}
                          >
                            {step.done ? "✓" : idx + 1}
                          </div>

                          {/* Libellé sous la bulle */}
                          <span 
                            style={{ 
                              marginTop: 6, 
                              fontFamily: "var(--font-body)", 
                              fontSize: 10.5, 
                              fontWeight: step.active || step.done ? 700 : 500, 
                              color: step.active ? "#8B6914" : step.done ? "#2D6A4F" : "#64748B", 
                              textAlign: "center",
                              padding: "0 2px",
                              wordBreak: "break-word",
                              lineHeight: 1.2
                            }}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Product Card */}
                <div style={{ background: "var(--surface)", borderRadius: 20, border: "1px solid var(--border)", overflow: "hidden", marginBottom: 16, boxShadow: "var(--shadow-md)" }}>
                  {selectedOrder.productImage && (
                    <div style={{ position: "relative", height: 140, overflow: "hidden" }}>
                      <img src={selectedOrder.productImage} alt={selectedOrder.productTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(26,42,58,0.85) 0%, transparent 65%)" }} />
                      <div style={{ position: "absolute", bottom: 12, left: 14, right: 14 }}>
                        <span style={{ display: "inline-block", background: isCustom ? "rgba(204,119,85,0.90)" : "rgba(156,175,136,0.90)", color: "#fff", fontSize: 10, fontWeight: 700, fontFamily: "var(--font-body)", padding: "2px 8px", borderRadius: 12, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
                          {isCustom ? (lang === "ar" ? "تفصيل خاص" : "Sur-Mesure") : (lang === "ar" ? "جاهز للتسليم" : "Prêt-à-porter")}
                        </span>
                        <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedOrder.productTitle}</p>
                      </div>
                    </div>
                  )}

                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                          {lang === "ar" ? "المعلم الصانع" : "Maâlem Créateur"}
                        </p>
                        <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "var(--primary)", margin: 0 }}>{selectedOrder.artisanName || selectedOrder.artisanRef}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                          {lang === "ar" ? "المجموع الكلي" : "Prix Total"}
                        </p>
                        <p style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16, color: "var(--primary)", margin: 0 }}>{selectedOrder.totalPrice} <span style={{ fontSize: 11, fontWeight: 500 }}>{lang === "ar" ? "د.م" : "MAD"}</span></p>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor }} />
                        <span style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
                      </div>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)" }}>{new Date(selectedOrder.createdAt).toLocaleDateString(lang === "ar" ? "ar-MA" : "fr-FR")}</span>
                    </div>
                  </div>
                </div>

                {/* Overlay Inner Feedback Banner */}
                {message && (
                  <div style={{ padding: "12px 14px", borderRadius: 14, marginBottom: 16, background: message.type === "success" ? "rgba(45,106,79,0.10)" : "rgba(220,53,69,0.10)", border: `1px solid ${message.type === "success" ? "rgba(45,106,79,0.30)" : "rgba(220,53,69,0.30)"}`, display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-body)", fontSize: 12, color: message.type === "success" ? "#2D6A4F" : "#DC3545" }}>
                    {message.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                    <span style={{ flex: 1 }}>{message.text}</span>
                  </div>
                )}

                {/* Action Buttons Section */}
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--primary)", marginBottom: 10 }}>
                    {lang === "ar" ? "الإجراءات المتاحة" : "Actions disponibles"}
                  </p>

                  {/* ── Section Devis Reçus (Projets Atelier Sur-Mesure) ── */}
                  {(selectedOrder as any).quotes && (selectedOrder as any).quotes.length > 0 && !selectedOrder.acceptedAt && (
                    <div style={{ background: "rgba(45,106,79,0.06)", border: "1.5px solid rgba(45,106,79,0.25)", borderRadius: 16, padding: "16px", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <CheckCircle size={18} color="#2D6A4F" />
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#2D6A4F" }}>
                          {lang === "ar" ? "عروض الأسعار المستلمة من الحرفيين" : "Offres & Devis Reçus des Maâlems"}
                        </span>
                      </div>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--text-secondary)", margin: "0 0 12px" }}>
                        {lang === "ar" 
                          ? "قام المعلم بدراسة مواصفاتك وقدّم هذا العرض المفصل. يمكنك قبوله لبدء الصنع فوراً."
                          : "Un Maâlem a étudié vos spécifications Atelier et vous propose le chiffrage ci-dessous. Acceptez le devis pour lancer la confection."}
                      </p>

                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {(selectedOrder as any).quotes.map((q: any, qIdx: number) => (
                          <div key={qIdx} style={{ background: "#FFFFFF", borderRadius: 12, border: "1px solid rgba(45,106,79,0.2)", padding: "12px", display: "flex", flexDirection: "column", gap: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--primary)" }}>
                                {q.artisanName || "Maâlem Abdelkader"}
                              </span>
                              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "#2D6A4F" }}>
                                {q.proposedPrice} {lang === "ar" ? "د.م" : "MAD"}
                              </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-secondary)" }}>
                              <Clock size={13} color="var(--text-secondary)" />
                              <span>{lang === "ar" ? `مدة الإنجاز : ${q.confectionDays} يوماً` : `Délai de confection : ${q.confectionDays} jours`}</span>
                            </div>
                            {q.note && (
                              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: 0, fontStyle: "italic", background: "#F9F8F6", padding: "6px 8px", borderRadius: 6 }}>
                                "{q.note}"
                              </p>
                            )}
                            <button
                              onClick={() => handleAcceptCustomQuote(selectedOrder.id, qIdx, q.artisanRef)}
                              disabled={loading}
                              style={{
                                marginTop: 4,
                                padding: "10px",
                                borderRadius: 10,
                                border: "none",
                                background: "#2D6A4F",
                                color: "#FFFFFF",
                                fontFamily: "var(--font-display)",
                                fontWeight: 700,
                                fontSize: 12,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                boxShadow: "0 2px 6px rgba(45,106,79,0.25)"
                              }}
                            >
                              <CheckCircle size={15} />
                              {lang === "ar" ? "قبول هذا العرض وبدء التصنيع" : "Accepter ce devis & Lancer la fabrication"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Section En attente de devis (Projet sur le Marché Public) ── */}
                  {(selectedOrder as any).status === "en_attente_artisan" && !(selectedOrder as any).quotes?.length && (
                    <div style={{ background: "rgba(212,175,55,0.08)", border: "1.5px solid rgba(212,175,55,0.3)", borderRadius: 16, padding: "16px", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <Clock size={18} color="#8B6914" />
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#8B6914" }}>
                          {lang === "ar" ? "مشروعك معروض على الحرفيين" : "Projet diffusé sur le Marché des Artisans"}
                        </span>
                      </div>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                        {lang === "ar"
                          ? "تمت مشاركة مواصفات مشروعك وصورته مع أمهر الحرفيين المغاربة. ستتلقى عروض الأسعار مع المهل الزمنية هنا بمجرد تقديمها."
                          : "Votre projet et la simulation visuelle sont actuellement examinés par les Maâlems. Dès qu'un artisan formule une proposition (prix et délai), elle apparaîtra ici et vous recevrez une notification."}
                      </p>
                    </div>
                  )}

                  {/* ── Tâche 2 : Relance Maâlem J+2 (10h00 → Minuit - Art. 5.1 & 5.2) ── */}
                  {showJ2Relance && (
                    <div style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 16, padding: "14px 16px", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <Bell size={16} color="#8B6914" />
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#8B6914" }}>
                          {lang === "ar" ? "تذكير المعلم (اليوم + 2)" : "Relance Maâlem J+2 — Fenêtre 10h00 à Minuit"}
                        </span>
                      </div>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: "0 0 10px" }}>
                        {lang === "ar" 
                          ? "لم يؤكد المعلم طلبكم بعد. بدون اتخاذ إجراء، سيتم إلغاء الطلب تلقائياً عند منتصف الليل واسترداد كامل المبلغ." 
                          : "Le Maâlem n'a pas encore validé votre commande payée. Sans action de votre part avant minuit (00h00), la commande sera automatiquement annulée et remboursée à 100%."}
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleCancel} disabled={loading} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "1px solid #C0392B", background: "rgba(192,57,43,0.06)", color: "#C0392B", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                          {lang === "ar" ? "إلغاء الآن" : "Annuler maintenant"}
                        </button>
                        <button onClick={() => setShowExtendModal(true)} disabled={loading} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "none", background: "var(--primary)", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                          {lang === "ar" ? "تمديد المهلة للمعلم" : "Prolonger le Maâlem"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Tâche 3 : Bannière Validation Réception 24h (Art. 4.3 C) ── */}
                  {showValidateDeliveryBanner && (
                    <div style={{ background: showValidateReminder18h ? "rgba(220,53,69,0.08)" : "rgba(45,106,79,0.08)", border: `1px solid ${showValidateReminder18h ? "rgba(220,53,69,0.3)" : "rgba(45,106,79,0.3)"}`, borderRadius: 16, padding: "14px 16px", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <CheckCircle size={16} color={showValidateReminder18h ? "#DC3545" : "#2D6A4F"} />
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: showValidateReminder18h ? "#DC3545" : "#2D6A4F" }}>
                          {showValidateReminder18h 
                            ? (lang === "ar" ? "⚠️ اقتراب مهلة التأكيد التلقائي" : "⚠️ Validation automatique imminente") 
                            : (lang === "ar" ? "✅ تأكيد استلام الشحنة" : "✅ Confirmez la réception")}
                        </span>
                      </div>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: "0 0 10px" }}>
                        {showValidateReminder18h
                          ? (lang === "ar" ? `متبقي حوالي ${Math.ceil(hoursLeftToValidate)} ساعة للتأكيد قبل التثبيت التلقائي.` : `Il vous reste environ ${Math.ceil(hoursLeftToValidate)}h pour valider. Sans action, la réception sera validée automatiquement à minuit (Art. 4.3 C).`)
                          : (lang === "ar" ? `تم تسليم الشحنة. لديكم ٢٤ ساعة لتأكيد الاستلام أو الإبلاغ عن أي ملاحظة. (متبقي ~${Math.ceil(hoursLeftToValidate)} س)` : `Votre colis a été livré. Vous disposez de 24h pour confirmer la réception ou signaler un défaut apparent. (Encore ~${Math.ceil(hoursLeftToValidate)}h)`)
                        }
                      </p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setShowDisputeModal(true)} disabled={loading} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "1px solid rgba(212,175,55,0.4)", background: "rgba(212,175,55,0.08)", color: "#8B6914", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                          {lang === "ar" ? "الإبلاغ عن ملاحظة" : "Signaler un défaut"}
                        </button>
                        <button onClick={handleValidateDelivery} disabled={loading} style={{ flex: 1, padding: "9px", borderRadius: 10, border: "none", background: "#2D6A4F", color: "#fff", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                          {loading ? "…" : (lang === "ar" ? "تأكيد الاستلام والتوقيع" : "Confirmer la réception")}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Approbation Réception Livraison Vendeur (Priorité 11/09/2026 & Art. 13/18 CGV) ── */}
                  {selectedOrder.transportProvider === "vendeur" && selectedOrder.status === "livre" && selectedOrder.clientApprovalStatus !== "approved" && (
                    <div style={{ background: selectedOrder.clientApprovalRequestedAt ? "rgba(212,175,55,0.12)" : "rgba(45,106,79,0.08)", border: `1.5px solid ${selectedOrder.clientApprovalRequestedAt ? "#D4AF37" : "rgba(45,106,79,0.3)"}`, borderRadius: 16, padding: "16px", marginBottom: 14, boxShadow: "var(--shadow-sm)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <CheckCircle size={18} color={selectedOrder.clientApprovalRequestedAt ? "#8B6914" : "#2D6A4F"} />
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: selectedOrder.clientApprovalRequestedAt ? "#8B6914" : "#2D6A4F" }}>
                          {selectedOrder.clientApprovalRequestedAt 
                            ? (lang === "ar" ? "🔔 تذكير من المعلم : يرجى تأكيد استلام الشحنة" : "🔔 Relance du Maâlem : Confirmez la réception") 
                            : (lang === "ar" ? "📦 تسليم مباشر : يرجى تأكيد الاستلام" : "📦 Livraison par le Vendeur : Confirmez la réception")}
                        </span>
                      </div>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--text-secondary)", margin: "0 0 12px", lineHeight: 1.45 }}>
                        {selectedOrder.clientApprovalRequestedAt
                          ? (lang === "ar" 
                              ? "أرسل لكم الصانع تذكيراً لتأكيد تسليم الطلب يداً بيد. ضغطكم على زر التأكيد ضروري لاحتساب مهلة الـ 7 أيام للقطع العادية أو لتحويل مستحقات المعلم للتفصيل الخاص."
                              : "Le Maâlem vous a envoyé une relance pour confirmer la bonne réception de votre commande remise par ses soins. Votre validation lance le délai de rétractation de 7 jours (produits standards) ou déclenche le versement des fonds (sur-mesure).")
                          : (lang === "ar"
                              ? "أكد المعلم تسليم الطلب إليكم. يرجى الضغط على زر التأكيد لبدء مهلة الـ 7 أيام للقطع العادية أو إتمام الطلب للقطع الخاصة."
                              : "Le Maâlem a indiqué vous avoir livré votre commande en mains propres. Votre validation permet de débloquer le versement ou d'ouvrir votre délai de rétractation de 7 jours.")}
                      </p>
                      <button 
                        onClick={handleApproveReceipt} 
                        disabled={loading} 
                        style={{ 
                          width: "100%", 
                          padding: "12px", 
                          borderRadius: 12, 
                          border: "none", 
                          background: "#2D6A4F", 
                          color: "#fff", 
                          fontFamily: "var(--font-display)", 
                          fontWeight: 700, 
                          fontSize: 13, 
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          boxShadow: "0 4px 12px rgba(45,106,79,0.25)"
                        }}
                      >
                        <CheckCircle size={16} />
                        {loading ? "Validation en cours…" : (lang === "ar" ? "أؤكد استلام طلبي بنجاح" : "J'ai bien reçu mon colis — Approuver la réception")}
                      </button>
                    </div>
                  )}

                  {/* Badge Réception validée (Livraison Vendeur) */}
                  {selectedOrder.transportProvider === "vendeur" && selectedOrder.clientApprovalStatus === "approved" && (
                    <div style={{ background: "rgba(45,106,79,0.06)", border: "1px solid rgba(45,106,79,0.2)", borderRadius: 14, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle size={15} color="#2D6A4F" />
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#2D6A4F", fontWeight: 600 }}>
                        {isCustom 
                          ? (lang === "ar" ? "تم تأكيد الاستلام · تم صرف مستحقات الصانع (تفصيل خاص)" : "Réception validée · Fonds libérés au Maâlem (Sur-mesure)") 
                          : (lang === "ar" ? "تم تأكيد الاستلام · مهلة الـ 7 أيام للرجوع جارية" : `Réception validée · Délai de rétractation 7j en cours${selectedOrder.withdrawalExpiresAt ? ` (jusqu'au ${new Date(selectedOrder.withdrawalExpiresAt).toLocaleDateString()})` : ""}`)}
                      </span>
                    </div>
                  )}

                  {/* Badge Preuve de livraison automatique (Sendit POD) */}
                  {selectedOrder.transportProvider === "sendit" && selectedOrder.status === "livre" && !isCustom && (
                    <div style={{ background: "rgba(45,106,79,0.06)", border: "1px solid rgba(45,106,79,0.2)", borderRadius: 14, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle size={15} color="#2D6A4F" />
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#2D6A4F", fontWeight: 600 }}>
                        {lang === "ar" ? "تم تسليم الطرد عبر سينديت · مهلة الـ 7 أيام للرجوع جارية" : `Livraison validée par POD Sendit Express · Rétractation légale 7 jours en cours${selectedOrder.withdrawalExpiresAt ? ` (jusqu'au ${new Date(selectedOrder.withdrawalExpiresAt).toLocaleDateString()})` : ""}`}
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* 1. [Payer en ligne via CMI] */}
                    {(selectedOrder.status === "en_attente_paiement" || selectedOrder.status === "paiement_echoue") && (
                      <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowCmiModal(true)} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderRadius: 14, background: "var(--primary)", color: "#fff", border: "none", cursor: "pointer", boxShadow: "var(--shadow-md)", width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <CreditCard size={18} />
                          <div style={{ textAlign: "left" }}>
                            <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, margin: 0 }}>
                              {lang === "ar" ? "أداء آمن عبر CMI (3D Secure)" : "Payer via CMI (3D Secure)"}
                            </p>
                            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, opacity: 0.75, margin: 0 }}>{isHighAmount ? `${lang === "ar" ? "عربون 50%" : "Acompte 50%"} : ${depositAmount} ${lang === "ar" ? "د.م" : "MAD"}` : `${lang === "ar" ? "المبلغ الإجمالي" : "Règlement total"} : ${depositAmount} ${lang === "ar" ? "د.م" : "MAD"}`}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} opacity={0.7} style={{ transform: lang === "ar" ? "rotate(180deg)" : "none" }} />
                      </motion.button>
                    )}

                    {/* 2. [Annuler la commande] */}
                    {canCancel && (
                      <div>
                        <motion.button whileTap={{ scale: 0.98 }} onClick={handleCancel} disabled={loading || !!isCustomLocked} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderRadius: 14, background: isCustomLocked ? "rgba(107,114,128,0.08)" : "rgba(220,53,69,0.08)", color: isCustomLocked ? "var(--text-secondary)" : "#C0392B", border: `1px solid ${isCustomLocked ? "var(--border)" : "rgba(220,53,69,0.25)"}`, cursor: isCustomLocked ? "not-allowed" : "pointer", width: "100%", opacity: isCustomLocked ? 0.6 : 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <XCircle size={18} />
                            <div style={{ textAlign: "left" }}>
                              <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, margin: 0 }}>
                                {lang === "ar" ? "إلغاء الطلب" : "Annuler la commande"}
                              </p>
                              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, opacity: 0.75, margin: 0 }}>
                                {isCustomLocked ? (lang === "ar" ? "طلب مؤكد بعد ساعة" : "Ferme après 1h") : isGracePeriodActive ? `${lang === "ar" ? "مجاني" : "Gratuit"} · ${Math.round(60 - diffMinutes)}min` : (lang === "ar" ? "استرداد 100% في المحفظة" : "Remboursement 100% Wallet")}
                              </p>
                            </div>
                          </div>
                          {!isCustomLocked && <ChevronRight size={16} opacity={0.6} style={{ transform: lang === "ar" ? "rotate(180deg)" : "none" }} />}
                        </motion.button>
                      </div>
                    )}

                    {/* 3. [Demander un Retour 7j] */}
                    {canReturn7d && (
                      <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowReturnModal(true)} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderRadius: 14, background: "rgba(26,42,58,0.05)", color: "var(--primary)", border: "1px solid var(--border)", cursor: "pointer", width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <RotateCcw size={18} />
                          <div style={{ textAlign: "left" }}>
                            <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, margin: 0 }}>
                              {lang === "ar" ? "طلب إرجاع (مهلة ٧ أيام)" : "Demander un Retour (7j)"}
                            </p>
                            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, opacity: 0.6, margin: 0 }}>
                              {lang === "ar" ? "عبر سينديت أو بالوسائل الذاتية" : "Sendit ou propres moyens"}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={16} opacity={0.5} style={{ transform: lang === "ar" ? "rotate(180deg)" : "none" }} />
                      </motion.button>
                    )}

                    {/* ── Tâche 1 : Signaler un Vice Caché (3 mois / 90j - Art. 11.2) ── */}
                    {canDispute90d && (
                      <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowDisputeModal(true)} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderRadius: 14, background: isDisputePostEscrow ? "rgba(220,53,69,0.07)" : "rgba(212,175,55,0.08)", color: isDisputePostEscrow ? "#C0392B" : "#8B6914", border: `1px solid ${isDisputePostEscrow ? "rgba(220,53,69,0.25)" : "rgba(212,175,55,0.30)"}`, cursor: "pointer", width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <ShieldAlert size={18} />
                          <div style={{ textAlign: "left" }}>
                            <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, margin: 0 }}>
                              {lang === "ar" ? "فتح شكوى أو عيب خفي (٣ أشهر)" : "Signaler un Vice Caché (3 mois)"}
                            </p>
                            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, opacity: 0.7, margin: 0 }}>
                              {isDisputePostEscrow 
                                ? (lang === "ar" ? "⚠️ تم تحويل الأموال — استرداد مباشر من الصانع" : "⚠️ Fonds libérés — Remboursement direct Vendeur (Art. 11.6)") 
                                : (lang === "ar" ? "تجميد الضمان البنكي · وساطة وتحكيم ڤورك" : "Gel de l'escrow · Arbitrage Vork")}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={16} opacity={0.6} style={{ transform: lang === "ar" ? "rotate(180deg)" : "none" }} />
                      </motion.button>
                    )}

                    {/* Annuler la demande de retour (Art. 9.5 bis) */}
                    {selectedOrder.status === "retour_initie" && (
                      <motion.button whileTap={{ scale: 0.98 }} onClick={handleCancelReturn} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderRadius: 14, background: "rgba(45,106,79,0.08)", color: "#2D6A4F", border: "1px solid rgba(45,106,79,0.25)", cursor: "pointer", width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <CheckCircle size={18} />
                          <div style={{ textAlign: "left" }}>
                            <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, margin: 0 }}>
                              {lang === "ar" ? "إلغاء طلب الإرجاع والاحتفاظ بالقطعة" : "Conserver l'article (Annuler le retour)"}
                            </p>
                            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, opacity: 0.7, margin: 0 }}>
                              {lang === "ar" ? "المادة 9.5 مكرر · تراجع عن الإرجاع" : "Art. 9.5 bis · Maintien de l'achat"}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={16} opacity={0.6} style={{ transform: lang === "ar" ? "rotate(180deg)" : "none" }} />
                      </motion.button>
                    )}

                    {/* Déclaration non-réception après auto-validation (Art. 4.3 D) */}
                    {canDeclareNotReceived && (
                      <motion.button whileTap={{ scale: 0.98 }} onClick={handleDeclareNotReceived} disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderRadius: 14, background: "rgba(220,53,69,0.08)", color: "#C0392B", border: "1px solid rgba(220,53,69,0.25)", cursor: "pointer", width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <AlertTriangle size={18} />
                          <div style={{ textAlign: "left" }}>
                            <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, margin: 0 }}>
                              {lang === "ar" ? "إبلاغ عن عدم الاستلام بعد التثبيت التلقائي" : "Signaler non-réception (Fenêtre 24h)"}
                            </p>
                            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, opacity: 0.7, margin: 0 }}>
                              {lang === "ar" ? "فتح تحقيق فوري مع شركة التوصيل سينديت" : "Ouverture d'enquête logistique Vork & Sendit"}
                            </p>
                          </div>
                        </div>
                        <ChevronRight size={16} opacity={0.6} style={{ transform: lang === "ar" ? "rotate(180deg)" : "none" }} />
                      </motion.button>
                    )}
                  </div>
                </div>

                {/* ── SUIVI RÉEL D'ATELIER & LOGISTIQUE MAÂLEM (VUE CLIENT) ── */}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed var(--border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h4 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--primary)", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                      {lang === "ar" ? "حالة الورشة ومسار التوصيل" : "Statut Atelier & Acheminement"}
                    </h4>
                    <span style={{ 
                      fontFamily: "var(--font-body)", 
                      fontSize: 10, 
                      padding: "3px 9px", 
                      borderRadius: 8, 
                      background: ["en_cours_de_transport", "livre"].includes(selectedOrder.status) 
                        ? "rgba(45,106,79,0.12)" 
                        : selectedOrder.status === "annulee" 
                        ? "rgba(220,53,69,0.12)" 
                        : "rgba(184,98,63,0.12)", 
                      color: ["en_cours_de_transport", "livre"].includes(selectedOrder.status) 
                        ? "#2D6A4F" 
                        : selectedOrder.status === "annulee" 
                        ? "#DC3545" 
                        : "var(--accent-warm)", 
                      fontWeight: 700 
                    }}>
                      {selectedOrder.status === "en_preparation" 
                        ? (lang === "ar" ? "قيد الصنع" : "En Confection") 
                        : selectedOrder.status === "en_cours_de_transport" 
                        ? (lang === "ar" ? "في طريق التوصيل" : "En Livraison") 
                        : selectedOrder.status === "livre" 
                        ? (lang === "ar" ? "تم التسليم" : "Livré") 
                        : selectedOrder.status === "annulee"
                        ? (selectedOrder.refusedByArtisan 
                            ? (lang === "ar" ? "اعتذار الورشة" : "Déclinée par l'Atelier") 
                            : (lang === "ar" ? "ملغاة ومسترجعة" : "Annulée"))
                        : (lang === "ar" ? "بانتظار المعلم" : "En Attente Maâlem")}
                    </span>
                  </div>

                  {/* 0. Étape Commande Déclinée / Refus Atelier */}
                  {selectedOrder.status === "annulee" && (
                    <div style={{ background: "rgba(220,53,69,0.06)", border: "1px solid rgba(220,53,69,0.25)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
                      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, margin: "0 0 4px", color: "#DC3545" }}>
                        {selectedOrder.refusedByArtisan 
                          ? (lang === "ar" ? "تعذر قبول الطلب من الورشة" : "Prise en charge déclinée par le Maâlem") 
                          : (lang === "ar" ? "تم إلغاء الطلب" : "Commande Annulée")}
                      </p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                        {selectedOrder.refusedByArtisan
                          ? (lang === "ar" 
                              ? `اعتذر المعلم عن تصنيع هذا الطلب.${selectedOrder.refusalReason ? ` سبب الاعتذار: "${selectedOrder.refusalReason}".` : ""} تم استرداد كامل المبلغ مباشرة إلى محفظتكم.` 
                              : `Le Maâlem ne peut pas confectionner cette pièce.${selectedOrder.refusalReason ? ` Motif d'atelier : "${selectedOrder.refusalReason}".` : ""} L'intégralité de vos fonds a été immédiatement recréditée sur votre portefeuille Vork.`)
                          : (lang === "ar"
                              ? "تم إلغاء هذا الطلب واسترداد المبالغ المدفوعة إلى محفظتكم لدى ڤورك."
                              : "Cette commande a été annulée et le montant dû a été reversé sur votre portefeuille Vork.")}
                      </p>
                    </div>
                  )}

                  {/* 1. Étape Attente Confirmation Maâlem */}
                  {["acompte_verse", "payee_integralement"].includes(selectedOrder.status) && (
                    <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
                      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, margin: "0 0 4px", color: "var(--primary)" }}>
                        {lang === "ar" ? "تم إرسال الطلب إلى ورشة المعلم" : "Commande transmise à l'Atelier"}
                      </p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                        {lang === "ar" 
                          ? "تم إخطار المعلم بطلبك. وفقاً للشروط العامة، لدى الصانع مهلة ٧٢ ساعة كحد أقصى لتأكيد الطلب وبدء الصنع. أموالك محفوظة تحت الضمان البنكي." 
                          : "Votre commande a été notifiée au Maâlem. L'artisan dispose de 72 heures maximum pour confirmer la faisabilité et lancer la fabrication. Vos fonds restent protégés sous séquestre."}
                      </p>
                    </div>
                  )}

                  {/* 2. Étape En Préparation Atelier + Photos de Préparation */}
                  {selectedOrder.status === "en_preparation" && (
                    <div style={{ background: "rgba(184,98,63,0.05)", border: "1px solid rgba(184,98,63,0.2)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
                      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, margin: "0 0 4px", color: "var(--primary)" }}>
                        {lang === "ar" ? "قيد الصنع والإعداد في ورشة المعلم" : "En cours de fabrication artisanale"}
                      </p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: "0 0 10px", lineHeight: 1.45 }}>
                        {lang === "ar" 
                          ? "يقوم المعلم بإعداد قطعتك بحرفية عالية. قبل الشحن، يقوم المعلم برفع ٤ صور لتوثيق الجودة والمطابقة من كافة الزوايا." 
                          : "Le Maâlem prépare votre pièce dans son atelier. Avant expédition, l'artisan dépose 4 photos de contrôle qualité (face, dos, détails, finitions)."}
                      </p>

                      {/* Galerie des photos de préparation si disponibles */}
                      {validPrepPhotos.length > 0 ? (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--accent-warm)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                            {lang === "ar" ? `صور توثيق الجاهزية من الورشة (${validPrepPhotos.length}/٤) :` : `Photos de préparation de l'artisan (${validPrepPhotos.length}/4) :`}
                          </p>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                            {validPrepPhotos.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" style={{ display: "block", borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", aspectRatio: "1/1" }}>
                                <img src={url} alt={`Préparation ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : isPrepBypass ? (
                        <p style={{ fontSize: 10, color: "var(--accent-emerald)", margin: 0, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>✓</span>
                          <span>{lang === "ar" ? "تم فحص واعتماد جودة ومطابقة القطعة في الورشة قبل الشحن." : "Contrôle qualité et conformité validés en atelier avant expédition."}</span>
                        </p>
                      ) : (
                        <p style={{ fontSize: 10, color: "var(--text-secondary)", fontStyle: "italic", margin: 0 }}>
                          {lang === "ar" ? "سيلتقط المعلم صور الجاهزية فور الانتهاء من حياكة وصنع القطعة." : "L'artisan prendra les photos de conformité dès l'achèvement de la pièce."}
                        </p>
                      )}
                    </div>
                  )}

                  {/* 3. Étape En Cours de Transport / Suivi Colis */}
                  {selectedOrder.status === "en_cours_de_transport" && (
                    <div style={{ background: "rgba(45,106,79,0.05)", border: "1px solid rgba(45,106,79,0.22)", borderRadius: 14, padding: 14, marginBottom: 12 }}>
                      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, margin: "0 0 4px", color: "#2D6A4F" }}>
                        {lang === "ar" ? "الطلب في طريق التوصيل إليكم" : "Colis en cours d'acheminement"}
                      </p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: "0 0 8px", lineHeight: 1.45 }}>
                        {selectedOrder.transportProvider === "sendit" 
                          ? (lang === "ar" ? "تم تسليم طردكم إلى شريك التوصيل سينديت إكسبريس." : "Votre colis a été confié au transporteur partenaire Sendit Express.")
                          : (lang === "ar" ? "يتم شحن وتوصيل الطلب مباشرة بوسائل المعلم الخاصة." : "Votre commande est expédiée directement par les moyens propres du Maâlem.")}
                      </p>

                      {selectedOrder.senditDeliveryCode && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.7)", padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(45,106,79,0.15)" }}>
                          <div>
                            <span style={{ fontSize: 9.5, color: "var(--text-secondary)", display: "block" }}>Numéro de suivi Sendit</span>
                            <code style={{ fontSize: 12, fontWeight: 700, color: "#2D6A4F" }}>{selectedOrder.senditDeliveryCode}</code>
                          </div>
                          {selectedOrder.senditWaybillUrl && (
                            <a href={selectedOrder.senditWaybillUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--primary)", fontWeight: 600, textDecoration: "underline" }}>
                              Voir BL
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. Étape Livré */}
                  {selectedOrder.status === "livre" && (
                    <div style={{ background: "rgba(45,106,79,0.06)", border: "1px solid rgba(45,106,79,0.2)", borderRadius: 14, padding: 14 }}>
                      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, margin: "0 0 4px", color: "#2D6A4F" }}>
                        {lang === "ar" ? "تم تسليم الطرد للمستلم" : "Colis remis au destinataire"}
                      </p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                        La livraison a été enregistrée. Utilisez les boutons ci-dessus pour confirmer la réception sous 24h ou signaler un incident.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALE MOBILE : Paiement CMI avec Signature Électronique (Art. 11.2) ── */}
      <AnimatePresence>
        {showCmiModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(26,42,58,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 90 }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 26, stiffness: 220 }} style={{ background: "#FCFBF9", borderRadius: "24px 24px 0 0", padding: "20px 20px 32px", width: "100%", maxWidth: 640, borderTop: "1.5px solid rgba(196, 169, 106, 0.2)", boxShadow: "0 -10px 30px rgba(0,0,0,0.15)", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ width: 36, height: 4, background: "rgba(0,0,0,0.1)", borderRadius: 2, margin: "0 auto 16px" }} />
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--primary)", marginBottom: 6 }}>Paiement CMI 3D Secure & Signature</h3>
              
              {isHighAmount ? (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 12, padding: "10px 12px", marginBottom: 12, fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    ℹ️ <strong>Commande ≥ 1 000 MAD :</strong> Vous pouvez régler un acompte de 50% en ligne, et les 50% restants à la livraison.
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setPaymentChoice("deposit")}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: paymentChoice === "deposit" ? "2px solid var(--primary)" : "1px solid var(--border)",
                        background: paymentChoice === "deposit" ? "rgba(196,169,106,0.08)" : "none",
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      <div>
                        <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "var(--primary)", margin: 0 }}>Payer l'acompte (50%)</p>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-secondary)", margin: 0 }}>Reste à payer à la livraison : {selectedOrder ? Math.round(selectedOrder.totalPrice * 0.5) : 0} MAD</p>
                      </div>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {paymentChoice === "deposit" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }} />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentChoice("total")}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: paymentChoice === "total" ? "2px solid var(--primary)" : "1px solid var(--border)",
                        background: paymentChoice === "total" ? "rgba(196,169,106,0.08)" : "none",
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      <div>
                        <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "var(--primary)", margin: 0 }}>Payer la totalité (100%)</p>
                        <p style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-secondary)", margin: 0 }}>Règlement intégral sécurisé</p>
                      </div>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: "1px solid var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {paymentChoice === "total" && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }} />}
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-secondary)", marginBottom: 12 }}>
                  Montant à régler : <strong style={{ color: "var(--primary)" }}>{selectedOrder?.totalPrice} MAD</strong>.
                </p>
              )}

              {/* ✍️ Signature Électronique Interactive Canvas (Art. 11.2) */}
              <div style={{ marginBottom: 14, background: "rgba(26,42,58,0.02)", border: "1px solid var(--border)", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, color: "var(--primary)", margin: 0 }}>
                    ✍️ Signature Électronique Obligatoire (Art. 11.2)
                  </label>
                  <button type="button" onClick={clearCanvas} style={{ border: "none", background: "none", color: "#DC3545", fontSize: 10, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>
                    Effacer
                  </button>
                </div>
                <p style={{ fontSize: 9, color: "var(--text-secondary)", margin: "0 0 6px" }}>
                  Tracez votre signature ci-dessous (sert de référence pour la comparaison à la livraison) :
                </p>
                <div style={{ border: "1.5px dashed rgba(26,42,58,0.25)", borderRadius: 10, background: "#FFFFFF", overflow: "hidden", touchAction: "none" }}>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={110}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ width: "100%", height: 110, display: "block", cursor: "crosshair" }}
                  />
                </div>
                {hasSignature ? (
                  <p style={{ fontSize: 9, color: "#2D6A4F", fontWeight: 600, margin: "4px 0 0" }}>✓ Signature apposée</p>
                ) : (
                  <p style={{ fontSize: 9, color: "#CC7755", margin: "4px 0 0" }}>⚠️ Veuillez signer dans le cadre ci-dessus</p>
                )}
              </div>
              
              {/* CGV Checkbox */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 14, background: "rgba(26,42,58,0.02)", border: "1px dashed var(--border)", padding: "10px", borderRadius: 12 }}>
                <input 
                  type="checkbox" 
                  id="cgv-accept-checkbox"
                  checked={cgvAccepted} 
                  onChange={(e) => setCgvAccepted(e.target.checked)}
                  style={{ marginTop: 2, cursor: "pointer" }}
                />
                <label htmlFor="cgv-accept-checkbox" style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--text-primary)", cursor: "pointer", lineHeight: "1.3" }}>
                  J'accepte sans réserve les{" "}
                  <span 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCgvTextModal(true); }}
                    style={{ textDecoration: "underline", fontWeight: 700, color: "#8B6914", cursor: "pointer" }}
                  >
                    CGV Vork
                  </span>{" "}
                  (Rétractation 7j pour Standards, Heure de grâce 60m sur-mesure, Séquestre sécurisé).
                </label>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setShowCmiModal(false); setCgvAccepted(false); clearCanvas(); }} style={{ flex: 1, padding: "10px", borderRadius: 12, border: "1px solid var(--border)", background: "none", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>Annuler</button>
                <button 
                  onClick={handlePay} 
                  disabled={loading || !cgvAccepted || !hasSignature} 
                  style={{ 
                    flex: 2, 
                    padding: "10px", 
                    borderRadius: 12, 
                    border: "none", 
                    background: (cgvAccepted && hasSignature) ? "var(--primary)" : "var(--text-placeholder)", 
                    fontFamily: "var(--font-display)", 
                    fontWeight: 700, 
                    fontSize: 12, 
                    color: "#fff", 
                    cursor: (cgvAccepted && hasSignature) ? "pointer" : "not-allowed" 
                  }}
                >
                  {loading ? "Traitement…" : `Payer ${paymentChoice === "deposit" && isHighAmount ? Math.round((selectedOrder?.totalPrice || 0) * 0.5) : (selectedOrder?.totalPrice || 0)} MAD`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALE MOBILE : Texte des CGV Vork ────────────────────── */}
      <AnimatePresence>
        {showCgvTextModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "absolute", inset: 0, background: "rgba(26,42,58,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 110 }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} style={{ background: "var(--surface)", borderRadius: 24, padding: 20, width: "100%", maxHeight: "80%", display: "flex", flexDirection: "column", boxShadow: "var(--shadow-lg)", border: "1px solid var(--border)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--primary)", marginBottom: 12, borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>Conditions Générales Vork</h3>
              <div style={{ flex: 1, overflowY: "auto", fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.5", display: "flex", flexDirection: "column", gap: 10, paddingRight: 6, scrollbarWidth: "none" }}>
                <p><strong>1. Séquestre & Libération des fonds (Art. 15 & 18 CGV) :</strong> 100% des fonds sont cantonnés sous séquestre sécurisé. Pour les produits standards, le délai légal de rétractation de 7 jours débute dès la validation de réception (POD transporteur Sendit ou approbation par clic client en livraison vendeur). À l'issue des 7 jours sans litige, les fonds sont débloqués pour la commande concernée.</p>
                <p><strong>2. Produits Sur-Mesure / Personnalisés (Art. 17 & 19 CGV - Art. 36 Loi 31-08) :</strong> Conformément à la loi marocaine de protection du consommateur, aucun droit de rétractation ne s'applique aux commandes confectionnées sur mesure selon les spécifications de l'acheteur. Une heure de grâce (60 minutes) post-acceptation atelier permet une annulation sans frais. Dès confirmation de réception, les fonds sont immédiatement libérés à l'artisan.</p>
                <p><strong>3. Retours Produits Standards (Art. 19.3 & 19.4 CGV) :</strong> Réservé exclusivement aux produits standards non personnalisés sous 7 jours. L'organisation du retour incombe intégralement au client, par ses propres moyens et à ses frais exclusifs, avec transmission obligatoire de la preuve d'expédition.</p>
                <p><strong>4. Garantie Légale des Vices Cachés (3 mois / 90 jours - Art. 16.9 CGV) :</strong> Tout défaut de matière première ou vice structurel grave peut être signalé pendant 3 mois complets suivant la réception pour arbitrage et expertise Vork.</p>
                <p><strong>5. Transport Sendit vs Vendeur (Art. 13 & 14 CGV) :</strong> Sendit Express est réservé aux produits standards de dimensions ≤ 40×40 cm. Les pièces hors gabarit et sur-mesure sont acheminées par le Maâlem.</p>
              </div>
              <button 
                onClick={() => setShowCgvTextModal(false)} 
                style={{ marginTop: 16, width: "100%", padding: "12px", borderRadius: 14, background: "var(--primary)", color: "#fff", border: "none", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Fermer et retourner au paiement
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALE MOBILE : Demande de Prolongation Maâlem (J+2 - Art 4.3) ── */}
      <AnimatePresence>
        {showExtendModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(26,42,58,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 110 }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 26, stiffness: 220 }} style={{ background: "#FCFBF9", borderRadius: "24px 24px 0 0", padding: "20px 20px 32px", width: "100%", maxWidth: 640, borderTop: "1.5px solid rgba(196, 169, 106, 0.2)", boxShadow: "0 -10px 30px rgba(0,0,0,0.15)" }}>
              <div style={{ width: 36, height: 4, background: "rgba(0,0,0,0.1)", borderRadius: 2, margin: "0 auto 16px" }} />
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--primary)", marginBottom: 4 }}>Prolonger le délai du Maâlem</h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>Accordez un délai supplémentaire au Maâlem pour valider votre fabrication (Article 4.3 CGV).</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {([24, 48, 72] as const).map((h) => (
                  <label key={h} onClick={() => setExtendHours(h)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px", borderRadius: 14, border: extendHours === h ? "2px solid var(--primary)" : "1px solid var(--border)", background: extendHours === h ? "rgba(26,42,58,0.04)" : "var(--surface)", cursor: "pointer" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${extendHours === h ? "var(--primary)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {extendHours === h && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }} />}
                    </div>
                    <div>
                      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, color: "var(--primary)", margin: 0 }}>Prolongation de +{h} heures</p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>Nouveau délai accordé jusqu'à J+{(h / 24) + 2} à 10h00 du matin</p>
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowExtendModal(false)} style={{ flex: 1, padding: "12px", borderRadius: 14, border: "1px solid var(--border)", background: "none", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>Fermer</button>
                <button onClick={handleExtendSubmit} disabled={loading} style={{ flex: 2, padding: "12px", borderRadius: 14, border: "none", background: "var(--primary)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#fff", cursor: "pointer" }}>{loading ? "Envoi…" : "Valider la prolongation"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALE MOBILE : Demande de Retour (7j - Art. 19 CGV) ── */}
      <AnimatePresence>
        {showReturnModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(26,42,58,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 110 }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 26, stiffness: 220 }} style={{ background: "#FCFBF9", borderRadius: "24px 24px 0 0", padding: "20px 20px 32px", width: "100%", maxWidth: 640, borderTop: "1.5px solid rgba(196, 169, 106, 0.2)", boxShadow: "0 -10px 30px rgba(0,0,0,0.15)" }}>
              <div style={{ width: 36, height: 4, background: "rgba(0,0,0,0.1)", borderRadius: 2, margin: "0 auto 16px" }} />
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--primary)", marginBottom: 4 }}>Rétractation légale (7 jours)</h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>Organisation du renvoi sous 7 jours (Article 19 CGV).</p>

              {isCustom ? (
                <div style={{ background: "rgba(220,53,69,0.06)", border: "1px solid rgba(220,53,69,0.2)", borderRadius: 14, padding: 14, marginBottom: 16 }}>
                  <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#DC3545", margin: "0 0 4px" }}>
                    ❌ Produit non éligible au retour (Art. 19 & Art. 36 Loi 31-08)
                  </p>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 11.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                    Les pièces confectionnées sur mesure ou personnalisées ne bénéficient d'aucun droit de rétractation. En cas de défaut structurel de matière, utilisez l'option « Signaler un vice caché (3 mois) ».
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ background: "rgba(196,169,106,0.08)", border: "1px solid rgba(196,169,106,0.25)", borderRadius: 14, padding: 12, marginBottom: 14 }}>
                    <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, color: "var(--primary)", margin: "0 0 4px" }}>
                      📦 Organisation par vos propres moyens (Art. 19.3 & 19.4)
                    </p>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                      Le retour d'un produit standard s'effectue obligatoirement à vos frais et par vos propres moyens (Amana, CTM, etc.). Dès réception et vérification par le Maâlem, 100% du prix de l'article vous sera recrédité sur votre portefeuille Vork.
                    </p>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                      Numéro de suivi transporteur / Récépissé d'expédition (Art. 19.4) *
                    </label>
                    <input 
                      type="text" 
                      placeholder="Ex: Code Amana, CTM Messagerie, etc." 
                      value={trackingNumber} 
                      onChange={(e) => setTrackingNumber(e.target.value)} 
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-primary)", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--primary)", outline: "none" }} 
                    />
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowReturnModal(false)} style={{ flex: 1, padding: "12px", borderRadius: 14, border: "1px solid var(--border)", background: "none", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>Fermer</button>
                {!isCustom && (
                  <button 
                    onClick={handleReturnSubmit} 
                    disabled={loading || !trackingNumber.trim()} 
                    style={{ 
                      flex: 2, 
                      padding: "12px", 
                      borderRadius: 14, 
                      border: "none", 
                      background: trackingNumber.trim() ? "var(--primary)" : "var(--text-placeholder)", 
                      fontFamily: "var(--font-display)", 
                      fontWeight: 700, 
                      fontSize: 13, 
                      color: "#fff", 
                      cursor: trackingNumber.trim() ? "pointer" : "not-allowed" 
                    }}
                  >
                    {loading ? "Envoi…" : "Valider le retour (100% remboursé)"}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODALE MOBILE : Vice Caché (15j - Art. 10) ────────────────── */}
      <AnimatePresence>
        {showDisputeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, background: "rgba(26,42,58,0.65)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 110 }}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 26, stiffness: 220 }} style={{ background: "#FCFBF9", borderRadius: "24px 24px 0 0", padding: "20px 20px 32px", width: "100%", maxWidth: 640, borderTop: "1.5px solid rgba(196, 169, 106, 0.2)", boxShadow: "0 -10px 30px rgba(0,0,0,0.15)" }}>
              <div style={{ width: 36, height: 4, background: "rgba(0,0,0,0.1)", borderRadius: 2, margin: "0 auto 16px" }} />
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--primary)", marginBottom: 4 }}>Signaler un Vice Caché (Art. 10)</h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>Sélectionnez le motif. L'escrow sera immédiatement gelé pour arbitrage Vork.</p>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Type de Réclamation (Catégorie CGV) *</label>
                <select value={disputeType} onChange={(e) => setDisputeType(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-primary)", fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 700, color: "var(--primary)", outline: "none", marginBottom: 8 }}>
                  <option value="vice_cache_3mois">🔍 Vice Caché / Défaut de Matière Première (Garantie 3 mois - Art. 12.5 & 16.9)</option>
                  <option value="non_conformite">📐 Non-Conformité au Devis Sur-Mesure (Art. 12)</option>
                  <option value="non_reception">✍️ Non-Réception / Contestation Signature à la livraison (Art. 11.6 & 13.3)</option>
                  <option value="retard_critique">⏱️ Retard Critique d'Expédition / Fabrication (&gt;5 jours)</option>
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Motif détaillé du vice / problème constasté *</label>
                <select value={disputeReasonCategory} onChange={(e) => setDisputeReasonCategory(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-primary)", fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--primary)", outline: "none", marginBottom: 10 }}>
                  {VICE_CACHE_REASONS.map((r, i) => (
                    <option key={i} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Détails complémentaires (optionnel)</label>
                <textarea rows={3} maxLength={500} placeholder="Précisez le problème constaté…" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-primary)", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--primary)", resize: "none", outline: "none" }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>URL photo de preuve (optionnel)</label>
                <input type="text" placeholder="https://…" value={disputePhotoUrl} onChange={(e) => setDisputePhotoUrl(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-primary)", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--primary)", outline: "none" }} />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowDisputeModal(false)} style={{ flex: 1, padding: "12px", borderRadius: 14, border: "1px solid var(--border)", background: "none", fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>Annuler</button>
                <button onClick={handleDisputeSubmit} disabled={loading} style={{ flex: 2, padding: "12px", borderRadius: 14, border: "none", background: "#CC7755", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "#fff", cursor: "pointer" }}>{loading ? "Envoi…" : "Ouvrir la réclamation"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
