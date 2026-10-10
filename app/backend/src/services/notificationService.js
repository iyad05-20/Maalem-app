import { eq, and, desc } from "drizzle-orm";
import { db } from "../core/db/index.js";
import { notifications } from "../core/db/schema.js";

/**
 * Service de Notifications In-App persistant (Maâlem v2)
 * Notifie les artisans et les clients en temps réel avec traçabilité complète.
 */

export async function createNotification({
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
}) {
  try {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

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
      metadata: typeof metadata === "string" ? metadata : JSON.stringify(metadata),
      createdAt: now,
    };

    await db.insert(notifications).values(record);
    console.log(`[NOTIF-SERVICE] 🔔 Notification créée pour ${userType} (${userId}): "${title}" [Type: ${type}]`);
    return { success: true, notification: record };
  } catch (err) {
    console.error("[NOTIF-SERVICE] ❌ Échec création notification:", err.message);
    return { success: false, error: err.message };
  }
}

export async function getNotificationsForUser(userId, userType = null) {
  try {
    const query = db
      .select()
      .from(notifications)
      .where(userType ? and(eq(notifications.userId, userId), eq(notifications.userType, userType)) : eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));

    const list = await query;
    return list.map((n) => ({
      ...n,
      isRead: Number(n.isRead) === 1,
      metadata: n.metadata ? (typeof n.metadata === "string" ? JSON.parse(n.metadata) : n.metadata) : {},
    }));
  } catch (err) {
    console.error("[NOTIF-SERVICE] ❌ Erreur récupération notifications:", err.message);
    return [];
  }
}

export async function markNotificationAsRead(id, userId) {
  try {
    await db
      .update(notifications)
      .set({ isRead: 1 })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    return { success: true };
  } catch (err) {
    console.error("[NOTIF-SERVICE] ❌ Erreur marquage notification lue:", err.message);
    return { success: false, error: err.message };
  }
}

export async function markAllNotificationsAsRead(userId) {
  try {
    await db
      .update(notifications)
      .set({ isRead: 1 })
      .where(eq(notifications.userId, userId));
    return { success: true };
  } catch (err) {
    console.error("[NOTIF-SERVICE] ❌ Erreur marquage toutes notifications lues:", err.message);
    return { success: false, error: err.message };
  }
}
