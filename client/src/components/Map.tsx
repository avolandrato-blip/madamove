/// <reference types="@types/google.maps" />

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

let mapsScriptPromise: Promise<void> | null = null;

function loadMapScript() {
  if (window.google?.maps) return Promise.resolve();
  if (mapsScriptPromise) return mapsScriptPromise;

  const config = window.__MANUS_CONFIG__;
  if (!config?.apiUrl || !config.apiBrowserKey) {
    return Promise.reject(new Error("Maps is not configured"));
  }

  const apiKey = encodeURIComponent(config.apiBrowserKey);
  const mapsProxyUrl = `${config.apiUrl.replace(/\/$/, "")}/v1/maps/proxy`;
  mapsScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-madamove-maps]");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.dataset.madamoveMaps = "true";
    script.src = `${mapsProxyUrl}/maps/api/js?key=${apiKey}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  }).catch(error => {
    mapsScriptPromise = null;
    throw error;
  });

  return mapsScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: -18.8792, lng: 47.5079 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const onMapReadyRef = useRef(onMapReady);
  onMapReadyRef.current = onMapReady;

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        await loadMapScript();
        if (cancelled || !mapContainer.current || !window.google?.maps) return;

        const nextMap = new window.google.maps.Map(mapContainer.current, {
          zoom: initialZoom,
          center: initialCenter,
          mapTypeControl: true,
          fullscreenControl: true,
          zoomControl: true,
          streetViewControl: true,
          mapId: "DEMO_MAP_ID",
        });

        if (cancelled) return;
        map.current = nextMap;
        onMapReadyRef.current?.(nextMap);
      } catch (error) {
        if (!cancelled) console.error("[Maps] Unable to initialize map:", error);
      }
    }

    initialize();

    return () => {
      cancelled = true;
      map.current = null;
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom]);

  return <div ref={mapContainer} className={cn("h-[500px] w-full", className)} />;
}
