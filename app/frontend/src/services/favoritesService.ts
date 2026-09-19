import { API_BASE } from './apiConfig';

export const favoritesService = {
  /**
   * Fetch user's favorited product IDs from Supabase
   */
  async fetchFavorites(userId: string): Promise<string[]> {
    try {
      const res = await fetch(`${API_BASE}/favorites?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.favorites)) {
        return data.favorites;
      }
    } catch (err) {
      console.error('[FAVORITES-SERVICE] Error fetching favorites:', err);
    }
    return [];
  },

  /**
   * Toggle favorite state in Supabase
   */
  async toggleFavorite(userId: string, productId: string): Promise<{ success: boolean; isFavorite: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId })
      });
      const data = await res.json();
      if (data.success) {
        return { success: true, isFavorite: data.isFavorite };
      }
    } catch (err) {
      console.error('[FAVORITES-SERVICE] Error toggling favorite:', err);
    }
    return { success: false, isFavorite: false };
  }
};
