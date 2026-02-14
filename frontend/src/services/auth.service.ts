
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  browserLocalPersistence,
  setPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import app, { db, auth } from "./firebase.config";
import { sanitizeFirestoreData } from "../utils";

// Ensure persistence is set
setPersistence(auth, browserLocalPersistence).catch(console.error);

const isValidUrl = (url: string) => {
  if (!url) return true; // Empty is valid if optional
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * ISOLATED REGISTRATION
 */
export const registerUser = async (email, password, role, additionalData) => {
  const collectionName = role === "artisan" ? "artisans" : "users";
  let user = null;
  let isNewAuthUser = false;

  // Data Validation
  if (additionalData.avatar && !isValidUrl(additionalData.avatar)) {
    throw new Error("L'URL de la photo de profil est invalide.");
  }

  try {
    // 1. Attempt to create a fresh Authentication user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    user = userCredential.user;
    isNewAuthUser = true;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      try {
        const loginCredential = await signInWithEmailAndPassword(auth, email, password);
        user = loginCredential.user;
        isNewAuthUser = false;

        const docRef = doc(db, collectionName, user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          throw new Error(`Un compte ${role === 'user' ? 'Client' : 'Artisan'} existe déjà avec cet email. Veuillez vous connecter.`);
        }
      } catch (loginError: any) {
        if (loginError.message.includes("existe déjà")) throw loginError;
        if (loginError.code === 'auth/wrong-password' || loginError.code === 'auth/invalid-credential') {
          throw new Error("Cet email est déjà utilisé, mais le mot de passe ne correspond pas.");
        }
        throw loginError;
      }
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error("UNAUTHORIZED_DOMAIN");
    } else {
      throw error;
    }
  }

  try {
    const profileData = {
      ...additionalData,
      id: user.uid,
      uid: user.uid,
      email: email,
      role: role,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, collectionName, user.uid), profileData, { merge: true });

    // SANITIZE HERE
    return { user, role, data: sanitizeFirestoreData(profileData) };
  } catch (dbError) {
    console.error("Firestore Error:", dbError);
    throw new Error("Erreur lors de la création du profil.");
  }
};

/**
 * ISOLATED LOGIN
 */
export const loginUser = async (email, password, role) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;

    const targetCollection = role === "artisan" ? "artisans" : "users";
    const docRef = doc(db, targetCollection, uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      // SANITIZE HERE
      return {
        user: userCredential.user,
        role,
        data: sanitizeFirestoreData({ ...docSnap.data(), id: uid })
      };
    } else {
      const otherCollection = role === "artisan" ? "users" : "artisans";
      const otherDocRef = doc(db, otherCollection, uid);
      const otherDocSnap = await getDoc(otherDocRef);

      if (otherDocSnap.exists()) {
        throw new Error(`Ce compte est enregistré comme ${role === 'artisan' ? 'Client' : 'Artisan'}. Veuillez changer de mode de connexion.`);
      } else {
        throw new Error("Profil introuvable. Veuillez vous inscrire.");
      }
    }
  } catch (error: any) {
    console.error("Login error:", error);
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error("Email ou mot de passe incorrect.");
    }
    if (error.code === 'auth/user-not-found') {
      throw new Error("Aucun compte trouvé avec cet email.");
    }
    throw error;
  }
};
