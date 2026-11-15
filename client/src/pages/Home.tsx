import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { CarFront, CheckCircle2, Clock3, LogOut, MapPin, ShieldCheck, Smartphone, UserRound, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type Role = "passenger" | "driver";
type ServiceType = "taxi" | "vtc" | "moto";
type PaymentMethod = "cash" | "mobile_money";
type Profile = { role: Role; full_name: string; phone: string | null };
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
};

type AuthForm = { fullName: string; phone: string; email: string; password: string; role: Role };
const emptyAuthForm: AuthForm = { fullName: "", phone: "", email: "", password: "", role: "passenger" };

const serviceOptions: Array<{ value: ServiceType; label: string; description: string; price: string }> = [
  { value: "taxi", label: "Taxi", description: "Course urbaine", price: "2 500 Ar/km" },
  { value: "vtc", label: "VTC", description: "Véhicule réservé", price: "2 500 Ar/km" },
  { value: "moto", label: "Taxi-moto", description: "Rapide et léger", price: "1 500 Ar/km" },
];

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} Ar`;
}

function formatStatus(status: string) {
  return ({ pending: "En attente d’offres", accepted: "Course confirmée", in_progress: "En cours", completed: "Terminée", cancelled: "Annulée" } as Record<string, string>)[status] ?? status;
}

function AuthPanel() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState<AuthForm>(emptyAuthForm);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const update = (field: keyof AuthForm, value: string) => setForm(current => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: form.email.trim(), password: form.password, options: { data: { role: form.role, full_name: form.fullName.trim(), phone: form.phone.trim() || null } } });
        if (error) throw error;
        if (!data.session) {
          setNotice({ type: "success", text: "Compte créé. Consultez votre boîte email pour confirmer votre adresse." });
          setMode("login");
          setForm(current => ({ ...current, password: "" }));
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email.trim(), password: form.password });
        if (error) throw error;
      }
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Impossible de terminer l’opération." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
      <div className="flex rounded-xl bg-slate-100 p-1">
        {(["login", "signup"] as const).map(value => <button type="button" key={value} onClick={() => { setMode(value); setNotice(null); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${mode === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>{value === "login" ? "Se connecter" : "Créer un compte"}</button>)}
      </div>
      <div className="mt-7"><h2 className="text-2xl font-semibold">{mode === "login" ? "Bienvenue" : "Rejoindre MadaMove"}</h2><p className="mt-2 text-sm text-slate-500">{mode === "login" ? "Connectez-vous pour commander une course." : "Créez un compte passager ou conducteur."}</p></div>
      <form onSubmit={submit} className="mt-7 space-y-4">
        {mode === "signup" && <>
          <div><label className="mb-1.5 block text-sm font-medium">Nom complet</label><Input required value={form.fullName} onChange={event => update("fullName", event.target.value)} placeholder="Ex. Rado Andriamihaja" /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Téléphone <span className="font-normal text-slate-400">(optionnel)</span></label><Input value={form.phone} onChange={event => update("phone", event.target.value)} placeholder="03X XX XXX XX" /></div>
          <div><label className="mb-2 block text-sm font-medium">Je suis</label><div className="grid grid-cols-2 gap-2">{(["passenger", "driver"] as Role[]).map(role => <button type="button" key={role} onClick={() => setForm(current => ({ ...current, role }))} className={`rounded-xl border px-3 py-3 text-left text-sm ${form.role === role ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-600"}`}><span className="font-medium">{role === "driver" ? "Conducteur" : "Passager"}</span><span className="mt-1 block text-xs text-slate-500">{role === "driver" ? "Je propose des courses" : "Je cherche une course"}</span></button>)}</div></div>
        </>}
        <div><label className="mb-1.5 block text-sm font-medium">Adresse email</label><Input required type="email" value={form.email} onChange={event => update("email", event.target.value)} placeholder="vous@exemple.com" /></div>
        <div><label className="mb-1.5 block text-sm font-medium">Mot de passe</label><Input required minLength={6} type="password" value={form.password} onChange={event => update("password", event.target.value)} placeholder="6 caractères minimum" /></div>
        {notice && <div className={`rounded-xl px-3 py-3 text-sm ${notice.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{notice.text}</div>}
        <Button type="submit" disabled={submitting} className="h-11 w-full bg-emerald-700 text-white hover:bg-emerald-800">{submitting ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : "Créer mon compte"}</Button>
      </form>
      <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-400"><ShieldCheck className="size-3.5" /> Authentification sécurisée par Supabase</p>
    </section>
  );
}

function RideRequestForm({ userId, onCreated }: { userId: string; onCreated: (ride: RideRequest) => void }) {
  const [serviceType, setServiceType] = useState<ServiceType>("taxi");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [price, setPrice] = useState("10000");
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [passengers, setPassengers] = useState("1");
  const [luggage, setLuggage] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    setSubmitting(true);
    const payload = {
      passenger_id: userId,
      service_type: serviceType,
      pickup_address: pickup.trim(),
      destination_address: destination.trim(),
      proposed_price: Number(price),
      payment_method: payment,
      passenger_count: Number(passengers),
      luggage_count: Number(luggage),
    };
    try {
      const { data, error } = await supabase.from("ride_requests").insert(payload).select("*").single();
      if (error) throw error;
      onCreated(data as RideRequest);
      setNotice({ type: "success", text: "Demande publiée. Les conducteurs disponibles peuvent maintenant répondre." });
      setPickup("");
      setDestination("");
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? error.message : "Impossible de publier la demande." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Nouvelle demande</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Où souhaitez-vous aller ?</h2></div><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700"><MapPin className="size-5" /></div></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">{serviceOptions.map(option => <button type="button" key={option.value} onClick={() => setServiceType(option.value)} className={`rounded-2xl border p-4 text-left transition ${serviceType === option.value ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600" : "border-slate-200 hover:border-slate-300"}`}><p className="font-semibold">{option.label}</p><p className="mt-1 text-xs text-slate-500">{option.description}</p><p className="mt-3 text-xs font-medium text-emerald-700">{option.price}</p></button>)}</div>
      <div className="mt-7 grid gap-4 md:grid-cols-2"><div><label className="mb-1.5 block text-sm font-medium">Point de départ</label><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-600" /><Input required value={pickup} onChange={event => setPickup(event.target.value)} placeholder="Ex. Analakely" className="pl-9" /></div></div><div><label className="mb-1.5 block text-sm font-medium">Point d’arrivée</label><div className="relative"><MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input required value={destination} onChange={event => setDestination(event.target.value)} placeholder="Ex. Aéroport d’Ivato" className="pl-9" /></div></div></div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3"><div><label className="mb-1.5 block text-sm font-medium">Prix proposé</label><div className="relative"><Input required min={1} type="number" value={price} onChange={event => setPrice(event.target.value)} className="pr-12" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">Ar</span></div></div><div><label className="mb-1.5 block text-sm font-medium">Passagers</label><Input required min={1} max={8} type="number" value={passengers} onChange={event => setPassengers(event.target.value)} /></div><div><label className="mb-1.5 block text-sm font-medium">Bagages</label><Input required min={0} max={20} type="number" value={luggage} onChange={event => setLuggage(event.target.value)} /></div></div>
      <div className="mt-6"><label className="mb-2 block text-sm font-medium">Mode de paiement</label><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setPayment("cash")} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${payment === "cash" ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}><WalletCards className="size-5 text-emerald-700" /><span><span className="block text-sm font-medium">Espèces</span><span className="block text-xs text-slate-500">Paiement à la fin de la course</span></span></button><button type="button" onClick={() => setPayment("mobile_money")} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${payment === "mobile_money" ? "border-emerald-600 bg-emerald-50" : "border-slate-200"}`}><Smartphone className="size-5 text-emerald-700" /><span><span className="block text-sm font-medium">Mobile Money</span><span className="block text-xs text-slate-500">MVola, Orange Money ou Airtel Money</span></span></button></div></div>
      {notice && <div className={`mt-5 rounded-xl px-4 py-3 text-sm ${notice.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{notice.text}</div>}
      <div className="mt-7 flex flex-col items-start justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center"><p className="text-xs leading-5 text-slate-500">Votre prix sera proposé aux conducteurs disponibles. Ils pourront l’accepter ou envoyer une contre-offre.</p><Button type="submit" disabled={submitting} className="h-11 w-full shrink-0 bg-emerald-700 text-white hover:bg-emerald-800 sm:w-auto">{submitting ? "Publication…" : "Publier la demande"}</Button></div>
    </form>
  );
}

