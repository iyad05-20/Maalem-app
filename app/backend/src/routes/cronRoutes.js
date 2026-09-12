import express from "express";
import { 
  runAllCronJobs, 
  runJ2RelanceJob, 
  runAutoValidationJob, 
  runEscrowReleaseJob, 
  runExpiredReturnsJob, 
  runMonthlyWarningResetJob,
  runWeeklyWithdrawalBatchJob 
} from "../services/cronService.js";
import { db } from "../core/db/index.js";
import { cronExecutions } from "../core/db/schema.js";
import { desc } from "drizzle-orm";

export const cronRouter = express.Router();

/**
 * GET /api/cron/status
 * Retourne les 20 dernières exécutions de tâches planifiées.
 */
cronRouter.get("/status", async (req, res) => {
  try {
    const executions = await db.select().from(cronExecutions).orderBy(desc(cronExecutions.executedAt)).limit(20);
    return res.json({ success: true, count: executions.length, executions });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/cron/run-all
 * Déclenche manuellement l'ensemble des 5 tâches.
 */
cronRouter.post("/run-all", async (req, res) => {
  try {
    const results = await runAllCronJobs();
    return res.json({ success: true, message: "Tous les Cron Jobs ont été exécutés avec succès.", results });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/cron/run/:jobName
 * Déclenche manuellement une tâche spécifique.
 */
cronRouter.post("/run/:jobName", async (req, res) => {
  const { jobName } = req.params;

  try {
    let result;
    switch (jobName) {
      case "relance-j2":
        result = await runJ2RelanceJob();
        break;
      case "auto-validation":
        result = await runAutoValidationJob();
        break;
      case "release-escrow":
        result = await runEscrowReleaseJob();
        break;
      case "expire-returns":
        result = await runExpiredReturnsJob();
        break;
      case "reset-warnings":
        result = await runMonthlyWarningResetJob();
        break;
      case "virements-vendredi":
        result = await runWeeklyWithdrawalBatchJob();
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          error: `Nom de job invalide : ${jobName}. Valeurs acceptées : relance-j2, auto-validation, release-escrow, expire-returns, reset-warnings, virements-vendredi` 
        });
    }

    return res.json({ success: true, jobName, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
