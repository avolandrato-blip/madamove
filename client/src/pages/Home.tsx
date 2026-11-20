import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DriverDashboard } from "@/components/DriverDashboard";
import { PassengerDashboard } from "@/components/PassengerDashboard";
import { supabase } from "@/lib/supabase";

type Role = "passenger" | "driver";
type Profile = { role: Role; full_name: string; phone: string | null };
type AuthForm = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  role: Role;
};
const emptyAuthForm: AuthForm = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  role: "passenger",
};

function AuthPanel() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState<AuthForm>(emptyAuthForm);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const update = (field: keyof AuthForm, value: string) =>
    setForm(current => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
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
            text: "Compte créé. Consultez votre email pour confirmer votre adresse.",
          });
          setMode("login");
          setForm(current => ({ ...current, password: "" }));
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;
      }
    } catch (error) {
      setNotice({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Impossible de terminer l’opération.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 text-[#0B1F3A] shadow-xl">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {(["login", "signup"] as const).map(value => (
          <button
            type="button"
            key={value}
            onClick={() => {
              setMode(value);
              setNotice(null);
            }}
            className={`min-h-10 rounded-lg px-2 text-sm font-semibold ${mode === value ? "bg-[#D4AF37] text-[#0B1F3A]" : "text-slate-600"}`}
          >
            {value === "login" ? "Connexion" : "Créer un compte"}
          </button>
        ))}
      </div>
      <div className="mt-5">
        <h2 className="text-xl font-bold">
          {mode === "login" ? "Bienvenue" : "Rejoindre MadaMove"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {mode === "login"
            ? "Connectez-vous pour commander une course."
            : "Créez un compte passager ou conducteur."}
        </p>
      </div>

      <form onSubmit={submit} className="mt-5 space-y-3">
        {mode === "signup" && (
          <>
            <div>
              <label
                htmlFor="full-name"
                className="mb-1 block text-sm font-semibold"
              >
                Nom complet
              </label>
              <Input
                id="full-name"
                required
                value={form.fullName}
                onChange={event => update("fullName", event.target.value)}
                placeholder="Ex. Rado Andriamihaja"
              />
            </div>
            <div>
              <label
                htmlFor="phone"
                className="mb-1 block text-sm font-semibold"
              >
                Téléphone{" "}
                <span className="font-normal text-slate-500">(facultatif)</span>
              </label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={event => update("phone", event.target.value)}
                placeholder="03X XX XXX XX"
              />
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold">Je suis</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["passenger", "driver"] as Role[]).map(role => (
                  <button
                    type="button"
                    key={role}
                    onClick={() => setForm(current => ({ ...current, role }))}
                    aria-pressed={form.role === role}
                    className={`min-h-12 rounded-xl border px-3 py-2 text-left text-sm font-semibold ${form.role === role ? "border-[#D4AF37] bg-[#FFF7DF] text-[#0B1F3A]" : "border-slate-200 text-slate-600"}`}
                  >
                    {role === "driver" ? "Conducteur" : "Passager"}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold">
            Adresse email
          </label>
          <Input
            id="email"
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={event => update("email", event.target.value)}
            placeholder="vous@exemple.com"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-semibold"
          >
            Mot de passe
          </label>
          <Input
            id="password"
            required
            minLength={6}
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            value={form.password}
            onChange={event => update("password", event.target.value)}
            placeholder="6 caractères minimum"
          />
        </div>
        {notice && (
          <div
            className={`rounded-xl border px-3 py-2.5 text-sm ${notice.type === "success" ? "border-[#E8D690] bg-[#FFF9E9] text-[#0B1F3A]" : "border-red-200 bg-red-50 text-red-700"}`}
            role="status"
          >
            {notice.text}
          </div>
        )}
        <Button
          type="submit"
          disabled={submitting}
          className="h-11 w-full bg-[#D4AF37] font-bold text-[#0B1F3A] hover:bg-[#C5A02E]"
        >
          {submitting
            ? "Veuillez patienter…"
            : mode === "login"
              ? "Se connecter"
              : "Créer mon compte"}
        </Button>
      </form>
      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
        <ShieldCheck className="size-3.5 text-[#8A6A10]" /> Authentification
        sécurisée par Supabase
      </p>
    </section>
  );
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadProfile(user: User) {
      const { data } = await supabase
        .from("profiles")
        .select("role, full_name, phone")
        .eq("id", user.id)
        .maybeSingle();
      if (mounted) setProfile(data as Profile | null);
    }
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user);
      if (mounted) setBusy(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        if (nextSession?.user) await loadProfile(nextSession.user);
        else setProfile(null);
        if (mounted) setBusy(false);
      }
    );
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (busy)
    return (
      <main className="grid min-h-dvh place-items-center bg-[#0B1F3A] px-4 text-sm text-white">
        Chargement de votre session…
      </main>
    );
  if (!session)
    return (
      <main className="min-h-dvh bg-[#0B1F3A] px-4 py-6 text-white">
        <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-[430px] flex-col justify-center gap-5">
          <header>
            <div className="grid size-12 place-items-center rounded-xl bg-[#D4AF37] text-lg font-black text-[#0B1F3A]">
              MM
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-[#E8C95A]">
              MadaMove · Grand Tana
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight">
              Le transport local, simplement.
            </h1>
            <p className="mt-2 text-sm leading-5 text-white/75">
              Commandez un taxi, un VTC ou un taxi-moto.
            </p>
          </header>
          <AuthPanel />
        </div>
      </main>
    );
  if (profile?.role === "driver")
    return (
      <DriverDashboard
        userId={session.user.id}
        email={session.user.email}
        onLogout={() => {
          void supabase.auth.signOut();
        }}
      />
    );
  return (
    <PassengerDashboard
      userId={session.user.id}
      email={session.user.email}
      profile={profile}
      onLogout={() => {
        void supabase.auth.signOut();
      }}
    />
  );
}
