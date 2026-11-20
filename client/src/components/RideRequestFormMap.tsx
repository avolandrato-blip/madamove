import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  LocateFixed,
  MapPin,
  MapPinned,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/Map";
import {
  calculateSuggestedFare,
  getMinimumFare,
  getRatePerKm,
} from "@/lib/fares";
import { supabase } from "@/lib/supabase";

type ServiceType = "taxi" | "vtc" | "moto";
type PaymentMethod = "cash" | "mobile_money";
type Coordinates = google.maps.LatLngLiteral;
type RideRequest = {
  id: string;
  service_type: ServiceType;
  pickup_address: string;
  destination_address: string;
  proposed_price: number;
  payment_method: PaymentMethod;
  passenger_count: number;
  luggage_count: number;
  status: string;
  created_at: string;
  distance_km?: number | null;
  estimated_duration_minutes?: number | null;
};

const serviceOptions: Array<{
  value: ServiceType;
  label: string;
  description: string;
  symbol: string;
}> = [
  { value: "taxi", label: "Taxi", description: "Course urbaine", symbol: "🚕" },
  { value: "vtc", label: "VTC", description: "Véhicule réservé", symbol: "🚗" },
  {
    value: "moto",
    label: "Taxi-moto",
    description: "Rapide et léger",
    symbol: "🏍️",
  },
];

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} Ar`;
}

function coordinateFromLocation(location: google.maps.LatLng): Coordinates {
  return { lat: location.lat(), lng: location.lng() };
}

export function RideRequestFormMap({
  userId,
  onCreated,
}: {
  userId: string;
  onCreated: (ride: RideRequest) => void;
}) {
  const [serviceType, setServiceType] = useState<ServiceType>("taxi");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [landmark, setLandmark] = useState("");
  const [price, setPrice] = useState("10000");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [passengers, setPassengers] = useState("1");
  const [luggage, setLuggage] = useState("0");
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [pickupCoordinates, setPickupCoordinates] =
    useState<Coordinates | null>(null);
  const [destinationCoordinates, setDestinationCoordinates] =
    useState<Coordinates | null>(null);
  const [mapPickTarget, setMapPickTarget] = useState<
    "pickup" | "destination" | null
  >(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [mapError, setMapError] = useState("");
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const renderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const fareFloor = getMinimumFare(serviceType);
  const ratePerKm = getRatePerKm(serviceType);

  useEffect(() => {
    if (!map || !window.google?.maps.places) return;

    const pickupInput = document.getElementById(
      "pickup-address"
    ) as HTMLInputElement | null;
    const destinationInput = document.getElementById(
      "destination-address"
    ) as HTMLInputElement | null;
    if (!pickupInput || !destinationInput) return;

    const options: google.maps.places.AutocompleteOptions = {
      fields: ["formatted_address", "geometry", "name"],
      componentRestrictions: { country: "mg" },
    };
    const pickupAutocomplete = new google.maps.places.Autocomplete(
      pickupInput,
      options
    );
    const destinationAutocomplete = new google.maps.places.Autocomplete(
      destinationInput,
      options
    );

    const pickupListener = pickupAutocomplete.addListener(
      "place_changed",
      () => {
        const place = pickupAutocomplete.getPlace();
        const address = place.formatted_address || place.name;
        if (address) setPickup(address);
        if (place.geometry?.location)
          setPickupCoordinates(coordinateFromLocation(place.geometry.location));
        if (place.geometry?.viewport) map.fitBounds(place.geometry.viewport);
        else if (place.geometry?.location) {
          map.panTo(place.geometry.location);
          map.setZoom(15);
        }
      }
    );
    const destinationListener = destinationAutocomplete.addListener(
      "place_changed",
      () => {
        const place = destinationAutocomplete.getPlace();
        const address = place.formatted_address || place.name;
        if (address) setDestination(address);
        if (place.geometry?.location)
          setDestinationCoordinates(
            coordinateFromLocation(place.geometry.location)
          );
        if (place.geometry?.viewport) map.fitBounds(place.geometry.viewport);
        else if (place.geometry?.location) {
          map.panTo(place.geometry.location);
          map.setZoom(15);
        }
      }
    );

    return () => {
      pickupListener.remove();
      destinationListener.remove();
    };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    renderer.current = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: "#047857",
        strokeOpacity: 0.92,
        strokeWeight: 5,
      },
    });
    return () => {
      renderer.current?.setMap(null);
      renderer.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (!map || !mapPickTarget) return;
    const listener = map.addListener(
      "click",
      (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        const target = mapPickTarget;
        const coordinates = coordinateFromLocation(event.latLng);
        if (target === "pickup") setPickupCoordinates(coordinates);
        else setDestinationCoordinates(coordinates);
        setMapPickTarget(null);
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: coordinates }, (results, status) => {
          const address =
            status === "OK" && results?.[0]
              ? results[0].formatted_address
              : `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
          if (target === "pickup") setPickup(address);
          else setDestination(address);
        });
      }
    );
    return () => listener.remove();
  }, [map, mapPickTarget]);

  useEffect(() => {
    if (!map || !renderer.current || !pickup.trim() || !destination.trim()) {
      setDistanceKm(null);
      setDurationMinutes(null);
      setRouteError("");
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      setRouteLoading(true);
      setRouteError("");
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: pickup.trim(),
          destination: destination.trim(),
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (cancelled) return;
          setRouteLoading(false);
          const leg = result?.routes[0]?.legs[0];
          if (status !== "OK" || !leg) {
            renderer.current?.setMap(null);
            renderer.current?.setMap(map);
            setDistanceKm(null);
            setDurationMinutes(null);
            setRouteError(
              "Itinéraire introuvable. Vérifiez les adresses ou choisissez les points directement sur la carte."
            );
            return;
          }

          renderer.current?.setDirections(result);
          const nextDistanceKm = (leg.distance?.value ?? 0) / 1000;
          const nextDurationMinutes = Math.max(
            1,
            Math.round((leg.duration?.value ?? 0) / 60)
          );
          setDistanceKm(nextDistanceKm);
          setDurationMinutes(nextDurationMinutes);
          setPickupCoordinates(coordinateFromLocation(leg.start_location));
          setDestinationCoordinates(coordinateFromLocation(leg.end_location));
          setPrice(String(calculateSuggestedFare(serviceType, nextDistanceKm)));
        }
      );
    }, 500);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [map, pickup, destination, serviceType]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    const proposedPrice = Number(price);
    if (
      !distanceKm ||
      !Number.isFinite(proposedPrice) ||
      proposedPrice < fareFloor
    ) {
      setNotice({
        type: "error",
        text: !distanceKm
          ? "Renseignez deux adresses valides pour calculer l’itinéraire."
          : `Le prix proposé doit être d’au moins ${formatPrice(fareFloor)}.`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const pickupWithLandmark = landmark.trim()
        ? `${pickup.trim()} — Repère : ${landmark.trim()}`
        : pickup.trim();
      const payload = {
        passenger_id: userId,
        service_type: serviceType,
        pickup_address: pickupWithLandmark,
        destination_address: destination.trim(),
        proposed_price: proposedPrice,
        payment_method: payment,
        passenger_count: Number(passengers),
        luggage_count: Number(luggage),
        distance_km: Number(distanceKm.toFixed(2)),
        estimated_duration_minutes: durationMinutes,
        pickup_latitude: pickupCoordinates?.lat ?? null,
        pickup_longitude: pickupCoordinates?.lng ?? null,
        destination_latitude: destinationCoordinates?.lat ?? null,
        destination_longitude: destinationCoordinates?.lng ?? null,
      };
      const { data, error } = await supabase
        .from("ride_requests")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw error;
      onCreated(data as RideRequest);
      setNotice({
        type: "success",
        text: "Demande publiée. Les conducteurs disponibles peuvent maintenant répondre.",
      });
      setPickup("");
      setDestination("");
      setLandmark("");
      setPickupCoordinates(null);
      setDestinationCoordinates(null);
      setDistanceKm(null);
      setDurationMinutes(null);
      renderer.current?.setMap(null);
      renderer.current?.setMap(map);
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible de publier la demande.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function useCurrentPosition() {
    if (!navigator.geolocation) {
      setRouteError(
        "La géolocalisation n’est pas disponible sur ce navigateur."
      );
      return;
    }
    setLocating(true);
    setRouteError("");
    navigator.geolocation.getCurrentPosition(
      position => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setPickupCoordinates(coordinates);
        map?.panTo(coordinates);
        map?.setZoom(16);
        if (!window.google?.maps) {
          setPickup(
            `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
          );
          setLocating(false);
          return;
        }
        new google.maps.Geocoder().geocode(
          { location: coordinates },
          (results, status) => {
            setLocating(false);
            setPickup(
              status === "OK" && results?.[0]
                ? results[0].formatted_address
                : `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`
            );
          }
        );
      },
      error => {
        setLocating(false);
        setRouteError(
          error.code === error.PERMISSION_DENIED
            ? "Autorisez la localisation pour utiliser votre position actuelle."
            : "Impossible de récupérer votre position."
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Nouvelle demande · Grand Tana
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
            Où souhaitez-vous aller ?
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Le prix reste négociable jusqu’à son acceptation.
          </p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
          <MapPinned className="size-5" />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {serviceOptions.map(option => (
          <button
            type="button"
            key={option.value}
            onClick={() => setServiceType(option.value)}
            aria-pressed={serviceType === option.value}
            className={`rounded-2xl border p-3 text-left transition ${serviceType === option.value ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <span className="text-xl" aria-hidden="true">
              {option.symbol}
            </span>
            <span className="mt-2 block text-sm font-bold text-slate-900">
              {option.label}
            </span>
            <span className="mt-0.5 block text-[11px] text-slate-500">
              {option.description}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="pickup-address"
              className="text-sm font-semibold text-slate-800"
            >
              Point de départ
            </label>
            <button
              type="button"
              onClick={useCurrentPosition}
              disabled={locating}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
            >
              <LocateFixed className="size-3.5" />{" "}
              {locating ? "Localisation…" : "Ma position"}
            </button>
          </div>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-600" />
            <Input
              id="pickup-address"
              required
              value={pickup}
              onChange={event => {
                setPickup(event.target.value);
                setPickupCoordinates(null);
              }}
              placeholder="Rechercher une adresse à Madagascar"
              className="pl-9"
            />
          </div>
          <button
            type="button"
            onClick={() => setMapPickTarget("pickup")}
            className="mt-1.5 text-xs font-medium text-slate-500 hover:text-emerald-700"
          >
            Ou choisir le départ sur la carte
          </button>
        </div>
        <div>
          <label
            htmlFor="destination-address"
            className="mb-1.5 block text-sm font-semibold text-slate-800"
          >
            Destination
          </label>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="destination-address"
              required
              value={destination}
              onChange={event => {
                setDestination(event.target.value);
                setDestinationCoordinates(null);
              }}
              placeholder="Ex. Aéroport d’Ivato"
              className="pl-9"
            />
          </div>
          <button
            type="button"
            onClick={() => setMapPickTarget("destination")}
            className="mt-1.5 text-xs font-medium text-slate-500 hover:text-emerald-700"
          >
            Ou choisir l’arrivée sur la carte
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
        <label
          htmlFor="pickup-landmark"
          className="block text-xs font-bold text-amber-900"
        >
          <MapPin className="mr-1 inline size-3.5" />
          Repère visible pour le chauffeur
        </label>
        <Input
          id="pickup-landmark"
          value={landmark}
          onChange={event => setLandmark(event.target.value)}
          maxLength={160}
          placeholder="Ex. Devant la pharmacie, portail bleu"
          className="mt-2 border-amber-200 bg-white text-sm"
        />
        <p className="mt-1 text-[11px] text-amber-800">
          Utile dans les quartiers sans numéro de rue ; transmis au conducteur
          avec le départ.
        </p>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold text-slate-700">
            Carte Google · Antananarivo
          </p>
          {mapPickTarget && (
            <p className="text-xs font-semibold text-emerald-700" role="status">
              Touchez la carte pour choisir{" "}
              {mapPickTarget === "pickup" ? "le départ" : "l’arrivée"}.
            </p>
          )}
          {!mapPickTarget && (
            <p className="text-[11px] text-slate-500">
              Zoomez et déplacez la carte pour affiner le trajet.
            </p>
          )}
        </div>
        <MapView
          className="h-[250px] sm:h-[330px]"
          initialCenter={{ lat: -18.8792, lng: 47.5079 }}
          initialZoom={12}
          onMapReady={setMap}
          onMapError={setMapError}
        />
      </div>
      {mapError && (
        <p className="mt-2 text-xs text-amber-700">
          La carte ne répond pas. Vérifiez que les services Google Maps sont
          activés dans la configuration du projet.
        </p>
      )}

      <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm">
        {routeLoading ? (
          <span className="text-slate-500">Calcul de l’itinéraire…</span>
        ) : distanceKm ? (
          <>
            <span className="font-medium text-slate-700">
              Distance routière :{" "}
              <strong className="text-emerald-700">
                {distanceKm.toFixed(1)} km
              </strong>
            </span>
            <span className="text-slate-500">
              Environ {durationMinutes} min
            </span>
          </>
        ) : (
          <span className="text-slate-500">
            Saisissez les deux adresses pour afficher l’itinéraire.
          </span>
        )}
      </div>
      {routeError && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {routeError}
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-[1.1fr_0.9fr]">
        <div>
          <label
            htmlFor="proposed-price"
            className="mb-1.5 block text-sm font-semibold text-slate-800"
          >
            Votre prix proposé
          </label>
          <div className="relative">
            <Input
              id="proposed-price"
              required
              min={fareFloor}
              step={500}
              type="number"
              value={price}
              onChange={event => setPrice(event.target.value)}
              className="pr-12 font-bold"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              Ar
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Indicatif : {ratePerKm.toLocaleString("fr-FR")} Ar/km · minimum{" "}
            {formatPrice(fareFloor)}. Modifiable à partir du minimum.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="passenger-count"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              Passagers
            </label>
            <Input
              id="passenger-count"
              required
              min={1}
              max={8}
              type="number"
              value={passengers}
              onChange={event => setPassengers(event.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="luggage-count"
              className="mb-1.5 block text-sm font-semibold text-slate-800"
            >
              Bagages
            </label>
            <Input
              id="luggage-count"
              required
              min={0}
              max={20}
              type="number"
              value={luggage}
              onChange={event => setLuggage(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-semibold text-slate-800">
          Paiement direct au conducteur
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setPayment("cash")}
            aria-pressed={payment === "cash"}
            className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${payment === "cash" ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white"}`}
          >
            <WalletCards className="size-5 text-emerald-700" />
            <span>
              <span className="block text-sm font-semibold">Espèces</span>
              <span className="block text-xs text-slate-500">
                À régler au chauffeur à la fin
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPayment("mobile_money")}
            aria-pressed={payment === "mobile_money"}
            className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${payment === "mobile_money" ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white"}`}
          >
            <Smartphone className="size-5 text-emerald-700" />
            <span>
              <span className="block text-sm font-semibold">Mobile Money</span>
              <span className="block text-xs text-slate-500">
                MVola, Orange Money ou Airtel
              </span>
            </span>
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${notice.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}
          role="status"
        >
          {notice.text}
        </div>
      )}
      <div className="mt-5 flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
        <p className="max-w-md text-xs leading-5 text-slate-500">
          Le tarif indicatif suit le barème MadaMove. La négociation reste
          ouverte jusqu’à l’accord du passager et du conducteur.
        </p>
        <Button
          type="submit"
          disabled={submitting || routeLoading}
          className="h-11 w-full shrink-0 bg-emerald-700 text-white hover:bg-emerald-800 sm:w-auto"
        >
          {submitting ? "Publication…" : "Lancer la demande"}
        </Button>
      </div>
    </form>
  );
}
