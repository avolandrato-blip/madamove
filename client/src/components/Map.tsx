import { useEffect } from "react";
import L, { type LatLngTuple } from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

export type MapPosition = LatLngTuple;

interface MapViewProps {
  className?: string;
  initialCenter?: MapPosition;
  initialZoom?: number;
  pickupPosition?: MapPosition | null;
  destinationPosition?: MapPosition | null;
  routeCoordinates?: MapPosition[];
}

const defaultCenter: MapPosition = [-18.8792, 47.5079];
const emptyCoordinates: MapPosition[] = [];
const tileUrl = import.meta.env.VITE_OSM_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const pickupIcon = L.divIcon({
  className: "madamove-map-marker",
  html: '<span style="display:block;width:18px;height:18px;border:4px solid white;border-radius:50%;background:#047857;box-shadow:0 1px 6px #0006"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const destinationIcon = L.divIcon({
  className: "madamove-map-marker",
  html: '<span style="display:block;width:18px;height:18px;border:4px solid white;border-radius:50%;background:#e11d48;box-shadow:0 1px 6px #0006"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitMapToRoute({
  pickupPosition,
  destinationPosition,
  routeCoordinates,
}: Pick<MapViewProps, "pickupPosition" | "destinationPosition" | "routeCoordinates">) {
  const map = useMap();

  useEffect(() => {
    const coordinates = routeCoordinates?.length
      ? routeCoordinates
      : [pickupPosition, destinationPosition].filter((point): point is MapPosition => Boolean(point));

    if (coordinates.length > 1) {
      map.fitBounds(L.latLngBounds(coordinates), { padding: [28, 28], maxZoom: 15 });
    } else if (coordinates.length === 1) {
      map.setView(coordinates[0], 15);
    }
  }, [map, pickupPosition, destinationPosition, routeCoordinates]);

  return null;
}

export function MapView({
  className,
  initialCenter = defaultCenter,
  initialZoom = 12,
  pickupPosition = null,
  destinationPosition = null,
  routeCoordinates = emptyCoordinates,
}: MapViewProps) {
  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      className={cn("h-[500px] w-full", className)}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Search: <a href="https://github.com/komoot/photon">Photon</a> | Routes: <a href="https://project-osrm.org/">OSRM</a>'
        url={tileUrl}
      />
      <FitMapToRoute
        pickupPosition={pickupPosition}
        destinationPosition={destinationPosition}
        routeCoordinates={routeCoordinates}
      />
      {pickupPosition && (
        <Marker position={pickupPosition} icon={pickupIcon}>
          <Popup>Point de départ</Popup>
        </Marker>
      )}
      {destinationPosition && (
        <Marker position={destinationPosition} icon={destinationIcon}>
          <Popup>Point d’arrivée</Popup>
        </Marker>
      )}
      {routeCoordinates.length > 0 && (
        <Polyline positions={routeCoordinates} pathOptions={{ color: "#047857", weight: 5, opacity: 0.9 }} />
      )}
    </MapContainer>
  );
}
