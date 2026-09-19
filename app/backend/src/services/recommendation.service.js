import { getAllProducts } from '../db/products.repository.js';
import { getActiveProfile, setActiveProfile } from './cache/redis.service.js';

let products = [];
let tagIndex = null;

// ─── Single Catalog Load at Startup ─────────────────────────────────────────
export async function loadProducts() {
  products = await getAllProducts();
  tagIndex = buildTagIndex(products);
  console.log(`[REC-INIT] ✅ Loaded ${products.length} products once at startup into memory.`);
}

const ActionConfig = {
  BOOKMARK: { baseScore: 10, halfLifeHours: 14 * 24 },
  ORDER:    { baseScore: 8,  halfLifeHours: 21 * 24 },
  SEARCH:   { baseScore: 4,  halfLifeHours: 3 * 24 },
  VIEW:     { baseScore: 2,  halfLifeHours: 1 * 24 },
};

const tagWeights = { style: 1.0, material: 0.5, color_vibe: 0.8 };

function buildTagIndex(prods) {
  const index = {};
  for (const p of prods) {
    if (!p.rec_tags) continue;
    for (const category of ['style', 'material', 'color_vibe']) {
      for (const t of (p.rec_tags[category] || [])) {
        if (!index[t]) index[t] = { category, list: [] };
        index[t].list.push(p.id);
      }
    }
  }
  return index;
}

function getDecayedScore(tagState, requestTime) {
  if (!tagState || !tagState.score) return 0;
  const hoursPassed = (requestTime - (tagState.lastUpdated || requestTime)) / (1000 * 60 * 60);
  if (hoursPassed <= 0) return tagState.score;
  const halfLife = 14 * 24; // Standard 14-day half life
  return tagState.score * Math.pow(0.5, hoursPassed / halfLife);
}

