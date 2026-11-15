import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { MapPin, Smartphone, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapView } from "@/components/Map";
import { supabase } from "@/lib/supabase";

type ServiceType = "taxi" | "vtc" | "moto";
type PaymentMethod = "cash" | "mobile_money";
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

const serviceOptions: Array<{ value: ServiceType; label: string; description: string; rate: number }> = [
  { value: "taxi", label: "Taxi", description: "Course urbaine", rate: 2500 },
  { value: "vtc", label: "VTC", description: "Véhicule réservé", rate: 2500 },
  { value: "moto", label: "Taxi-moto", description: "Rapide et léger", rate: 1500 },
];

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} Ar`;
}

export function RideRequestFormMap({ userId, onCreated }: { userId: string; onCreated: (ride: RideRequest) => void }) {
  const [serviceType, setServiceType] = useState<ServiceType>("taxi");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [price, setPrice] = useState("10000");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [passengers, setPassengers] = useState("1");
  const [luggage, setLuggage] = useState("0");
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const renderer = useRef<google.maps.DirectionsRenderer | null>(null);

  useEffect(() => {
    if (!map) return;
    renderer.current = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: { strokeColor: "#047857", strokeOpacity: 0.9, strokeWeight: 5 },
    });
    return () => {
      renderer.current?.setMap(null);
      renderer.current = null;
    };
  }, [map]);

  useEffect(() => {
    if (!map || !renderer.current || !pickup.trim() || !destination.trim()) {
      setDistanceKm(null);
      setDurationMinutes(null);
      setRouteError("");
      return;
    }

    const timeout = window.setTimeout(() => {
      setRouteLoading(true);
      setRouteError("");
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        { origin: pickup.trim(), destination: destination.trim(), travelMode: google.maps.TravelMode.DRIVING },
        (result, status) => {
          setRouteLoading(false);
          if (status !== "OK" || !result?.routes[0]?.legs[0]) {
            renderer.current?.setMap(null);
            renderer.current?.setMap(map);
            setDistanceKm(null);
            setDurationMinutes(null);
            setRouteError("Itinéraire introuvable. Vérifiez les deux adresses.");
            return;
          }
          renderer.current?.setDirections(result);
          const leg = result.routes[0].legs[0];
          const nextDistanceKm = (leg.distance?.value ?? 0) / 1000;
          const nextDurationMinutes = Math.max(1, Math.round((leg.duration?.value ?? 0) / 60));
          setDistanceKm(nextDistanceKm);
          setDurationMinutes(nextDurationMinutes);
          const rate = serviceOptions.find(option => option.value === serviceType)?.rate ?? 2500;
          const suggestedPrice = Math.max(2500, Math.round((nextDistanceKm * rate) / 500) * 500);
          setPrice(String(suggestedPrice));
        },
      );
    }, 650);

    return () => window.clearTimeout(timeout);
  }, [map, pickup, destination, serviceType]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    if (!distanceKm) {
      setNotice({ type: "error", text: "Renseignez deux adresses valides pour calculer l’itinéraire." });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        passenger_id: userId,
        service_type: serviceType,
        pickup_address: pickup.trim(),
        destination_address: destination.trim(),
        proposed_price: Number(price),
        payment_method: payment,
        passenger_count: Number(passengers),
        luggage_count: Number(luggage),
        distance_km: Number(distanceKm.toFixed(2)),
        estimated_duration_minutes: durationMinutes,
      };
      const { data, error } = await supabase.from("ride_requests").insert(payload).select("*").single();
      if (error) throw error;
      onCreated(data as RideRequest);
      setNotice({ type: "success", text: "Demande publiée. Les conducteurs disponibles peuvent maintenant répondre." });
      setPickup("");
      setDestination("");
      setDistanceKm(null);
      setDurationMinutes(null);
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Impossible de publier la demande." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Nouvelle demande</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Où souhaitez-vous aller ?</h2></div><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><MapPin className="size-5" /></div></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">{serviceOptions.map(option => <button type="button" key={option.value} onClick={() => setServiceType(option.value)} className={`rounded-2xl border p-4 text-left transition ${serviceType === option.value ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600" : "border-slate-200 hover:border-slate-300"}`}><p className="font-semibold">{option.label}</p><p className="mt-1 text-xs text-slate-500">{option.description}</p><p className="mt-3 text-xs font-medium text-emerald-700">{formatPrice(option.rate)} / km</p></button>)}</div>
      <div className="mt-7 grid gap-4 md:grid-cols-2"><div><label className="mb-1.5 block text-sm font-medium">Point de départ</label><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-600" /><Input required value={pickup} onChange={event => setPickup(event.target.value)} placeholder="Ex. Analakely" className="pl-9" /></div></div><div><label className="mb-1.5 block text-sm font-medium">Point d’arrivée</label><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input required value={destination} onChange={event => setDestination(event.target.value)} placeholder="Ex. Aéroport d’Ivato" className="pl-9" /></div></div></div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200"><MapView className="h-[300px] sm:h-[360px]" initialCenter={{ lat: -18.8792, lng: 47.5079 }} initialZoom={12} onMapReady={setMap} /></div>
      <div className="mt-3 flex min-h-10 items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm">{routeLoading ? <span className="text-slate-500">Calcul de l’itinéraire…</span> : distanceKm ? <><span className="font-medium text-slate-700">Distance : <strong className="text-emerald-700">{distanceKm.toFixed(1)} km</strong></span><span className="text-slate-500">Durée estimée : {durationMinutes} min</span></> : <span className="text-slate-500">Saisissez les deux adresses pour afficher le trajet.</span>}</div>
      {routeError && <p className="mt-3 text-sm text-red-700">{routeError}</p>}
      <div className="mt-6 grid gap-4 sm:grid-cols-3"><div><label className="mb-1.5 block text-sm font-medium">Prix proposé</label><div className="relative"><Input required min={1} type="number" value={price} onChange={event => setPrice(event.target.value)} className="pr-12" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Ar</span></div><p className="mt-1 text-xs text-slate-400">Calculé automatiquement, modifiable</p></div><div><label className="mb-1.5 block text-sm font-medium">Passagers</label><Input required min={1} max={8} type="number" value={passengers} onChange={event => setPassengers(event.target.value)} /></div><div><label className="mb-1.5 block text-sm font-medium">Bagages</label><Input required min={0} max={20} type="number" value={luggage} onChange={event => setLuggage(event.target.value)} /></div></div>
      <div className="mt-6"><label className="mb-2 block text-sm font-medium">Mode de paiement</label><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setPayment("cash")} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${payment === "cash" ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}><WalletCards className="size-5 text-emerald-700" /><span><span className="block text-sm font-medium">Espèces</span><span className="block text-xs text-slate-500">Paiement à la fin de la course</span></span></button><button type="button" onClick={() => setPayment("mobile_money")} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${payment === "mobile_money" ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}><Smartphone className="size-5 text-emerald-700" /><span><span className="block text-sm font-medium">Mobile Money</span><span className="block text-xs text-slate-500">MVola, Orange Money ou Airtel Money</span></span></button></div></div>
      {notice && <div className={`mt-5 rounded-xl px-4 py-3 text-sm ${notice.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{notice.text}</div>}
      <div className="mt-7 flex flex-col items-start justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center"><p className="text-xs leading-5 text-slate-500">Le tarif est basé sur la distance routière et le barème du service sélectionné. Vous pouvez proposer un autre prix.</p><Button type="submit" disabled={submitting || routeLoading} className="h-11 w-full shrink-0 bg-emerald-700 text-white hover:bg-emerald-800 sm:w-auto">{submitting ? "Publication…" : "Publier la demande"}</Button></div>
    </form>
  );
}
