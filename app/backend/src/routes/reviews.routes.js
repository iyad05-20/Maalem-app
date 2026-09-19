import express from 'express';
import { supabase } from '../db/supabase.client.js';

const router = express.Router();

// GET /api/reviews?productId=xxx
router.get('/', async (req, res) => {
  const { productId } = req.query;
  if (!productId) {
    return res.status(400).json({ success: false, error: 'productId est obligatoire.' });
  }

  try {
    // Fetch reviews
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select(`
        id,
        user_id,
        product_id,
        rating,
        comment,
        created_at
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[REVIEWS-ROUTE] Fetch error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Resolve profiles manually to avoid schema relationship constraint issues
    const profilesMap = {};
    if (reviews && reviews.length > 0) {
      const userIds = [...new Set(reviews.map(r => r.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        if (!profilesError && profiles) {
          profiles.forEach(p => {
            profilesMap[p.id] = p;
          });
        } else if (profilesError) {
          console.error('[REVIEWS-ROUTE] Profiles fetch error:', profilesError.message);
        }
      }
    }

    res.json({
      success: true,
      reviews: reviews.map(r => {
        const profile = profilesMap[r.user_id];
        return {
          id: r.id,
          userId: r.user_id,
          productId: r.product_id,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.created_at,
          author: profile?.full_name || 'Utilisateur anonyme',
          avatarUrl: profile?.avatar_url || null
        };
      })
    });
  } catch (err) {
    console.error('[REVIEWS-ROUTE] Exception:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reviews
router.post('/', async (req, res) => {
  const { userId, productId, rating, comment, orderId } = req.body;
  if (!userId || !productId || !rating) {
    return res.status(400).json({ success: false, error: 'userId, productId et rating sont obligatoires.' });
  }

  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert({
        user_id: userId,
        product_id: productId,
        rating: parseInt(rating),
        comment: comment || '',
        order_id: orderId || null
      })
      .select()
      .single();

    if (error) {
      console.error('[REVIEWS-ROUTE] Insert error:', error.message);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`[REVIEWS-ROUTE] ⭐️ Review added for product ${productId} by user ${userId}`);
    res.json({ success: true, review: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
