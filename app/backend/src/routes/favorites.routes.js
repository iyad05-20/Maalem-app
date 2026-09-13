import express from 'express';
import { supabase } from '../db/supabase.client.js';
import { optionalAuthMiddleware } from '../middleware/auth.middleware.js';

const router = express.Router();
router.use(optionalAuthMiddleware);

const localFavoritesMemory = new Map(); // userId -> Set of productIds

// GET /api/favorites?userId=xxx
router.get('/', async (req, res) => {
  const userId = req.userId || req.query.userId;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId est obligatoire.' });
  }

  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('product_id, created_at')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    const userFavs = new Set(data.map(f => f.product_id));
    localFavoritesMemory.set(userId, userFavs);

    res.json({
      success: true,
      favorites: data.map(f => f.product_id)
    });
  } catch (err) {
    console.warn(`[FAVORITES-ROUTE] ⚠️ Failed to fetch favorites from Supabase (${err.message}). Using local memory fallback.`);
    if (!localFavoritesMemory.has(userId)) {
      localFavoritesMemory.set(userId, new Set());
    }
    const list = Array.from(localFavoritesMemory.get(userId));
    res.json({ success: true, favorites: list });
  }
});

// POST /api/favorites (Toggle Favorite)
router.post('/', async (req, res) => {
  const userId = req.userId || req.body.userId;
  const { productId } = req.body;
  if (!userId || !productId) {
    return res.status(400).json({ success: false, error: 'userId et productId sont obligatoires.' });
  }

  try {
    let isFavorite = false;
    let action = 'removed';
    
    try {
      // Check if already favorited in Supabase
      const { data: existing, error: checkError } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        // Remove favorite
        const { error: deleteError } = await supabase
          .from('favorites')
          .delete()
          .eq('id', existing.id);
        
        if (deleteError) throw deleteError;
        isFavorite = false;
        action = 'removed';
      } else {
        // Add favorite
        const { error: insertErr } = await supabase
          .from('favorites')
          .insert({ user_id: userId, product_id: productId });
        
        if (insertErr) throw insertErr;
        isFavorite = true;
        action = 'added';
      }
    } catch (dbErr) {
      console.warn(`[FAVORITES-ROUTE] ⚠️ DB error: ${dbErr.message}. Toggling locally in memory.`);
      if (!localFavoritesMemory.has(userId)) {
        localFavoritesMemory.set(userId, new Set());
      }
      const userFavs = localFavoritesMemory.get(userId);
      if (userFavs.has(productId)) {
        userFavs.delete(productId);
        isFavorite = false;
        action = 'removed';
      } else {
        userFavs.add(productId);
        isFavorite = true;
        action = 'added';
      }
    }

    // Keep local memory cache in sync
    if (!localFavoritesMemory.has(userId)) {
      localFavoritesMemory.set(userId, new Set());
    }
    const userFavs = localFavoritesMemory.get(userId);
    if (isFavorite) {
      userFavs.add(productId);
    } else {
      userFavs.delete(productId);
    }

    console.log(`[FAVORITES-ROUTE] Toggled favorite for user ${userId}: product ${productId} (${action})`);
    return res.json({ success: true, isFavorite, action });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
