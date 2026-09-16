/**
 * src/services/atelierService.ts
 * ═══════════════════════════════════════════════════════════════════════
 * Frontend Client Service for Atelier Co-Creation API
 * ═══════════════════════════════════════════════════════════════════════
 */

import { API_BASE } from './apiConfig';

export type AtelierMode =
  | 'searching'
  | 'clarifying_customize'
  | 'clarifying_scratch'
  | 'awaiting_generation_approval'
  | 'awaiting_submission'
  | 'complete';

export interface Modification {
  feature: string;
  value: string;
  operation: 'ADD' | 'CHANGE' | 'MODIFY' | 'REMOVE';
  location?: string;
  visualDecomposition?: string;
}

export interface CustomizationSpec {
  modifications: Modification[];
  preservedProperties: string[];
}

export interface AtelierMessageResponse {
  sessionId: string;
  reply: string;
  suggestions: string[];
  previews?: Array<{
    id: string;
    title: string;
    price?: string;
    image?: string;
    imageUrl?: string;
    category?: string;
    artisanName?: string;
    artisanId?: string;
    badge?: string;
  }>;
  sufficient: boolean;
  summary?: string | null;
  mode: AtelierMode;
  activeProduct?: any;
  customizationSpec?: CustomizationSpec | null;
}

export interface SimulationResponse {
  imageUrl: string;
  promptUsed?: string;
  strategyUsed?: string;
  complexityScore?: number;
  cached?: boolean;
  generationMode?: 'image_to_image' | 'text_to_image';
  sourceImageUsed?: boolean;
  referenceImageUrl?: string | null;
  referenceType?: 'anchor_product' | 'previous_simulation' | null;
}

export interface SubmitResponse {
  success: boolean;
  requestId: string;
  status: string;
  message: string;
}

export const atelierApi = {
  /**
   * Dispatches a message turn to the Atelier engine.
   */
  async sendMessage(params: {
    sessionId?: string;
    message?: string;
    approvedProductId?: string;
  }): Promise<AtelierMessageResponse> {
    const res = await fetch(`${API_BASE}/atelier/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.error || `Error ${res.status}: ${res.statusText}`);
    }

    return res.json();
  },

  /**
   * Anchors a product as the base creation for customization.
   */
  async selectProduct(sessionId: string, productId: string) {
    const res = await fetch(`${API_BASE}/atelier/select-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, productId })
    });

    if (!res.ok) {
      throw new Error(`Product anchor failed (${res.status})`);
    }

    return res.json();
  },

  /**
   * Direct standard order creation from search preview bottom-sheet (Flow 1: Direct Buy).
   */
  async createDirectOrder(params: {
    productId: string;
    userId?: string;
    clientSignature?: string;
  }): Promise<{ success: boolean; orderId: string; order: any; message: string }> {
    const res = await fetch(`${API_BASE}/atelier/direct-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Direct order failed (${res.status})`);
    }

    return res.json();
  },

  /**
   * Triggers adaptive simulation generation on Cloudflare FLUX.
   */
  async generateSimulation(sessionId: string): Promise<SimulationResponse> {
    const res = await fetch(`${API_BASE}/atelier/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.error || 'Generation failed');
    }

    return res.json();
  },

  /**
   * Submits the custom creation to an artisan.
   */
  async submitCustomRequest(params: {
    sessionId: string;
    userId?: string;
    requestType?: 'customize' | 'scratch';
    customizationTags?: any;
    generatedImageUrl?: string;
    targetArtisanId?: string;
  }): Promise<SubmitResponse> {
    const res = await fetch(`${API_BASE}/atelier/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      throw new Error(`Submission failed (${res.status})`);
    }

    return res.json();
  },

  /**
   * Resets the session state for a new creation.
   */
  async resetSession(sessionId: string) {
    const res = await fetch(`${API_BASE}/atelier/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    });

    return res.json();
  }
};
