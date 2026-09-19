/**
 * src/routes/atelier.routes.js
 * ═══════════════════════════════════════════════════════════════════════
 * Atelier Co-Creation API Routes
 * ═══════════════════════════════════════════════════════════════════════
 */

import express from 'express';
import {
  processAtelierMessage,
  selectAnchorProduct,
  generateSimulation,
  submitCustomRequest,
  createDirectOrder
} from '../services/llm/atelierService.js';
import { resetSession } from '../services/llm/atelierSessionManager.js';

const router = express.Router();

/**
 * POST /api/atelier/message
 * Handles multi-turn conversational interaction, Meilisearch queries, and clarification.
 */
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message, approvedProductId } = req.body;

    if (!message && !approvedProductId) {
      return res.status(400).json({ error: 'Message or approvedProductId is required.' });
    }

    const result = await processAtelierMessage({
      sessionId,
      message: message || "Je souhaite personnaliser ce produit.",
      approvedProductId
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Error in /api/atelier/message:', error);
    res.status(500).json({
      error: 'Atelier engine error',
      details: error.message
    });
  }
});

/**
 * POST /api/atelier/select-product
 * Anchors a product into the session and initiates the customization clarification loop.
 */
router.post('/select-product', (req, res) => {
  try {
    const { sessionId, productId } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'productId is required.' });
    }

    const result = selectAnchorProduct({ sessionId, productId });
    res.json(result);
  } catch (error) {
    console.error('❌ Error in /api/atelier/select-product:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/atelier/generate
 * Triggers the adaptive FLUX simulation after dual-gate approval.
 */
router.post('/generate', async (req, res) => {
  try {
    const { sessionId, force } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    const result = await generateSimulation({ sessionId, force: Boolean(force) });
    res.json(result);
  } catch (error) {
    console.error('❌ Error in /api/atelier/generate:', error);
    res.status(400).json({
      error: 'Generation failed',
      details: error.message
    });
  }
});

/**
 * POST /api/atelier/direct-order
 * Directly buys / orders a catalog product from the preview sheet to its private artisan.
 */
router.post('/direct-order', async (req, res) => {
  try {
    const { productId, userId, clientSignature } = req.body;
    if (!productId) {
      return res.status(400).json({ error: 'productId is required.' });
    }

    const result = await createDirectOrder({
      productId,
      userId: userId || 'client-me',
      clientSignature
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Error in /api/atelier/direct-order:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/atelier/submit
 * Submits the made-to-order request to the artisan marketplace.
 */
router.post('/submit', async (req, res) => {
  try {
    const {
      sessionId,
      userId,
      requestType,
      customizationTags,
      generatedImageUrl,
      targetArtisanId
    } = req.body;

    const result = await submitCustomRequest({
      sessionId,
      userId,
      requestType,
      customizationTags,
      generatedImageUrl,
      targetArtisanId
    });

    res.json(result);
  } catch (error) {
    console.error('❌ Error in /api/atelier/submit:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/atelier/reset
 * Resets the session state for a fresh creative journey.
 */
router.post('/reset', (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = resetSession(sessionId);
    res.json({ success: true, sessionId: session.sessionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
