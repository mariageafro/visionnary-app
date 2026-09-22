# Architecture — journal local VISIONNARY

2026-09-22 : ajout route `/etape/:id`, composant `Stage` et indicateur `OfflineStatus`. Précache généré par Vite, hash de version automatique. Aucune table ni ressource MariageAfro modifiée : application autonome avec IndexedDB et serveur local distinct.

2026-09-22 (2ᵉ session) : écran `/etape/:id` refait en frise par moment (`Stage.tsx` + `stage.css`), nouveau module de calcul `src/moments.ts` (frise, état, ordre de la journée), composant `MomentSplit.tsx` (rangement validé des anciens préparatifs), chapitres centralisés dans `model.ts`, champ projet `moments` (horaires saisis, validé à l'import, remappé à la copie, nettoyé à la suppression d'une étape), cartes de plan enrichies et Mode Jour J « Maintenant → Ensuite » avec pastilles de cadreur. Aucune ressource MariageAfro touchée.


## 22/09/2026 — Repère horaire dans la frise
- Reprise depuis la conversation « Vérifier les consommations en cours » et vérification du code plus récent.
- Repère doré « Maintenant · Selon le planning » sur chaque moment actif à la date du projet, y compris les pistes parallèles et les moments qui traversent minuit. Aucun statut ni donnée modifié automatiquement.
- Actualisation toutes les 15 secondes et au retour sur la page ; nettoyage du minuteur à la fermeture.
- Vérification : 66 tests métier + 3 serveur, types et build réussis ; 10 avertissements lint préexistants, bundle principal > 500 ko.
- Chrome isolé : 375 / 768 / 1440 px sans débordement, deux moments simultanés visibles, disparition automatique à la fin. Données réelles non utilisées.


## 22/09/2026 — Galerie sobre et références animées
- Direction demandée : moins de pollution visuelle ; images prioritaires. Recherche et Importer visibles, filtres et outils secondaires repliés ; suppression du bouton Ajouter répété.
- Filtres étape/cadreur, sans affectation, compteurs contextuels, remise à zéro ; recherche multi-mots insensible aux accents couvrant cadrage, focale et affectations. Les plans archivés sont exclus dans tous les filtres.
- Bouton Animer/Figer dans Plans & scènes : vidéos muettes en boucle et originaux animés, seulement dans les cartes visibles ; désactivé par défaut, respecte prefers-reduced-motion.
- Formats MIME de repli GIF/WebP/PNG/JPEG/WebM et aperçu vidéo d'import corrigé.
- Médias Pexels et provenance dans test-media/licensed/SOURCES.md. Le MP4 est un zoom de démonstration dérivé d'une photo, pas une captation réelle.
- Démo isolée exportée dans test-media/licensed/demo-visionnary.zip ; aucun projet réel modifié. Attention : la restauration ZIP existante remplace le studio, cette archive est destinée à un navigateur/profil de test.
- npm run verifier : 67 tests métier et 3 serveur verts, types/build OK ; 10 avertissements lint antérieurs et avertissement de taille du bundle.
- scripts/qa-gallery.mjs : import de trois fichiers via interface, animation/pause, fiche, filtres et reset, responsive 375/768/1440, préférence mouvement réduit, export/restauration ZIP et persistance après rechargement. Captures docs/qa/galerie-*.png.
- Tests navigateur Chrome isolé, pas sur appareils iOS physiques.


## 22/09/2026 — Gestes du plan de scène
- Outil Déplacer la vue : glisser au-dessus des éléments sans les déplacer ; molette enfoncée également disponible.
- pointercancel annule le brouillon des éléments et du fond au lieu d'enregistrer la position interrompue.
- Après ajout sur téléphone, le panneau se replie ; élément sélectionné et bouton Régler existant accessible.
- Zone de saisie de rotation portée à 44 px sans agrandir le dessin.
- scripts/qa-scene-gestures.mjs : main au-dessus d'une caméra sans mutation, annulation du glisser, pas de débordement à 375 px. npm run verifier : 70 tests verts, types/build OK, avertissements préexistants inchangés.
- Pas de mesure de performance ni de validation tactile sur appareil réel dans ce lot.

## 2026-09-22 — Parcours terrain complet
Ajout MissionBoard (/accueil), ReferenceGallery, QuickStatus, TravelPlanner (/trajets), AlertControls/fieldAlerts et weddingDemo. PoseBoard reste la galerie photographe (/m/poses), ancien Home accessible /studio. Champs Project.alerts et Item.subjectGroup/coverId/travel* ; stockage local existant conservé. Nouvelle route serveur POST /api/routes authentifiée, clé Google privée optionnelle. Affichage des scènes réglable et références caméra éditables. Démo sous public/demo-wedding, licences documentées. Validation : 75 tests métier, 4 serveur, build et scénario navigateur responsive avec alertes.
