// Configuração de conexão com o Firebase.
// As chaves REAIS não ficam aqui — vêm de variáveis de ambiente (.env),
// que não são commitadas no Git (veja .env.example na raiz do projeto).
//
// Enquanto o .env não estiver preenchido, `isFirebaseConfigured` fica
// false e auth/db/storage ficam null — isso evita que o app inteiro
// quebre com tela branca antes do Firebase real existir.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export let firebaseApp = null;
export let auth = null;
export let db = null;

if (isFirebaseConfigured) {
  firebaseApp = initializeApp(firebaseConfig);
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
}
