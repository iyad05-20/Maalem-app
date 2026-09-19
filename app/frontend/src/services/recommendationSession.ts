import { API_BASE } from './apiConfig';

export interface PendingAction {
  actionType: 'VIEW' | 'SEARCH' | 'BOOKMARK' | 'ORDER';
  tags: string[];
}

export interface LastFeeds {
  previousFeed: string[];
  olderFeed: string[];
}

export interface FeedResponse {
  items: any[];
  sectionState: 'hidden' | 'discovery' | 'personalized';
  sectionTitle: string | null;
  highestTagScore: number;
  activeTagsCount: number;
  epsilon: number;
}

class RecommendationSessionManager {
  private pendingActions: PendingAction[] = [];
  private lastFeeds: LastFeeds = {
    previousFeed: [],
    olderFeed: []
  };
  private isInitialized = false;
  private currentUserId: string = 'user_demo_01';
  private autoSyncCallback: ((res: FeedResponse) => void) | null = null;

  getIsSessionInitialized(): boolean {
    return this.isInitialized;
  }

  registerAutoSyncCallback(cb: (res: FeedResponse) => void) {
    this.autoSyncCallback = cb;
  }

  /**
   * Phase 1: Initialize session on app load
   */
  async initSession(userId: string = 'user_demo_01'): Promise<boolean> {
    this.currentUserId = userId;
    try {
      const res = await fetch(`${API_BASE}/recommendations/session?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.success) {
        this.isInitialized = true;
        console.log(`[REC-FE-SESSION] ⚡ Session initialized for ${userId}`);
        return true;
      }
    } catch (err) {
      console.warn(`[REC-FE-SESSION] Session init warning:`, err);
    }
    return false;
  }

  private isFetchingFeed = false;

  /**
   * Phase 2: Track user interaction locally
   * If pendingActions >= 3, automatically triggers a background feed fetch/sync!
   */
  trackAction(actionType: PendingAction['actionType'], tags: string[]) {
    if (!tags || tags.length === 0) return;
    this.pendingActions.push({ actionType, tags });
    console.log(`[REC-FE-SESSION] 📝 Action queued: ${actionType} on tags [${tags.join(', ')}] (Total pending: ${this.pendingActions.length})`);

    // Auto-sync after 3 accumulated actions
    if (this.pendingActions.length >= 3 && this.autoSyncCallback) {
      console.log(`[REC-FE-SESSION] ⚡ Auto-sync threshold reached (>=3 pending actions). Triggering background feed refresh...`);
      this.fetchFeed(this.currentUserId).then(res => {
        if (this.autoSyncCallback && res.items.length > 0) {
          this.autoSyncCallback(res);
        }
      });
    }
  }

  /**
   * Phase 3: Fetch feed & piggyback pending actions
   */
  async fetchFeed(userId: string = this.currentUserId, topK = 15): Promise<FeedResponse> {
    if (this.isFetchingFeed) {
      console.log(`[REC-FE-SESSION] ⏳ Feed fetch is already in flight. Skipping duplicate trigger.`);
      return {
        items: [],
        sectionState: 'hidden',
        sectionTitle: null,
        highestTagScore: 0,
        activeTagsCount: 0,
        epsilon: 0.50
      };
    }

    this.isFetchingFeed = true;
    this.currentUserId = userId;

    // Snapshot and clear pending actions immediately to prevent race conditions during async network call
    const actionsToSend = [...this.pendingActions];
    this.pendingActions = [];

    try {
      const payload = {
        userId,
        pending_actions: actionsToSend,
        lastFeeds: { ...this.lastFeeds },
        topK
      };

      console.log(`[REC-FE-SESSION] 🚀 Requesting feed with ${payload.pending_actions.length} pending action(s)...`);
      const res = await fetch(`${API_BASE}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Update sliding window of last 2 feeds
        const newFeedIds = data.data.map((p: any) => p.id);
        this.lastFeeds = {
          olderFeed: this.lastFeeds.previousFeed,
          previousFeed: newFeedIds
        };

        const result: FeedResponse = {
          items: data.data,
          sectionState: data.sectionState || 'hidden',
          sectionTitle: data.sectionTitle || null,
          highestTagScore: data.highestTagScore || 0,
          activeTagsCount: data.activeTagsCount || 0,
          epsilon: data.epsilon || 0.25
        };

        console.log(`[REC-FE-SESSION] ✅ Received ${data.data.length} products for feed (State: ${result.sectionState}, Title: "${result.sectionTitle}", Score: ${result.highestTagScore.toFixed(2)}). Pending actions cleared.`);
        return result;
      }
    } catch (err) {
      console.error(`[REC-FE-SESSION] ❌ Error fetching feed:`, err);
    } finally {
      this.isFetchingFeed = false;
    }

    return {
      items: [],
      sectionState: 'hidden',
      sectionTitle: null,
      highestTagScore: 0,
      activeTagsCount: 0,
      epsilon: 0.50
    };
  }

  /**
   * Phase 4: Clean logout / session end
   */
  async logout(userId: string = this.currentUserId) {
    try {
      await fetch(`${API_BASE}/recommendations/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      this.pendingActions = [];
      this.lastFeeds = { previousFeed: [], olderFeed: [] };
      this.isInitialized = false;
      console.log(`[REC-FE-SESSION] 🚪 Session terminated and flushed for ${userId}`);
    } catch (err) {
      console.error(`[REC-FE-SESSION] Logout error:`, err);
    }
  }
}

export const recSession = new RecommendationSessionManager();
