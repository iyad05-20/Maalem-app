import { getUserProfileFromDB, upsertUserProfileToDB } from '../../db/profiles.repository.js';

// In-Memory cache simulating Redis when no external Redis server is connected
const memoryCache = new Map();

// Configuration
const SYNC_INTERVAL_MS = parseInt(process.env.REC_SYNC_INTERVAL_MS || '1200000'); // 20 minutes par défaut
const INACTIVE_TTL_MS  = parseInt(process.env.REC_INACTIVE_TTL_MS || '86400000');  // 24 heures par défaut

/**
 * Charge ou initialise le profil actif d'un utilisateur.
 * (Cache Hit -> Redis/InMemory ; Cache Miss -> DB Supabase -> Cache)
 * @param {string} userId 
 * @returns {Promise<Object>} Active profile object { profile: {}, dirty: boolean, lastAccess: number }
 */
export async function getActiveProfile(userId) {
  const now = Date.now();
  const cacheKey = `user_profile:${userId}`;

  // 1. Check Cache
  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey);
    cached.lastAccess = now;
    console.log(`[REC-CACHE] ⚡ Cache HIT for user: ${userId} (dirty: ${cached.dirty})`);
    return cached;
  }

  // 2. Cache Miss -> Load from DB
  console.log(`[REC-CACHE] 🔍 Cache MISS for user: ${userId} -> Loading from Supabase...`);
  const dbProfile = await getUserProfileFromDB(userId);

  const activeProfile = {
    userId,
    profile: dbProfile && dbProfile.profile ? dbProfile.profile : {},
    dirty: false,
    lastAccess: now
  };

  memoryCache.set(cacheKey, activeProfile);
  console.log(`[REC-CACHE] ✅ Cached active profile for ${userId} with ${Object.keys(activeProfile.profile).length} tags`);
  return activeProfile;
}

/**
 * Enregistre/Met à jour le profil utilisateur actif dans le cache.
 * @param {string} userId 
 * @param {Object} profileTagMap { tag: { score, lastUpdated } }
 * @param {boolean} isDirty Si le profil a été modifié par de nouvelles actions
 */
export function setActiveProfile(userId, profileTagMap, isDirty = true) {
  const cacheKey = `user_profile:${userId}`;
  const now = Date.now();

  const existing = memoryCache.get(cacheKey) || { userId, dirty: false };
  existing.profile = profileTagMap;
  existing.dirty = existing.dirty || isDirty;
  existing.lastAccess = now;

  memoryCache.set(cacheKey, existing);
  console.log(`[REC-CACHE] 💾 Updated active profile in cache for ${userId} (dirty=${existing.dirty})`);
}

/**
 * Déconnexion / Fin de session propre : Flush vers Supabase et suppression du cache.
 * @param {string} userId 
 */
export async function evictUserSession(userId) {
  const cacheKey = `user_profile:${userId}`;
  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey);
    if (cached.dirty) {
      console.log(`[REC-CACHE] 🚪 Session logout: Flushing dirty profile to Supabase for ${userId}...`);
      await upsertUserProfileToDB(userId, { profile: cached.profile });
    }
    memoryCache.delete(cacheKey);
    console.log(`[REC-CACHE] 🗑️ Evicted profile from active cache for ${userId}`);
    return true;
  }
  return false;
}

/**
 * Scheduler d'arrière-plan :
 * - Si dirty == true -> Écriture dans Supabase + dirty=false
 * - Si dirty == false ET inactif > TTL -> Éviction (DEL) du cache
 */
function startSyncScheduler() {
  setInterval(async () => {
    const now = Date.now();
    console.log(`\n[REC-SCHEDULER] ⏰ Starting periodic sync & eviction sweep (${memoryCache.size} active sessions)...`);

    for (const [cacheKey, cached] of memoryCache.entries()) {
      const { userId, profile, dirty, lastAccess } = cached;

      // Rule 1: Flush dirty profiles to DB
      if (dirty) {
        console.log(`[REC-SCHEDULER] 💾 Flushing dirty profile to Supabase for ${userId}...`);
        const success = await upsertUserProfileToDB(userId, { profile });
        if (success) {
          cached.dirty = false;
        }
      } 
      // Rule 2: Evict inactive clean profiles past TTL
      else if ((now - lastAccess) > INACTIVE_TTL_MS) {
        console.log(`[REC-SCHEDULER] 🧹 Evicting inactive profile past TTL for ${userId} (Inactive: ${Math.round((now - lastAccess)/60000)}m)...`);
        memoryCache.delete(cacheKey);
      }
    }
    console.log(`[REC-SCHEDULER] ✅ Sweep completed. Active sessions remaining: ${memoryCache.size}\n`);
  }, SYNC_INTERVAL_MS);
}

// Démarrer le planificateur de synchronisation
startSyncScheduler();
