// Leitura/escrita no Firestore — nenhuma tela chama `firebase/firestore`
// diretamente, sempre passa por essas funções. Isso facilita trocar de
// banco no futuro e testar a lógica sem precisar de um Firebase real.

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./config";

function assertConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase ainda não configurado — preencha o .env");
  }
}

// Cria uma nova aplicação de checklist (quando o gerente inicia o preenchimento).
export async function createChecklistRun({ templateId, unitId, userId }) {
  assertConfigured();
  const ref = await addDoc(collection(db, "checklistRuns"), {
    templateId,
    unitId,
    userId,
    startedAt: serverTimestamp(),
    finishedAt: null,
    status: "em_andamento",
  });
  return ref.id;
}

// Salva o resultado final (nota, respostas resumidas) ao concluir o checklist.
export async function finishChecklistRun(runId, { responses, finalScore, inconformities }) {
  assertConfigured();
  const ref = doc(db, "checklistRuns", runId);
  await updateDoc(ref, {
    responses,
    finalScore,
    inconformities,
    finishedAt: serverTimestamp(),
    status: "concluido",
  });
}

// Busca o histórico de aplicações de uma unidade (para a tela de Histórico).
export async function getChecklistHistory(unitId) {
  assertConfigured();
  const q = query(
    collection(db, "checklistRuns"),
    where("unitId", "==", unitId),
    orderBy("finishedAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