export const recommendationService = {
  getProducts: () => products,

  /**
   * Main V2 Feed Generation Pipeline
   */
  async generateFeed(userId = 'anonymous', pendingActions = [], lastFeeds = {}, options = {}) {
    const requestTime = Date.now();
    const topK = options.topK || 15;
    const lambda = options.lambda || 0.4;
    let epsilon = options.epsilon || 0.15;
    const alphaFatigue = 0.10; // Tag fatigue factor
    const betaEmerging = 0.10;  // Emerging tag boost

    console.log(`\n===============================================================`);
    console.log(`[REC-PIPELINE] 🚀 Generating V2 Feed for user: ${userId} (${requestTime})`);
    console.log(`===============================================================`);

    // ── STEP 1: Load Active Profile from Redis Cache
    const activeProfileData = await getActiveProfile(userId);
    const profileTagMap = activeProfileData.profile || {};

    // ── STEP 2: Lazy Time Decay on Persistent Profile
    const decayedProfile = {};
    let decayedCount = 0;
    for (const [tag, state] of Object.entries(profileTagMap)) {
      const dScore = getDecayedScore(state, requestTime);
      if (dScore > 0.01) {
        decayedProfile[tag] = { score: dScore, lastUpdated: state.lastUpdated || requestTime };
        decayedCount++;
      }
    }
    console.log(`[REC-DECAY] ⏳ Lazy time decay applied across ${decayedCount} active user tags.`);

    // ── STEP 3: Apply Pending Actions
    const emergingTags = new Set();
    if (pendingActions && pendingActions.length > 0) {
      console.log(`[REC-ACTIONS] 📥 Applying ${pendingActions.length} pending action(s)...`);
      for (const act of pendingActions) {
        const { actionType, tags } = act;
        const config = ActionConfig[actionType] || ActionConfig.VIEW;
        const actionBonus = config.baseScore * 0.1;

        if (tags && Array.isArray(tags)) {
          for (const tag of tags) {
            emergingTags.add(tag);
            const current = decayedProfile[tag] || { score: 0, lastUpdated: requestTime };
            const newScore = Math.max(current.score, config.baseScore) + actionBonus;
            decayedProfile[tag] = { score: newScore, lastUpdated: requestTime };
            console.log(`   + Tag "${tag}" reinforced via ${actionType} -> newScore: ${newScore.toFixed(2)}`);
          }
        }
      }
      // Update active profile in Redis
      setActiveProfile(userId, decayedProfile, true);
    }

    // ── Profile Metrics & Dynamic Epsilon Strategy
    const tagScores = Object.values(decayedProfile).map(t => t.score || 0);
    const highestTagScore = tagScores.length > 0 ? Math.max(...tagScores) : 0;
    const activeTagsCount = tagScores.filter(s => s > 0).length;

    // Dynamic Epsilon Calculation
    epsilon = 0.25;
    if (highestTagScore < 3)        epsilon = 0.50;
    else if (highestTagScore < 5)   epsilon = 0.40;
    else if (highestTagScore < 7)   epsilon = 0.35;
    else if (highestTagScore < 9)   epsilon = 0.30;
    else if (highestTagScore < 11)  epsilon = 0.25;
    else if (highestTagScore < 13)  epsilon = 0.20;
    else if (highestTagScore < 15)  epsilon = 0.15;
    else                            epsilon = 0.10;

    // Determine Section State & Title
    let sectionState = 'hidden'; // 'hidden' | 'discovery' | 'personalized'
    let sectionTitle = null;

    if (highestTagScore < 3) {
      sectionState = 'hidden';
      sectionTitle = null;
    } else if (highestTagScore < 9 || activeTagsCount < 2) {
      sectionState = 'discovery';
      sectionTitle = "Découvrez l'artisanat marocain";
    } else {
      sectionState = 'personalized';
      sectionTitle = "✨ Pour vous";
    }

    // ── Cold Start Fallback
    const persistentTags = Object.keys(decayedProfile);
    if (persistentTags.length === 0 || highestTagScore < 3) {
      console.log(`[REC-COLD-START] ❄️ User profile is in Cold Start (Score: ${highestTagScore.toFixed(2)}, Tags: ${activeTagsCount}). Section: hidden.`);
      return {
        feed: products.slice(0, topK).map(p => ({ ...p, _rec: { isExplore: true, source: 'cold-start' } })),
        sectionState: 'hidden',
        sectionTitle: null,
        highestTagScore,
        activeTagsCount,
        epsilon,
        debug: { coldStart: true }
      };
    }

    // ── STEP 4 & 5 & 6: Temporary Query Profile (Sqrt Normalization + Emerging Boost)
    const queryProfile = {};
    for (const [tag, state] of Object.entries(decayedProfile)) {
      let qScore = Math.sqrt(state.score); // Square root normalization
      if (emergingTags.has(tag)) {
        qScore *= (1 + betaEmerging); // Emerging tag boost
      }
      queryProfile[tag] = qScore;
    }
    console.log(`[REC-QUERY-PROFILE] 🧮 Built normalized Query Profile (${Object.keys(queryProfile).length} tags, ${emergingTags.size} emerging boosted).`);

    // ── STEP 7: WAND Candidate Retrieval
    if (!tagIndex) tagIndex = buildTagIndex(products);
    const sortedQueryTags = Object.keys(queryProfile).sort((a, b) => queryProfile[b] - queryProfile[a]);
    const wandPoolSize = 35;
    const candidateIdsSet = new Set();
    const ignoredTagsSet = new Set();

    for (const tag of sortedQueryTags) {
      const meta = tagIndex[tag];
      if (!meta) continue;
      for (const pId of meta.list) {
        candidateIdsSet.add(pId);
      }
      if (candidateIdsSet.size >= wandPoolSize) {
        // Tag overflow -> rest are marked ignored
        sortedQueryTags.slice(sortedQueryTags.indexOf(tag) + 1).forEach(t => ignoredTagsSet.add(t));
        break;
      }
    }
    console.log(`[REC-WAND] 🎯 WAND retrieved ${candidateIdsSet.size} candidate products.`);

    // ── STEP 8: Exact Candidate Score Computation (Re-evaluated Post-WAND)
    const candidatePool = [];
    for (const pId of candidateIdsSet) {
      const p = products.find(prod => prod.id === pId);
      if (!p || !p.rec_tags) continue;

      let exactScore = 0;
      for (const cat of ['style', 'material', 'color_vibe']) {
        const catWeight = tagWeights[cat] || 1.0;
        for (const t of (p.rec_tags[cat] || [])) {
          if (decayedProfile[t]) {
            exactScore += decayedProfile[t].score * catWeight;
          }
        }
      }
      candidatePool.push({ id: pId, product: p, exactScore });
    }
    candidatePool.sort((a, b) => b.exactScore - a.exactScore);
    console.log(`[REC-EXACT-SCORE] 📐 Recomputed exact scores for candidates (Top score: ${candidatePool[0]?.exactScore.toFixed(2)}).`);

    // ── STEP 9: Reranking (MMR + Tag Fatigue + Previous Feed Penalty + Epsilon-Greedy)
    const previousFeedSet = new Set(lastFeeds.previousFeed || []);
    const olderFeedSet    = new Set(lastFeeds.olderFeed || []);

    const tagOccurrences = {}; // In-memory counter for Temporary Tag Fatigue
    const mmrSelected = [];
    const remainingPool = [...candidatePool];

    while (mmrSelected.length < candidatePool.length && remainingPool.length > 0) {
      let bestIdx = -1;
      let bestScore = -Infinity;

      for (let i = 0; i < remainingPool.length; i++) {
        const item = remainingPool[i];
        const p = item.product;

        // 1. Tag Fatigue Multiplier
        let fatigueFactor = 1.0;
        if (p.rec_tags) {
          for (const cat of ['style', 'material', 'color_vibe']) {
            for (const t of (p.rec_tags[cat] || [])) {
              const occ = tagOccurrences[t] || 0;
              fatigueFactor *= (1 / (1 + alphaFatigue * occ));
            }
          }
        }

        // 2. Previous Feed Penalty
        let feedPenalty = 1.0;
        if (previousFeedSet.has(p.id)) feedPenalty = 0.90;
        else if (olderFeedSet.has(p.id)) feedPenalty = 0.95;

        // 3. MMR Group Ratio
        const catGroup = p.category_group || p.identity?.category_group || 'divers';
        const sameGroupCount = mmrSelected.filter(s => (s.product.category_group || s.product.identity?.category_group) === catGroup).length;
        const groupRatio = mmrSelected.length > 0 ? sameGroupCount / mmrSelected.length : 0;
        const mmrMultiplier = Math.max(0, lambda - (1 - lambda) * groupRatio);

        // Effective Reranked Score
        const rerankedScore = item.exactScore * fatigueFactor * feedPenalty * mmrMultiplier;

        if (rerankedScore > bestScore) {
          bestScore = rerankedScore;
          bestIdx = i;
        }
      }

      if (bestIdx > -1) {
        const chosen = remainingPool.splice(bestIdx, 1)[0];
        mmrSelected.push(chosen);

        // Update tag occurrences for fatigue
        if (chosen.product.rec_tags) {
          for (const cat of ['style', 'material', 'color_vibe']) {
            for (const t of (chosen.product.rec_tags[cat] || [])) {
              tagOccurrences[t] = (tagOccurrences[t] || 0) + 1;
            }
          }
        }
      } else break;
    }
    console.log(`[REC-RERANK] ⚖️ MMR + Tag Fatigue (α=0.1) + Previous Feed Penalty applied to ${mmrSelected.length} items.`);

    // ── STEP 10: Epsilon-Greedy Exploration (100% In-Memory 0ms DB Latency)
    const finalFeed = [];
    let exploitIndex = 0;
    // Unselected products in RAM act as exploration candidates
    const explorationCandidates = products.filter(p => !candidateIdsSet.has(p.id));

    for (let i = 0; i < topK; i++) {
      const isExploreSlot = Math.random() < epsilon && explorationCandidates.length > 0;
      if (isExploreSlot) {
        const randIdx = Math.floor(Math.random() * explorationCandidates.length);
        const expItem = explorationCandidates.splice(randIdx, 1)[0];
        finalFeed.push({ ...expItem, _rec: { isExplore: true, score: 0 } });
        console.log(`   🎲 Slot ${i+1}: Exploration item chosen -> ${expItem.title}`);
      } else if (exploitIndex < mmrSelected.length) {
        const item = mmrSelected[exploitIndex++];
        finalFeed.push({ ...item.product, _rec: { isExplore: false, score: item.exactScore } });
      }
    }

    console.log(`[REC-FEED] 🏁 Final feed generated with ${finalFeed.length} products (State: ${sectionState}, Title: "${sectionTitle}", Score: ${highestTagScore.toFixed(2)}, Epsilon: ${epsilon}).`);
    return {
      feed: finalFeed,
      sectionState,
      sectionTitle,
      highestTagScore,
      activeTagsCount,
      epsilon,
      debug: {
        totalProducts: products.length,
        wandCandidates: candidateIdsSet.size,
        mmrRanked: mmrSelected.length,
        explorationRate: epsilon
      }
    };
  }
};
