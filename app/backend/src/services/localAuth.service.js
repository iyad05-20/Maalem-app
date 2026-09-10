import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../core/db/index.js";
import { appUsers } from "../core/db/schema.js";

const JWT_SECRET = process.env.JWT_SECRET || "vork_secure_local_jwt_secret_2026_maroc_artisanat";
const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Hachage sécurisé du mot de passe avec sel fort
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Comparaison temps-constant du mot de passe
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Génération du jeton JWT avec payload typé
 */
export function generateToken(user, expiresIn = "24h") {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName || user.email.split("@")[0],
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Vérification et décodage du jeton JWT
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Inscription locale autonome
 */
export async function signUpUser({ email, password, fullName, role = "client", phone, city }) {
  if (!email || !password) {
    throw new Error("L'adresse email et le mot de passe sont obligatoires.");
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error("Format d'adresse email invalide.");
  }

  if (password.length < 8) {
    throw new Error("Le mot de passe doit comporter au moins 8 caractères.");
  }

  const existing = db.select().from(appUsers).where(eq(appUsers.email, cleanEmail)).get();
  if (existing) {
    throw new Error("Un compte existe déjà avec cette adresse email.");
  }

  const allowedRoles = ["client", "artisan", "admin"];
  const targetRole = allowedRoles.includes(role) ? role : "client";

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  const id = `usr-${crypto.randomUUID()}`;

  db.insert(appUsers).values({
    id,
    email: cleanEmail,
    passwordHash,
    fullName: fullName ? fullName.trim() : cleanEmail.split("@")[0],
    role: targetRole,
    phone: phone || null,
    city: city || null,
    status: "active",
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
  }).run();

  const user = db.select().from(appUsers).where(eq(appUsers.id, id)).get();
  const token = generateToken(user);

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

/**
 * Connexion avec protection anti-bruteforce et verrouillage temporisé
 */
export async function signInUser({ email, password, expectedRole = null }) {
  if (!email || !password) {
    throw new Error("Identifiants incomplets.");
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.select().from(appUsers).where(eq(appUsers.email, cleanEmail)).get();

  if (!user) {
    // Message générique pour éviter l'énumération des comptes
    throw new Error("Adresse email ou mot de passe incorrect.");
  }

  const now = Date.now();

  // 1. Contrôle du verrouillage temporisé
  if (user.lockedUntil) {
    const lockTime = new Date(user.lockedUntil).getTime();
    if (lockTime > now) {
      const remainingMinutes = Math.ceil((lockTime - now) / (60 * 1000));
      throw new Error(`Compte temporairement verrouillé par mesure de sécurité suite à plusieurs échecs. Réessayez dans ${remainingMinutes} minute(s).`);
    } else {
      // Période de verrouillage expirée : réinitialiser
      db.update(appUsers)
        .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date().toISOString() })
        .where(eq(appUsers.id, user.id))
        .run();
    }
  }

  // 2. Vérification du statut du compte
  if (user.status === "suspended") {
    throw new Error("Ce compte a été suspendu par l'administration Vork.");
  }

  // 3. Vérification du mot de passe
  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    const newAttempts = (user.failedLoginAttempts || 0) + 1;
    let lockedUntil = null;

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      lockedUntil = new Date(now + LOCKOUT_MINUTES * 60 * 1000).toISOString();
      console.warn(`[SECURITY-ALERT] ⚠️ Compte ${cleanEmail} verrouillé après ${newAttempts} tentatives échouées.`);
    }

    db.update(appUsers)
      .set({
        failedLoginAttempts: newAttempts,
        lockedUntil,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(appUsers.id, user.id))
      .run();

    if (lockedUntil) {
      throw new Error(`Trop de tentatives erronées. Compte verrouillé pendant ${LOCKOUT_MINUTES} minutes.`);
    }

    throw new Error("Adresse email ou mot de passe incorrect.");
  }

  // 4. Contrôle de cloisonnement de rôle (si spécifié)
  if (expectedRole && user.role !== expectedRole) {
    throw new Error(`Accès non autorisé pour ce profil (ce compte est enregistré comme ${user.role}).`);
  }

  // 5. Réinitialisation des tentatives échouées en cas de succès
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    db.update(appUsers)
      .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date().toISOString() })
      .where(eq(appUsers.id, user.id))
      .run();
  }

  const token = generateToken(user, user.role === "admin" ? "4h" : "24h");
  const { passwordHash: _, ...safeUser } = user;

  return { user: safeUser, token };
}

/**
 * Initialisation des comptes par défaut si la table est vide
 */
export async function seedDefaultAccounts() {
  try {
    const existing = db.select().from(appUsers).all();
    if (existing.length === 0) {
      console.log("[LOCAL-AUTH] 🌱 Initialisation des comptes sécurisés de démarrage...");
      const now = new Date().toISOString();

      const defaultAccounts = [
        {
          id: "artisan_abdelkader",
          email: "artisan@vork.ma",
          password: "Maalem2026!",
          fullName: "Maâlem Abdelkader",
          role: "artisan",
          phone: "0661234567",
          city: "Fès",
        },
        {
          id: "client_karim",
          email: "client@vork.ma",
          password: "Client2026!",
          fullName: "Karim Benjelloun",
          role: "client",
          phone: "0662345678",
          city: "Casablanca",
        },
        {
          id: "admin_master",
          email: "admin@vork.ma",
          password: "AdminVork2026!",
          fullName: "Opérateur Principal Vork",
          role: "admin",
          phone: "0660000000",
          city: "Casablanca",
        },
      ];

      for (const acc of defaultAccounts) {
        const passwordHash = await hashPassword(acc.password);
        db.insert(appUsers).values({
          id: acc.id,
          email: acc.email,
          passwordHash,
          fullName: acc.fullName,
          role: acc.role,
          phone: acc.phone,
          city: acc.city,
          status: "active",
          failedLoginAttempts: 0,
          lockedUntil: null,
          createdAt: now,
          updatedAt: now,
        }).run();
      }
      console.log("[LOCAL-AUTH] ✅ 3 comptes par défaut initialisés avec succès (artisan@vork.ma, client@vork.ma, admin@vork.ma).");
    }
  } catch (err) {
    console.error("[LOCAL-AUTH] ⚠️ Erreur lors du seeding des comptes par défaut :", err.message);
  }
}
