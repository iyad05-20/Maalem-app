import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../core/db/index.js";
import { appUsers, adminAuditLogs } from "../core/db/schema.js";
import { verifyToken } from "../services/localAuth.service.js";

const ADMIN_MASTER_KEY = process.env.ADMIN_MASTER_KEY || "vork_admin_master_passkey_2026";

/**
 * Extraction sécurisée du Bearer Token
 */
function getBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }
  return null;
}

/**
 * Middleware d'authentification locale obligatoire avec contrôle strict des rôles (RBAC) & Anti-IDOR
 */
export function requireAuth(allowedRoles = []) {
  return async (req, res, next) => {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Accès refusé. Jeton d'authentification manquant (Authorization: Bearer <token> requis).",
        code: "AUTH_TOKEN_MISSING",
      });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        error: "Session invalide ou expirée. Veuillez vous reconnecter.",
        code: "AUTH_TOKEN_INVALID",
      });
    }

    // Vérification de l'utilisateur actif en base SQLite
    const user = db.select().from(appUsers).where(eq(appUsers.id, decoded.id)).get();
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Compte utilisateur introuvable.",
        code: "AUTH_USER_NOT_FOUND",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        error: "Ce compte a été suspendu par l'administration Vork.",
        code: "AUTH_USER_SUSPENDED",
      });
    }

    // Contrôle strict de rôle (RBAC)
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: `Accès interdit : cette ressource requiert le rôle [${allowedRoles.join(", ")}], votre rôle actuel est '${user.role}'.`,
        code: "FORBIDDEN_ROLE",
      });
    }

    // Dérivation exclusive et sécurisée de l'identité (Anti-IDOR)
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      phone: user.phone,
      city: user.city,
    };
    req.userId = user.id;
    req.userRole = user.role;

    next();
  };
}

/**
 * Middleware de sécurité renforcée pour le Dashboard Administrateur
 * Exige un compte rôle 'admin' ET la validation de la Master Passkey
 */
export function requireAdmin(req, res, next) {
  // 1. Première couche : Authentification JWT rôle 'admin'
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Accès Administrateur refusé : Jeton d'opérateur manquant.",
      code: "ADMIN_TOKEN_MISSING",
    });
  }

  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Accès Administrateur refusé : Rôle admin non autorisé.",
      code: "ADMIN_FORBIDDEN",
    });
  }

  // 2. Deuxième couche : Validation de la Master Passkey Vork
  const masterKeyHeader = req.headers["x-admin-master-key"] || req.headers["x-master-key"];
  if (!masterKeyHeader) {
    return res.status(403).json({
      success: false,
      error: "Accès Administrateur refusé : Clé de sécurité Master manquante (En-tête 'X-Admin-Master-Key').",
      code: "ADMIN_MASTER_KEY_MISSING",
    });
  }

  // Comparaison temps-constant pour contrer les timing attacks
  let isKeyValid = false;
  try {
    const expected = Buffer.from(ADMIN_MASTER_KEY);
    const provided = Buffer.from(String(masterKeyHeader));
    isKeyValid = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
  } catch {
    isKeyValid = false;
  }

  if (!isKeyValid) {
    console.warn(`[SECURITY-ALERT] 🚨 Tentative d'accès Admin avec Master Key erronée par ${decoded.email} (${req.ip})`);
    return res.status(403).json({
      success: false,
      error: "Clé de sécurité Master invalide.",
      code: "ADMIN_MASTER_KEY_INVALID",
    });
  }

  req.user = decoded;
  req.userId = decoded.id;
  req.userRole = "admin";
  req.adminOperator = {
    id: decoded.id,
    email: decoded.email,
  };

  next();
}

/**
 * Helper d'audit log pour consigner les actions d'arbitrage et de gestion manuelle
 */
export function logAdminAction(operatorId, action, targetId, details = null, ipAddress = null) {
  try {
    const id = `audit-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    db.insert(adminAuditLogs).values({
      id,
      operatorId,
      action,
      targetId: String(targetId),
      details: details ? (typeof details === "string" ? details : JSON.stringify(details)) : null,
      ipAddress: ipAddress || null,
      createdAt: new Date().toISOString(),
    }).run();
  } catch (err) {
    console.error("[ADMIN-AUDIT] ⚠️ Échec de consignation dans le journal d'audit :", err.message);
  }
}

/**
 * Authentification optionnelle (visiteurs / navigation catalogue côté client)
 */
export function optionalAuth(req, res, next) {
  const token = getBearerToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.id) {
      req.user = decoded;
      req.userId = decoded.id;
      req.userRole = decoded.role;
    }
  }
  next();
}
