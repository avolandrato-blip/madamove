import { useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export function CallRideContactButton({ rideId, label }: { rideId: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function callContact() {
    setLoading(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("get_ride_contact_phone", { p_ride_request_id: rideId });
    setLoading(false);

    if (rpcError) {
      setError("Impossible d’accéder au contact de cette course.");
      return;
    }
    const phone = typeof data === "string" ? data.replace(/[^\d+]/g, "") : "";
    if (!phone) {
      setError("Aucun numéro de téléphone n’est disponible pour ce contact.");
      return;
    }
    window.location.href = `tel:${phone}`;
  }

  return <div className="space-y-1">
    <Button type="button" variant="outline" disabled={loading} onClick={callContact} className="gap-2">
      <Phone className="size-4" /> {loading ? "Préparation de l’appel…" : label}
    </Button>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>;
}
