// Fotos dos itens do checklist — guardadas como documentos no Firestore
// (subcoleção `checklistRuns/{runId}/photos/{itemId}`), cada uma já
// comprimida no navegador (ver `src/logic/imageCompression.js`).
//
// Isso evita depender do Firebase Storage, que hoje exige o plano pago
// Blaze (cartão com limite disponível) mesmo dentro da cota gratuita.
// Cada foto vira o seu próprio documento, então o limite de 1MiB do
// Firestore vale por foto, não dividido entre todas as fotos do checklist.

import { doc, setDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./config";
import { compressImage } from "../logic/imageCompression";

/**
 * Comprime e salva a foto de um item. Devolve a própria data URL (para já
 * usar como preview na tela, sem precisar buscar de volta no Firestore).
 */
export async function savePhotoForItem(runId, itemId, file) {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase ainda não configurado — preencha o .env");
  }
  const dataUrl = await compressImage(file);
  const photoRef = doc(db, "checklistRuns", runId, "photos", itemId);
  await setDoc(photoRef, {
    itemId,
    dataUrl,
    savedAt: serverTimestamp(),
  });
  return dataUrl;
}

/**
 * Busca todas as fotos salvas de uma aplicação de checklist — usado para
 * montar o PDF final com as evidências anexadas.
 * Devolve um objeto { [itemId]: dataUrl }.
 */
export async function getPhotosForRun(runId) {
  if (!isFirebaseConfigured) return {};
  const snap = await getDocs(collection(db, "checklistRuns", runId, "photos"));
  const photos = {};
  snap.forEach((d) => {
    photos[d.id] = d.data().dataUrl;
  });
  return photos;
}
