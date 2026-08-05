// Compressão de imagem no navegador — usada para guardar as fotos dos
// itens diretamente no Firestore (sem precisar do Firebase Storage/Blaze).
// Redimensiona para uma largura máxima e reduz a qualidade JPEG até o
// resultado caber num limite de tamanho seguro por documento.

const MAX_WIDTH = 900;
const MAX_BYTES = 700 * 1024; // ~700KB em base64, com folga sob o limite de 1MiB por documento do Firestore

/**
 * Recebe um File de imagem e devolve uma data URL (base64) comprimida,
 * pronta para salvar num campo de string no Firestore.
 */
export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      const scale = Math.min(1, MAX_WIDTH / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);

      let quality = 0.7;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);

      // Reduz a qualidade progressivamente até caber no limite de tamanho.
      while (dataUrl.length > MAX_BYTES && quality > 0.2) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível processar a imagem."));
    };

    img.src = objectUrl;
  });
}
