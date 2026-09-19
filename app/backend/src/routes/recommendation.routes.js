import express from 'express';
import { recommendationService } from '../services/recommendation.service.js';
import { getActiveProfile, evictUserSession } from '../services/cache/redis.service.js';

const router = express.Router();

// ── GET /api/recommendations/session?userId=123
// Session initialization endpoint (Phase 1)
router.get('/session', async (req, res) => {
  const userId = req.query.userId || 'anonymous';
  try {
    const profile = await getActiveProfile(userId);
    console.log(`[REC-ROUTE] 👤 Session initialized for user: ${userId}`);
    res.json({
      success: true,
      userId,
      sessionInitialized: true,
      tagsCount: Object.keys(profile.profile || {}).length
    });
  } catch (err) {
    console.error(`[REC-ROUTE] ❌ Session init error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/recommendations
// Main feed generation endpoint accepting pending_actions & lastFeeds (Phase 3)
router.post('/', async (req, res) => {
  const { userId = 'anonymous', pending_actions = [], lastFeeds = {}, topK = 15, options = {} } = req.body;
  try {
    console.log(`[REC-ROUTE] 📩 POST /api/recommendations for ${userId} (${pending_actions.length} pending actions)`);
    const result = await recommendationService.generateFeed(userId, pending_actions, lastFeeds, { topK, ...options });
    res.json({
      success: true,
      data: result.feed,
      sectionState: result.sectionState,
      sectionTitle: result.sectionTitle,
      highestTagScore: result.highestTagScore,
      activeTagsCount: result.activeTagsCount,
      epsilon: result.epsilon,
      debug: result.debug
    });
  } catch (err) {
    console.error(`[REC-ROUTE] ❌ Feed generation error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/recommendations (Fallback GET endpoint)
router.get('/', async (req, res) => {
  const userId = req.query.userId || 'anonymous';
  const topK  = parseInt(req.query.topK || '15');
  try {
    const result = await recommendationService.generateFeed(userId, [], {}, { topK });
    res.json({
      success: true,
      data: result.feed,
      sectionState: result.sectionState,
      sectionTitle: result.sectionTitle,
      highestTagScore: result.highestTagScore,
      activeTagsCount: result.activeTagsCount,
      epsilon: result.epsilon,
      debug: result.debug
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/recommendations/logout
// Session termination (Phase 4) -> Flushes dirty profile & evicts from Redis
router.post('/logout', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'Missing userId' });
  }
  try {
    const evicted = await evictUserSession(userId);
    console.log(`[REC-ROUTE] 🚪 Logout processed for ${userId} (evicted: ${evicted})`);
    res.json({ success: true, evicted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
