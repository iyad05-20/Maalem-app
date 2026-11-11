import { eq, and, desc, or } from "drizzle-orm";
import { db } from "../core/db/index.js";
import { notifications } from "../core/db/schema.js";

/**
 * Service de Notifications In-App Résilient (Maâlem v2)
 * - Parsing JSON sécurisé (tolère les métadonnées corrompues)
 * - Idempotence par idempotencyKey (évite les doublons lors des retries)
 * - Retry automatique avec backoff exponentiel borné + repli en mémoire
 * - Gestion des statuts d'actions interactives ('pending' | 'accepted' | 'rejected' | 'withdrawn' | 'info')
 */

const fallbackMemoryNotifications = [];
const MAX_FALLBACK_ITEMS = 250;

export function safeParseMetadata(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeNotificationRow(n) {
  return {
    ...n,
    isRead: Number(n.isRead) === 1,
    actionStatus: n.actionStatus || null,
    metadata: safeParseMetadata(n.metadata),
  };
}

function getUserIdsForQuery(userId) {
  if (userId === "artisan-1" || userId === "artisan_abdelkader") {
    return ["artisan_abdelkader", "artisan-1"];
  }
  return [userId];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pushToMemoryFallback(record) {
  if (record.idempotencyKey) {
    const exists = fallbackMemoryNotifications.some(
      (n) => n.userId === record.userId && n.idempotencyKey === record.idempotencyKey
    );
    if (exists) return record;
  }
  fallbackMemoryNotifications.unshift({ ...record });
  if (fallbackMemoryNotifications.length > MAX_FALLBACK_ITEMS) {
    fallbackMemoryNotifications.pop();
  }
  return record;
}

/**
 * Création résiliente avec idempotence, retry et fallback mémoire.
 * Ne rejette jamais une promesse non gérée afin de ne pas casser les flux métiers.
 */
export async function createNotificationResilient(payload) {
  const {
    userId,
    userType = "artisan", // 'artisan' | 'client'
    type,
    title,
    titleAr = null,
    message,
    messageAr = null,
    linkUrl = null,
    sourceId = null,
    secondaryUserId = null,
    secondaryUserName = null,
    metadata = {},
    idempotencyKey = null,
    actionStatus = null,
  } = payload || {};

  if (!userId || !type || !title || !message) {
    console.warn("[NOTIF-RESILIENT] ⚠️ Payload incomplet ignoré:", { userId, type, title });
    return { success: false, error: "invalid_notification_payload" };
  }

  const now = new Date().toISOString();
  const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const metaObj = typeof metadata === "string" ? safeParseMetadata(metadata) : { ...(metadata || {}) };
  if (actionStatus && !metaObj.actionStatus) {
    metaObj.actionStatus = actionStatus;
  }

  const record = {
    id,
    userId,
    userType,
    type,
    title,
    titleAr,
    message,
    messageAr,
    linkUrl,
    sourceId,
    secondaryUserId,
    secondaryUserName,
    isRead: 0,
    metadata: JSON.stringify(metaObj),
    idempotencyKey: idempotencyKey || null,
    actionStatus: actionStatus || null,
    updatedAt: now,
    createdAt: now,
  };

  // Vérification d'idempotence si fournie
  if (idempotencyKey) {
    try {
      const existing = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, userId), eq(notifications.idempotencyKey, idempotencyKey)))
        .limit(1);
      if (existing.length > 0) {
        return { success: true, deduplicated: true, notification: normalizeNotificationRow(existing[0]) };
      }
    } catch (checkErr) {
      console.warn("[NOTIF-RESILIENT] ⚠️ Échec contrôle idempotence DB:", checkErr.message);
    }
  }

  const backoffs = [0, 250, 750];
  let lastError = null;
  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    if (backoffs[attempt] > 0) await sleep(backoffs[attempt]);
    try {
      await db.insert(notifications).values(record);
      console.log(`[NOTIF-RESILIENT] 🔔 Notification créée pour ${userType} (${userId}): "${title}" [Type: ${type}]`);
      return { success: true, notification: normalizeNotificationRow(record) };
    } catch (err) {
      lastError = err;
      console.warn(`[NOTIF-RESILIENT] ⚠️ Tentative ${attempt + 1}/${backoffs.length} échouée:`, err.message);
    }
  }

  // Repli en mémoire si la DB reste injoignable après retries
  pushToMemoryFallback(record);
  console.error("[NOTIF-RESILIENT] ❌ Persist DB impossible après retries — bascule fallback mémoire:", lastError?.message);
  return {
    success: true,
    fallback: true,
    warning: lastError?.message,
    notification: normalizeNotificationRow(record),
  };
}

