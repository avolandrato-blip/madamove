import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export type ProfileDetails = {
  role: "passenger" | "driver";
  first_name: string;
  last_name: string;
  full_name: string;
  address: string;
  phone: string | null;
};

type ProfileSettingsDialogProps = {
  userId: string;
  profile: ProfileDetails | null;
  onClose: () => void;
  onSaved: (profile: ProfileDetails) => void;
};

export function ProfileSettingsDialog({ userId, profile, onClose, onSaved }: ProfileSettingsDialogProps) {
  const nameParts = (profile?.full_name ?? "").trim().split(/\s+/).filter(Boolean);
  const [firstName, setFirstName] = useState(profile?.first_name || nameParts[0] || "");
  const [lastName, setLastName] = useState(profile?.last_name || nameParts.slice(1).join(" "));
  const [address, setAddress] = useState(profile?.address ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanAddress = address.trim();
    const cleanPhone = phone.trim();
    const fullName = `${cleanFirstName} ${cleanLastName}`;

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({ first_name: cleanFirstName, last_name: cleanLastName, full_name: fullName, address: cleanAddress, phone: cleanPhone, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("role, first_name, last_name, full_name, address, phone")
      .single();

    setSaving(false);
    if (updateError) {
      setError(updateError.message || "Impossible de mettre à jour votre profil.");
      return;
    }
    onSaved(data as ProfileDetails);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 p-4 sm:items-center">
      <section role="dialog" aria-modal="true" aria-labelledby="profile-dialog-title" className="my-4 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="profile-dialog-title" className="text-2xl font-semibold">Mon profil</h2>
            <p className="mt-2 text-sm text-slate-500">Votre numéro est privé; il sert uniquement à lancer un appel depuis une course confirmée.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100">Fermer</button>
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="profile-first-name" className="mb-1.5 block text-sm font-medium">Prénom</label><Input id="profile-first-name" required autoComplete="given-name" value={firstName} onChange={event => setFirstName(event.target.value)} /></div>
            <div><label htmlFor="profile-last-name" className="mb-1.5 block text-sm font-medium">Nom</label><Input id="profile-last-name" required autoComplete="family-name" value={lastName} onChange={event => setLastName(event.target.value)} /></div>
          </div>
          <div><label htmlFor="profile-address" className="mb-1.5 block text-sm font-medium">Adresse</label><Input id="profile-address" required autoComplete="street-address" value={address} onChange={event => setAddress(event.target.value)} /></div>
          <div><label htmlFor="profile-phone" className="mb-1.5 block text-sm font-medium">Téléphone</label><Input id="profile-phone" required type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="03X XX XXX XX" /><p className="mt-1 text-xs text-slate-400">Modifiable à tout moment dans votre profil.</p></div>
          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saving} className="bg-emerald-700 text-white hover:bg-emerald-800">{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
