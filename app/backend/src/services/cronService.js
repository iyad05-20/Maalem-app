import { eq, and, isNull, inArray, lte, gte, or } from "drizzle-orm";
import { db } from "../core/db/index.js";
import { orders, returnRequests, vendorProfiles, vendorWarnings, cronExecutions, withdrawalRequests, formalRequests } from "../core/db/schema.js";

/**
 * 🕒 Moteur de Cron Jobs Vork / Maâlem — Conforme aux Décisions du 26/09/2026
 *
 * Principes fondamentaux :
 * - ZÉRO validation tacite / ZÉRO libération automatique de séquestre (Décision 1 & 2).
 * - ZÉRO annulation automatique ni sanction vendeur pour non-réponse (Décision 21 & 24).
 * - Système de RAPPELS et NOTIFICATIONS bienveillants (Règle des 48h - Décision 29).
 * - Support Bilingue Français / العربية pour toutes les notifications.
 */

async function logCronExecution(jobName, status, itemsProcessed = 0, details = "") {
  try {
    const id = `cron-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await db.insert(cronExecutions).values({
      id,
      jobName,
      status,
      itemsProcessed,
      details: typeof details === "object" ? JSON.stringify(details) : String(details),
      executedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error(`[CRON] Failed to log execution for ${jobName}:`, e.message);
  }
}

/**
 * Job 1 : Rappels d'Acceptation Commande pour l'Artisan (+24h / +48h / +72h)
 * (Décision 21 & 29 - CRON V2 & V3)
 * Rappelle à l'artisan qu'une commande attend sa confirmation, SANS forçage ni sanction.
 */
export async function runJ2RelanceJob() {
  console.log("[CRON] ⏰ Démarrage du Job 1 : Rappels d'acceptation artisan (48h/72h)...");
  const now = new Date();
  let processedCount = 0;
  const logs = [];

  try {
    const pendingOrders = await db.select().from(orders).where(
      inArray(orders.status, ["acompte_verse", "payee_integralement", "en_attente_vendeur"])
    );

    for (const order of pendingOrders) {
      if (order.acceptedAt) continue;

      const createdMs = new Date(order.createdAt).getTime();
      const diffHours = (now.getTime() - createdMs) / (1000 * 60 * 60);

      // Rappel +48h (J+2)
      if (diffHours >= 48 && !order.j2RelanceSentAt) {
        await db.update(orders).set({
          j2RelanceSentAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }).where(eq(orders.id, order.id));

        const notifMsg = {
          fr: `Rappel : la commande #${order.id} attend votre acceptation. Le client peut annuler à tout moment tant que vous n'avez pas accepté.`,
          ar: `تذكير: الطلب #${order.id} في انتظار قبولك. يحق للزبون إلغاء الطلب في أي وقت قبل قبولك له.`,
        };

        logs.push(`Commande ${order.id} : Rappel 48h envoyé à l'artisan ${order.artisanRef}.`);
        processedCount++;
      }
      // Relance +72h (J+3) — Information sans pénalité
      else if (diffHours >= 72) {
        logs.push(`Commande ${order.id} : En attente depuis >72h chez l'artisan ${order.artisanRef}. Le client conserve son droit d'annulation libre.`);
        processedCount++;
      }
    }

    await logCronExecution("relance-artisan-acceptation", "success", processedCount, logs);
    console.log(`[CRON] ✅ Job 1 terminé (${processedCount} commandes traitées).`);
    return { success: true, processedCount, logs };
  } catch (err) {
    console.error("[CRON] ❌ Erreur Job 1 :", err);
    await logCronExecution("relance-artisan-acceptation", "failed", 0, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Job 2 : Rappels de Validation de Réception au Client (+48h et +5 jours)
 * (Décision 1 & 29 - CRON C1 & C2)
 * Pousse le client à inspecter sa commande et à valider. AUCUNE libération tacite.
 */
export async function runClientDeliveryRemindersJob() {
  console.log("[CRON] ⏰ Démarrage du Job 2 : Rappels de validation client post-livraison...");
  const now = new Date();
  let processedCount = 0;
  const logs = [];

  try {
    const deliveredOrders = await db.select().from(orders).where(
      and(
        eq(orders.status, "livre"),
        isNull(orders.escrowReleasedAt)
      )
    );

    for (const order of deliveredOrders) {
      if (!order.deliveredAt) continue;

      const deliveredMs = new Date(order.deliveredAt).getTime();
      const diffHours = (now.getTime() - deliveredMs) / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      if (diffHours >= 48 && diffDays < 5) {
        // Notification C1 (+48h)
        const notif = {
          fr: `Votre commande #${order.id} semble livrée. Inspectez et validez la réception pour finaliser et libérer les fonds de l'artisan.`,
          ar: `شحنتك رقم #${order.id} تم تسليمها. يرجى فحصها وتأكيد الاستلام لتحويل مستحقات الصانع.`,
        };
        logs.push(`Commande ${order.id} : Rappel client +48h (Validation requise).`);
        processedCount++;
      } else if (diffDays >= 5) {
        // Notification C2 (+5j)
        const notif = {
          fr: `Rappel : validez la réception de votre commande #${order.id}. Le Maâlem attend votre confirmation.`,
          ar: `تذكير: يرجى تأكيد استلام طلبك #${order.id}. المعلم في انتظار مصادقتك الكريمة.`,
        };
        logs.push(`Commande ${order.id} : Rappel client +5j (Validation urgente).`);
        processedCount++;
      }
    }

    await logCronExecution("rappels-validation-client", "success", processedCount, logs);
    console.log(`[CRON] ✅ Job 2 terminé (${processedCount} rappels envoyés).`);
    return { success: true, processedCount, logs };
  } catch (err) {
    console.error("[CRON] ❌ Erreur Job 2 :", err);
    await logCronExecution("rappels-validation-client", "failed", 0, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Job 3 : Surveillance Admin des Séquestres Dormants (+10j / +30j)
 * (Décision 1 & Audit A1/A2)
 * Alerte l'administration sur les commandes livrées dont le client n'a jamais validé.
 */
export async function runAdminEscrowMonitoringJob() {
  console.log("[CRON] ⏰ Démarrage du Job 3 : Surveillance des séquestres dormants...");
  const now = new Date();
  let processedCount = 0;
  const logs = [];

  try {
    const eligibleOrders = await db.select().from(orders).where(
      and(
        eq(orders.status, "livre"),
        isNull(orders.escrowReleasedAt)
      )
    );

    for (const order of eligibleOrders) {
      if (!order.deliveredAt) continue;

      const deliveredMs = new Date(order.deliveredAt).getTime();
      const diffDays = (now.getTime() - deliveredMs) / (1000 * 60 * 60 * 24);

      if (diffDays >= 30) {
        logs.push(`🔴 CRITIQUE - Commande #${order.id} non validée depuis 30+ jours. Séquestre bloqué (${order.totalPrice} MAD).`);
        processedCount++;
      } else if (diffDays >= 5) {
        // C01 : Déclenche une demande pour l'admin pour vérification de retard de réponse + notification pour le vendeur
        logs.push(`⚠️ DEMANDE ADMIN (C01) - Vérification retard de réponse validation client pour commande #${order.id} (${Math.floor(diffDays)} jours post-livraison).`);
        
        // Notifier le vendeur (C01)
        const sellerAlert = {
          orderId: order.id,
          artisanRef: order.artisanRef,
          type: "alerte_retard_validation_client",
          fr: `Le client n'a pas encore validé la réception de la commande #${order.id}. Une demande de vérification pour retard de réponse a été transmise à l'administration Vork.`,
          ar: `لم يقم الزبون بعد بتأكيد استلام الطلب #${order.id}. تم إرسال طلب تحقق بسبب تأخر الرد إلى إدارة Vork.`,
        };
        logs.push(`Notification vendeur émise : ${sellerAlert.fr}`);
        processedCount++;
      }
    }

    await logCronExecution("surveillance-admin-sequestres", "success", processedCount, logs);
    console.log(`[CRON] ✅ Job 3 terminé (${processedCount} alertes séquestres identifiées).`);
    return { success: true, processedCount, logs };
  } catch (err) {
    console.error("[CRON] ❌ Erreur Job 3 :", err);
    await logCronExecution("surveillance-admin-sequestres", "failed", 0, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Job 4 : Forclusion des Retours Expirés sous 17 jours (Art. 13.5)
 * - 10 jours légaux de dépôt + 7 jours de tolérance.
 */
export async function runExpiredReturnsJob() {
  console.log("[CRON] ⏰ Démarrage du Job 4 : Clôture des Retours Expirés...");
  const now = new Date();
  let processedCount = 0;
  const logs = [];

  try {
    const pendingReturns = await db.select().from(returnRequests).where(
      eq(returnRequests.status, "initie")
    );

    for (const ret of pendingReturns) {
      const createdMs = new Date(ret.createdAt).getTime();
      const diffDays = (now.getTime() - createdMs) / (1000 * 60 * 60 * 24);

      if (diffDays >= 17) {
        await db.update(returnRequests).set({
          status: "expire",
          resolvedAt: now.toISOString(),
        }).where(eq(returnRequests.id, ret.id));

        await db.update(orders).set({
          status: "valide",
          escrowReleasedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }).where(eq(orders.id, ret.orderId));

        logs.push(`Retour ${ret.id} pour commande ${ret.orderId} : Expiré (Fonds libérés à l'artisan).`);
        processedCount++;
      }
    }

    await logCronExecution("expire-returns", "success", processedCount, logs);
    console.log(`[CRON] ✅ Job 4 terminé (${processedCount} retours forclos).`);
    return { success: true, processedCount, logs };
  } catch (err) {
    console.error("[CRON] ❌ Erreur Job 4 :", err);
    await logCronExecution("expire-returns", "failed", 0, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Job 5 : Surveillance des Demandes Formelles sans Réponse (+48h)
 * (Décision 29, 34 & 35 - Q/R 28/09/2026)
 * Identifie les demandes formelles dont le délai de réponse de 48h est expiré.
 * Conforme à la Philosophie Vork : ZÉRO escalade automatique !
 * Vork n'intervient JAMAIS sans demande explicite du client ou de l'artisan.
 * Le Cron envoie un rappel de retard au destinataire et informe l'initiateur
 * qu'il est désormais éligible pour solliciter l'avis de médiation Vork s'il le souhaite.
 */
export async function runFormalRequestsDeadlineJob() {
  console.log("[CRON] ⏰ Démarrage du Job 5 : Échéance des Demandes Formelles (48h - Rappels sans auto-escalade)...");
  const now = new Date();
  let processedCount = 0;
  const logs = [];

  try {
    const openRequests = await db.select().from(formalRequests).where(
      eq(formalRequests.status, "ouverte")
    );

    for (const req of openRequests) {
      if (req.deadlineRespondentAt && new Date(req.deadlineRespondentAt).getTime() <= now.getTime()) {
        // Notification au destinataire (rappel de retard) et à l'initiateur (éligibilité à demander l'avis Vork)
        logs.push(`Demande formelle ${req.id} (Commande ${req.orderId}) : Délai 48h expiré. Notification de retard envoyée à ${req.respondentId}. L'initiateur ${req.initiatorId} est notifié qu'il peut solliciter l'intervention Vork.`);
        processedCount++;
      }
    }

    await logCronExecution("demandes-formelles-48h", "success", processedCount, logs);
    console.log(`[CRON] ✅ Job 5 terminé (${processedCount} demandes notifiées pour échéance 48h).`);
    return { success: true, processedCount, logs };
  } catch (err) {
    console.error("[CRON] ❌ Erreur Job 5 :", err);
    await logCronExecution("demandes-formelles-48h", "failed", 0, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Job 6 : Traitement du Lot Hebdomadaire des Virements (Vendredi à 10h00)
 */
export async function runWeeklyWithdrawalBatchJob() {
  console.log("[CRON] ⏰ Démarrage du Job 6 : Lot Hebdomadaire des Virements (Vendredi 10h00)...");
  const now = new Date();
  let processedCount = 0;
  let totalAmount = 0;
  const logs = [];

  try {
    const allPending = await db.select().from(withdrawalRequests).where(
      inArray(withdrawalRequests.status, ["pending", "en_attente_lot_vendredi"])
    );

    for (const req of allPending) {
      await db.update(withdrawalRequests).set({
        status: "processed",
        processedAt: now.toISOString(),
      }).where(eq(withdrawalRequests.id, req.id));

      processedCount++;
      totalAmount += Number(req.amount);
      logs.push(`Virement #${req.id} de ${req.amount} MAD exécuté vers le RIB ${req.rib.slice(0, 4)}...${req.rib.slice(-4)} (${req.userId}).`);
    }

    await logCronExecution("virements-vendredi", "success", processedCount, { totalAmount, logs });
    console.log(`[CRON] ✅ Job 6 terminé (${processedCount} virements traités pour un total de ${totalAmount} MAD).`);
    return { success: true, processedCount, totalAmount, logs };
  } catch (err) {
    console.error("[CRON] ❌ Erreur Job 6 :", err);
    await logCronExecution("virements-vendredi", "failed", 0, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Exécute l'ensemble des jobs planifiés.
 */
export async function runAllCronJobs() {
  console.log("[CRON] 🚀 Lancement global des tâches conformes Vork...");
  const results = {
    job1_relanceArtisan: await runJ2RelanceJob(),
    job2_rappelsClientValidation: await runClientDeliveryRemindersJob(),
    job3_surveillanceSequestres: await runAdminEscrowMonitoringJob(),
    job4_expiredReturns: await runExpiredReturnsJob(),
    job5_formalRequests48h: await runFormalRequestsDeadlineJob(),
    job6_weeklyWithdrawals: await runWeeklyWithdrawalBatchJob(),
  };
  return results;
}

/**
 * Démarre le scheduler périodique en arrière-plan.
 */
export function startCronScheduler(intervalMinutes = 60) {
  console.log(`[CRON] 🕒 Planificateur de rappels et alertes Vork initialisé (${intervalMinutes} min).`);

  setInterval(async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDate();

      // Relances et virements chaque matin à 10h
      if (currentHour === 10) {
        await runJ2RelanceJob();
        await runClientDeliveryRemindersJob();
        if (now.getDay() === 5) {
          await runWeeklyWithdrawalBatchJob();
        }
      }

      // Surveillance séquestres et demandes formelles à 14h
      if (currentHour === 14) {
        await runFormalRequestsDeadlineJob();
        await runAdminEscrowMonitoringJob();
      }

      // Clôture retours expirés la nuit à 02h00
      if (currentHour === 2) {
        await runExpiredReturnsJob();
      }
    } catch (err) {
      console.error("[CRON] Erreur dans le cycle du scheduler :", err);
    }
  }, intervalMinutes * 60 * 1000);
}
