import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  X, 
  ChevronRight,
  ExternalLink,
  Flag,
  CheckCircle,
  XCircle,
  Ban
} from "lucide-react";
import type { ClientOrder } from "../../types/clientPayment";
import { useClientI18n } from "../../services/i18n";
import { ReportModal } from "../../components/Shared/ReportModal";
import { clientWalletAPI } from "../../services/clientWalletApi";

interface NotificationsViewProps {
  orders: ClientOrder[];
  onClose: () => void;
  onSelectOrder: (orderId: string) => void;
  currentUser?: any;
  onNavigate?: (view: any) => void;
  serverNotifications?: any[];
  onRefreshNotifications?: () => Promise<void> | void;
  onCatalogChanged?: () => Promise<void> | void;
  onOpenProduct?: (productId: string) => Promise<void> | void;
}

export interface AppNotification {
  id: string;
  orderId?: string;
  title: string;
  message: string;
  type: "urgent" | "warning" | "info" | "success";
  rawType?: string;
  actionStatus?: string | null;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
  badgeText?: string;
  linkUrl?: string;
  sourceId?: string;
  secondaryUserId?: string;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  orders,
  onClose,
  onSelectOrder,
  currentUser,
  serverNotifications = [],
  onRefreshNotifications,
  onCatalogChanged,
  onOpenProduct,
}) => {
  const { lang, t } = useClientI18n();
  const [filter, setFilter] = useState<"all" | "unread" | "urgent">("all");
  const [serverNotifs, setServerNotifs] = useState<any[]>(serverNotifications);
  const [reportTarget, setReportTarget] = useState<any | null>(null);
  const [busyActionKey, setBusyActionKey] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setServerNotifs(serverNotifications);
  }, [serverNotifications]);

  useEffect(() => {
    const uid = currentUser?.id || "client-me";
    clientWalletAPI.fetchServerNotifications(uid).then((list) => {
      if (Array.isArray(list)) setServerNotifs(list);
    }).catch(() => {});
  }, [currentUser]);

  // Génération dynamique et professionnelle des notifications basées sur les CGV
  const notifications: AppNotification[] = [];

  // Ajouter les notifications persistantes du serveur
  serverNotifs.forEach((sn) => {
    const isConsentReq = sn.type === "republication_consent_request";
    const isPublished = sn.type === "from_scratch_published_to_catalog";
    const isQuote = sn.type === "custom_quote_received";
    const status = sn.actionStatus || sn.metadata?.consentStatus || null;

    notifications.push({
      id: sn.id,
      orderId: sn.metadata?.orderId || (isConsentReq ? sn.sourceId : ''),
      title: (lang === 'ar' && sn.titleAr) ? sn.titleAr : sn.title,
      message: (lang === 'ar' && sn.messageAr) ? sn.messageAr : sn.message,
      type: isConsentReq ? 'warning' : (isPublished || isQuote) ? 'success' : 'info',
      rawType: sn.type,
      actionStatus: status,
      metadata: sn.metadata || {},
      isRead: Boolean(sn.isRead),
      createdAt: sn.createdAt,
      badgeText: isConsentReq
        ? (lang === 'ar' ? 'مطلوب موافقة' : 'ACCORD REQUIS')
        : isPublished
          ? (lang === 'ar' ? 'نشر في الكتالوج' : 'NOUVEAU POST')
          : isQuote
            ? (lang === 'ar' ? 'عرض جديد' : 'DEVIS REÇU')
            : undefined,
      linkUrl: sn.linkUrl,
      sourceId: sn.sourceId,
      secondaryUserId: sn.secondaryUserId,
    });
  });

  orders.forEach((o) => {
    const isCustom = ["personnalise", "sur_commande"].includes(o.productType);
    const itemTitle = o.productTitle || (lang === "ar" ? "تحفة تقليدية" : "Produit Artisanal");

    // 0. SUCCESS : Devis reçu pour un projet Atelier sur-mesure
    if ((o as any).status === "devis_recu" || (Array.isArray((o as any).quotes) && (o as any).quotes.length > 0 && o.status !== "complete" && o.status !== "annulee" && !(o as any).acceptedAt)) {
      const quotesCount = (o as any).quotes?.length || 1;
      const latestQuote = (o as any).quotes?.[(o as any).quotes.length - 1];
      const artisanName = latestQuote?.artisanName || o.artisanName || "Un Maâlem";
      const price = latestQuote?.proposedPrice || o.totalPrice;
      const days = latestQuote?.confectionDays || 14;

      notifications.push({
        id: `notif-devis-${o.id}`,
        orderId: o.id,
        title: lang === "ar" ? `عرض سعر متاح (${quotesCount})` : `Devis reçu — ${artisanName}`,
        message: lang === "ar"
          ? `قدّم ${artisanName} عرضاً لصناعة "${itemTitle}" بسعر ${price} درهم في غضون ${days} يوماً. انقر لمعاينة العرض وتأكيد الطلب.`
          : `${artisanName} vous propose de confectionner "${itemTitle}" pour ${price} MAD sous ${days} jours. Cliquez pour examiner et valider.`,
        type: "success",
        isRead: false,
        badgeText: lang === "ar" ? "عرض متاح" : "DEVIS REÇU",
        createdAt: latestQuote?.createdAt || o.updatedAt || o.createdAt,
      });
    }

    // 0 bis. INFO : Projet sur-mesure diffusé sur le marché public des artisans
    if ((o as any).status === "en_attente_artisan") {
      notifications.push({
        id: `notif-waiting-devis-${o.id}`,
        orderId: o.id,
        title: lang === "ar" ? "مشروعك معروض في سوق الحرفيين" : "Projet en ligne sur le Marché",
        message: lang === "ar"
          ? `مشروعك "${itemTitle}" معروض الآن على أمهر الحرفيين في المنصة. ستتلقى عروض الأسعار قريباً.`
          : `Votre création "${itemTitle}" est consultable par les Maâlems. Vous recevrez leurs propositions tarifaires sous peu.`,
        type: "info",
        isRead: false,
        badgeText: lang === "ar" ? "قيد الدراسة" : "EN ATTENTE",
        createdAt: o.createdAt,
      });
    }

    // 1. URGENT : Litige ou Réclamation de non-réception en cours
    if (o.status === "en_reclamation" || o.nonReceptionClaimedAt) {
      notifications.push({
        id: `notif-reclamation-${o.id}`,
        orderId: o.id,
        title: lang === "ar" ? "شكوى مفتوحة — الضمان معلق" : "Réclamation Ouverte — Fonds Sécurisés",
        message: lang === "ar"
          ? `طلبكم الخاص بـ "${itemTitle}" قيد الدراسة لدى وساطة ڤورك. المبالغ مجمدة لضمان حقوقكم.`
          : `Votre réclamation concernant "${itemTitle}" est prise en charge par la médiation Vork. Les fonds restent bloqués par mesure de sécurité.`,
        type: "urgent",
        isRead: false,
        badgeText: lang === "ar" ? "عاجل" : "URGENT",
        createdAt: o.nonReceptionClaimedAt || o.createdAt,
      });
    }

    // 2. URGENT / WARNING : Fenêtre de grâce d'annulation 60 min (Produits Sur-Mesure)
    if (isCustom && o.acceptedAt && o.status === "en_preparation") {
      const acceptedMs = new Date(o.acceptedAt).getTime();
      const diffMin = Math.floor((Date.now() - acceptedMs) / (1000 * 60));
      if (diffMin <= 60) {
        notifications.push({
          id: `notif-grace-${o.id}`,
          orderId: o.id,
          title: lang === "ar" ? `مهلة الإلغاء (متبقي ${60 - diffMin} د)` : `Délai d'annulation (${60 - diffMin} min restantes)`,
          message: lang === "ar"
            ? `شرع المعلم في صناعة "${itemTitle}". لديكم ${60 - diffMin} دقيقة لإلغاء الطلب مجاناً وبشكل فوري.`
            : `Le Maâlem commence la confection de "${itemTitle}". Vous disposez encore de ${60 - diffMin} minutes pour annuler votre commande sans frais.`,
          type: "warning",
          isRead: false,
          badgeText: lang === "ar" ? "مهلة الإلغاء" : "DÉLAI DE GRÂCE",
          createdAt: o.acceptedAt,
        });
      }
    }

    // 2 bis. SUCCESS : Commande Acceptée par le Maâlem & Confection en cours
    if (o.status === "en_preparation" || o.acceptedAt) {
      notifications.push({
        id: `notif-prep-active-${o.id}`,
        orderId: o.id,
        title: lang === "ar" ? "قبول الطلب — الورشة تباشر العمل" : "Commande Validée — Confection en Cours",
        message: lang === "ar"
          ? `أكّد المعلم طلبك "${itemTitle}". تجري حالياً صناعة وتجهيز قطعتكم داخل الورشة.`
          : `Le Maâlem a validé votre commande "${itemTitle}". La confection est en cours dans son atelier.`,
        type: "success",
        isRead: o.status !== "en_preparation",
        badgeText: lang === "ar" ? "في الورشة" : "EN ATELIER",
        createdAt: o.acceptedAt || o.updatedAt || o.createdAt,
      });
    }

    // 2 ter. INFO : Photos de confection disponibles
    if ((o as any).prepPhotos?.length > 0 || (o as any).photosUploadedAt) {
      notifications.push({
        id: `notif-photos-${o.id}`,
        orderId: o.id,
        title: lang === "ar" ? "صور الورشة متاحة للمعاينة" : "Photos d'Atelier Disponibles",
        message: lang === "ar"
          ? `شارك المعلم صور مراحل إنجاز "${itemTitle}". يمكنك معاينتها داخل تفاصيل طلبك.`
          : `Le Maâlem a ajouté des photos de fabrication pour "${itemTitle}". Vous pouvez les consulter dans le suivi de votre commande.`,
        type: "info",
        isRead: false,
        badgeText: lang === "ar" ? "صور الورشة" : "PHOTOS ATELIER",
        createdAt: (o as any).photosUploadedAt || o.updatedAt || o.createdAt,
      });
    }

    // 3. WARNING : Relance Maâlem J+2 (10h00) après 48h sans acceptation
    if (["acompte_verse", "payee_integralement"].includes(o.status)) {
      const createdMs = new Date(o.createdAt).getTime();
      const diffHours = (Date.now() - createdMs) / (1000 * 60 * 60);
      if (diffHours >= 48) {
        notifications.push({
          id: `notif-j2-${o.id}`,
          orderId: o.id,
          title: lang === "ar" ? "تذكير بخصوص تأكيد الطلب" : "Attente de Confirmation du Maâlem",
          message: lang === "ar"
            ? `لم يؤكد الصانع بعد طلب "${itemTitle}". يمكنكم تمديد المهلة أو إلغاء الطلب واسترداد كامل المبلغ.`
            : `L'artisan n'a pas encore confirmé la prise en charge de "${itemTitle}". Vous pouvez prolonger son délai ou annuler avec remboursement intégral.`,
          type: "warning",
          isRead: false,
          badgeText: lang === "ar" ? "تذكير" : "RELANCE",
          createdAt: o.createdAt,
        });
      }
    }

    // 4. WARNING : Rappel de Validation de livraison (Fenêtre 24h)
    if (o.status === "livre" && o.deliveredAt) {
      const deliveredMs = new Date(o.deliveredAt).getTime();
      const hoursSinceDelivered = (Date.now() - deliveredMs) / (1000 * 60 * 60);
      if (hoursSinceDelivered < 24) {
        notifications.push({
          id: `notif-valide-24h-${o.id}`,
          orderId: o.id,
          title: lang === "ar" ? `تأكيد الاستلام — متبقي ${Math.max(0, Math.round(24 - hoursSinceDelivered))}س` : `Colis Reçu — ${Math.max(0, Math.round(24 - hoursSinceDelivered))}h pour valider`,
          message: lang === "ar"
            ? `تم تسليم الشحنة "${itemTitle}". يرجى تأكيد استلام الطلب أو الإبلاغ عن أي ملاحظة.`
            : `Le colis "${itemTitle}" a bien été remis. Merci de confirmer sa bonne réception ou de signaler un problème.`,
          type: "warning",
          isRead: hoursSinceDelivered >= 12,
          badgeText: lang === "ar" ? "إجراء مطلوب" : "ACTION REQUISE",
          createdAt: o.deliveredAt,
        });
      }
    }

    // 6. INFO : Colis en cours de transport
    if (o.status === "en_cours_de_transport") {
      const providerLabel = o.carrierName || (lang === "ar" ? "عبر المعلم / الشحن المعتمد" : "par l'artisan / son transporteur");
      notifications.push({
        id: `notif-ship-${o.id}`,
        orderId: o.id,
        title: lang === "ar" ? "الشحنة في طريقها إليك" : "Colis en Cours de Livraison",
        message: lang === "ar"
          ? `طلبكم "${itemTitle}" قيد التوصيل ${providerLabel}. سيتم التواصل معكم عند التسليم.`
          : `Votre commande "${itemTitle}" est en cours d'acheminement ${providerLabel}. Préparez votre confirmation à la livraison.`,
        type: "info",
        isRead: false,
        badgeText: lang === "ar" ? "قيد التوصيل" : "EN TRANSIT",
        createdAt: o.shippedAt || o.createdAt,
      });
    }

    // 7. SUCCESS : Paiement confirmé & Séquestre actif
    if (["acompte_verse", "payee_integralement"].includes(o.status)) {
      notifications.push({
        id: `notif-pay-${o.id}`,
        orderId: o.id,
        title: lang === "ar" ? "تأكيد الدفع والأمان" : "Paiement Enregistré et Sécurisé",
        message: lang === "ar"
          ? `تم تسجيل أداء "${itemTitle}". المبلغ محمي ومحفوظ حتى استلامكم للطلب.`
          : `Le règlement pour "${itemTitle}" a bien été validé. Vos fonds sont protégés jusqu'à la remise du colis.`,
        type: "success",
        isRead: true,
        badgeText: lang === "ar" ? "مضمون" : "SÉCURISÉ",
        createdAt: o.createdAt,
      });
    }

    // 8. Commande Annulée / Refusée par l'Artisan
    if (o.status === "annulee") {
      const isRefused = Boolean((o as any).refusedByArtisan || (o as any).refusalReason);
      if (isRefused) {
        const reasonText = (o as any).refusalReason ? (lang === "ar" ? ` سبب الرفض: "${(o as any).refusalReason}".` : ` Motif : "${(o as any).refusalReason}".`) : "";
        notifications.push({
          id: `notif-refused-${o.id}`,
          orderId: o.id,
          title: lang === "ar" ? "اعتذار عن قبول الطلب من الورشة" : "Prise en charge déclinée par l'Atelier",
          message: lang === "ar"
            ? `اعتذر المعلم عن تنفيذ طلبكم "${itemTitle}".${reasonText} تم استرداد كامل المبلغ فورياً إلى محفظتكم لدى ڤورك.`
            : `Le Maâlem ne peut pas confectionner votre commande "${itemTitle}".${reasonText} Vos fonds ont été intégralement recrédités sur votre portefeuille Vork.`,
          type: "warning",
          isRead: false,
          badgeText: lang === "ar" ? "اعتذار الورشة" : "REFUS ATELIER",
          createdAt: o.updatedAt || o.createdAt,
        });
      } else {
        notifications.push({
          id: `notif-cancel-${o.id}`,
          orderId: o.id,
          title: lang === "ar" ? "تأكيد الإلغاء والاسترداد" : "Annulation et Remboursement Effectués",
          message: lang === "ar"
            ? `تم إلغاء الطلب "${itemTitle}" وإعادة المبلغ بالكامل إلى محفظتكم.`
            : `La commande "${itemTitle}" a été annulée. Les fonds ont été reversés sur votre portefeuille Vork.`,
          type: "info",
          isRead: true,
          badgeText: lang === "ar" ? "مسترجع" : "REMBOURSÉ",
          createdAt: o.updatedAt || o.createdAt,
        });
      }
    }

    // 9. SUCCESS : Droit de Rétractation légal 7j actif (Produits Standards)
    if (!isCustom && ["livre", "auto_valide"].includes(o.status) && o.deliveredAt) {
      notifications.push({
        id: `notif-retractation-${o.id}`,
        orderId: o.id,
        title: lang === "ar" ? "مهلة الإرجاع متاحة (٧ أيام)" : "Délai d'Échange ou Retour (7 jours)",
        message: lang === "ar"
          ? `يمكنكم طلب إرجاع القطعة "${itemTitle}" خلال ٧ أيام من تاريخ الاستلام.`
          : `Vous disposez d'un délai de 7 jours après livraison pour demander un retour de "${itemTitle}".`,
        type: "info",
        isRead: true,
        badgeText: lang === "ar" ? "ضمان ٧ أيام" : "GARANTIE 7J",
        createdAt: o.deliveredAt,
      });
    }

    // 10. SUCCESS : Réception validée & Commande finalisée
    if (["complete", "auto_valide"].includes(o.status)) {
      notifications.push({
        id: `notif-completed-${o.id}`,
        orderId: o.id,
        title: lang === "ar" ? "اكتمال الطلب بنجاح" : "Commande Finalisée",
        message: lang === "ar"
          ? `تم تأكيد استلام تحفتكم "${itemTitle}". نتمنى أن تنال إعجابكم.`
          : `La réception de "${itemTitle}" est confirmée. Nous espérons que cette pièce vous apportera entière satisfaction.`,
        type: "success",
        isRead: true,
        badgeText: lang === "ar" ? "مكتمل" : "FINALISÉ",
        createdAt: o.updatedAt || o.createdAt,
      });
    }
  });

  // Filtrage selon le choix de l'utilisateur
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "urgent") return n.type === "urgent" || n.type === "warning";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(26,42,58,0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 120,
      }}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
        style={{
          background: "#FCFBF9",
          borderRadius: "24px 24px 0 0",
          padding: "20px 20px 32px",
          width: "100%",
          maxWidth: 640,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          borderTop: "1.5px solid rgba(196, 169, 106, 0.2)",
          boxShadow: "0 -10px 30px rgba(0,0,0,0.15)",
        }}
      >
        {/* Poignée de la modale */}
        <div style={{ width: 36, height: 4, background: "rgba(0,0,0,0.1)", borderRadius: 2, margin: "0 auto 16px" }} />
        
        {/* Entête du Centre de Notifications */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {unreadCount > 0 && (
              <span style={{
                display: "inline-block",
                padding: "2px 8px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 700,
                background: "rgba(220,53,69,0.12)",
                color: "#DC3545",
              }}>
                {unreadCount}
              </span>
            )}
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--primary)", margin: 0 }}>
                {t('notif_title')}
              </h3>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                {unreadCount > 0 ? (lang === "ar" ? `${unreadCount} إشعار(ات) غير مقروءة` : `${unreadCount} notification(s) non lue(s)`) : (lang === "ar" ? "جميع تنبيهاتك محدثة" : "Toutes vos alertes sont à jour")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={lang === "ar" ? "إغلاق" : "Fermer"}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={16} color="var(--primary)" />
          </button>
        </div>

        {/* Filtres par Onglets (Toutes, Non Lues, Urgentes) */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, background: "rgba(0,0,0,0.03)", padding: 3, borderRadius: 12 }}>
          <button
            onClick={() => setFilter("all")}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 9,
              border: "none",
              background: filter === "all" ? "#FFFFFF" : "transparent",
              color: filter === "all" ? "var(--primary)" : "var(--text-secondary)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 11,
              cursor: "pointer",
              boxShadow: filter === "all" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
            }}
          >
            {lang === "ar" ? `الكل (${notifications.length})` : `Toutes (${notifications.length})`}
          </button>

          <button
            onClick={() => setFilter("unread")}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 9,
              border: "none",
              background: filter === "unread" ? "#FFFFFF" : "transparent",
              color: filter === "unread" ? "#8B6914" : "var(--text-secondary)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 11,
              cursor: "pointer",
              boxShadow: filter === "unread" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
            }}
          >
            {lang === "ar" ? `غير مقروءة (${unreadCount})` : `Non Lues (${unreadCount})`}
          </button>

          <button
            onClick={() => setFilter("urgent")}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 9,
              border: "none",
              background: filter === "urgent" ? "#FFFFFF" : "transparent",
              color: filter === "urgent" ? "#DC3545" : "var(--text-secondary)",
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 11,
              cursor: "pointer",
              boxShadow: filter === "urgent" ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
            }}
          >
            {lang === "ar" ? `عاجلة (${notifications.filter(n => n.type === "urgent" || n.type === "warning").length})` : `Urgentes (${notifications.filter(n => n.type === "urgent" || n.type === "warning").length})`}
          </button>
        </div>

        {actionFeedback && (
          <div style={{
            marginBottom: 10,
            padding: "9px 12px",
            borderRadius: 12,
            fontSize: 11.5,
            fontWeight: 700,
            background: actionFeedback.type === "success" ? "rgba(45,106,79,0.1)" : "rgba(220,53,69,0.1)",
            color: actionFeedback.type === "success" ? "#2D6A4F" : "#DC2626",
            border: `1px solid ${actionFeedback.type === "success" ? "rgba(45,106,79,0.3)" : "rgba(220,53,69,0.3)"}`,
          }}>
            {actionFeedback.text}
          </div>
        )}

        {/* Liste des Notifications Colorées */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 2, paddingBottom: 24, display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => {
              // Couleurs spécifiques par type de notification
              const isUrgent = n.type === "urgent";
              const isWarning = n.type === "warning";
              const isSuccess = n.type === "success";

              const bgColor = isUrgent
                ? "rgba(220,53,69,0.06)"
                : isWarning
                ? "rgba(212,175,55,0.07)"
                : isSuccess
                ? "rgba(45,106,79,0.05)"
                : "rgba(26,42,58,0.03)";

              const borderColor = isUrgent
                ? "rgba(220,53,69,0.30)"
                : isWarning
                ? "rgba(212,175,55,0.35)"
                : isSuccess
                ? "rgba(45,106,79,0.25)"
                : "rgba(26,42,58,0.12)";

              const textColor = isUrgent
                ? "#DC3545"
                : isWarning
                ? "#8B6914"
                : isSuccess
                ? "#2D6A4F"
                : "var(--primary)";

              return (
                <motion.div
                  key={n.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (n.id.startsWith("notif-") && !n.isRead) {
                      setServerNotifs(prev => prev.map(s => s.id === n.id ? { ...s, isRead: true } : s));
                      clientWalletAPI.markNotificationRead(n.id, currentUser?.id || "client-me").catch(() => {});
                    }
                    if (n.rawType === "republication_consent_request") return;
                    onClose();
                    if (n.orderId) onSelectOrder(n.orderId);
                  }}
                  style={{
                    background: bgColor,
                    border: `1.5px solid ${borderColor}`,
                    borderRadius: 16,
                    padding: "13px 15px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    cursor: "pointer",
                    boxShadow: !n.isRead ? "0 4px 12px rgba(0,0,0,0.06)" : "none",
                    position: "relative",
                  }}
                >
                  {/* Puce d'Indicateur Non Lu */}
                  {!n.isRead && (
                    <div 
                      style={{ 
                        position: "absolute", 
                        top: 12, 
                        right: 12, 
                        width: 8, 
                        height: 8, 
                        borderRadius: "50%", 
                        background: isUrgent ? "#DC3545" : "#8B6914",
                        boxShadow: `0 0 0 2px #FCFBF9`
                      }} 
                    />
                  )}

                  {/* Indicateur minimal de statut (Design épuré sans icônes superflues) */}
                  <div style={{ marginTop: 5, flexShrink: 0, width: 8, height: 8, borderRadius: "50%", background: textColor }} />

                  <div style={{ flex: 1, minWidth: 0, paddingRight: !n.isRead ? 14 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12.5, color: textColor, margin: 0 }}>
                        {n.title}
                      </p>
                      {n.badgeText && (
                        <span 
                          style={{ 
                            fontFamily: "var(--font-body)", 
                            fontSize: 8.5, 
                            fontWeight: 700, 
                            padding: "2px 6px", 
                            borderRadius: 6, 
                            background: isUrgent ? "#DC3545" : isWarning ? "#8B6914" : isSuccess ? "#2D6A4F" : "#1A2A3A", 
                            color: "#FFFFFF" 
                          }}
                        >
                          {n.badgeText}
                        </span>
                      )}
                    </div>

                    <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.45 }}>
                      {n.message}
                    </p>

                    {/* Diagramme 5 : Aperçu + Boutons Accepter / Refuser pour Demande d'accord */}
                    {n.rawType === "republication_consent_request" && n.orderId && (
                      <div style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                        {n.metadata?.draftPreview && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 10px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.85)',
                            border: '1px solid rgba(212,175,55,0.3)',
                            marginBottom: 8,
                          }}>
                            {n.metadata.draftPreview.image && (
                              <img src={n.metadata.draftPreview.image} alt={n.metadata.draftPreview.title} style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover' }} />
                            )}
                            <div style={{ fontSize: '0.74rem' }}>
                              <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{n.metadata.draftPreview.title}</div>
                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>
                                {n.metadata.draftPreview.category} · {n.metadata.draftPreview.price} MAD
                              </div>
                            </div>
                          </div>
                        )}

                        {(!n.actionStatus || n.actionStatus === "pending") ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              disabled={busyActionKey === `${n.id}:accept`}
                              onClick={async () => {
                                setBusyActionKey(`${n.id}:accept`);
                                setActionFeedback(null);
                                try {
                                  const res = await clientWalletAPI.respondPublicationConsent(n.orderId!, "accept", currentUser?.id || "client-me");
                                  setServerNotifs(prev => prev.map(s => s.id === n.id ? { ...s, actionStatus: "accepted", isRead: true } : s));
                                  setActionFeedback({
                                    type: "success",
                                    text: res.published
                                      ? (lang === "ar" ? "✓ تمت الموافقة وتم نشر المنشور بالكتالوج." : "✓ Accord validé ! Le post a été publié au catalogue.")
                                      : (lang === "ar" ? "✓ تم تسجيل موافقتك. بانتظار موافقة البائع الأصلي." : "✓ Votre accord est enregistré. En attente du vendeur de base."),
                                  });
                                  if (onRefreshNotifications) await onRefreshNotifications();
                                  if (res.published && onCatalogChanged) await onCatalogChanged();
                                } catch (err: any) {
                                  setActionFeedback({ type: "error", text: err.message });
                                } finally {
                                  setBusyActionKey(null);
                                }
                              }}
                              style={{
                                flex: 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                                padding: '7px 10px',
                                borderRadius: 10,
                                border: 'none',
                                background: '#2D6A4F',
                                color: '#FFFFFF',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <CheckCircle size={13} />
                              {lang === "ar" ? "قبول" : "Accepter"}
                            </button>
                            <button
                              type="button"
                              disabled={busyActionKey === `${n.id}:refuse`}
                              onClick={async () => {
                                setBusyActionKey(`${n.id}:refuse`);
                                setActionFeedback(null);
                                try {
                                  await clientWalletAPI.respondPublicationConsent(n.orderId!, "refuse", currentUser?.id || "client-me");
                                  setServerNotifs(prev => prev.map(s => s.id === n.id ? { ...s, actionStatus: "rejected", isRead: true } : s));
                                  setActionFeedback({
                                    type: "success",
                                    text: lang === "ar" ? "✕ تم رفض طلب النشر." : "✕ Demande refusée. Aucun post ne sera publié.",
                                  });
                                  if (onRefreshNotifications) await onRefreshNotifications();
                                } catch (err: any) {
                                  setActionFeedback({ type: "error", text: err.message });
                                } finally {
                                  setBusyActionKey(null);
                                }
                              }}
                              style={{
                                flex: 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                                padding: '7px 10px',
                                borderRadius: 10,
                                border: '1px solid rgba(220,53,69,0.35)',
                                background: 'rgba(220,53,69,0.08)',
                                color: '#DC2626',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <XCircle size={13} />
                              {lang === "ar" ? "رفض" : "Refuser"}
                            </button>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: n.actionStatus === "accepted" ? "#2D6A4F" : "#DC2626" }}>
                            {n.actionStatus === "accepted"
                              ? (lang === "ar" ? "✓ تم قبول هذا الطلب" : "✓ Demande acceptée")
                              : (lang === "ar" ? "✕ تم رفض هذا الطلب" : "✕ Demande refusée")}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons si publication + Retrait de l'accord (Diagramme 5) */}
                    {n.linkUrl && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => {
                            const prodId = n.sourceId || (n.linkUrl ? n.linkUrl.split('/').pop() || '' : '');
                            if (onOpenProduct && prodId) {
                              onOpenProduct(prodId);
                            } else if (n.linkUrl) {
                              window.location.href = n.linkUrl;
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 10px',
                            borderRadius: 8,
                            border: 'none',
                            background: '#1A2A3A',
                            color: '#FFFFFF',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <ExternalLink size={12} />
                          Voir la création
                        </button>

                        {n.rawType === "from_scratch_published_to_catalog" && n.orderId && (
                          n.actionStatus === "withdrawn" ? (
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#DC2626', padding: '4px 6px' }}>
                              ✓ Accord retiré · Vendeur notifié
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={busyActionKey === `${n.id}:withdraw`}
                              onClick={async () => {
                                if (!window.confirm(lang === "ar" ? "هل تريد سحب موافقتك؟ سيتم إلزام الصانع بحذف المنشور دون إلغاء الطلبات الجارية." : "Demander le retrait de votre accord ? Le vendeur devra supprimer ce post (les commandes en cours continuent).")) {
                                  return;
                                }
                                setBusyActionKey(`${n.id}:withdraw`);
                                setActionFeedback(null);
                                try {
                                  await clientWalletAPI.withdrawPublicationConsent(n.orderId!, currentUser?.id || "client-me");
                                  setServerNotifs(prev => prev.map(s => s.id === n.id ? { ...s, actionStatus: "withdrawn" } : s));
                                  setActionFeedback({
                                    type: "success",
                                    text: lang === "ar" ? "تم سحب الموافقة وإشعار البائع لحذف المنشور." : "Accord retiré : le post a été masqué et le vendeur notifié.",
                                  });
                                  if (onRefreshNotifications) await onRefreshNotifications();
                                  if (onCatalogChanged) await onCatalogChanged();
                                } catch (err: any) {
                                  setActionFeedback({ type: "error", text: err.message });
                                } finally {
                                  setBusyActionKey(null);
                                }
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '4px 9px',
                                borderRadius: 8,
                                background: 'rgba(212, 175, 55, 0.14)',
                                border: '1px solid rgba(212, 175, 55, 0.4)',
                                color: '#8B6914',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <Ban size={12} />
                              {lang === "ar" ? "سحب الموافقة" : "Retirer l'accord"}
                            </button>
                          )
                        )}

                        <button
                          onClick={() => {
                            setReportTarget({
                              targetId: n.sourceId || (n.linkUrl ? n.linkUrl.split('/').pop() || '' : '') || 'item',
                              targetTitle: n.title,
                              targetOwnerId: n.secondaryUserId,
                            });
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '4px 8px',
                            borderRadius: 8,
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#DC2626',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Flag size={12} />
                          Signaler
                        </button>
                      </div>
                    )}
                  </div>

                  <ChevronRight size={15} color="var(--text-secondary)" style={{ alignSelf: "center", opacity: 0.5, transform: lang === 'ar' ? 'rotate(180deg)' : 'none' }} />
                </motion.div>
              );
            })
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14, color: "var(--primary)", margin: "0 0 4px" }}>
                {lang === "ar" ? "لا توجد أي إشعارات" : "Aucune notification trouvée"}
              </p>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                {filter === "unread" 
                  ? (lang === "ar" ? "جميع إشعاراتك مقروءة." : "Toutes vos notifications sont lues.") 
                  : (lang === "ar" ? "لا توجد تنبيهات جديدة في الوقت الراهن." : "Aucune alerte pour le moment.")}
              </p>
            </div>
          )}
        </div>

        {/* Modal de signalement */}
        {reportTarget && (
          <ReportModal
            isOpen={Boolean(reportTarget)}
            onClose={() => setReportTarget(null)}
            targetType="product"
            targetId={reportTarget.targetId}
            targetTitle={reportTarget.targetTitle}
            targetOwnerId={reportTarget.targetOwnerId}
            reporterId={currentUser?.id || 'client-me'}
            reporterType="client"
          />
        )}
      </motion.div>
    </motion.div>
  );
};
