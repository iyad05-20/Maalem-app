import { eq, desc, and } from "drizzle-orm";
import { db } from "../core/db/index.js";
import { reports, adminAuditLogs, vendorProfiles, customRequests } from "../core/db/schema.js";
import { supabase } from "../db/supabase.client.js";
import { createNotification } from "./notificationService.js";

/**
 * Service de Signalements & Modération Admin (Reports - Maâlem v2)
 * Encadre le signalement pour plagiat, images inappropriées et infractions à la charte.
 */

export async function submitReport({
  reporterId,
  reporterType = "client", // 'client' | 'artisan'
  targetType, // 'product' | 'public_custom_request' | 'vendor'
  targetId,
  targetTitle = null,
  targetOwnerId = null,
  category = "plagiat", // 'plagiat' | 'image_inappropriee' | 'non_respect_charte' | 'autre'
  reason,
  evidenceUrls = [],
}) {
  if (!reporterId || !targetType || !targetId || !reason) {
    throw new Error("parametres_signalement_invalides");
  }

  const id = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  const record = {
    id,
    reporterId,
    reporterType,
    targetType,
    targetId,
    targetTitle: targetTitle ? String(targetTitle).trim() : null,
    targetOwnerId: targetOwnerId || null,
    category,
    reason: String(reason).trim(),
    evidenceUrls: JSON.stringify(evidenceUrls || []),
    status: "en_attente_admin",
    createdAt: now,
  };

  await db.insert(reports).values(record);
  console.log(`[REPORT-SERVICE] 🚨 Nouveau signalement #${id} soumis par ${reporterType} (${reporterId}) contre [${targetType}:${targetId} - ${category}]`);

  return {
    success: true,
    reportId: id,
    message: "Signalement enregistré avec succès. Notre équipe de modération va examiner le dossier.",
    message_ar: "تم تسجيل البلاغ بنجاح. سيقوم فريق المراقبة بمراجعة الملف في أقرب وقت.",
  };
}

export async function getReportsForAdmin({ status = null, category = null } = {}) {
  try {
    let query = db.select().from(reports);
    const conditions = [];

    if (status) conditions.push(eq(reports.status, status));
    if (category) conditions.push(eq(reports.category, category));

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const list = await query.orderBy(desc(reports.createdAt));
    return list.map((r) => ({
      ...r,
      evidenceUrls: r.evidenceUrls ? (typeof r.evidenceUrls === "string" ? JSON.parse(r.evidenceUrls) : r.evidenceUrls) : [],
    }));
  } catch (err) {
    console.error("[REPORT-SERVICE] ❌ Erreur lecture signalements admin:", err.message);
    return [];
  }
}

export async function resolveReportAdmin(reportId, operatorId, { decision, adminNotes = "" }) {
  const [report] = await db.select().from(reports).where(eq(reports.id, reportId));
  if (!report) {
    throw new Error("signalement_introuvable");
  }

  const now = new Date().toISOString();
  let actionResult = "investigation_completed";

  // 1. Exécution de la sanction
  if (decision === "post_deleted") {
    if (report.targetType === "product") {
      try {
        await supabase
          .from("products")
          .update({ is_hidden: true, updated_at: now })
          .eq("id", report.targetId);
        actionResult = "produit_masque_du_catalogue";
      } catch (sbErr) {
        console.warn("[REPORT-SERVICE] ⚠️ Erreur masquage produit Supabase:", sbErr.message);
      }
    } else if (report.targetType === "public_custom_request") {
      await db
        .update(customRequests)
        .set({ status: "supprimee_admin", updatedAt: now })
        .where(eq(customRequests.id, report.targetId));
      actionResult = "demande_marche_public_supprimee";
    }
  } else if (decision === "vendor_banned") {
    const vendorToBan = report.targetOwnerId || (report.targetType === "vendor" ? report.targetId : null);
    if (vendorToBan) {
      await db
        .update(vendorProfiles)
        .set({
          suspensionStatus: "blocked",
          suspendedUntil: "indefinite",
          updatedAt: now,
        })
        .where(eq(vendorProfiles.id, vendorToBan));
      actionResult = `vendeur_${vendorToBan}_banni_de_la_plateforme`;
    }
  }

  const finalStatus = decision === "dismissed" ? "rejete" : "resolu";

  // 2. Mise à jour du rapport
  await db
    .update(reports)
    .set({
      status: finalStatus,
      adminDecision: decision,
      adminNotes: adminNotes ? String(adminNotes).trim() : null,
      resolvedBy: operatorId || "admin-vork",
      resolvedAt: now,
    })
    .where(eq(reports.id, reportId));

  // 3. Audit log admin
  try {
    await db.insert(adminAuditLogs).values({
      id: `audit-${Date.now()}`,
      operatorId: operatorId || "admin-vork",
      action: `report_resolution:${decision}`,
      targetId: reportId,
      details: JSON.stringify({ decision, actionResult, adminNotes, target: `${report.targetType}:${report.targetId}` }),
      ipAddress: "127.0.0.1",
      createdAt: now,
    });
  } catch {}

  // 4. Notification à l'auteur du signalement
  await createNotification({
    userId: report.reporterId,
    userType: report.reporterType,
    type: "report_update",
    title: "Mise à jour concernant votre signalement",
    titleAr: "تحديث بخصوص بلاغك",
    message: decision === "dismissed"
      ? `Votre signalement concernant "${report.targetTitle || report.targetId}" a été examiné et classé sans suite.`
      : `Votre signalement concernant "${report.targetTitle || report.targetId}" a été traité. Merci de votre contribution à la sécurité de la communauté Maâlem.`,
    messageAr: decision === "dismissed"
      ? `تمت مراجعة بلاغك بخصوص "${report.targetTitle || report.targetId}" وتصنيفه دون متابعة.`
      : `تم اتخاذ الإجراءات اللازمة بخصوص بلاغك. شكراً لمساهمتك في حماية منصة معلم.`,
    sourceId: reportId,
  });

  return {
    success: true,
    reportId,
    status: finalStatus,
    decision,
    actionResult,
    message: "Signalement traité et décision enregistrée avec succès.",
  };
}
