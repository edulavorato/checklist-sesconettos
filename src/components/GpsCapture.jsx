export default function GpsCapture({ coords, status, onCapture }) {
  const label =
    status === "loading"
      ? "Obtendo localização..."
      : coords
      ? `Localização capturada (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
      : status === "error"
      ? "GPS indisponível — toque para tentar de novo"
      : "Toque para capturar localização";

  return (
    <div className="gps-tag" onClick={onCapture}>
      <span className={`dot ${coords ? "ok" : ""}`} />
      <span>{label}</span>
    </div>
  );
}