function PassengerDashboard({ user, profile, onLogout }: { user: User; profile: Profile | null; onLogout: () => void }) {
  const [rides, setRides] = useState<RideRequest[]>([]);
  const [loadingRides, setLoadingRides] = useState(true);

  useEffect(() => {
    async function loadRides() {
      const { data } = await supabase.from("ride_requests").select("*").eq("passenger_id", user.id).order("created_at", { ascending: false }).limit(5);
      setRides((data as RideRequest[]) ?? []);
      setLoadingRides(false);
    }
    loadRides();
  }, [user.id]);

  return <main className="min-h-screen bg-[#f6f8f7] px-4 py-8 text-slate-950 sm:px-8"><div className="mx-auto max-w-6xl"><header className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">MadaMove V1</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Bonjour {profile?.full_name || user.email}</h1><p className="mt-2 text-sm text-slate-500">Demandez un taxi, un VTC ou un taxi-moto.</p></div><Button variant="outline" onClick={onLogout} className="gap-2 self-start"><LogOut className="size-4" /> Se déconnecter</Button></header><section className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]"><RideRequestForm userId={user.id} onCreated={ride => setRides(current => [ride, ...current].slice(0, 5))} /><aside className="space-y-5"><div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl"><div className="flex items-center gap-3"><UserRound className="size-5 text-emerald-300" /><p className="text-sm font-medium text-emerald-300">Compte passager</p></div><p className="mt-5 text-sm text-slate-300">{user.email}</p><div className="mt-5 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="size-4 text-emerald-300" /> Profil sécurisé par Supabase</div></div><div className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="font-semibold">Vos dernières demandes</h2>{loadingRides ? <p className="mt-5 text-sm text-slate-500">Chargement…</p> : rides.length === 0 ? <p className="mt-5 text-sm leading-6 text-slate-500">Aucune course pour le moment. Votre première demande apparaîtra ici.</p> : <div className="mt-5 space-y-4">{rides.map(ride => <div key={ride.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{ride.pickup_address} → {ride.destination_address}</p><span className="shrink-0 text-xs font-medium text-emerald-700">{formatPrice(ride.proposed_price)}</span></div><div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Clock3 className="size-3.5" /> {formatStatus(ride.status)}</div></div>)}</div>}</div></aside></section></div></main>;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadProfile(user: User) {
      const { data } = await supabase.from("profiles").select("role, full_name, phone").eq("id", user.id).maybeSingle();
      if (mounted) setProfile(data as Profile | null);
    }
    supabase.auth.getSession().then(async ({ data }) => { if (!mounted) return; setSession(data.session); if (data.session?.user) await loadProfile(data.session.user); setBusy(false); });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => { if (!mounted) return; setSession(nextSession); if (nextSession?.user) await loadProfile(nextSession.user); else setProfile(null); setBusy(false); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  if (busy) return <div className="grid min-h-screen place-items-center bg-[#f6f8f7] text-slate-600">Chargement de votre session…</div>;
  if (!session) return <main className="min-h-screen bg-[#f6f8f7] px-4 py-8 text-slate-950 sm:px-8"><div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]"><section className="hidden lg:block"><p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">MadaMove V1</p><h1 className="mt-5 max-w-xl text-6xl font-semibold leading-[0.95] tracking-[-0.05em]">Le transport local, simplement.</h1><p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">Connectez-vous pour commander un taxi, un VTC ou un taxi-moto au prix qui vous convient.</p><div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">{[{ icon: UserRound, label: "Passager" }, { icon: CarFront, label: "Conducteur" }, { icon: ShieldCheck, label: "Sécurisé" }].map(item => { const Icon = item.icon; return <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4"><Icon className="size-5 text-emerald-700" /><p className="mt-3 text-sm font-medium">{item.label}</p></div>; })}</div></section><AuthPanel /></div></main>;
  if (profile?.role === "driver") return <main className="grid min-h-screen place-items-center bg-[#f6f8f7] px-4"><div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><CarFront className="mx-auto size-10 text-emerald-700" /><h1 className="mt-5 text-2xl font-semibold">Espace conducteur</h1><p className="mt-3 text-sm leading-6 text-slate-600">Votre compte conducteur est connecté. La réception des demandes et la gestion des contre-offres seront ajoutées dans la prochaine étape.</p><Button className="mt-6 bg-emerald-700 text-white hover:bg-emerald-800" onClick={() => supabase.auth.signOut()}>Se déconnecter</Button></div></main>;
  return <PassengerDashboard user={session.user} profile={profile} onLogout={() => supabase.auth.signOut()} />;
}
