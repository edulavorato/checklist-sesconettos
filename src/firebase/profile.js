// Perfil complementar do usuário — nome de exibição, cargo e unidade.
// O Firebase Auth só guarda e-mail/senha; esses dados extras ficam num
// documento próprio em `users/{uid}`, que o próprio usuário pode editar
// (ver firestore.rules).

import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./config";

export async function getUserProfile(uid) {
  if (!isFirebaseConfigured || !uid) return null;
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

// Lista todos os perfis cadastrados (nome, cargo, unidade) — usada na tela
// inicial da administração para mostrar a visão geral por unidade/gerente.
// As regras do Firestore só liberam essa leitura completa para quem tem
// `role: "admin"`; para qualquer outra conta, isso retorna vazio/erro.
export async function getAllUsers() {
  if (!isFirebaseConfigured) return [];
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveUserProfile(uid, { displayName, cargo, unitId }) {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase ainda não configurado — preencha o .env");
  }
  await setDoc(
    doc(db, "users", uid),
    { displayName: displayName || "", cargo: cargo || "", unitId: unitId || "" },
    { merge: true }
  );
}
