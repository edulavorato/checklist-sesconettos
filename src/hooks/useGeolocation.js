// Hook para capturar a localização do navegador, com fallback tratado
// (permissão negada, GPS indisponível, timeout) em vez de quebrar a tela.

import { useState, useCallback } from "react";

export function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ok | error

  const capture = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      return Promise.resolve(null);
    }
    setStatus("loading");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const value = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setCoords(value);
          setStatus("ok");
          resolve(value);
        },
        () => {
          setStatus("error");
          resolve(null);
        },
        { timeout: 6000 }
      );
    });
  }, []);

  return { coords, status, capture };
}
