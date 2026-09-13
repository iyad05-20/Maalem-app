import { getUserFromToken } from '../services/auth.service.js';

/**
 * Middleware d'authentification obligatoire (JWT Bearer Token)
 * Protège les routes de l'écosystème Maâlem (App Client, Artisan, Admin).
 */
export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: "Accès refusé. Jeton JWT Bearer manquant (En-tête 'Authorization: Bearer <token>' obligatoire).",
      code: "AUTH_TOKEN_MISSING"
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const userData = await getUserFromToken(token);
    if (!userData || !userData.user) {
      return res.status(401).json({
        success: false,
        error: "Jeton JWT invalide ou session expirée.",
        code: "AUTH_TOKEN_INVALID"
      });
    }

    // Injection des données d'authentification dans la requête
    req.user = userData.user;
    req.userProfile = userData.profile;
    req.userId = userData.user.id;
    req.token = token;

    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la vérification du jeton d'authentification.",
      details: err.message
    });
  }
}

/**
 * Middleware d'authentification optionnelle
 * Injecte req.user si un jeton est présent, sans bloquer si absent.
 */
export async function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const userData = await getUserFromToken(token);
      if (userData && userData.user) {
        req.user = userData.user;
        req.userProfile = userData.profile;
        req.userId = userData.user.id;
        req.token = token;
      }
    } catch (err) {
      // Ignoré en mode optionnel
    }
  }
  next();
}
