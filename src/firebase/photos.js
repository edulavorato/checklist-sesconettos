// Fotos dos itens do checklist — guardadas como documentos no Firestore
// (subcoleção `checklistRuns/{runId}/photos/{itemId}`), cada uma já
// comprimida no navegador (ver `src/logic/imageCompression.js`).
//
// Isso evita depender do Firebase Storage, que hoje exige o plano pago
// Blaze (cartão com limite disponível) mesmo dentro da cota gratuita.
// Cada foto vira o seu próprio documento, então o limite de 1MiB do
// Firestore vale por foto, não dividido entre todas as fotos do checklist.

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
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
