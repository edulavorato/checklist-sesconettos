// Upload das fotos anexadas a cada item do checklist.

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage, isFirebaseConfigured } from "./config";

/**
 * Envia a foto de um item para o Storage e devolve a URL pública.
 * @param {string} runId - id da aplicação do checklist (checklistRuns/{runId})
 * @param {string} itemId - id do item respondido
 * @param {File} file - arquivo de imagem vindo do <input type="file">
 */
export async function uploadItemPhoto(runId, itemId, file) {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase ainda não configurado — preencha o .env");
  }
  const path = `checklistRuns/${runId}/${itemId}-${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
