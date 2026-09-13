import express from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../core/db/index.js';
import { appUsers } from '../core/db/schema.js';
import { signUpUser, signInUser, verifyToken } from '../services/localAuth.service.js';

const router = express.Router();

/**
 * Extraction sécurisée de Bearer Token
 */
function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

// ── POST /api/auth/signup ────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  const { email, password, fullName, role, phone, city, metadata } = req.body;
  const effectiveRole = role || (metadata && metadata.role) || 'client';
  const effectiveCity = city || (metadata && metadata.city) || null;

  try {
    const result = await signUpUser({
      email,
      password,
      fullName,
      role: effectiveRole,
      phone,
      city: effectiveCity,
    });

    console.log(`[AUTH-ROUTE] 👤 Nouvel utilisateur inscrit (Local DB): ${result.user.email} (${result.user.role})`);
    
    return res.status(201).json({
      success: true,
      message: 'Inscription réussie ! Votre compte sécurisé est prêt.',
      user: result.user,
      profile: result.user,
      token: result.token,
      session: {
        access_token: result.token,
        token_type: 'bearer',
        user: result.user,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message || "Erreur lors de l'inscription.",
    });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const result = await signInUser({
      email,
      password,
      expectedRole: role || null,
    });

    console.log(`[AUTH-ROUTE] 🔑 Connexion réussie : ${result.user.email} [${result.user.role}]`);

    return res.json({
      success: true,
      message: 'Connexion réussie !',
      user: result.user,
      profile: {
        id: result.user.id,
        full_name: result.user.fullName,
        role: result.user.role,
        phone: result.user.phone,
        city: result.user.city,
      },
      token: result.token,
      session: {
        access_token: result.token,
        token_type: 'bearer',
        user: result.user,
      },
    });
  } catch (err) {
    const isLocked = err.message && err.message.includes('verrouillé');
    return res.status(isLocked ? 429 : 401).json({
      success: false,
      error: err.message || 'Identifiants incorrects.',
    });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', (_req, res) => {
  // Session JWT sans état : l'invalidation s'effectue par suppression côté client
  return res.json({
    success: true,
    message: 'Déconnexion réussie !',
  });
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Non authentifié (jeton absent).',
    });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: 'Jeton invalide ou expiré.',
      });
    }

    const [user] = await db.select().from(appUsers).where(eq(appUsers.id, decoded.id));
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Compte utilisateur introuvable.',
      });
    }

    const { passwordHash: _, ...safeUser } = user;

    return res.json({
      success: true,
      user: safeUser,
      profile: {
        id: safeUser.id,
        full_name: safeUser.fullName,
        role: safeUser.role,
        phone: safeUser.phone,
        city: safeUser.city,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
