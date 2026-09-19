import { supabase } from './supabase.client.js';

/**
 * Lit le profil utilisateur persistant depuis Supabase.
 * @param {string} userId 
 * @returns {Promise<Object|null>} profile_data
 */
export async function getUserProfileFromDB(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('profile_data')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error(`[REC-DB] Error fetching user profile for ${userId}:`, error.message);
      return null;
    }
    return data ? data.profile_data : null;
  } catch (err) {
    console.error(`[REC-DB] Exception in getUserProfileFromDB:`, err.message);
    return null;
  }
}

/**
 * Persiste / Met à jour le profil utilisateur dans Supabase (UPSERT).
 * @param {string} userId 
 * @param {Object} profileData 
 */
export async function upsertUserProfileToDB(userId, profileData) {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        profile_data: profileData,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error(`[REC-DB] Error persisting user profile for ${userId}:`, error.message);
      return false;
    }
    console.log(`[REC-DB] ✅ Persisted profile to Supabase for user: ${userId}`);
    return true;
  } catch (err) {
    console.error(`[REC-DB] Exception in upsertUserProfileToDB:`, err.message);
    return false;
  }
}
