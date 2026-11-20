import { useEffect, useState } from "react";
import {
  CarFront,
  CheckCircle2,
  Clock3,
  LogOut,
  MapPin,
  Radio,
  Send,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

type ServiceType = "taxi" | "vtc" | "moto";
type Ride = {
  id: string;
  service_type: ServiceType;
  pickup_address: string;
  destination_address: string;
  proposed_price: number;
  passenger_count: number;
  luggage_count: number;
  distance_km: number | null;
  estimated_duration_minutes: number | null;
  status: string;
  created_at: string;
};
type DriverDashboardProps = {
  userId: string;
  email?: string;
  onLogout: () => void;
};

const serviceLabels: Record<ServiceType, string> = {
  taxi: "Taxi",
  vtc: "VTC",
  moto: "Taxi-moto",
};
const formatPrice = (value: number) =>
  `${new Intl.NumberFormat("fr-FR").format(value)} Ar`;

export function DriverDashboard({
  userId,
  email,
  onLogout,
}: DriverDashboardProps) {
  const [available, setAvailable] = useState(false);
  const [rides, setRides] = useState<Ride[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function loadDashboard() {
    const { data: profile } = await supabase
      .from("driver_profiles")
      .select("is_available")
      .eq("id", userId)
      .maybeSingle();
    setAvailable(Boolean(profile?.is_available));
    if (profile?.is_available) {
      const { data } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      const nextRides = (data as Ride[]) ?? [];
      setRides(nextRides);
      setDrafts(current =>
        Object.fromEntries(
          nextRides.map(ride => [
            ride.id,
            current[ride.id] ?? String(ride.proposed_price),
          ])
        )
      );
    } else {
      setRides([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadDashboard();
    const channel = supabase
      .channel(`driver-dashboard-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ride_requests" },
        loadDashboard
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function toggleAvailability() {
    setUpdatingAvailability(true);
    const next = !available;
    const { error } = await supabase.from("driver_profiles").upsert({
      id: userId,
      is_available: next,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setNotice({ type: "error", text: error.message });
    } else {
      setAvailable(next);
      setNotice({
        type: "success",
        text: next
          ? "Vous êtes maintenant disponible."
          : "Vous êtes maintenant indisponible.",
      });
      await loadDashboard();
    }
    setUpdatingAvailability(false);
  }

  async function sendOffer(ride: Ride) {
    setSending(ride.id);
    setNotice(null);
    const amount = Number(drafts[ride.id]);
    if (!amount || amount < 1) {
      setNotice({ type: "error", text: "Indiquez un montant valide." });
      setSending(null);
      return;
    }
    const { error } = await supabase.from("ride_offers").insert({
      ride_request_id: ride.id,
      driver_id: userId,
      proposed_price: amount,
      status: "pending",
    });
    if (error)
      setNotice({
        type: "error",
        text:
          error.code === "23505"
            ? "Vous avez déjà répondu à cette demande."
            : error.message,
      });
    else
      setNotice({
        type: "success",
        text: "Votre offre a été envoyée au passager.",
      });
    setSending(null);
  }

  return (
    <main className="min-h-dvh bg-[#EEF1F5] text-[#0B1F3A]">
      <div className="mx-auto min-h-dvh max-w-[430px] bg-white pb-6 shadow-sm">
        <header className="bg-[#0B1F3A] px-4 pb-5 pt-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E8C95A]">
                MadaMove
              </p>
              <h1 className="mt-1 text-2xl font-bold">Espace conducteur</h1>
              <p className="mt-1 text-xs text-white/70">{email}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Se déconnecter"
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/25 text-white"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        <div className="space-y-4 px-3 py-4">
          <section className="rounded-2xl bg-[#0B1F3A] p-4 text-white">
            <div className="flex items-center gap-2">
              <CarFront className="size-5 text-[#E8C95A]" />
              <h2 className="font-bold">Disponibilité</h2>
            </div>
            <p className="mt-2 text-sm leading-5 text-white/75">
              Activez-vous pour recevoir les demandes de course proches.
            </p>
            <button
              type="button"
              onClick={() => void toggleAvailability()}
              disabled={updatingAvailability}
              className={`mt-4 flex min-h-12 w-full items-center justify-between rounded-xl px-3 py-2 font-semibold ${available ? "bg-[#D4AF37] text-[#0B1F3A]" : "border border-white/30 bg-white/10 text-white"}`}
            >
              <span>
                {updatingAvailability
                  ? "Mise à jour…"
                  : available
                    ? "En ligne · Recevoir des demandes"
                    : "Hors ligne · Activer"}
              </span>
              {available ? (
                <ToggleRight className="size-6" />
              ) : (
                <ToggleLeft className="size-6" />
              )}
            </button>
          </section>

          {notice && (
            <div
              className={`rounded-xl border px-3 py-2.5 text-sm ${notice.type === "success" ? "border-[#E8D690] bg-[#FFF9E9] text-[#0B1F3A]" : "border-red-200 bg-red-50 text-red-700"}`}
              role="status"
            >
              {notice.text}
            </div>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#8A6A10]">
                  Demandes disponibles
                </p>
                <h2 className="mt-1 text-lg font-bold">Courses proches</h2>
              </div>
              <span className="rounded-full bg-[#FFF7DF] px-3 py-1 text-xs font-semibold text-[#72550B]">
                {rides.length}
              </span>
            </div>

            {!available ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
                <Radio className="mx-auto size-7 text-slate-400" />
                <p className="mt-3 text-sm font-semibold">
                  Vous êtes hors ligne
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Activez votre disponibilité pour commencer.
                </p>
              </div>
            ) : loading ? (
              <p className="py-5 text-center text-sm text-slate-500">
                Chargement des demandes…
              </p>
            ) : rides.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 p-6 text-center">
                <CheckCircle2 className="mx-auto size-7 text-[#8A6A10]" />
                <p className="mt-3 text-sm font-semibold">
                  Aucune demande pour le moment
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Les nouvelles demandes apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rides.map(ride => (
                  <article
                    key={ride.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-[#FFF7DF] px-2.5 py-1 text-xs font-bold text-[#72550B]">
                        {serviceLabels[ride.service_type]}
                      </span>
                      <span className="text-xs text-slate-500">
                        {ride.distance_km
                          ? `${Number(ride.distance_km).toFixed(1)} km`
                          : "Distance à confirmer"}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-2">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-[#8A6A10]" />
                        <div>
                          <p className="text-[11px] text-slate-500">Départ</p>
                          <p className="text-sm font-semibold leading-5">
                            {ride.pickup_address}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                        <div>
                          <p className="text-[11px] text-slate-500">Arrivée</p>
                          <p className="text-sm font-semibold leading-5">
                            {ride.destination_address}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#F5F6F8] p-2 text-center text-[11px]">
                      <span>
                        <strong className="block text-sm">
                          {ride.passenger_count}
                        </strong>
                        passagers
                      </span>
                      <span>
                        <strong className="block text-sm">
                          {ride.luggage_count}
                        </strong>
                        bagages
                      </span>
                      <span>
                        <strong className="block text-sm text-[#72550B]">
                          {formatPrice(ride.proposed_price)}
                        </strong>
                        prix proposé
                      </span>
                    </div>
                    <div className="mt-3">
                      <label
                        htmlFor={`offer-${ride.id}`}
                        className="mb-1 block text-xs font-semibold"
                      >
                        Votre prix (Ar)
                      </label>
                      <Input
                        id={`offer-${ride.id}`}
                        type="number"
                        min={1}
                        value={drafts[ride.id] ?? ride.proposed_price}
                        onChange={event =>
                          setDrafts(current => ({
                            ...current,
                            [ride.id]: event.target.value,
                          }))
                        }
                      />
                      <Button
                        type="button"
                        disabled={sending === ride.id}
                        onClick={() => void sendOffer(ride)}
                        className="mt-2 h-11 w-full gap-2 bg-[#D4AF37] font-bold text-[#0B1F3A] hover:bg-[#C5A02E]"
                      >
                        <Send className="size-4" />
                        {sending === ride.id
                          ? "Envoi…"
                          : Number(drafts[ride.id]) === ride.proposed_price
                            ? "Accepter le prix"
                            : "Envoyer une contre-offre"}
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock3 className="size-3.5" />{" "}
                      {ride.estimated_duration_minutes
                        ? `${ride.estimated_duration_minutes} min estimées`
                        : "Nouvelle demande"}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
