import { API_BASE } from './apiConfig';

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string;
  createdAt: string;
  author: string;
  avatarUrl: string | null;
}

export const reviewsService = {
  /**
   * Fetch reviews for a product from Supabase
   */
  async fetchReviews(productId: string): Promise<Review[]> {
    try {
      const res = await fetch(`${API_BASE}/reviews?productId=${encodeURIComponent(productId)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.reviews)) {
        return data.reviews;
      }
    } catch (err) {
      console.error('[REVIEWS-SERVICE] Error fetching reviews:', err);
    }
    return [];
  },

  /**
   * Submit a new review to Supabase
   */
  async submitReview(params: {
    userId: string;
    productId: string;
    rating: number;
    comment: string;
    orderId?: string;
  }): Promise<{ success: boolean; review?: Review }> {
    try {
      const res = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (data.success && data.review) {
        return {
          success: true,
          review: {
            id: data.review.id,
            userId: data.review.user_id,
            productId: data.review.product_id,
            rating: data.review.rating,
            comment: data.review.comment,
            createdAt: data.review.created_at,
            author: params.userId, // Will display raw userId or user's full_name after joining on get
            avatarUrl: null
          }
        };
      }
    } catch (err) {
      console.error('[REVIEWS-SERVICE] Error submitting review:', err);
    }
    return { success: false };
  }
};
