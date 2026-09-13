/**
 * src/services/llm/atelierSessionManager.js
 * ═══════════════════════════════════════════════════════════════════════
 * In-Memory RAM Session State Manager for Atelier Engine
 *
 * Implements:
 * - 30-minute TTL per session with automated sweep
 * - Turn capping with pinned first turn
 * - Search context storage (tags only, never raw product previews)
 * - 4-Gate explicit approval tracking (never inferred)
 * ═══════════════════════════════════════════════════════════════════════
 */

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_TURNS = 12; // Maximum message turns before pruning

/**
 * In-memory map of active sessions
 * @type {Map<string, AtelierSession>}
 */
const sessions = new Map();

/**
 * Creates or retrieves an existing Atelier session.
 * 
 * @param {string} sessionId 
 * @returns {AtelierSession}
 */
export function getOrCreateSession(sessionId) {
  const now = Date.now();
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  let session = sessions.get(sessionId);

  if (session) {
    session.lastActive = now;
    return session;
  }

  session = {
    sessionId,
    history: [],

    // Search context — tags only, never product previews
    lastFilters: null, // { category_group?: string[], rec_tags?: { style?: string[], material?: string[], color_vibe?: string[] } }
    lastQueryText: null,

    mode: 'searching', // 'searching' | 'clarifying_customize' | 'clarifying_scratch' | 'awaiting_generation_approval' | 'awaiting_submission' | 'complete'
    searchPerformed: false,          // tracks if initial discovery search was executed

    approvedProductId: null,         // anchor for customize; null for scratch
    anchorProduct: null,             // cached snapshot of the anchor product (title, category, price, imageUrl)
    clarificationSufficient: false, // LLM-side gate flag (sufficient:true)
    userApprovedGeneration: false,  // explicit UI action flag — never inferred
    imageGeneratedForRequest: false, // one-image-per-request guard
    generatedImageUrl: null,
    customizationSpec: null,         // structured spec produced when sufficient:true

    createdAt: now,
    lastActive: now,
  };

  sessions.set(sessionId, session);
  return session;
}

/**
 * Appends a message turn to the session history, respecting turn caps.
 * 
 * @param {AtelierSession} session 
 * @param {'user' | 'assistant'} role 
 * @param {string} content 
 */
export function appendHistory(session, role, content) {
  session.history.push({ role, content });
  session.lastActive = Date.now();

  // If history exceeds cap, keep turn 0 (first user turn) and prune oldest middle turns
  if (session.history.length > MAX_TURNS) {
    const firstTurn = session.history[0];
    const recentTurns = session.history.slice(session.history.length - (MAX_TURNS - 1));
    session.history = [firstTurn, ...recentTurns];
  }
}

/**
 * Resets a session's creative flow while preserving the session ID.
 * 
 * @param {string} sessionId 
 * @returns {AtelierSession}
 */
export function resetSession(sessionId) {
  sessions.delete(sessionId);
  return getOrCreateSession(sessionId);
}

/**
 * Periodic cleanup sweep to free memory from expired sessions.
 */
function sweepExpiredSessions() {
  const now = Date.now();
  let sweptCount = 0;
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActive > SESSION_TTL_MS) {
      sessions.delete(id);
      sweptCount++;
    }
  }
  if (sweptCount > 0) {
    console.log(`🧹 AtelierSessionManager: Cleaned up ${sweptCount} expired sessions.`);
  }
}

setInterval(sweepExpiredSessions, SWEEP_INTERVAL_MS);

export default {
  getOrCreateSession,
  appendHistory,
  resetSession
};
