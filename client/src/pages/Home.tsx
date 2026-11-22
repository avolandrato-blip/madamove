import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Bike, CarFront, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RideRequestFormMap } from "@/components/RideRequestFormMap";
import { DriverDashboard } from "@/components/DriverDashboard";
import { PassengerDashboard } from "@/components/PassengerDashboard";
import { supabase } from "@/lib/supabase";

type Role = "passenger" | "driver";
type Profile = { role: Role; full_name: string; phone: string | null };
type AuthForm = { fullName: string; phone: string; email: string; password: string; role: Role };
const emptyAuthForm: AuthForm = { fullName: "", phone: "", email: "", password: "", role: "passenger" };

function AuthPanel({ initialMode, isRideRequest, onClose }: { initialMode: "login" | "signup"; isRideRequest: boolean; onClose: () => void }) {
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
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            emailRedirectTo,
            data: {
              role: isRideRequest ? "passenger" : form.role,
              full_name: form.fullName.trim(),
              phone: form.phone.trim() || null,
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice({ type: "success", text: "Compte créé. Confirmez votre adresse email puis connectez-vous pour continuer." });
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4 sm:items-center">
      <section className="my-4 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <button type="button" onClick={onClose} className="mb-5 text-sm font-medium text-emerald-800 hover:text-emerald-950">← {isRideRequest ? "Revenir à ma demande" : "Fermer"}</button>
        <div className="flex rounded-xl bg-slate-100 p-1">
          {(["login", "signup"] as const).map(value => <button type="button" key={value} onClick={() => { setMode(value); setNotice(null); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${mode === value ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>{value === "login" ? "Se connecter" : "Créer un compte"}</button>)}
        </div>
        <div className="mt-7"><h2 className="text-2xl font-semibold">{mode === "login" ? "Bienvenue" : "Rejoindre MadaMove"}</h2><p className="mt-2 text-sm text-slate-500">{isRideRequest ? "Connectez-vous ou créez un compte pour envoyer votre demande." : mode === "login" ? "Connectez-vous pour retrouver votre espace MadaMove." : "Créez un compte passager ou conducteur."}</p></div>
        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "signup" && <>
            <div><label className="mb-1.5 block text-sm font-medium">Nom complet</label><Input required value={form.fullName} onChange={event => update("fullName", event.target.value)} placeholder="Ex. Rado Andriamihaja" /></div>
            <div><label className="mb-1.5 block text-sm font-medium">Téléphone <span className="font-normal text-slate-400">(optionnel)</span></label><Input value={form.phone} onChange={event => update("phone", event.target.value)} placeholder="03X XX XXX XX" /></div>
            {!isRideRequest && <div><label className="mb-2 block text-sm font-medium">Je suis</label><div className="grid grid-cols-2 gap-2">{(["passenger", "driver"] as Role[]).map(role => <button type="button" key={role} onClick={() => setForm(current => ({ ...current, role }))} className={`rounded-xl border px-3 py-3 text-left text-sm ${form.role === role ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-600"}`}><span className="font-medium">{role === "driver" ? "Conducteur" : "Passager"}</span><span className="mt-1 block text-xs text-slate-500">{role === "driver" ? "Je propose des courses" : "Je cherche une course"}</span></button>)}</div></div>}
          </>}
          <div><label className="mb-1.5 block text-sm font-medium">Adresse email</label><Input required type="email" value={form.email} onChange={event => update("email", event.target.value)} placeholder="vous@exemple.com" /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Mot de passe</label><Input required minLength={6} type="password" value={form.password} onChange={event => update("password", event.target.value)} placeholder="6 caractères minimum" /></div>
          {notice && <div className={`rounded-xl px-3 py-3 text-sm ${notice.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{notice.text}</div>}
          <Button type="submit" disabled={submitting} className="h-11 w-full bg-emerald-700 text-white hover:bg-emerald-800">{submitting ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : "Créer mon compte"}</Button>
        </form>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-400"><ShieldCheck className="size-3.5" /> Authentification sécurisée par Supabase</p>
      </section>
    </div>
  );
}

function PublicHome({ userId, onLogin, onRequestAuth, onRequestCreated }: { userId: string | null; onLogin: () => void; onRequestAuth: () => void; onRequestCreated: () => void }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#f6f8f7] text-slate-950">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-8">
        <a href="#accueil" className="flex items-center gap-3" aria-label="MadaMove, accueil"><span className="grid size-10 place-items-center rounded-2xl bg-emerald-700 text-white"><CarFront className="size-5" /></span><span><span className="block text-lg font-bold tracking-tight">MadaMove</span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Le transport local</span></span></a>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Navigation principale"><a className="hover:text-emerald-800" href="#services">Nos services</a><a className="hover:text-emerald-800" href="#commander">Commander</a></nav>
        <button type="button" onClick={onLogin} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white">Connexion</button>
      </header>

      <section id="accueil" className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-14 lg:grid-cols-[1fr_0.8fr]">
        <div><p className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800"><span className="size-2 rounded-full bg-emerald-500" /> Madagascar, vos trajets à votre façon</p><h1 className="mt-6 max-w-2xl text-4xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl">Votre trajet, <span className="text-emerald-700">en toute simplicité.</span></h1><p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Choisissez une voiture ou une moto, indiquez votre départ et votre arrivée, puis vérifiez le trajet et le tarif calculé.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><a href="#commander" className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-700 px-6 text-sm font-semibold text-white hover:bg-emerald-800">Commencer ma demande</a><a href="#services" className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 hover:border-emerald-300">Choisir un transport</a></div><p className="mt-6 max-w-xl text-sm leading-6 text-slate-500">Vous pouvez préparer votre trajet sans compte. Une connexion ou la création d’un compte ne sera demandée qu’au moment d’envoyer la demande.</p></div>
        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-1"><article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><CarFront className="size-6" /></span><h2 className="mt-4 text-xl font-semibold">Voiture</h2><p className="mt-2 text-sm leading-6 text-slate-500">Pour vos déplacements en ville et vos trajets plus longs.</p></article><article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><span className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Bike className="size-6" /></span><h2 className="mt-4 text-xl font-semibold">Moto</h2><p className="mt-2 text-sm leading-6 text-slate-500">Une solution pratique pour circuler rapidement.</p></article></div>
      </section>

      <section id="services" className="border-y border-slate-200 bg-white px-4 py-10 sm:px-8"><div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Deux options</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Choisissez votre moyen de transport</h2></div><a href="#commander" className="text-sm font-semibold text-emerald-800 hover:text-emerald-950">Faire une demande →</a></div></section>

      <section id="commander" className="mx-auto max-w-6xl px-4 py-12 sm:px-8 sm:py-16"><div className="mb-6 max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Votre trajet</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Où souhaitez-vous aller ?</h2><p className="mt-3 text-sm leading-6 text-slate-600">Renseignez les détails et consultez le tarif estimé. Votre demande ne sera envoyée qu’après connexion ou création de compte.</p></div><RideRequestFormMap userId={userId} onRequireAuth={onRequestAuth} onCreated={onRequestCreated} /></section>

      <footer className="border-t border-slate-200 px-4 py-6 text-center text-xs text-slate-500 sm:px-8">MadaMove · Voiture ou moto, à vous de choisir.</footer>
    </main>
  );
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [requestInProgress, setRequestInProgress] = useState(false);

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
  if (session && !requestInProgress) {
    if (profile?.role === "driver") return <DriverDashboard userId={session.user.id} email={session.user.email} onLogout={() => supabase.auth.signOut()} />;
    return <PassengerDashboard userId={session.user.id} email={session.user.email} profile={profile} onLogout={() => supabase.auth.signOut()} />;
  }

  return <>
    <PublicHome
      userId={session?.user.id ?? null}
      onLogin={() => { setAuthMode("login"); setAuthOpen(true); }}
      onRequestAuth={() => { setRequestInProgress(true); setAuthMode("signup"); setAuthOpen(true); }}
      onRequestCreated={() => setRequestInProgress(false)}
    />
    {!session && authOpen && <AuthPanel initialMode={authMode} isRideRequest={requestInProgress} onClose={() => setAuthOpen(false)} />}
  </>;
}
