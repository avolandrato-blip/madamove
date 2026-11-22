import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { CarFront, CheckCircle2, Clock3, LogOut, MapPin, ShieldCheck, Smartphone, UserRound, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RideRequestFormMap } from "@/components/RideRequestFormMap";
import { DriverDashboard as DemoDriverDashboard } from "@/components/DriverDashboard";
import { PassengerDashboard as DemoPassengerDashboard } from "@/components/PassengerDashboard";
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
  { value: "taxi", label: "Taxi", description: "Course urbaine", price: "Tarif calculé selon le trajet" },
  { value: "vtc", label: "VTC", description: "Véhicule réservé", price: "Tarif calculé selon le trajet" },
  { value: "moto", label: "Moto", description: "Rapide et léger", price: "Tarif calculé selon le trajet" },
];

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} Ar`;
}

function formatStatus(status: string) {
  return ({ pending: "En attente d’offres", accepted: "Course confirmée", in_progress: "En cours", completed: "Terminée", cancelled: "Annulée" } as Record<string, string>)[status] ?? status;
}

function AuthPanel({ initialMode, onClose }: { initialMode: "login" | "signup"; onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
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
        const emailRedirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString();
        const { data, error } = await supabase.auth.signUp({ email: form.email.trim(), password: form.password, options: { emailRedirectTo, data: { role: form.role, full_name: form.fullName.trim(), phone: form.phone.trim() || null } } });
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
      <button type="button" onClick={onClose} className="mb-5 text-sm font-medium text-emerald-800 hover:text-emerald-950">← Retour à l’aperçu</button>
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

  return <main className="min-h-screen bg-[#f6f8f7] px-4 py-8 text-slate-950 sm:px-8"><div className="mx-auto max-w-6xl"><header className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">MadaMove V1</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Bonjour {profile?.full_name || user.email}</h1><p className="mt-2 text-sm text-slate-500">Demandez un taxi, un VTC ou un taxi-moto.</p></div><Button variant="outline" onClick={onLogout} className="gap-2 self-start"><LogOut className="size-4" /> Se déconnecter</Button></header><section className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]"><RideRequestFormMap userId={user.id} onCreated={ride => setRides(current => [ride, ...current].slice(0, 5))} /><aside className="space-y-5"><div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl"><div className="flex items-center gap-3"><UserRound className="size-5 text-emerald-300" /><p className="text-sm font-medium text-emerald-300">Compte passager</p></div><p className="mt-5 text-sm text-slate-300">{user.email}</p><div className="mt-5 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="size-4 text-emerald-300" /> Profil sécurisé par Supabase</div></div><div className="rounded-3xl border border-slate-200 bg-white p-6"><h2 className="font-semibold">Vos dernières demandes</h2>{loadingRides ? <p className="mt-5 text-sm text-slate-500">Chargement…</p> : rides.length === 0 ? <p className="mt-5 text-sm leading-6 text-slate-500">Aucune course pour le moment. Votre première demande apparaîtra ici.</p> : <div className="mt-5 space-y-4">{rides.map(ride => <div key={ride.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{ride.pickup_address} → {ride.destination_address}</p><span className="shrink-0 text-xs font-medium text-emerald-700">{formatPrice(ride.proposed_price)}</span></div><div className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Clock3 className="size-3.5" /> {formatStatus(ride.status)}</div></div>)}</div>}</div></aside></section></div></main>;
}

function PublicPreview({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const services = [
    { icon: CarFront, name: "Taxi", description: "Pour vos trajets en ville.", price: "10 000 Ar" },
    { icon: CarFront, name: "VTC", description: "Un véhicule réservé pour votre trajet.", price: "15 000 Ar" },
    { icon: MapPin, name: "Taxi-moto", description: "Une option rapide pour circuler.", price: "6 000 Ar" },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f8f7] text-slate-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <a href="#accueil" className="flex items-center gap-3" aria-label="MadaMove, accueil">
          <span className="grid size-10 place-items-center rounded-2xl bg-emerald-700 text-white"><CarFront className="size-5" /></span>
          <span><span className="block text-lg font-bold tracking-tight">MadaMove</span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Le transport local</span></span>
        </a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Navigation principale">
          <a className="hover:text-emerald-800" href="#services">Nos services</a>
          <a className="hover:text-emerald-800" href="#fonctionnement">Comment ça marche</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={onLogin} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white">Connexion</button>
          <Button type="button" onClick={onSignup} className="bg-emerald-700 text-white hover:bg-emerald-800">Créer un compte</Button>
        </div>
      </header>

      <section id="accueil" className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-14 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800"><span className="size-2 rounded-full bg-emerald-500" /> Madagascar, vos trajets à votre façon</p>
          <h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl">Voyagez simplement. <span className="text-emerald-700">Choisissez votre trajet.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Découvrez MadaMove avant de vous inscrire : comparez Taxi, VTC et taxi-moto, puis créez un compte seulement si vous souhaitez réserver.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={onSignup} className="h-12 bg-emerald-700 px-6 text-white hover:bg-emerald-800">Réserver une course</Button>
            <a href="#services" className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 hover:border-emerald-300">Voir les services et tarifs</a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500"><span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-700" /> Aperçu accessible sans compte</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-700" /> Plusieurs options de transport</span></div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-4 rounded-[2.5rem] bg-emerald-100/70 blur-2xl" />
          <article className="relative rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10 sm:p-6" aria-label="Aperçu d’une réservation MadaMove">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Aperçu client</p><h2 className="mt-1 text-lg font-semibold">Votre trajet en un coup d’œil</h2></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Exemple</span></div>
            <div className="mt-5 overflow-hidden rounded-2xl bg-[#e9f2ec] p-5 sm:p-7">
              <div className="relative mx-auto flex min-h-48 max-w-sm items-center justify-center overflow-hidden rounded-xl border border-white/80 bg-[#f8fbf8]">
                <svg viewBox="0 0 360 190" className="absolute inset-0 size-full" role="img" aria-label="Illustration stylisée d’un itinéraire entre Analakely et Ivato">
                  <path d="M-10 35 C50 5 80 75 130 50 S210 20 240 65 S300 105 370 45 M-10 145 C50 105 90 175 145 130 S215 95 245 130 S315 175 370 115" fill="none" stroke="#dbe7de" strokeWidth="12" strokeLinecap="round" />
                  <path d="M65 135 C102 105 116 120 148 95 S190 63 225 78 S268 96 298 52" fill="none" stroke="#047857" strokeWidth="5" strokeDasharray="8 8" strokeLinecap="round" />
                  <circle cx="65" cy="135" r="10" fill="#047857" stroke="white" strokeWidth="5" />
                  <circle cx="298" cy="52" r="10" fill="#0f172a" stroke="white" strokeWidth="5" />
                </svg>
                <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium shadow-sm">Antananarivo</div>
                <div className="absolute right-3 top-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium shadow-sm">Ivato</div>
                <div className="absolute bottom-3 right-3 rounded-full bg-white p-2 text-emerald-700 shadow-sm"><MapPin className="size-4" /></div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Départ</p><p className="mt-1 truncate text-sm font-semibold">Analakely</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Arrivée</p><p className="mt-1 truncate text-sm font-semibold">Aéroport d’Ivato</p></div>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">Illustration de démonstration : aucune course n’est créée depuis cet aperçu.</p>
          </article>
        </div>
      </section>

      <section id="services" className="border-y border-slate-200 bg-white px-4 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Choisissez votre option</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Des trajets qui vous ressemblent</h2></div><p className="max-w-md text-sm leading-6 text-slate-500">Les tarifs indiqués sont des minimums. Le montant final dépend du trajet et s’affiche avant la demande.</p></div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {services.map(({ icon: Icon, name, description, price }) => <article key={name} className="rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"><div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Icon className="size-5" /></span><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Minimum</span></div><h3 className="mt-4 text-lg font-semibold">{name}</h3><p className="mt-1 text-sm text-slate-500">{description}</p><p className="mt-5 text-2xl font-bold tracking-tight text-emerald-800">{price}</p></article>)}
          </div>
        </div>
      </section>

      <section id="fonctionnement" className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-8 sm:py-16 md:grid-cols-[0.8fr_1.2fr]">
        <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Simple et transparent</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Comment ça marche</h2><p className="mt-3 text-sm leading-6 text-slate-600">Parcourez l’aperçu librement. Un compte sera demandé au moment de publier une demande ou d’accéder à votre espace.</p></div>
        <div className="grid gap-3 sm:grid-cols-3">{[{ n: "01", title: "Choisissez", text: "Taxi, VTC ou taxi-moto." }, { n: "02", title: "Préparez", text: "Indiquez départ et arrivée." }, { n: "03", title: "Confirmez", text: "Créez un compte pour réserver." }].map(step => <article key={step.n} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold tracking-[0.16em] text-emerald-700">{step.n}</p><h3 className="mt-3 font-semibold">{step.title}</h3><p className="mt-1 text-sm leading-5 text-slate-500">{step.text}</p></article>)}</div>
      </section>

      <footer className="border-t border-slate-200 px-4 py-6 text-center text-xs text-slate-500 sm:px-8">MadaMove · Aperçu libre, inscription uniquement pour réserver ou accéder à votre compte.</footer>
    </main>
  );
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

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
  if (!session && authOpen) return <main className="min-h-screen bg-[#f6f8f7] px-4 py-8 text-slate-950"><AuthPanel initialMode={authMode} onClose={() => setAuthOpen(false)} /></main>;
  if (!session) return <PublicPreview onLogin={() => { setAuthMode("login"); setAuthOpen(true); }} onSignup={() => { setAuthMode("signup"); setAuthOpen(true); }} />;
  if (profile?.role === "driver") return <DemoDriverDashboard userId={session.user.id} email={session.user.email} onLogout={() => supabase.auth.signOut()} />;
  return <DemoPassengerDashboard userId={session.user.id} email={session.user.email} profile={profile} onLogout={() => supabase.auth.signOut()} />;
}
