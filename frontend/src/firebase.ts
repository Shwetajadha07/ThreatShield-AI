import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDBwFeqKSBErhRakyXz5kHTbLL6h8qKqcE",
  authDomain: "threatshield-ai-e78b3.firebaseapp.com",
  projectId: "threatshield-ai-e78b3",
  storageBucket: "threatshield-ai-e78b3.firebasestorage.app",
  messagingSenderId: "262251978015",
  appId: "1:262251978015:web:1f570594cff5feab0c242a",
  measurementId: "G-7ZX0EL3NQF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export { app };
