# Plan — profil, itinéraires et navigation MadaMove

## Approche

Conserver l’identité visuelle actuelle MadaMove et le site React/Vite, Supabase Auth/Postgres et Leaflet/OSRM. Compléter l’inscription par les champs requis (prénom, nom, adresse, téléphone et rôle), stocker les champs dans `profiles` via le déclencheur Auth, et fournir un formulaire de profil pour actualiser notamment le téléphone.

Le numéro reste visible uniquement à son propriétaire dans son formulaire de profil. Pour les courses acceptées ou en cours, le passager et le conducteur affecté disposent d’un bouton d’appel qui récupère à la demande le téléphone de l’autre participant par une fonction RPC sécurisée; RLS demeure la barrière pour les lignes de course.

Étendre le formulaire de trajet à un arrêt facultatif. Demander au service OSRM jusqu’à trois propositions, afficher celles qu’il renvoie et recalculer prix/distance/durée dès la sélection. Enregistrer arrêt, coordonnées et métriques de la proposition choisie. Dans l’espace conducteur, permettre d’ouvrir Google Maps avec départ, arrêt éventuel et arrivée afin de lancer le guidage; la navigation externe peut recalculer la variante.

## Structure

- `client/src/pages/Home.tsx` : authentification et champs d’inscription.
- `client/src/components/ProfileSettingsDialog.tsx` : modification du profil par son propriétaire.
- `client/src/components/RideRequestFormMap.tsx` et `Map.tsx` : arrêt, propositions de route, prix et tracé sélectionné.
- `client/src/components/PassengerDashboard.tsx` et `DriverDashboard.tsx` : appel contrôlé et navigation des courses attribuées.
- `supabase/migrations/` : colonnes de profil/arrêt, fonction de création de profil, fonction RPC contrôlée et politique de lecture des courses attribuées.

## Conception

Réutiliser le style existant : interface claire, cartes blanches, accents vert émeraude, boutons directs et responsive. Les choix d’itinéraire affichent clairement distance, durée et tarif; le numéro de téléphone ne figure jamais dans les cartes de course.
