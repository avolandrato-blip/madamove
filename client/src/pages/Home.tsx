import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { CarFront, CheckCircle2, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type Role = "passenger" | "driver";
type Profile = { role: Role; full_name: string; phone: string | null };

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  role: Role;
};

const emptyForm: FormState = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  role: "passenger",
};

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user);
      setBusy(false);
    }

    async function loadProfile(user: User) {
      const { data } = await supabase
        .from("profiles")
        .select("role, full_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (mounted) setProfile(data as Profile | null);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      if (nextSession?.user) await loadProfile(nextSession.user);
      else setProfile(null);
      setBusy(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const updateForm = (field: keyof FormState, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    setSubmitting(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: {
              role: form.role,
              full_name: form.fullName.trim(),
              phone: form.phone.trim() || null,
            },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice({
            type: "success",
            text: "Compte créé. Consultez votre boîte email pour confirmer votre adresse avant de vous connecter.",
          });
          setMode("login");
          setForm(current => ({ ...current, password: "" }));
        } else {
          setNotice({ type: "success", text: "Compte créé avec succès." });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
        setNotice({ type: "success", text: "Connexion réussie." });
      }
    } catch (error) {
      setNotice({
        type: "error",
        text: error instanceof Error ? error.message : "Impossible de terminer l’opération.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    setForm(emptyForm);
    setNotice({ type: "success", text: "Vous êtes déconnecté." });
  }

  if (busy) {
    return <div className="min-h-screen grid place-items-center bg-[#f6f8f7] text-slate-600">Chargement de votre session…</div>;
  }

  if (session) {
    return (
      <main className="min-h-screen bg-[#f6f8f7] px-4 py-8 text-slate-950 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="flex items-center justify-between border-b border-slate-200 pb-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">MadaMove V1</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Votre espace transport</h1>
            </div>
            <Button variant="outline" onClick={logout} className="gap-2"><LogOut className="size-4" /> Se déconnecter</Button>
          </header>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl">
              <p className="text-sm text-emerald-300">Connexion Supabase active</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight">Bonjour {profile?.full_name || session.user.email}.</h2>
              <p className="mt-4 max-w-xl text-slate-300">Votre compte est prêt pour la prochaine étape : demander ou accepter une course taxi, VTC ou taxi-moto.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full bg-emerald-400/15 px-4 py-2 text-sm text-emerald-200">{profile?.role === "driver" ? "Conducteur" : "Passager"}</span>
                <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">{session.user.email}</span>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-emerald-600" /><h2 className="font-semibold">Profil sécurisé</h2></div>
              <dl className="mt-6 space-y-4 text-sm">
                <div><dt className="text-slate-500">Rôle</dt><dd className="mt-1 font-medium">{profile?.role === "driver" ? "Conducteur" : "Passager"}</dd></div>
                <div><dt className="text-slate-500">Téléphone</dt><dd className="mt-1 font-medium">{profile?.phone || "Non renseigné"}</dd></div>
                <div><dt className="text-slate-500">Email confirmé</dt><dd className="mt-1 font-medium text-emerald-700">Oui</dd></div>
              </dl>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] px-4 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">MadaMove V1</p>
          <h1 className="mt-5 max-w-xl text-6xl font-semibold leading-[0.95] tracking-[-0.05em]">Le transport local, simplement.</h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">Un compte unique pour demander une course ou rejoindre la flotte MadaMove comme conducteur.</p>
          <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-3">
            {[{ icon: UserRound, label: "Passager" }, { icon: CarFront, label: "Conducteur" }, { icon: ShieldCheck, label: "Compte vérifié" }].map(item => {
              const Icon = item.icon;
              return <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4"><Icon className="size-5 text-emerald-700" /><p className="mt-3 text-sm font-medium">{item.label}</p></div>;
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="lg:hidden"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">MadaMove V1</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Le transport local, simplement.</h1></div>
          <div className="mt-7 flex rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => { setMode("login"); setNotice(null); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Se connecter</button>
            <button type="button" onClick={() => { setMode("signup"); setNotice(null); }} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${mode === "signup" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Créer un compte</button>
          </div>

          <div className="mt-7"><h2 className="text-2xl font-semibold">{mode === "login" ? "Bienvenue" : "Rejoindre MadaMove"}</h2><p className="mt-2 text-sm text-slate-500">{mode === "login" ? "Connectez-vous avec votre email et votre mot de passe." : "Choisissez votre usage pour personnaliser votre compte."}</p></div>

          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === "signup" && <>
              <div><label className="mb-1.5 block text-sm font-medium">Nom complet</label><Input required value={form.fullName} onChange={e => updateForm("fullName", e.target.value)} placeholder="Ex. Rado Andriamihaja" /></div>
              <div><label className="mb-1.5 block text-sm font-medium">Téléphone <span className="font-normal text-slate-400">(optionnel)</span></label><Input value={form.phone} onChange={e => updateForm("phone", e.target.value)} placeholder="03X XX XXX XX" /></div>
              <div><label className="mb-2 block text-sm font-medium">Je suis</label><div className="grid grid-cols-2 gap-2">{(["passenger", "driver"] as Role[]).map(role => <button type="button" key={role} onClick={() => setForm(current => ({ ...current, role }))} className={`rounded-xl border px-3 py-3 text-left text-sm transition ${form.role === role ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}><span className="font-medium">{role === "driver" ? "Conducteur" : "Passager"}</span><span className="mt-1 block text-xs text-slate-500">{role === "driver" ? "Je propose des courses" : "Je cherche une course"}</span></button>)}</div></div>
            </>}
            <div><label className="mb-1.5 block text-sm font-medium">Adresse email</label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input required type="email" value={form.email} onChange={e => updateForm("email", e.target.value)} placeholder="vous@exemple.com" className="pl-9" /></div></div>
            <div><label className="mb-1.5 block text-sm font-medium">Mot de passe</label><Input required minLength={6} type="password" value={form.password} onChange={e => updateForm("password", e.target.value)} placeholder="6 caractères minimum" /></div>
            {notice && <div className={`rounded-xl px-3 py-3 text-sm ${notice.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{notice.text}</div>}
            <Button type="submit" disabled={submitting} className="h-11 w-full bg-emerald-700 text-white hover:bg-emerald-800">{submitting ? "Veuillez patienter…" : mode === "login" ? "Se connecter" : "Créer mon compte"}</Button>
          </form>
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-slate-400"><CheckCircle2 className="size-3.5" /> Authentification sécurisée par Supabase</p>
        </section>
      </div>
    </main>
  );
}
