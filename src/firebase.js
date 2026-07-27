import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCVT3E6aeTTt_hLLfTOQL8BcCxEQDQrbCI",
  authDomain: "kaamyaar-1cf70.firebaseapp.com",
  projectId: "kaamyaar-1cf70",
  storageBucket: "kaamyaar-1cf70.firebasestorage.app",
  messagingSenderId: "829945268137",
  appId: "1:829945268137:web:387c5f872650377020a6b8",
  measurementId: "G-K5SMM9CMBF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;