// Alias rétrocompatible
export const createNotification = createNotificationResilient;

export async function getNotificationsForUser(userId, userType = null) {
  const userIds = getUserIdsForQuery(userId);
  let dbRows = [];

  try {
    const userCond = userIds.length > 1
      ? or(...userIds.map((uid) => eq(notifications.userId, uid)))
      : eq(notifications.userId, userId);

    const whereCond = userType
      ? and(userCond, eq(notifications.userType, userType))
      : userCond;

    dbRows = await db
      .select()
      .from(notifications)
      .where(whereCond)
      .orderBy(desc(notifications.createdAt));
  } catch (err) {
    console.error("[NOTIF-RESILIENT] ❌ Erreur lecture notifications DB (fallback mémoire activé):", err.message);
  }

  const normalizedDb = dbRows.map(normalizeNotificationRow);
  const memMatches = fallbackMemoryNotifications
    .filter((n) => userIds.includes(n.userId) && (!userType || n.userType === userType))
    .map(normalizeNotificationRow);

  const seenIds = new Set(normalizedDb.map((n) => n.id));
  const merged = [...normalizedDb];
  for (const m of memMatches) {
    if (!seenIds.has(m.id)) {
      seenIds.add(m.id);
      merged.push(m);
    }
  }

  return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function markNotificationAsRead(id, userId) {
  const userIds = getUserIdsForQuery(userId);
  const memItem = fallbackMemoryNotifications.find((n) => n.id === id && userIds.includes(n.userId));
  if (memItem) {
    memItem.isRead = 1;
    memItem.updatedAt = new Date().toISOString();
  }

  try {
    const userCond = userIds.length > 1
      ? or(...userIds.map((uid) => eq(notifications.userId, uid)))
      : eq(notifications.userId, userId);
    await db
      .update(notifications)
      .set({ isRead: 1, updatedAt: new Date().toISOString() })
      .where(and(eq(notifications.id, id), userCond));
    return { success: true };
  } catch (err) {
    console.error("[NOTIF-RESILIENT] ❌ Erreur marquage notification lue:", err.message);
    return { success: Boolean(memItem), fallback: Boolean(memItem), error: err.message };
  }
}

export async function markAllNotificationsAsRead(userId) {
  const userIds = getUserIdsForQuery(userId);
  const now = new Date().toISOString();
  fallbackMemoryNotifications.forEach((n) => {
    if (userIds.includes(n.userId)) {
      n.isRead = 1;
      n.updatedAt = now;
    }
  });

  try {
    const userCond = userIds.length > 1
      ? or(...userIds.map((uid) => eq(notifications.userId, uid)))
      : eq(notifications.userId, userId);
    await db
      .update(notifications)
      .set({ isRead: 1, updatedAt: now })
      .where(userCond);
    return { success: true };
  } catch (err) {
    console.error("[NOTIF-RESILIENT] ❌ Erreur marquage toutes notifications lues:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Met à jour actionStatus + metadata pour les notifications liées à un consentement (sourceId = orderId).
 */
export async function updateConsentNotificationsStatus({
  sourceId,
  targetUserId = null,
  actionStatus,
  extraMetadata = {},
}) {
  const now = new Date().toISOString();
  const userIds = targetUserId ? getUserIdsForQuery(targetUserId) : null;

  fallbackMemoryNotifications.forEach((n) => {
    if (n.sourceId === sourceId && n.type === "republication_consent_request") {
      if (!userIds || userIds.includes(n.userId)) {
        const meta = safeParseMetadata(n.metadata);
        n.actionStatus = actionStatus;
        n.isRead = 1;
        n.updatedAt = now;
        n.metadata = JSON.stringify({ ...meta, ...extraMetadata, consentStatus: actionStatus });
      }
    }
  });

  try {
    const rows = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.sourceId, sourceId), eq(notifications.type, "republication_consent_request")));

    for (const row of rows) {
      if (userIds && !userIds.includes(row.userId)) continue;
      const meta = safeParseMetadata(row.metadata);
      await db
        .update(notifications)
        .set({
          actionStatus,
          isRead: 1,
          updatedAt: now,
          metadata: JSON.stringify({ ...meta, ...extraMetadata, consentStatus: actionStatus }),
        })
        .where(eq(notifications.id, row.id));
    }
    return { success: true };
  } catch (err) {
    console.warn("[NOTIF-RESILIENT] ⚠️ Échec mise à jour statut action notification:", err.message);
    return { success: false, error: err.message };
  }
}
