// Captura a localização do aparelho e (best-effort) traduz as coordenadas
// num endereço legível — usado para registrar onde o checklist foi
// aplicado (início e fim), igual ao que o ChecklistFácil já mostrava.

/**
 * Pede a localização atual do navegador. Resolve com `null` se o usuário
 * negar a permissão, o aparelho não suportar GPS, ou der timeout — nunca
 * rejeita, para não quebrar o fluxo do checklist por causa disso.
 */
export function getCurrentLocation(timeout = 7000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => resolve(null),
      { timeout, enableHighAccuracy: true }
    );
  });
}

/**
 * Tenta traduzir lat/lng num endereço legível (OpenStreetMap/Nominatim,
 * gratuito, sem chave de API). Se a rede falhar ou demorar, devolve `null`
 * e quem chamou deve mostrar só as coordenadas como alternativa.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18`,
      { signal: controller.signal, headers: { Accept: "application/json" } }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
}

export function formatCoords(loc) {
  if (!loc) return "—";
  return `${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}`;
}
