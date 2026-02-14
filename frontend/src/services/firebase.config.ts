
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
// Added missing getAuth import from Firebase Auth SDK
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Using explicit configuration provided previously
const firebaseConfig = {
  apiKey: "AIzaSyChaguaGghhYRdmKRJsO7AStFM7VeT1SHc",
  authDomain: "vork-1092c.firebaseapp.com",
  projectId: "vork-1092c",
  storageBucket: "vork-1092c.firebasestorage.app",
  messagingSenderId: "587012804050",
  appId: "1:587012804050:web:d93a8a3f6345b9bebe4c0b"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
// Export Firestore database instance
export const db = getFirestore(app);
// Export Storage instance
export const storage = getStorage(app);
// Export Auth instance to resolve named import errors in other components
export const auth = getAuth(app);

export const isFirebaseConfigured = true;

export default app;
