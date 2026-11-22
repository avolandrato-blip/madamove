import { useEffect, useState } from "react";
import { CarFront, CheckCircle2, Clock3, LogOut, MapPin, Radio, Send, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type ServiceType = "taxi" | "vtc" | "moto";
type Ride = { id: string; service_type: ServiceType; pickup_address: string; destination_address: string; proposed_price: number; passenger_count: number; luggage_count: number; distance_km: number | null; estimated_duration_minutes: number | null; status: string; created_at: string };
type DriverDashboardProps = { userId: string; email?: string; onLogout: () => void };

const serviceLabels: Record<ServiceType, string> = { taxi: "Voiture", vtc: "Voiture", moto: "Moto" };
const formatPrice = (value: number) => `${new Intl.NumberFormat("fr-FR").format(value)} Ar`;

export function DriverDashboard({ userId, email, onLogout }: DriverDashboardProps) {
  const [available, setAvailable] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadDashboard() {
    const { data: profile } = await supabase.from("driver_profiles").select("is_available").eq("id", userId).maybeSingle();
    setAvailable(Boolean(profile?.is_available));
    if (profile?.is_available) {
      const { data } = await supabase.from("ride_requests").select("*").eq("status", "pending").order("created_at", { ascending: false });
      const nextRides = (data as Ride[]) ?? [];
      setRides(nextRides);
      setDrafts(current => Object.fromEntries(nextRides.map(ride => [ride.id, current[ride.id] ?? String(ride.proposed_price)])));
    } else {
      setRides([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
    const channel = supabase.channel(`driver-dashboard-${userId}`).on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, loadDashboard).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function toggleAvailability() {
    setUpdatingAvailability(true);
    const next = !available;
    const { error } = await supabase.from("driver_profiles").upsert({ id: userId, is_available: next, updated_at: new Date().toISOString() });
    if (error) setNotice({ type: "error", text: error.message });
    else { setAvailable(next); setNotice({ type: "success", text: next ? "Vous êtes maintenant disponible." : "Vous êtes maintenant indisponible." }); await loadDashboard(); }
    setUpdatingAvailability(false);
  }

  async function sendOffer(ride: Ride) {
    setSending(ride.id);
    setNotice(null);
    const amount = Number(drafts[ride.id]);
    if (!amount || amount < 1) { setNotice({ type: "error", text: "Indiquez un montant valide." }); setSending(null); return; }
    const { error } = await supabase.from("ride_offers").insert({ ride_request_id: ride.id, driver_id: userId, proposed_price: amount, status: "pending" });
    if (error) setNotice({ type: "error", text: error.code === "23505" ? "Vous avez déjà répondu à cette demande." : error.message });
    else setNotice({ type: "success", text: "Votre offre a été envoyée au passager." });
    setSending(null);
  }

  return <main className="min-h-screen bg-[#f6f8f7] px-4 py-8 text-slate-950 sm:px-8"><div className="mx-auto max-w-6xl"><header className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">MadaMove V1</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Espace conducteur</h1><p className="mt-2 text-sm text-slate-500">{email}</p></div><Button variant="outline" onClick={onLogout} className="gap-2 self-start"><LogOut className="size-4" /> Se déconnecter</Button></header>
    <section className="mt-8 rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-center"><div><div className="flex items-center gap-3"><CarFront className="size-6 text-emerald-300" /><p className="font-semibold">Réception des demandes</p></div><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Activez votre disponibilité pour recevoir les demandes en voiture ou à moto proches de votre zone.</p></div><button type="button" onClick={toggleAvailability} disabled={updatingAvailability} className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-left transition ${available ? "bg-emerald-400 text-slate-950" : "bg-white/10 text-white hover:bg-white/15"}`}>{available ? <ToggleRight className="size-7" /> : <ToggleLeft className="size-7 text-slate-400" />}<span><span className="block text-sm font-semibold">{available ? "Disponible" : "Indisponible"}</span><span className="block text-xs opacity-70">{available ? "Vous recevez les demandes" : "Activer pour commencer"}</span></span></button></div></section>
    {notice && <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${notice.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{notice.text}</div>}
    <section className="mt-8"><div className="flex items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Demandes disponibles</p><h2 className="mt-2 text-2xl font-semibold">Répondez aux passagers</h2></div><span className="rounded-full bg-white px-3 py-1.5 text-sm text-slate-500 shadow-sm">{rides.length} demande{rides.length > 1 ? "s" : ""}</span></div>{!available ? <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><Radio className="mx-auto size-8 text-slate-300" /><p className="mt-4 font-medium">Vous êtes indisponible</p><p className="mt-2 text-sm text-slate-500">Activez le bouton ci-dessus pour afficher les demandes.</p></div> : loading ? <p className="mt-5 text-sm text-slate-500">Chargement des demandes…</p> : rides.length === 0 ? <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center"><CheckCircle2 className="mx-auto size-8 text-emerald-600" /><p className="mt-4 font-medium">Aucune demande pour le moment</p><p className="mt-2 text-sm text-slate-500">Gardez votre disponibilité activée, les nouvelles demandes apparaîtront automatiquement.</p></div> : <div className="mt-5 grid gap-5 lg:grid-cols-2">{rides.map(ride => <article key={ride.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{serviceLabels[ride.service_type]}</span><span className="text-xs text-slate-400">{ride.distance_km ? `${Number(ride.distance_km).toFixed(1)} km` : "Distance à confirmer"}</span></div><div className="mt-5 space-y-3"><div className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-emerald-600" /><div><p className="text-xs text-slate-400">Départ</p><p className="text-sm font-medium">{ride.pickup_address}</p></div></div><div className="ml-2 h-3 border-l border-dashed border-slate-300" /><div className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" /><div><p className="text-xs text-slate-400">Arrivée</p><p className="text-sm font-medium">{ride.destination_address}</p></div></div></div><div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center text-xs"><span><strong className="block text-sm text-slate-900">{ride.passenger_count}</strong>passager{ride.passenger_count > 1 ? "s" : ""}</span><span><strong className="block text-sm text-slate-900">{ride.luggage_count}</strong>bagage{ride.luggage_count > 1 ? "s" : ""}</span><span><strong className="block text-sm text-emerald-700">{formatPrice(ride.proposed_price)}</strong>prix proposé</span></div><div className="mt-5 flex items-end gap-3"><div className="flex-1"><label className="mb-1.5 block text-xs font-medium text-slate-500">Votre prix</label><div className="relative"><Input type="number" min={1} value={drafts[ride.id] ?? ride.proposed_price} onChange={event => setDrafts(current => ({ ...current, [ride.id]: event.target.value }))} className="pr-12" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Ar</span></div></div><Button type="button" disabled={sending === ride.id} onClick={() => sendOffer(ride)} className="h-9 gap-2 bg-emerald-700 text-white hover:bg-emerald-800"><Send className="size-3.5" />{sending === ride.id ? "…" : Number(drafts[ride.id]) === ride.proposed_price ? "Accepter" : "Contre-offre"}</Button></div><div className="mt-4 flex items-center gap-2 text-xs text-slate-400"><Clock3 className="size-3.5" /> {ride.estimated_duration_minutes ? `${ride.estimated_duration_minutes} min estimées` : "Nouvelle demande"}</div></article>)}</div>}</section>
  </div></main>;
}
