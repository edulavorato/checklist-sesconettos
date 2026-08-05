// Campo de foto de um item: abre a câmera do dispositivo (capture="environment")
// e mostra a pré-visualização assim que uma imagem é escolhida.

export default function PhotoCapture({ photoUrl, onCapture }) {
  function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    onCapture(file);
  }

  return (
    <label className={`photo-slot ${photoUrl ? "filled" : ""}`}>
      {photoUrl ? (
        <>
          <img src={photoUrl} alt="Evidência anexada" />
          <span className="photo-slot-label">✓ Foto anexada</span>
        </>
      ) : (
        <span>📷 Toque para tirar foto</span>
      )}
      <input type="file" accept="image/*" capture="environment" onChange={handleChange} />
    </label>
  );
}
