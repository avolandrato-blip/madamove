# TODO MadaMove — demande de course, profil et itinéraire

- [x] **Préparation et validation d’une demande :** ne pas afficher l’inscription au départ; permettre au client de préparer sa demande sans compte, puis demander la connexion ou la création d’un compte seulement lorsqu’il valide la demande. Après connexion, reprendre la demande en attente.
- [x] **Véhicules et tarif :** proposer uniquement voiture et moto, sans catégories taxi ou VTC. Ne pas afficher le tarif minimum dans l’interface; il reste utilisé en arrière-plan pour le calcul.
- [x] **Interface sans libellés de démonstration :** retirer de l’interface les notions ou libellés « démonstration » et « aperçu ».
- [x] **Inscription et profil :** pour créer un compte, demander le nom, le prénom, l’adresse, le numéro de téléphone et le choix « chauffeur ou passager »; rendre le numéro de téléphone modifiable dans le profil.
- [x] **Confidentialité et appel :** ne pas afficher le numéro de téléphone sur les écrans de course; le récupérer pour lancer l’appel uniquement quand le passager ou le conducteur affecté appuie sur le bouton d’appel du contact de sa course. Autoriser cet accès seulement aux participants d’une course acceptée ou en cours.
- [x] **Choix d’itinéraire :** proposer jusqu’à 2 ou 3 itinéraires que le client choisit; mettre automatiquement à jour le tarif quand il change d’itinéraire. Afficher uniquement les variantes réellement renvoyées par le service de cartographie, qui peut n’en fournir qu’une.
- [x] **Étape intermédiaire :** permettre d’ajouter une étape au trajet, la représenter sur la carte et la transmettre à l’itinéraire retenu.
- [x] **Guidage conducteur :** depuis une course attribuée, permettre d’ouvrir une application de navigation avec le départ, l’étape éventuelle et l’arrivée pour guider le pilote.

Validation finale : `pnpm check`, `pnpm test` (6 tests) et `pnpm build:static` réussis; migration appliquée et contrôles de la RPC/RLS confirmés. Le build affiche un avertissement Vite préexistant sur un script non-module et la taille du bundle.