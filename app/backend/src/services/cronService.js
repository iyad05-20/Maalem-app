import { eq, and, isNull, inArray, lte } from "drizzle-orm";
import { db } from "../core/db/index.js";
import { orders, returnRequests, vendorProfiles, cronExecutions, withdrawalRequests } from "../core/db/schema.js";
import { recordVendorWarning } from "../client/services/artisanOrderService.js";

/**
 * Helper to log a cron job execution in the database.
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
 * Job 1 : Relance Automatique Artisan J+2 à 10h00 (Art. 14.6)
 * - Identifie les commandes payées sans acceptation après 48h.
 * - Enregistre la relance J+2.
 * - Si >72h sans réponse (J+3) : Annulation automatique, remboursement client 100% et avertissement vendeur (Art. 6.4).
 */
export async function runJ2RelanceJob() {
  console.log("[CRON] ⏰ Démarrage du Job 1 : Relance Artisan J+2...");
  const now = new Date();
  let processedCount = 0;
  const logs = [];

  try {
    const pendingOrders = await db.select().from(orders).where(
      inArray(orders.status, ["acompte_verse", "payee_integralement"])
    );

    for (const order of pendingOrders) {
      const createdMs = new Date(order.createdAt).getTime();
      const diffHours = (now.getTime() - createdMs) / (1000 * 60 * 60);

      // Cas A : Dépassement 72h (J+3) sans acceptation -> Annulation automatique & Sanction
      if (diffHours >= 72) {
        await db.update(orders).set({
          status: "annulee",
          updatedAt: now.toISOString(),
        }).where(eq(orders.id, order.id));

        // Émission d'un avertissement au vendeur (Art. 6.4)
        await recordVendorWarning(
          order.artisanRef,
          "Annulation automatique : Commande non acceptée dans le délai limite de 72h (Art. 6.4)",
          order.id
        );

        logs.push(`Commande ${order.id} : Annulée automatiquement après 72h (Avertissement émis).`);
        processedCount++;
      }
      // Cas B : Dépassement 48h (J+2) sans relance encore envoyée
      else if (diffHours >= 48 && !order.j2RelanceSentAt) {
        await db.update(orders).set({
          j2RelanceSentAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }).where(eq(orders.id, order.id));

        logs.push(`Commande ${order.id} : Relance J+2 enregistrée pour l'artisan ${order.artisanRef}.`);
        processedCount++;
      }
    }

    await logCronExecution("relance-j2", "success", processedCount, logs);
    console.log(`[CRON] ✅ Job 1 terminé (${processedCount} commandes traitées).`);
    return { success: true, processedCount, logs };
  } catch (err) {
    console.error("[CRON] ❌ Erreur Job 1 :", err);
    await logCronExecution("relance-j2", "failed", 0, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Job 2 : Auto-Validation des Réceptions à Minuit (Art. 13.3 C)
 * - Identifie les commandes livrées depuis >= 24h sans réclamation client.
 * - Passe au statut 'auto_valide'.
 * - Pour les produits standards : Déclenche le délai de 7 jours de rétractation.
 * - Pour les produits sur-mesure : Libère immédiatement le séquestre.
 */
export async function runAutoValidationJob() {
  console.log("[CRON] ⏰ Démarrage du Job 2 : Auto-Validation des Réceptions 24h...");
  const now = new Date();
  let processedCount = 0;
  const logs = [];

  try {
    const deliveredOrders = await db.select().from(orders).where(
      and(
        eq(orders.status, "livre"),
        isNull(orders.receptionValidatedBy),
        isNull(orders.nonReceptionClaimedAt)
      )
    );

    for (const order of deliveredOrders) {
      if (!order.deliveredAt) continue;

      const deliveredMs = new Date(order.deliveredAt).getTime();
      const hoursSinceDelivery = (now.getTime() - deliveredMs) / (1000 * 60 * 60);

      // Seuil de 24 heures post-livraison
      if (hoursSinceDelivery >= 24) {
        const isCustom = ["personnalise", "sur_commande"].includes(order.productType);

        if (isCustom) {
          // Produits sur-mesure / sur-commande : Pas de rétractation, libération immédiate (Art. 9.3)
          await db.update(orders).set({
            status: "auto_valide",
            receptionValidatedBy: "auto",
            escrowReleasedAt: now.toISOString(),
            updatedAt: now.toISOString(),
          }).where(eq(orders.id, order.id));

          logs.push(`Commande Sur-Mesure ${order.id} : Auto-validée (Séquestre libéré immédiatement).`);
        } else {
          // Produits standards : Début des 7 jours calendaires de rétractation (Art. 13.1)
          const withdrawalExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
          await db.update(orders).set({
            status: "auto_valide",
            receptionValidatedBy: "auto",
            withdrawalExpiresAt: withdrawalExpires,
            updatedAt: now.toISOString(),
          }).where(eq(orders.id, order.id));

          logs.push(`Commande Standard ${order.id} : Auto-validée (Rétractation jusqu'au ${withdrawalExpires}).`);
        }
        processedCount++;
      }
    }

    await logCronExecution("auto-validation", "success", processedCount, logs);
    console.log(`[CRON] ✅ Job 2 terminé (${processedCount} commandes auto-validées).`);
    return { success: true, processedCount, logs };
  } catch (err) {
    console.error("[CRON] ❌ Erreur Job 2 :", err);
    await logCronExecution("auto-validation", "failed", 0, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Job 3 : Libération Automatique du Séquestre à J+7 (Art. 14 bis.4)
 * - Identifie les commandes standards validées dont le délai de 7 jours de rétractation est expiré sans litige.
 * - Débloque l'escrow vers le vendeur.
 */
export async function runEscrowReleaseJob() {
  console.log("[CRON] ⏰ Démarrage du Job 3 : Libération du Séquestre J+7...");
  const now = new Date();
  let processedCount = 0;
  const logs = [];

  try {
    const eligibleOrders = await db.select().from(orders).where(
      and(
        inArray(orders.status, ["livre", "auto_valide"]),
        isNull(orders.escrowReleasedAt)
      )
    );

    for (const order of eligibleOrders) {
      if (!order.withdrawalExpiresAt) continue;

      const expiryMs = new Date(order.withdrawalExpiresAt).getTime();
      // Si la date limite de rétractation est dépassée
      if (expiryMs <= now.getTime() && order.status !== "en_reclamation") {
        await db.update(orders).set({
          escrowReleasedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }).where(eq(orders.id, order.id));

        logs.push(`Commande ${order.id} : Séquestre libéré (${order.totalPrice} MAD vers ${order.artisanRef}).`);
        processedCount++;
      }
    }

    await logCronExecution("release-escrow", "success", processedCount, logs);
    console.log(`[CRON] ✅ Job 3 terminé (${processedCount} séquestres débloqués).`);
    return { success: true, processedCount, logs };
  } catch (err) {
    console.error("[CRON] ❌ Erreur Job 3 :", err);
    await logCronExecution("release-escrow", "failed", 0, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Job 4 : Forclusion des Retours Expirés sous 17 jours (Art. 13.5)
 * - 10 jours légaux de dépôt + 7 jours de grâce.
 * - Clôture le retour et libère les fonds au vendeur.
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

      // Seuil de 17 jours (10j dépôt + 7j tolérance)
      if (diffDays >= 17) {
        await db.update(returnRequests).set({
          status: "expire",
          resolvedAt: now.toISOString(),
        }).where(eq(returnRequests.id, ret.id));

        // Réactivation de la commande au statut 'livre' et déblocage séquestre
        await db.update(orders).set({
          status: "livre",
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
 * Job 5 : Reset Mensuel des Avertissements Vendeurs (Art. 6.4)
 * - Remise à zéro le 1er de chaque mois.
 * - Rétablissement des boutiques suspendues dont la période est écoulée.
 */
export async function runMonthlyWarningResetJob() {
  console.log("[CRON] ⏰ Démarrage du Job 5 : Réinitialisation Mensuelle des Avertissements...");
  const now = new Date();
  let processedCount = 0;
  const logs = [];

  try {
    const profiles = await db.select().from(vendorProfiles);

    for (const profile of profiles) {
      const updateData = {
        warningCountCurrentMonth: 0,
        updatedAt: now.toISOString(),
      };

      // Si suspension temporaire arrivée à terme
      if (profile.suspendedUntil && new Date(profile.suspendedUntil).getTime() <= now.getTime()) {
        updateData.suspensionStatus = "active";
        updateData.suspendedUntil = null;
        logs.push(`Vendeur ${profile.id} : Compteur réinitialisé & Boutique réactivée.`);
      } else {
        logs.push(`Vendeur ${profile.id} : Compteur réinitialisé à 0.`);
      }

      await db.update(vendorProfiles).set(updateData).where(eq(vendorProfiles.id, profile.id));
      processedCount++;
    }

    await logCronExecution("reset-warnings", "success", processedCount, logs);
    console.log(`[CRON] ✅ Job 5 terminé (${processedCount} profils réinitialisés).`);
    return { success: true, processedCount, logs };
  } catch (err) {
    console.error("[CRON] ❌ Erreur Job 5 :", err);
    await logCronExecution("reset-warnings", "failed", 0, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Job 6 : Traitement du Lot Hebdomadaire des Virements Artisans (Vendredi à 10h00)
 * - Rassemble toutes les demandes de virement en attente.
 * - Simule l'exécution du virement interbancaire marocain (RIB 24 chiffres).
 * - Clôture les demandes au statut 'processed'.
 */
export async function runWeeklyWithdrawalBatchJob() {
  console.log("[CRON] ⏰ Démarrage du Job 6 : Lot Hebdomadaire des Virements du Vendredi 10h00...");
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
 * Exécute l'ensemble des 6 jobs séquentiellement.
 */
export async function runAllCronJobs() {
  console.log("[CRON] 🚀 Lancement global de toutes les tâches planifiées CGV...");
  const results = {
    job1_relanceJ2: await runJ2RelanceJob(),
    job2_autoValidation: await runAutoValidationJob(),
    job3_escrowRelease: await runEscrowReleaseJob(),
    job4_expiredReturns: await runExpiredReturnsJob(),
    job5_monthlyReset: await runMonthlyWarningResetJob(),
    job6_weeklyWithdrawals: await runWeeklyWithdrawalBatchJob(),
  };
  return results;
}

/**
 * Démarre le scheduler périodique en arrière-plan.
 * Exécute une vérification chaque heure (ou intervalle configurable).
 */
export function startCronScheduler(intervalMinutes = 60) {
  console.log(`[CRON] 🕒 Planificateur de tâches CGV initialisé (Vérification toutes les ${intervalMinutes} min).`);
  
  // Exécution automatique régulière
  setInterval(async () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDate();

      // Relance J+2 exécutée à 10h00 & Virement hebdomadaire chaque vendredi à 10h00
      if (currentHour === 10) {
        await runJ2RelanceJob();
        if (now.getDay() === 5) {
          await runWeeklyWithdrawalBatchJob();
        }
      }

      // Auto-validation et Libération Escrow exécutées à minuit (00h00)
      if (currentHour === 0) {
        await runAutoValidationJob();
        await runEscrowReleaseJob();
        // Le 1er du mois à minuit : Reset des avertissements
        if (currentDay === 1) {
          await runMonthlyWarningResetJob();
        }
      }

      // Forclusion retours à 02h00
      if (currentHour === 2) {
        await runExpiredReturnsJob();
      }
    } catch (err) {
      console.error("[CRON] Erreur dans le cycle du scheduler :", err);
    }
  }, intervalMinutes * 60 * 1000);
}
