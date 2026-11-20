import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, LogOut, MapPin, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RideRequestFormMap } from "@/components/RideRequestFormMap";
import { supabase } from "@/lib/supabase";

type Role = "passenger" | "driver";
type Profile = { role: Role; full_name: string; phone: string | null };
type ServiceType = "taxi" | "vtc" | "moto";
type Ride = {
  id: string;
  service_type: ServiceType;
  pickup_address: string;
  destination_address: string;
  proposed_price: number;
  payment_method: "cash" | "mobile_money";
  passenger_count: number;
  luggage_count: number;
  distance_km: number | null;
  estimated_duration_minutes: number | null;
  selected_driver_id: string | null;
  final_price: number | null;
  status: string;
  created_at: string;
};
type Offer = {
  id: string;
  ride_request_id: string;
  driver_id: string;
  proposed_price: number;
  status: string;
  created_at: string;
};

const formatPrice = (value: number) =>
  `${new Intl.NumberFormat("fr-FR").format(value)} Ar`;
const statusLabels: Record<string, string> = {
  pending: "En attente d’offres",
  accepted: "Conducteur sélectionné",
  in_progress: "Course en cours",
  completed: "Course terminée",
  cancelled: "Annulée",
};

export function PassengerDashboard({
  userId,
  email,
  profile,
  onLogout,
}: {
  userId: string;
  email?: string;
  profile: Profile | null;
  onLogout: () => void;
}) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [offersByRide, setOffersByRide] = useState<Record<string, Offer[]>>({});
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const loadRidesAndOffers = useCallback(async () => {
    const { data: rideData } = await supabase
      .from("ride_requests")
      .select("*")
      .eq("passenger_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    const nextRides = (rideData as Ride[]) ?? [];
    setRides(nextRides);
    if (nextRides.length) {
      const { data: offerData } = await supabase
        .from("ride_offers")
        .select("*")
        .in(
          "ride_request_id",
          nextRides.map(ride => ride.id)
        )
        .order("created_at", { ascending: true });
      const grouped = ((offerData as Offer[]) ?? []).reduce<
        Record<string, Offer[]>
      >((acc, offer) => {
        acc[offer.ride_request_id] = [
          ...(acc[offer.ride_request_id] ?? []),
          offer,
        ];
        return acc;
      }, {});
      setOffersByRide(grouped);
    } else {
      setOffersByRide({});
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void loadRidesAndOffers();
    const channel = supabase
      .channel(`passenger-dashboard-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ride_requests",
          filter: `passenger_id=eq.${userId}`,
        },
        loadRidesAndOffers
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ride_offers" },
        loadRidesAndOffers
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, loadRidesAndOffers]);

  async function selectOffer(ride: Ride, offer: Offer) {
    setSelecting(offer.id);
    setNotice(null);
    const { error: rideError } = await supabase
      .from("ride_requests")
      .update({
        selected_driver_id: offer.driver_id,
        final_price: offer.proposed_price,
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", ride.id)
      .eq("passenger_id", userId);
    if (rideError) {
      setNotice({ type: "error", text: rideError.message });
      setSelecting(null);
      return;
    }
    const { error: offersError } = await supabase
      .from("ride_offers")
      .update({ status: "rejected" })
      .eq("ride_request_id", ride.id)
      .neq("id", offer.id);
    if (!offersError)
      await supabase
        .from("ride_offers")
        .update({ status: "accepted" })
        .eq("id", offer.id);
    setNotice({
      type: "success",
      text: "Conducteur sélectionné. Les autres offres ont été fermées.",
    });
    await loadRidesAndOffers();
    setSelecting(null);
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
              <h1 className="mt-1 text-2xl font-bold">
                Bonjour {profile?.full_name || email}
              </h1>
              <p className="mt-1 text-sm text-white/75">
                Taxi, VTC ou taxi-moto à Antananarivo.
              </p>
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

        <div className="space-y-5 px-3 py-4">
          <RideRequestFormMap
            userId={userId}
            onCreated={ride => {
              setRides(current => [ride as Ride, ...current].slice(0, 10));
              void loadRidesAndOffers();
            }}
          />

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-bold">Mes courses</h2>
              <span className="rounded-full bg-[#FFF7DF] px-3 py-1 text-xs font-semibold text-[#72550B]">
                {rides.length}
              </span>
            </div>
            {notice && (
              <div
                className={`mt-3 rounded-xl border px-3 py-2.5 text-sm ${notice.type === "success" ? "border-[#E8D690] bg-[#FFF9E9] text-[#0B1F3A]" : "border-red-200 bg-red-50 text-red-700"}`}
                role="status"
              >
                {notice.text}
              </div>
            )}
            {loading ? (
              <p className="mt-4 text-sm text-slate-500">Chargement…</p>
            ) : rides.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                Aucune course pour le moment. Votre prochaine demande apparaîtra
                ici.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {rides.map(ride => (
                  <article
                    key={ride.id}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold leading-5">
                          {ride.pickup_address}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                          <MapPin className="size-3" />{" "}
                          {ride.destination_address}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-[#72550B]">
                        {formatPrice(ride.final_price ?? ride.proposed_price)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock3 className="size-3.5" />{" "}
                      {statusLabels[ride.status] ?? ride.status}
                    </div>

                    {ride.status === "pending" &&
                      (offersByRide[ride.id] ?? []).length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                          <p className="text-xs font-semibold text-slate-500">
                            Offres reçues
                          </p>
                          {offersByRide[ride.id].map(offer => (
                            <div
                              key={offer.id}
                              className="rounded-xl bg-[#F5F6F8] p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-bold">
                                  {formatPrice(offer.proposed_price)}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {offer.proposed_price === ride.proposed_price
                                    ? "Accepte votre prix"
                                    : "Contre-offre"}
                                </span>
                              </div>
                              <Button
                                type="button"
                                disabled={selecting === offer.id}
                                onClick={() => void selectOffer(ride, offer)}
                                className="mt-2 h-10 w-full bg-[#D4AF37] text-sm font-bold text-[#0B1F3A] hover:bg-[#C5A02E]"
                              >
                                {selecting === offer.id
                                  ? "Confirmation…"
                                  : "Choisir ce conducteur"}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    {ride.status === "pending" &&
                      (offersByRide[ride.id] ?? []).length === 0 && (
                        <p className="mt-3 rounded-lg bg-[#F5F6F8] px-3 py-2 text-xs text-slate-600">
                          En attente des réponses des conducteurs…
                        </p>
                      )}
                    {ride.status === "accepted" && (
                      <p className="mt-3 flex items-center gap-2 rounded-lg bg-[#FFF9E9] px-3 py-2 text-xs text-[#0B1F3A]">
                        <CheckCircle2 className="size-4 text-[#8A6A10]" />{" "}
                        Course confirmée au prix de{" "}
                        {formatPrice(ride.final_price ?? ride.proposed_price)}.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <p className="flex items-center gap-2 px-1 text-xs text-slate-500">
            <UserRound className="size-4 text-[#8A6A10]" /> Compte passager
            sécurisé · {email}
          </p>
        </div>
      </div>
    </main>
  );
}
