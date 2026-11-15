import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, LogOut, MapPin, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RideRequestFormMap } from "@/components/RideRequestFormMap";
import { supabase } from "@/lib/supabase";

type Role = "passenger" | "driver";
type Profile = { role: Role; full_name: string; phone: string | null };
type ServiceType = "taxi" | "vtc" | "moto";
type Ride = { id: string; service_type: ServiceType; pickup_address: string; destination_address: string; proposed_price: number; payment_method: "cash" | "mobile_money"; passenger_count: number; luggage_count: number; distance_km: number | null; estimated_duration_minutes: number | null; selected_driver_id: string | null; final_price: number | null; status: string; created_at: string };
type Offer = { id: string; ride_request_id: string; driver_id: string; proposed_price: number; status: string; created_at: string };

const formatPrice = (value: number) => `${new Intl.NumberFormat("fr-FR").format(value)} Ar`;
const statusLabels: Record<string, string> = { pending: "En attente d’offres", accepted: "Conducteur sélectionné", in_progress: "Course en cours", completed: "Course terminée", cancelled: "Annulée" };

export function PassengerDashboard({ userId, email, profile, onLogout }: { userId: string; email?: string; profile: Profile | null; onLogout: () => void }) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [offersByRide, setOffersByRide] = useState<Record<string, Offer[]>>({});
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadRidesAndOffers = useCallback(async () => {
    const { data: rideData } = await supabase.from("ride_requests").select("*").eq("passenger_id", userId).order("created_at", { ascending: false }).limit(10);
    const nextRides = (rideData as Ride[]) ?? [];
    setRides(nextRides);
    if (nextRides.length) {
      const { data: offerData } = await supabase.from("ride_offers").select("*").in("ride_request_id", nextRides.map(ride => ride.id)).order("created_at", { ascending: true });
      const grouped = ((offerData as Offer[]) ?? []).reduce<Record<string, Offer[]>>((acc, offer) => { acc[offer.ride_request_id] = [...(acc[offer.ride_request_id] ?? []), offer]; return acc; }, {});
      setOffersByRide(grouped);
    } else setOffersByRide({});
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadRidesAndOffers();
    const channel = supabase.channel(`passenger-dashboard-${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "ride_requests", filter: `passenger_id=eq.${userId}` }, loadRidesAndOffers).on("postgres_changes", { event: "*", schema: "public", table: "ride_offers" }, loadRidesAndOffers).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, loadRidesAndOffers]);

  async function selectOffer(ride: Ride, offer: Offer) {
    setSelecting(offer.id);
    setNotice(null);
    const { error: rideError } = await supabase.from("ride_requests").update({ selected_driver_id: offer.driver_id, final_price: offer.proposed_price, status: "accepted", accepted_at: new Date().toISOString() }).eq("id", ride.id).eq("passenger_id", userId);
    if (rideError) { setNotice({ type: "error", text: rideError.message }); setSelecting(null); return; }
    const { error: offersError } = await supabase.from("ride_offers").update({ status: "rejected" }).eq("ride_request_id", ride.id).neq("id", offer.id);
    if (!offersError) await supabase.from("ride_offers").update({ status: "accepted" }).eq("id", offer.id);
    setNotice({ type: "success", text: "Conducteur sélectionné. Les autres offres ont été fermées." });
    await loadRidesAndOffers();
    setSelecting(null);
  }

  return <main className="min-h-screen bg-[#f6f8f7] px-4 py-8 text-slate-950 sm:px-8"><div className="mx-auto max-w-6xl"><header className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">MadaMove V1</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Bonjour {profile?.full_name || email}</h1><p className="mt-2 text-sm text-slate-500">Demandez un taxi, un VTC ou un taxi-moto.</p></div><Button variant="outline" onClick={onLogout} className="gap-2 self-start"><LogOut className="size-4" /> Se déconnecter</Button></header><section className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]"><RideRequestFormMap userId={userId} onCreated={ride => { setRides(current => [ride as Ride, ...current].slice(0, 10)); loadRidesAndOffers(); }} /><aside className="space-y-5"><div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl"><div className="flex items-center gap-3"><UserRound className="size-5 text-emerald-300" /><p className="text-sm font-medium text-emerald-300">Compte passager</p></div><p className="mt-5 text-sm text-slate-300">{email}</p><div className="mt-5 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="size-4 text-emerald-300" /> Flux sécurisé par Supabase Realtime</div></div><div className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="font-semibold">Vos demandes et offres</h2>{notice && <div className={`mt-4 rounded-xl px-3 py-3 text-sm ${notice.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{notice.text}</div>}{loading ? <p className="mt-5 text-sm text-slate-500">Chargement…</p> : rides.length === 0 ? <p className="mt-5 text-sm leading-6 text-slate-500">Aucune course pour le moment. Publiez votre première demande à gauche.</p> : <div className="mt-5 space-y-6">{rides.map(ride => <div key={ride.id} className="border-b border-slate-100 pb-5 last:border-0 last:pb-0"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium">{ride.pickup_address} → {ride.destination_address}</p><div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Clock3 className="size-3.5" /> {statusLabels[ride.status] ?? ride.status}</div></div><span className="shrink-0 text-xs font-semibold text-emerald-700">{formatPrice(ride.final_price ?? ride.proposed_price)}</span></div>{ride.status === "pending" && (offersByRide[ride.id] ?? []).length > 0 && <div className="mt-4 space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Offres reçues</p>{offersByRide[ride.id].map(offer => <div key={offer.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{formatPrice(offer.proposed_price)}</span><span className="text-xs text-slate-500">{offer.proposed_price === ride.proposed_price ? "Accepte votre prix" : "Contre-offre"}</span></div><Button type="button" disabled={selecting === offer.id} onClick={() => selectOffer(ride, offer)} className="mt-3 h-9 w-full bg-emerald-700 text-xs text-white hover:bg-emerald-800">{selecting === offer.id ? "Confirmation…" : "Choisir ce conducteur"}</Button></div>)}</div>}{ride.status === "pending" && (offersByRide[ride.id] ?? []).length === 0 && <p className="mt-4 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">En attente des réponses des conducteurs…</p>}{ride.status === "accepted" && <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-3 text-xs text-emerald-800"><CheckCircle2 className="size-4" /> Course confirmée au prix de {formatPrice(ride.final_price ?? ride.proposed_price)}.</div>}</div>)}</div>}</div></aside></section><div className="mt-8 flex items-center gap-2 text-xs text-slate-500"><MapPin className="size-4 text-emerald-700" /> Les nouvelles offres apparaissent automatiquement sans recharger la page.</div></div></main>;
}
