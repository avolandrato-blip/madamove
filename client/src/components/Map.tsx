/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { MapPin, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

let mapsScriptPromise: Promise<void> | null = null;

function loadMapScript(): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;

  const config = window.__MANUS_CONFIG__;
  if (!config?.apiUrl || !config.apiBrowserKey) {
    return Promise.reject(
      new Error("La configuration Google Maps de ce projet est absente.")
    );
  }

  const proxyBase = `${config.apiUrl.replace(/\/$/, "")}/v1/maps/proxy`;
  const scriptUrl = new URL(`${proxyBase}/maps/api/js`);
  scriptUrl.searchParams.set("key", config.apiBrowserKey);
  scriptUrl.searchParams.set("v", "weekly");
  scriptUrl.searchParams.set("libraries", "places,geometry");
  scriptUrl.searchParams.set("language", "fr");
  scriptUrl.searchParams.set("region", "MG");

  mapsScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      "script[data-madamove-maps]"
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Google Maps n’a pas pu être chargé.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.madamoveMaps = "true";
    script.src = scriptUrl.toString();
    script.async = true;
    script.onerror = () =>
      reject(
        new Error(
          "Google Maps n’a pas pu être chargé. Vérifiez la configuration du projet et votre connexion."
        )
      );
    script.onload = () => {
      if (window.google?.maps) resolve();
      else
        reject(
          new Error(
            "Le SDK Google Maps s’est chargé sans fournir l’API attendue."
          )
        );
    };
    document.head.appendChild(script);
  }).catch(error => {
    mapsScriptPromise = null;
    document.querySelector("script[data-madamove-maps]")?.remove();
    throw error;
  });

  return mapsScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
  onMapError?: (message: string) => void;
}

export function MapView({
  className,
  initialCenter = { lat: -18.8792, lng: 47.5079 },
  initialZoom = 12,
  onMapReady,
  onMapError,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const onMapReadyRef = useRef(onMapReady);
  const onMapErrorRef = useRef(onMapError);
  const [loadError, setLoadError] = useState("");
  onMapReadyRef.current = onMapReady;
  onMapErrorRef.current = onMapError;

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        await loadMapScript();
        if (cancelled || !mapContainer.current || !window.google?.maps) return;

        const map = new window.google.maps.Map(mapContainer.current, {
          zoom: initialZoom,
          center: initialCenter,
          clickableIcons: false,
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          zoomControl: true,
          gestureHandling: "greedy",
        });

        if (cancelled) return;
        setLoadError("");
        onMapReadyRef.current?.(map);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "La carte Google Maps est indisponible.";
        setLoadError(message);
        onMapErrorRef.current?.(message);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom]);

  return (
    <div className="relative">
      <div
        ref={mapContainer}
        className={cn("h-[500px] w-full", className)}
        aria-label="Carte Google Maps de la zone d’Antananarivo"
      />
      {loadError && (
        <div
          className="absolute inset-0 grid place-items-center bg-slate-100/95 p-6 text-center"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-sm">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-[#0B1F3A] shadow-sm">
              <MapPinned className="size-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">
              Carte indisponible
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{loadError}</p>
            <p className="mt-2 flex items-center justify-center gap-1 text-[11px] text-slate-500">
              <MapPin className="size-3" /> Zone de service : Antananarivo et
              périphérie
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
