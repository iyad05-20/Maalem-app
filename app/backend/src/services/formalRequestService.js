import { eq, desc, and } from "drizzle-orm";
import { db } from "../core/db/index.js";
import { orders, formalRequests } from "../core/db/schema.js";

/**
 * Service de Demandes Formelles (Q/R 28/09/2026)
 * 
 * Règles validées :
 * - Q3.1 : Les DEUX parties (client ET vendeur) peuvent faire une demande formelle
 * - Q3.2 : Plusieurs demandes par commande sont possibles (chaque partie peut rouvrir)
 * - Q3.3 : Format = Catégorie (liste déroulante + Autre) + Description texte + Photos (optionnel)
 * - Q3.4 : Vork n'intervient PAS sans demande explicite du demandeur.
 *           Conditions d'escalade :
 *           (a) 48h sans réponse de l'autre partie → le demandeur PEUT demander intervention Vork
 *           (b) Réponse reçue mais insatisfaisante → le demandeur PEUT demander intervention Vork
 *           L'escalade est toujours à l'initiative du demandeur, jamais automatique.
 * - Q3.5 : Vork ne rend PAS de décision contraignante. Il fait une OBSERVATION du litige
 *           et donne son AVIS. Les parties restent libres de suite.
 */

/**
 * Catégories officielles de demandes formelles (Spécification v2 / Décision Ziad)
 */
export const FORMAL_REQUEST_CATEGORIES = {
  client: [
    { id: "abus_delais", label: "Abus de délais (Fabrication ou Transport)", labelAr: "تجاوز المواعيد (تصنيع أو نقل)" },
    { id: "annulation_refusee", label: "Refus injustifié d'annulation", labelAr: "رفض غير مبرر للإلغاء" },
    { id: "produit_defectueux", label: "Produit défectueux ou non-conforme", labelAr: "منتج به عيب أو غير مطابق" },
    { id: "autre", label: "Autre motif", labelAr: "سبب آخر" },
  ],
  artisan: [
    { id: "client_inaccessible", label: "Client injoignable après expédition", labelAr: "العميل لا يجيب بعد الشحن" },
    { id: "refus_validation_reception", label: "Refus de validation de réception après livraison", labelAr: "رفض تأكيد الاستلام بعد التسليم" },
    { id: "autre", label: "Autre motif", labelAr: "سبب آخر" },
  ],
};

export async function createFormalRequest({
  orderId,
  initiatorType, // 'client' | 'artisan'
  initiatorId,
  category,
  description,
  evidenceUrls = [],
}) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) throw new Error("commande_introuvable");

  // Q3.2 : Plusieurs demandes par commande sont possibles — pas de vérification de doublon

  const respondentId = initiatorType === "client" ? order.artisanRef : order.clientRef;
  const now = new Date();
  const deadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48h de délai de réponse (Q3.4a)

  const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  await db.transaction(async (tx) => {
    await tx.insert(formalRequests).values({
      id,
      orderId,
      initiatorType,
      initiatorId,
      respondentId,
      category,
      description: description.trim(),
      evidenceUrls: JSON.stringify(evidenceUrls),
      status: "ouverte",
      createdAt: now.toISOString(),
      deadlineRespondentAt: deadline.toISOString(),
    });

    // Mettre à jour le statut de la commande en signalement si pas encore finalisée
    if (order.status !== "valide" && order.status !== "annulee") {
      await tx.update(orders)
        .set({ status: "en_demande_formelle", updatedAt: now.toISOString() })
        .where(eq(orders.id, orderId));
    }
  });

  return {
    success: true,
    requestId: id,
    orderId,
    initiatorType,
    deadlineRespondentAt: deadline.toISOString(),
    message: initiatorType === "artisan"
      ? "Demande formelle soumise. Le client dispose de 48h pour répondre. Après ce délai ou après sa réponse, vous pourrez demander l'intervention de Vork si nécessaire."
      : "Demande formelle soumise. L'artisan dispose de 48h pour répondre. Après ce délai ou après sa réponse, vous pourrez demander l'intervention de Vork si nécessaire.",
    message_ar: initiatorType === "artisan"
      ? "تم تقديم الطلب الرسمي. أمام العميل 48 ساعة للرد. بعد هذه المهلة أو بعد رده، يمكنك طلب تدخل Vork إذا لزم الأمر."
      : "تم تقديم الطلب الرسمي. أمام الحرفي 48 ساعة للرد. بعد هذه المهلة أو بعد رده، يمكنك طلب تدخل Vork إذا لزم الأمر.",
  };
}

