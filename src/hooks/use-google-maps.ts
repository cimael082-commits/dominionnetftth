import { useEffect, useState } from "react";

const CALLBACK_NAME = "__dominion_gmap_init";
let loadPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    const w = window as unknown as Record<string, unknown>;
    if (w.google && (w.google as { maps?: unknown }).maps) {
      resolve();
      return;
    }
    const key = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_GOOGLE_MAPS_TRACKING_ID;
    if (!key) {
      reject(new Error("Google Maps browser key ausente"));
      return;
    }
    (w as Record<string, unknown>)[CALLBACK_NAME] = () => resolve();
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geometry&loading=async&callback=${CALLBACK_NAME}${channel ? `&channel=${channel}` : ""}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

export function useGoogleMaps() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setReady(true))
      .catch((e: Error) => setError(e.message));
  }, []);
  return { ready, error };
}
