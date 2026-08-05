// Funções de autenticação — tudo que envolve login/logout do Firebase Auth
// fica isolado aqui, para as telas nunca chamarem o SDK do Firebase direto.

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "./config";

export function loginWithEmail(email, password) {
  if (!isFirebaseConfigured) {
    return Promise.reject(new Error("Firebase ainda não configurado — preencha o .env"));
  }
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  if (!isFirebaseConfigured) return Promise.resolve();
  return signOut(auth);
}

// Assina mudanças de sessão (login/logout) — usado pelo AuthContext.
// Se o Firebase ainda não estiver configurado, chama onNotConfigured
// em vez de tentar usar um `auth` que não existe.
export function subscribeToAuthChanges(callback, onNotConfigured) {
  if (!isFirebaseConfigured) {
    onNotConfigured?.(new Error("Variáveis VITE_FIREBASE_* ausentes no .env"));
    return () => {};
  }
  return onAuthStateChanged(auth, callback, onNotConfigured);
}
