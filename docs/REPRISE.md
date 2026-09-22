# VISIONNARY — Reprise de travail (22/09/2026, mise à jour en fin de 2ᵉ session)

## Projet
- Dossier : `/Users/visionary/Downloads/Dev/Repos/VSCODE/visionnary` (app séparée de MariageAfro, **pas de dépôt git** pour l'instant)
- Stack : React 19 + Vite + TypeScript, IndexedDB (idb, base `visionnary-local` v1), PWA hors ligne (`public/sw.js`), serveur de synchro Node optionnel (`server/`, port 4311)
- Lancer : `npm run dev` → http://127.0.0.1:4730 (config `visionnary` dans `.claude/launch.json` de MariageAfro)
- Vérifier : `npm run verifier` (= `vitest run tests` + `node --test server/server.test.mjs` + `tsc -b` + `vite build`)
- Médias de test réels (non versionnés) : `test-media/` (photos mariage, vidéo MP4, vidéo iPhone HEVC, HEIC, photo lourde 21 Mo)

## Principes validés avec l'utilisateur
- But : sérénité le Jour J. Chaque plan compris en 3 secondes, rien à improviser, n'importe qui de l'équipe s'y retrouve.
- Thème **entièrement sombre** (noir, surfaces brun-charbon, accents or). Pas de page blanche. Seul le mode Terrain reste clair (plein soleil).
- Pas de longues fenêtres modales pour naviguer : écrans pleins. Les feuilles servent aux formulaires courts et aux confirmations.
- Tout en français. Tests avec de vraies photos et vidéos.
- Rien de modifié dans les données sans validation (aperçu → bouton → « Annuler » possible).

## Architecture utile
- `src/model.ts` : modules, champs, `shotSections` (chapitres du film, ordre narratif) et **helpers de chapitres** : `sectionOf` (casse tolérée, chapitres personnalisés gardés, sinon « Autres plans »), `orderSections` (ordre du film, anciens préparatifs à leur place, personnalisés ensuite), `sideOf` / `momentLabel` (côté mariée/marié d'un moment « Mariée · … »), `legacySections`.
- `src/moments.ts` : **frise d'une étape** — `stageFrise` (moments par chapitre, horaires en cascade 3 min/plan ou `shootMinutes`, horaires saisis dans `project.moments["idÉtape|chapitre"]`, pistes parallèles, dépassement), `momentState` (à faire / en cours / fait + essentiels manquants), `dayOrder` (ordre de la journée pour le Jour J).
- `src/shotlist.ts` : shot-list pro (110 plans) + `linkShotsToStages` + `proposeMoments` (rangement proposé des anciens « Préparatifs mariée / marié » par titre puis mots-clés).
- `src/features.ts` : assistant de création (options cérémonies/moments/prestations) + démo.
- `src/store.tsx` : état, sauvegarde locale, annulation (supprimer une étape supprime ses horaires de moments). `src/ui.tsx` : composants (Screen, Tabs, Sheet, Thumb — `full` = original net si ≤ 16 Mpx —, MediaViewer, MediaManager).
- `src/screens/common.tsx` : `ItemEditor`, `MediaCard` (badge d'état, focale, opérateur), `QuickView`, `mediaFor`, `operatorsOf` (couleur fixe par membre, rang dans l'équipe), `OperatorPills`, `shortFocal`.
- Écrans clés : `Shots.tsx` (Plans & scènes par chapitre), `Stage.tsx` + `stage.css` (frise par moment, route `#/etape/:id`), `MomentSplit.tsx` (rangement des anciens préparatifs), `Timeline.tsx` (déroulé/régie), `FieldMode.tsx` (Mode Jour J), `Inspirations.tsx`.

## Fait
### 1ʳᵉ session
- Refonte complète du design (maquette dark luxury), navigation simplifiée autour de la fiche tournage.
- Mode Jour J : plan courant avec référence, gros boutons FAIT/EXCELLENT/À REFAIRE/SAUTER, prises, minuteur, onglets Checklist/Rappels/Poses/Inspi.
- Galeries avec vraies vignettes vidéo (durée), aperçu rapide. Shot-list pro chargeable d'un tap, liée aux étapes.
- Préparatifs découpés en 9 moments : Mariée (Détails & accessoires, Maquillage & coiffure, Seule, Avec ses proches, Habillage) et Marié (Détails & accessoires, Seul, Avec ses proches, Habillage).

### 2ᵉ session (22/09) — les 4 points « en cours » sont faits
1. Chapitres centralisés dans `model.ts` (plus de copie dans `Shots.tsx` / `Stage.tsx`).
2. **Écran d'étape en frise par moment** : pistes « Côté mariée » / « Côté marié » côte à côte dès 768 px (empilées sur téléphone), moments communs avant/après ; pour chaque moment : horaire estimé modifiable (sélecteur natif, enregistré à la sortie du champ, lien « rétablir »), état À faire / En cours · x/y / Fait, essentiels manquants, plans en bande horizontale, bouton « + Plan » (chapitre et étape préremplis) ; alerte si une piste dépasse la fin de l'étape ; pastilles de cadreur (les horaires restent ceux de toute l'équipe).
3. **Rangement des anciens préparatifs** (`MomentSplit`, dans l'étape et dans Plans & scènes) : bandeau → aperçu groupé → « Ranger les N plans » → annulable. Les plans non reconnus restent dans leur ancien chapitre, visibles.
4. **Cartes de plan** : badge Tourné / Excellent / À refaire / Sauté, image estompée une fois tournée, cadrage · mouvement, focale, opérateur avec sa couleur ; aperçu rapide avec l'opérateur et la photo originale nette.
5. **Mode Jour J** : pastilles de cadreur (avec reste à faire), bouton « N essentiels manquants » (n'affiche plus qu'eux, un essentiel sauté y revient), MAINTENANT → ENSUITE (aperçu visuel) → PUIS, ordre de la journée (déroulé puis frise, les deux côtés croisés par horaire), grille Cadrage / Focale / Mouvement / Opérateur visible sans défiler sur un téléphone 375×812, boutons d'action plus hauts (82 px, 92 px en Terrain).
6. Tests : `tests/moments.test.ts` (14 cas, dont les 24 titres réels des anciens préparatifs). Total 35 tests métier + 3 serveur, tous verts ; build OK.

### 3ᵉ session (22/09) — refonte « Wedding Shoot Planner » (voir `CURRENT_STATE_AND_REFACTOR_PLAN.md`)
- **Phase 1** : audit + plan (`CURRENT_STATE_AND_REFACTOR_PLAN.md`), lint ESLint (`npm run lint`, inclus dans `npm run verifier`), redo global (⌘Z / ⇧⌘Z + bouton « Rétablir »), **bug de sauvegarde corrigé** (couverture exclue du ZIP et restauration impossible ; médias encore cités gardés).
- **Phase 2** : étape = **tableau de bord** (`Stage.tsx` : horaire, lieu + adresse, équipe, anneau de progression, statut, prochain plan, compteurs cliquables vidéo / photo / poses / essentiels / transitions / lumières, 14 onglets fonctionnels) ; frise extraite (`stage/Frise.tsx`), onglets dans `stage/Boards.tsx` ; type de plan Photo / Vidéo / Drone (`stageStats.ts`), codes de cadrage CU / MCU…, bibliothèque de transitions, personnes, cadence ; **ajout en masse** (`BulkAdd.tsx`, liste collée ou N plans) ; **glisser-déposer d'images qui crée plans / poses / références** (`MediaDrop.tsx`, progression avec vignettes) ; **fiche plan plein écran** (`ShotViewer.tsx` : swipe, flèches, statut À FAIRE / À REFAIRE / FAIT / ★, transition vers le plan suivant) ; transitions visibles (étiquette dorée sur les cartes, onglet dédié) ; dupliquer une étape avec ses plans (statuts remis à zéro) ; template d'étape (Presets) ; images en fondu + reflet de chargement.
- Tests : 45 métier + 3 serveur.

## À faire par l'utilisateur
- Vrai projet « Andy & Maeva » (panneau navigateur intégré, `http://localhost:4730`) : ses 24 plans de préparatifs sont encore dans l'ancien format. Ouvrir l'étape Préparatifs → bandeau → **Voir** → **Ranger les 24 plans** (aperçu vérifié : les 24 sont reconnus). Non appliqué volontairement.

## Feuille de route validée ensuite
7. Presets vraiment adaptés : cérémonies, style, équipe → préparation pertinente sans plans inutiles.
8. Repérage annotable : photo du lieu, placement caméras/couple/lumières, schéma relié aux plans (base existante : `src/Spatial.tsx`). Idée : images de référence par emplacement caméra (ex. cérémonie à 4 caméras : centre plein pied, gauche/droite champ-contrechamp poitrine, réactions public).
9. Pack individuel par cadreur (horaires, missions, références, placements), exportable et hors ligne. Base prête : `operatorsOf` + `dayOrder` filtré par cadreur.
10. Synchro d'équipe fiable : droits par rôle, modifications en attente, conflits explicites, historique.
11. Aussi demandé : plans « Same-Day Edit » marqués, pages pré-wedding dédiées.
12. Tests sur iPhone et tablette réels avec vraies images/vidéos (le service worker exige HTTPS hors localhost) — vérifier notamment la roue horaire iOS des moments.
- Idées notées : « maintenant » en surbrillance dans la frise le jour J (moment dont l'horaire contient l'heure actuelle) ; aperçus intermédiaires (~1280 px) pour les photos > 16 Mpx.

## Pièges connus
- **Deux origines dans le panneau intégré** : `http://localhost:4730` contient le vrai projet « Andy & Maeva » → lecture seule. Les tests qui écrivent se font sur `http://127.0.0.1:4730` (stockage séparé, démo « Sabrina & Daniel » + shot-list + photos de test déjà chargées).
- IndexedDB : la base s'appelle `visionnary-local` (v1). `indexedDB.open('autre-nom')` crée une base vide parasite.
- Captures du panneau navigateur parfois en retard d'un rendu (ou noires) : vérifier l'état par JS/DOM, refaire la capture.
- Pour naviguer dans le panneau : `location.hash = '/m/shots'` plutôt que l'outil navigate (rechargement → accueil).
- Erreurs « X is not defined » après édition = résidu HMR : recharger un onglet neuf avant de conclure.
- Champs horaires (`input type=time`) : l'action « type » de l'automate n'a aucun effet, utiliser des frappes `key` (« 1 0 5 5 ») puis Entrée. En émulation mobile (Android), un tap ouvre le sélecteur natif, non pilotable : tester la saisie en vue bureau.
- Upload de test : copier un fichier de `test-media/` dans `public/` le temps du test (ou `importMedia` via `await import('/src/media.ts')` en dev), puis **supprimer la copie**.
- Photos HEIC non affichables dans Chrome : repli propre avec message (voulu).


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

## 22/09/2026 — Missions, angles, déplacements et alertes terrain
- Accueil orienté prochaine mission ; filtres étape/photo/vidéo/mariée/marié/ensemble et statuts immédiats avec archivage annulable.
- ReferenceGallery commune aux poses/plans : angles multiples, swipe, choix de couverture, import, légendes, vidéo en boucle ; galerie photographe avec filtre d’étape.
- Plan de scène épuré par défaut, réglages de couches visuelles, référence caméra modifiable ; moteurs de mouvements conservés.
- Trajets consécutifs : route manuelle, rangement, installation, marge, conflits et passages de minuit. Adaptateur Google Routes authentifié côté serveur, clé serveur uniquement ; aucune clé configurée ni trafic réel testé.
- Alertes optionnelles 20/10/5/0, fins d’étapes et moments, départs, rappels personnalisés ; son/vibration/notifications selon appareil. Déduplication par session, acquittement et retour de visibilité. Aucune promesse en arrière-plan ou écran verrouillé.
- Démo additive Aïcha & Malik : 18 missions, 6 étapes, 4 scènes cohérentes, 8 transitions, références Pexels créditées et clip de zoom explicitement illustratif. Aucun projet existant remplacé ; une démo ajoutée dans le navigateur intégré.
- npm run verifier : 75 tests métier + 4 tests serveur, types et build réussis ; 9 avertissements lint préexistants et avertissement de taille du bundle.
- scripts/qa-missions.mjs : démo, statuts, couverture, import, angles, scènes/champs/lecture, horaires sans conflit, responsive 375/850/768/1440, alertes/acquittement/persistance. Chrome isolé, pas de validation sur iPhone physique.
- Guide utilisateur : docs/GUIDE-TERRAIN.md. Configuration facultative : docs/GOOGLE-ROUTES.md.

## 22/09/2026 — Reprise (Claude Code) : audit visuel, contraste Terrain corrigé
- Reprise depuis une nouvelle conversation, après la session Codex du jour. Lecture de `docs/REPRISE.md` et `CURRENT_STATE_AND_REFACTOR_PLAN.md` avant toute action ; aucune écriture sur `http://localhost:4730` (vrai projet Andy & Maeva) — tout testé sur `http://127.0.0.1:4730`.
- Audit visuel des demandes de l'utilisateur (galerie structurée par moment, plans de scène avec fiche caméra/référence, accueil = déroulé du jour, mariée/marié/ensemble, like rapide, progression) : **déjà en place** — Galerie photographe = Pose Board par catégories avec favoris (cœur) ; étape Préparatifs = frise Côté mariée / Côté marié par moment ; Plans de scène = Scene Designer 2D avec cône de champ, timeline animée et fiche caméra (« Fiche caméra plein écran » : cadrage attendu, objectif, sujet — référence à épingler) ; Accueil = « Votre journée » avec filtres Tous/Mariée/Marié/Ensemble et prochaine mission.
- **Bug de contraste corrigé** : en mode Terrain (`data-mode="terrain"`, surfaces claires voulues pour le plein soleil), `.mission-shortcuts button` et `.mission-next` (`src/screens/missions.css`) posaient `background: var(--ivory)` sans `color: var(--ink)` — texte clair sur fond blanc, quasi invisible sur les deux raccourcis d'accueil (Galerie photographe / Plans de scène) et la carte « Prochaine mission ». Corrigé en appariant `color: var(--ink)` (le motif déjà utilisé par `.card`, `.next-shoot`). Vérifié en Terrain et en Studio, aucune régression.
- `npm run verifier` : 75 tests métier + 4 tests serveur, types et build toujours verts (changement CSS seul).
- Reste à auditer si temps disponible : autres paires `background: var(--ivory)` + texte doré (`.mission-travel`, bannière d'alerte terrain) — contraste à vérifier précisément en Terrain, pas confirmé cassé à l'écran.
- **Suite du même audit, même session** : le bug était plus large qu'un seul écran — chaque carte qui pose `background: var(--ivory)` (ou `--ivory-2`) sans `color: var(--ink)` assorti hérite du texte clair de la page et devient illisible dès que le mode Terrain passe l'ivoire au blanc. Repéré et corrigé sur les écrans que l'utilisateur a cités (accueil, trajets, régie, filtres des plans) :
  - Nouveau jeton `--gold-card` (`src/theme.css`) : = `--gold` en Studio/Nuit, = `#8a6018` (ambre foncé, lisible sur blanc) en Terrain. À utiliser pour tout texte doré posé sur une surface `--ivory`, jamais pour du doré sur fond sombre (qui reste `--gold`).
  - `src/screens/travel.css` (Trajets & installation) : titre de trajet et libellés horaires (`Finir les prises`, `Partir au plus tard`…) étaient illisibles — passés à `--gold-card` / `--ink-2`. `.travel-help` (hors carte, fond noir) volontairement laissé en `--text-2`.
  - `src/dayrun.css` (Régie du jour J) : horloge live, cases lever/coucher/golden hour et lignes d'étapes n'avaient aucune couleur de texte propre — ajout de `color: var(--ink)` sur `.dayrun-clock`, `.sun-grid > div`, `.dayrun-row`.
  - `src/screens/shots.css` : panneau de filtres (`.shot-filters`) sans couleur de texte — corrigé.
  - Vérifié à l'écran en Terrain sur Accueil, Trajets & installation et Déroulé · Régie ; `npm run verifier` : toujours 75 tests métier + 4 serveur, types et build verts (changements CSS uniquement).
  - **Non traité, à auditer si nécessaire** : le reste de l'app n'a pas été passé au crible composant par composant — seuls les écrans mentionnés par l'utilisateur et ceux visités pendant cette session ont été vérifiés à l'œil en Terrain. Si un autre écran affiche du texte pâle sur fond clair en Terrain, chercher le même motif (`background: var(--ivory` sans `color:` assorti dans la même règle, ou sur un ancêtre).
  - Audit refait de façon **exhaustive** (script perl parcourant tous les `.css`, règle par règle, pas seulement à l'œil) : 7 règles posent encore `background: var(--ivory`/`--ivory-2)` sans `color:` propre dans la règle elle-même (`.sheet-head`, `.thumb`, `.quickview-specs > div`, `.quickview-notes`, `.progress`, `.field-specs div`, `.split-groups section`) — vérifiées une à une via leur JSX, toutes héritent correctement `color: var(--ink)` d'un ancêtre (`.sheet`, `.field-shot`, `.card`) ou sont purement décoratives (`.thumb`, `.progress`) : rien à corriger. Aucune paire `color: var(--gold)` + `background: var(--ivory)` dans une même règle ne subsiste non plus. **L'audit contraste Terrain est maintenant complet et vérifié programmatiquement, pas seulement sur les écrans visités.**
  - Balayage automatisé des 22 routes de l'app (hash-navigation + lecture du texte affiché) : aucun écran vide ou cassé.

## 22/09/2026 — « Mes plans » : pack individuel par cadreur (feuille de route point 9)
- Carte blanche de l'utilisateur pour continuer sans validation. Repris le point 9 de la feuille de route (« Pack individuel par cadreur, exportable et hors ligne ») : jusqu'ici seul un filtre « Cadreur » existait, noyé dans les filtres de Plans & scènes — un cadreur devait fouiller 134 plans pour retrouver les siens.
- **Nouveau** : `operatorDayOrder(p, operatorId)` (`src/moments.ts`) — pure, testée (`tests/moments.test.ts`, filtre l'opérateur, exclut l'archivé, réutilise `dayOrder`). Écran `src/screens/MyPack.tsx` (route `#/pack/:operatorId`) : fiche du membre, barre de progression (X/Y tournés), ses plans uniquement groupés par étape chronologique (heure · étape · lieu/adresse), plans sans étape sous « Autres plans » (chapitre du film). Bouton imprimer/PDF réutilisant le motif `.print-report` déjà en place (`Files.tsx`) — donc utilisable hors ligne, sans dépendance réseau.
- Accès : icône caméra sur chaque ligne de « Mon équipe » → onglet Équipe (`src/screens/Team.tsx`).
- Un bug introduit puis corrigé dans la foulée : la première version posait un `<button>` dans le `<button>` de la ligne (nesting HTML invalide, erreur React) — remplacé par un `<a href="#/pack/…">`, même motif que le lien téléphone déjà présent sur la ligne. Vérifié par lecture directe du DOM après correction.
- Vérifié à l'écran (127.0.0.1:4730, projet de démo) : plans de Christopher correctement filtrés et groupés (Préparatifs 09:00 → First look 12:00 → Cérémonie 14:00 → Cocktail 17:30 → Ouverture de bal 22:30 → Autres plans), export imprimable généré avec le même contenu.
- `npm run verifier` : 76 tests métier (+1) + 4 serveur, types et build verts.
- **Pas encore fait** : bouton retour symétrique depuis « Mes plans » vers Mode Jour J filtré sur ce cadreur (actuellement Mode Jour J montre tout le monde) ; pas de test sur appareil réel.

## 22/09/2026 — Démo « Sabrina & Daniel » habillée de photos libres de droit
- Demande utilisateur : voir le rendu final avec de vraies images partout, pas des cases vides. 4 poses de la Galerie photographe étaient encore vides (« Portrait mariée fenêtre », « Marche du couple », « Front contre front », « Famille proche ») et les 4 caméras du plan de scène « Cérémonie religieuse » n'avaient aucune référence épinglée (pas seulement CAM C, comme aperçu en surface plus tôt dans la session — CAM A/B/D aussi).
- Sourcées sur Pexels (licence gratuite, cf. https://www.pexels.com/license/), en cohérence avec l'identité visuelle déjà choisie pour cette démo (couples noirs, mariage élégant/cinématique) et avec la mission précise de chaque caméra (ex. CAM C = « Marié côté droit : réaction à l'arrivée de la mariée » → photo d'un marié essuyant une larme). Sources consignées dans `test-media/licensed/SOURCES.md`.
- **Méthode** : rien commité dans le dépôt — importées directement dans IndexedDB du navigateur de test (`127.0.0.1:4730`) via `await import('/src/storage.ts')` + `await import('/src/media.ts')`, `fetch()` du CDN Pexels côté page, `importMedia(file, projectId, itemId)`, puis pour les caméras un patch direct de `referenceId` sur l'élément de scène suivi de `saveWorkspace`. Recharger la page après écriture directe en IndexedDB (le store React ne relit pas tout seul). Pattern déjà documenté dans les « Pièges connus » de ce fichier.
- Vérifié à l'écran : galerie complète (10/10 poses illustrées), fiche « CAM C » avec sa référence en place. `npm run verifier` toujours vert après coup (aucun fichier source touché, seulement IndexedDB + `test-media/licensed/SOURCES.md`).
- **Limite assumée** : seules la Galerie photographe et les 4 caméras de la scène « Cérémonie religieuse » ont été habillées — pas les 134 plans de « Plans & scènes » (shot-list professionnelle générique, pictogrammes voulus, pas une référence par plan) ni les autres plans de scène. À refaire à la demande si un autre écran doit être illustré.

## 22/09/2026 — Un plan illustré par chapitre, sur toute la journée
- Suite directe du point précédent : l'utilisateur a demandé un test « mariage complet » pour comparer l'ensemble habillé, en demandant explicitement des images Pinterest — **refusé** (Pinterest n'est pas une banque libre de droit, les photos y sont repostées sans licence de réutilisation ; risque de droit d'auteur). Poursuivi avec Pexels, même méthode.
- 10 plans supplémentaires illustrés, un par chapitre du film, du matin au soir : Lieu & décor, Mariée détails/coiffure/habillage, Marié habillage, Cortège, Cérémonie (entrée), Cocktail, Réception (gâteau), Ouverture de bal (première danse). Sources dans `test-media/licensed/SOURCES.md`.
- Volontairement pas exhaustif : les 134 plans ne sont pas tous illustrés (ni les chapitres Portraits mariée/marié/couple, Famille, First look, Interviews, Transitions) — un plan par chapitre suffit pour comparer le rendu habillé vs pictogramme, sans dénaturer la shot-list professionnelle générique. À la demande, la même méthode s'étend à n'importe quel autre chapitre.
- **Incident en cours de route** : le serveur de dev (port 4730) s'est arrêté seul entre deux commandes (cause non identifiée — possiblement le `npm run verifier` d'un tour précédent). Relancé via le lanceur `visionnary` ; ce lanceur ouvre par défaut `localhost:4730` (vraies données) — **rebasculé immédiatement** sur `127.0.0.1:4730` sans qu'aucune écriture n'ait eu lieu sur l'origine réelle entretemps. Vigilance à garder : après tout redémarrage de ce serveur, revérifier l'origine avant toute action.

## 22/09/2026 — Les 134 plans complétés : plus aucune case vide
- L'utilisateur a insisté : plus aucune case image vide, sur toute l'interface (« il faut complets pas de case image vide »). Passage du « un plan par chapitre » à l'exhaustif.
- **Méthode changée pour l'échelle** : au lieu d'une recherche Pexels par plan (134 recherches manuelles, intenable), une recherche large par thème/chapitre (ex. « black bride portrait garden elegant »), extraction de **tous** les liens `/photo/…-<id>/` de la page de résultats via une ligne JS (`document.querySelectorAll('a[href*="/photo/"]')`) plutôt que la lecture d'accessibilité (polluée par les liens sponsorisés iStock/Canva), puis répartition des photos récoltées sur les plans vides de ce chapitre. ~20 recherches ont fourni un vivier de 400+ photos pour couvrir 114 plans restants.
- Résultat vérifié programmatiquement : `p.items` module `shots` (134) et `poses` (10) → 0 sans média. Toutes les 4 caméras de la scène « Cérémonie religieuse » ont aussi leur référence (fait au tour précédent).
- IDs Pexels utilisés consignés par chapitre dans `test-media/licensed/SOURCES.md` (pas de commit dans le dépôt — tout en IndexedDB du navigateur de test).
- Compromis assumés à cette échelle : quelques répétitions d'image entre plans très proches, les plans « Interviews » et « vue en hauteur / drone » utilisent des photos génériques faute d'offre Pexels plus précise. Ce ne sont pas des recréations fidèles de CE mariage — des références de style/valeur de plan, comme le reste de la démo.
- `npm run verifier` revérifié après ce lot (changements IndexedDB uniquement, aucun fichier source touché).