export async function respondToFormalRequest(requestId, respondentId, responseMessage) {
  const [req] = await db.select().from(formalRequests).where(eq(formalRequests.id, requestId));
  if (!req) throw new Error("demande_introuvable");
  if (req.respondentId !== respondentId) throw new Error("non_autorise");

  const now = new Date().toISOString();
  await db.update(formalRequests)
    .set({
      status: "repondue",
      responseMessage: responseMessage.trim(),
      resolvedAt: now,
    })
    .where(eq(formalRequests.id, requestId));

  return {
    success: true,
    requestId,
    status: "repondue",
    message: "Réponse enregistrée avec succès.",
  };
}

/**
 * Escalade vers Vork (Q3.4) — intervention sur demande du demandeur uniquement.
 * Conditions requises :
 *   (a) 48h écoulées sans réponse de l'autre partie, OU
 *   (b) L'autre partie a déjà répondu mais le demandeur est insatisfait.
 *
 * Q3.5 : Vork donne une OBSERVATION / AVIS, PAS une décision contraignante.
 */
export async function escalateToAdmin(requestId, requestedById) {
  const [req] = await db.select().from(formalRequests).where(eq(formalRequests.id, requestId));
  if (!req) throw new Error("demande_introuvable");

  // Vérifier que le demandeur est bien l'initiateur de la demande
  if (req.initiatorId !== requestedById) {
    throw new Error("seul_initiateur_peut_escalader");
  }

  // Vérifier les conditions d'escalade (Q3.4)
  const now = new Date();
  const deadline = new Date(req.deadlineRespondentAt);
  const isDeadlinePassed = now >= deadline;
  const hasResponse = req.status === "repondue";

  if (!isDeadlinePassed && !hasResponse) {
    throw new Error("escalade_prematuree_attendre_48h_ou_reponse");
  }

  await db.update(formalRequests)
    .set({
      status: "escaladee_admin",
      adminNotes: `Intervention Vork demandée par ${requestedById} le ${now.toISOString()}. Motif : ${isDeadlinePassed ? '48h sans réponse' : 'Réponse insatisfaisante'}. Note : Vork émet un avis/observation, pas une décision contraignante.`,
    })
    .where(eq(formalRequests.id, requestId));

  return {
    success: true,
    requestId,
    status: "escaladee_admin",
    escalationReason: isDeadlinePassed ? "deadline_48h_depassee" : "reponse_insatisfaisante",
    message: "Le dossier a été transmis à l'équipe Vork pour observation. Vork émettra son avis sur le litige.",
    message_ar: "تم إرسال الملف إلى فريق Vork للملاحظة. سيصدر Vork رأيه بشأن النزاع.",
  };
}

export async function getFormalRequestsForUser(userId) {
  const list = await db.select()
    .from(formalRequests)
    .where(
      and(
        // Utilisateur est soit l'initiateur soit le destinataire
        eq(formalRequests.initiatorId, userId)
      )
    )
    .orderBy(desc(formalRequests.createdAt));

  const received = await db.select()
    .from(formalRequests)
    .where(eq(formalRequests.respondentId, userId))
    .orderBy(desc(formalRequests.createdAt));

  return {
    initiated: list.map(r => ({
      ...r,
      evidenceUrls: r.evidenceUrls ? JSON.parse(r.evidenceUrls) : [],
    })),
    received: received.map(r => ({
      ...r,
      evidenceUrls: r.evidenceUrls ? JSON.parse(r.evidenceUrls) : [],
    })),
  };
}

export async function getFormalRequestsForOrder(orderId) {
  const list = await db.select()
    .from(formalRequests)
    .where(eq(formalRequests.orderId, orderId))
    .orderBy(desc(formalRequests.createdAt));

  return list.map(r => ({
    ...r,
    evidenceUrls: r.evidenceUrls ? JSON.parse(r.evidenceUrls) : [],
  }));
}
