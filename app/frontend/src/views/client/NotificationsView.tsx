import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  X, 
  Bell, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  Truck
} from "lucide-react";
import type { ClientOrder } from "../../types/clientPayment";
import { useClientI18n } from "../../services/i18n";

interface NotificationsViewProps {
  orders: ClientOrder[];
  onClose: () => void;
  onSelectOrder: (orderId: string) => void;
}

export interface AppNotification {
  id: string;
  orderId: string;
  title: string;
  message: string;
  type: "urgent" | "warning" | "info" | "success";
  isRead: boolean;
  createdAt: string;
  badgeText?: string;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ orders, onClose, onSelectOrder }) => {
  const { lang, t } = useClientI18n();
  const [filter, setFilter] = useState<"all" | "unread" | "urgent">("all");

  // Génération dynamique et professionnelle des notifications basées sur les CGV
  const notifications: AppNotification[] = [];

  orders.forEach((o) => {
    const isCustom = ["personnalise", "sur_commande"].includes(o.productType);
    const itemTitle = o.productTitle || (lang === "ar" ? "تحفة تقليدية" : "Produit Artisanal");

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

    // 5. INFO : Bon de Livraison (BL) généré pour Sendit
    if (o.senditDeliveryCode && o.status === "en_preparation") {
      notifications.push({
        id: `notif-bl-${o.id}`,
        orderId: o.id,
        title: lang === "ar" ? "إصدار بوليصة الشحن" : "Bordereau d'Expédition Prêt",
        message: lang === "ar"
          ? `تم تجهيز بوليصة التوصيل (${o.senditDeliveryCode}) لطلب "${itemTitle}". جاري تجهيز الطرد للتسليم.`
          : `L'étiquette d'expédition (${o.senditDeliveryCode}) a été émise pour "${itemTitle}". Le colis est en cours de préparation.`,
        type: "info",
        isRead: true,
        badgeText: lang === "ar" ? "الشحن" : "EXPÉDITION",
        createdAt: o.createdAt,
      });
    }

    // 6. INFO : Colis en cours de transport
    if (o.status === "en_cours_de_transport") {
      const providerLabel = o.transportProvider === "vendeur" 
        ? (lang === "ar" ? "عبر المعلم مباشرة" : "directement par l'artisan") 
        : (lang === "ar" ? "عبر شريكنا اللوجستي" : "par notre transporteur partenaire");
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
            <div style={{ width: 38, height: 38, borderRadius: 12, background: unreadCount > 0 ? "rgba(220,53,69,0.12)" : "rgba(212,175,55,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={20} color={unreadCount > 0 ? "#DC3545" : "#8B6914"} />
            </div>
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

        {/* Liste des Notifications Colorées */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 2, display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none" }}>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => {
              // Couleurs spécifiques par type de notification
              const isUrgent = n.type === "urgent";
              const isWarning = n.type === "warning";
              const isSuccess = n.type === "success";
              const isInfo = n.type === "info";

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
                    onClose();
                    onSelectOrder(n.orderId);
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

                  {/* Icône selon le type */}
                  <div style={{ marginTop: 2, flexShrink: 0 }}>
                    {isUrgent && <ShieldAlert size={19} color="#DC3545" />}
                    {isWarning && <Clock size={19} color="#8B6914" />}
                    {isSuccess && <CheckCircle2 size={19} color="#2D6A4F" />}
                    {isInfo && <Truck size={19} color="#1A2A3A" />}
                  </div>

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
                  </div>

                  <ChevronRight size={15} color="var(--text-secondary)" style={{ alignSelf: "center", opacity: 0.5, transform: lang === 'ar' ? 'rotate(180deg)' : 'none' }} />
                </motion.div>
              );
            })
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <Bell size={32} color="var(--text-secondary)" style={{ opacity: 0.4, marginBottom: 10 }} />
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
      </motion.div>
    </motion.div>
  );
};
