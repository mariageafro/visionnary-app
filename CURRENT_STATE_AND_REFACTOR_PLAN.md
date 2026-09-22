# VISIONNARY — État actuel et plan de refonte

*Audit du 22/09/2026 · base : le code tel qu'il est après la 2ᵉ session (frise par moment, Mode Jour J « Maintenant → Ensuite »).*

---

## 0. En bref

VISIONNARY est déjà une vraie application **locale, hors ligne, sauvegardable et synchronisable**, avec un modèle de données souple et validé. Ses fondations sont bonnes et doivent être **conservées**. Ce qui manque, c'est la couche **visuelle et spatiale** : aujourd'hui l'app décrit (listes, formulaires, badges) là où l'on attend qu'elle **montre** (images, schémas, trajectoires, champ de vision, lumière).

| | Aujourd'hui | Cible |
|---|---|---|
| Étape | Frise des moments + plans | **Tableau de bord de tournage** (compteurs photo / vidéo / poses / transitions / lumières, prochaine action, onglets) |
| Plans | Cartes avec référence, focale, opérateur | **Shot cards** complètes (type, valeur CU/MCU, FPS, caméra, transition, statut en un geste) + ajout en masse |
| Photo | Absent en tant que tel (champ « Photo / vidéo » caché dans le formulaire) | **Section PHOTO** : liste du photographe, 12 / 30 réalisées |
| Poses | Galerie générique | **Pose Board** façon moodboard, import multiple, plein écran, favoris, ordre, fait |
| Transitions | Module caché dans « Préparation », invisible sur les plans | **Visibles** sur chaque carte, dans l'étape et le storyboard |
| Multicam | Un seul plan par tournage, 4 types de pions, trajectoires en ligne droite | **Scene Designer 2D** : lieu construit ou photo en fond, objets, personnes, foules, caméras avec **cône de champ calculé**, lumières, drone, **mouvements animés**, timeline |
| Jour J | Plan courant + suivant, pastilles de cadreur | Cartes plein écran à **swiper**, appui long = problème, **MY SHOTS**, essentiels d'abord si retard, caméra → cadrage attendu |

---

## 1. État actuel

### 1.1 Stack

| Élément | Choix | Remarque |
|---|---|---|
| Interface | React 19 + TypeScript 5.7 strict, Vite 6 | Pas de routeur : routage par hash dans `App.tsx` |
| État | Contexte maison `store.tsx` | Historique d'annulation (30 états), **pas de rétablissement (redo)** |
| Stockage | IndexedDB (`idb`), base `visionnary-local` v1 | 2 magasins : `workspace` (un document JSON) et `media` (fichiers + miniatures 480 px) |
| Hors ligne | Service worker versionné par hash de build | Précache du shell, polices, images de démo |
| Synchro | Serveur Node local (`server/index.mjs`, port 4311) | Compte local, envoi/téléchargement manuels, révision anti-écrasement |
| Icônes / polices | lucide-react, DM Sans, Manrope, Caveat | |
| Sauvegarde | ZIP (jszip) validé à la restauration, 250 Mo max | |
| Tests | Vitest (35 tests métier) + node:test (3 tests serveur) | Playwright installé mais aucun test navigateur |
| Qualité | `tsc -b` strict | **Aucun lint configuré** |

### 1.2 Navigation (hash)

`/accueil` · `/tournages` · `/tournage` (fiche : Infos, Planning, Plans, Équipe, Notes + tuiles des modules) · `/deroule` (Timeline, liste, régie) · `/etape/:id` (frise par moment) · `/jourj` · `/m/shots` · `/m/inspirations` · `/m/:module` (écran générique pour les autres modules) · `/checklist` · `/rappels` · `/equipe` · `/multicam` · `/montage` · `/cadrage` · `/reglages` · `/meteo` · `/notes` · `/fichiers` · `/communication` · `/fin` · `/couverture` · `/presets` · `/sync` · `/plus`.

Barre du bas (mobile) : Accueil, Tournages, Checklist, Équipe, Plus. Barre latérale (≥ 960 px) : 12 entrées.

### 1.3 Données

```
Workspace { projects[], presets[], activeProjectId, revision, updatedAt, ownerName? }
 └─ Project { nom, date, lieu, couple, style, statut, invités, à capturer / à éviter / priorités,
              features[] (options du programme), moments{} (horaires saisis de la frise),
              items: Item[], placements: Placement[] (multicam), scenes? (non utilisé), coverId? }
     └─ Item { id, module, title, status, priority, notes, order, …champs libres (texte, nombre, booléen) }
MediaEntry { id, projectId, itemId, blob, thumbnail?, largeur, hauteur, durée } (magasin séparé)
Preset { id, name, description, items[], custom? }
```

- **24 modules** d'items : étapes, plans, inspirations, lieux, équipe, matériel, checklists, rappels, audio, lumière, poses, interviews, notes, documents, pré-wedding, post-production, SDE, live, danse, drone, sauvegardes, transitions, briefings.
- Les relations passent par des champs `…Id` (étape, opérateur, lieu, inspiration, plans source/cible, tâche), **validées** à l'import et **remappées** à la copie.
- Ajouter un champ à un item ne demande **aucune migration** : c'est l'atout principal à préserver.

### 1.4 Fonctionnalités déjà présentes

| Domaine | Présent |
|---|---|
| Tournages | Création guidée (options cérémonies/moments/prestations), démo, duplication, archivage, suppression, couverture |
| Déroulé | Étapes horodatées, réordonnancement, tri par heure, **régie** (démarrer/terminer, retard, recalage proposé à valider), conflits d'équipe |
| Étape | Frise par moment (côté mariée / côté marié), horaires estimés modifiables, état, essentiels manquants, rangement des anciens préparatifs |
| Plans | Shot-list pro de 110 plans, chapitres du film, cartes visuelles (référence, statut, focale, opérateur), aperçu rapide, découpe IN/OUT d'une vidéo en plans |
| Jour J | Maintenant → Ensuite → Puis, pastilles de cadreur, essentiels, prises (flags, best take), minuteur, plan B, checklist, rappels, poses, inspirations, modes Studio / Terrain / Nuit |
| Rappels | Déclencheurs relatifs aux étapes, coucher du soleil, fin d'étape avec essentiel manquant, chaînes « poser → retirer » |
| Lumière naturelle | Lever/coucher/golden/blue hour et azimut du soleil calculés hors ligne à partir du GPS du lieu |
| Multicam | Plan 2D unique : caméra, sujet, lumière, micro ; trajectoire départ → arrivée ; lecture ; export SVG / PNG / WebM |
| Pré-montage | Sélection de plans, ordre, lecture des intentions, export EDL / CSV |
| Équipe | Membres, rôles, « qui fait quoi », briefs à copier |
| Fichiers | Sauvegarde ZIP, restauration validée, exports CSV / JSON / EDL, impression |
| Presets | Presets livrés + « votre signature » (enregistrer un tournage en template), import/export JSON |

### 1.5 Problèmes constatés

**UX**
1. **Ajouter une image est pénible** : créer l'élément → enregistrer → rouvrir → importer (« Enregistrez d'abord pour ajouter photos et vidéos »). Aucun glisser-déposer qui crée directement des plans ou des poses.
2. **Ajouter beaucoup de plans est lent** : un formulaire complet par plan. Pas d'ajout en masse (« 10 photos de détails »), pas de liste collée.
3. **Photo et vidéo ne sont pas distinguées** à l'écran : le type existe (champ « Photo / vidéo ») mais n'apparaît nulle part, aucun compteur photo.
4. **Transitions invisibles** : module relégué dans les tuiles « Préparation », jamais affiché sur un plan ni dans une étape.
5. **Multicam très basique** : un seul plan pour tout le mariage (pas par étape), toile fixe sans zoom, pions ronds identiques, pas de lieu (murs, allée, autel, tables), pas de photo du lieu en fond, cône décoratif sans lien avec la focale, mouvements uniquement en ligne droite, personnes non animables.
6. **Formulaires longs** : un seul éditeur générique pour tous les modules (jusqu'à 22 champs pour un plan).
7. Lumière, drone, audio, transitions, poses : de simples listes sans représentation visuelle.

**Technique**
8. Le multicam **enregistre toute la base à chaque mouvement de souris** (IndexedDB + une entrée d'annulation par pixel déplacé).
9. **Pas de rétablissement (redo)**.
10. **Bug de sauvegarde** : la photo de couverture d'un tournage (média rattaché au tournage, pas à un élément) est exclue du ZIP et serait refusée à la restauration.
11. **Pas de lint**, aucun test d'interface.
12. Les presets ne savent enregistrer que des éléments : pas de template d'étape ni de plan de scène.

---

## 2. Écart avec le cahier des charges

Légende : ✅ présent · 🟡 partiel · ❌ absent

| § | Exigence | État | Action |
|---|---|---|---|
| 2 | Étapes libres (créer, supprimer, dupliquer, renommer, réordonner) | 🟡 tout sauf dupliquer *avec ses plans* | Duplication complète d'étape |
| 2 | Templates d'étape, appliquer à un autre mariage | ❌ | Presets de type « étape » (étape + plans + poses + transitions + scène) |
| 3 | Dashboard d'étape (heure, lieu, adresse, équipe, progression, restants, retard, prochaine action) | 🟡 heure, lieu, progression | Refonte `Stage` en tableau de bord + onglets |
| 4 | Shot cards (type, personne, groupe, cadre, valeur CU, objectif, FPS, mouvement, caméra, opérateur, lumière, durée, priorité, statut en un geste, swipe) | 🟡 | Nouveaux champs + carte enrichie + statut rapide |
| 5 | Section PHOTO, « 12 / 30 photos réalisées » | ❌ | Filtre et compteurs par type, onglet PHOTO |
| 6 | Pose Board (catégories, 5 à 50 références, import image/vidéo, agrandir, favori, réordonner, annoter, assigner, fait) | 🟡 galerie générique | Nouvel écran `PoseBoard` |
| 7–10 | Scene Designer : plan 2D, zoom/pan/pinch, construction du lieu, bibliothèque d'objets, personnes, foules | ❌ | Nouveau module `src/scene/` |
| 11–12 | Multicam : caméras (modèle, capteur, focale, hauteur, support…), cône de champ calculé, fiche caméra avec référence épinglée | 🟡 pions + cône fixe | `CameraNode` + `FovCone` + `CameraCard` |
| 13–16 | Bibliothèque de mouvements, visualisation animée, personnes animées, timeline d'animation | 🟡 ligne droite | `motion.ts` (moteur pur) + `TimelinePanel` |
| 17–18 | Lighting Designer, soleil et fenêtres | 🟡 calcul solaire, liste lumières | `LightNode` + `LightCone` + soleil orienté |
| 19–20 | Photo/plan du lieu en fond, module repérage relié aux étapes | 🟡 fiche lieu | Fond de scène + onglet repérage |
| 21 | Drone dans la scène (altitude, trajectoire, mouvements) | 🟡 liste | `DroneNode` + mouvements drone |
| 22 | Presets multicam éditables (cérémonie, salle, flashmob) | 🟡 2 presets figés | Templates de scène |
| 23 | Bibliothèque de cadrages + presets personnels | 🟡 liste FR | Valeurs CU/MCU/… + libellés FR |
| 24 | Transitions par plan avec inspiration | 🟡 module caché | Transitions visibles + bibliothèque étendue |
| 25 | Style de montage / fast cut (15, 20, 30 plans) | ❌ | Tags de style + séquence rapide (phase 12) |
| 26 | Storyboard par étape | ❌ | Vue storyboard (phase 12) |
| 27 | Références vidéo, lecture dans la fiche, timecode | ✅ IN/OUT | Conserver, étendre aux GIF et liens |
| 28 | Day-of mode (grandes cartes, swipe, appui long, NEXT + équipe) | 🟡 | Refonte phase 11 |
| 29 | Progression multi-niveaux | 🟡 globale | Panneau de progression |
| 30 | MUST HAVE d'abord si retard | 🟡 filtre manuel | Automatique au-delà d'un seuil de retard |
| 31 | Rappels 10/5/2 min, heure exacte | ✅ | Conserver |
| 32–33 | Équipe par étape, MY SHOTS | 🟡 | Vue « Mes plans » dédiée |
| 34–35 | Matériel par étape (CAM A = A7S III + 85 mm), audio détaillé | 🟡 | Lien caméra de scène ↔ matériel |
| 36 | Chorégraphies / flashmob avec simulation | 🟡 fiche danse | Réutilise le Scene Designer (phase 8) |
| 37–39 | SDE, live, post-production | 🟡 fiches | Checklists dédiées (phase 12) |
| 40–41 | Exports PDF, image HD, viewer read-only, animation vidéo | 🟡 PNG/SVG/WebM, impression | Viewer HTML autonome + exports de scène (phase 12) |
| 42 | Interfaces adaptées mobile / tablette / desktop / paysage | 🟡 responsive | Mises en page dédiées du Scene Designer |
| 44 | Drag, rotate, resize, duplicate, group, lock, hide, snap, align, undo/redo, multi-select, calques | ❌ | `SceneCanvas` + `LayersPanel` + redo global |
| 45 | Sauvegarde auto, historique, undo/redo, templates personnels | 🟡 | Redo + templates de scène |
| 46 | Rapide avec 100 plans, 200 invités, 10 caméras, 20 lumières | — | Rendu par calques, foules en un seul tracé, brouillon local pendant les gestes |
| 47 | Local first, hors ligne | ✅ | Conserver ; médias de scène inclus dans les sauvegardes |

---

## 3. À conserver, à modifier, à créer

### Conserver tel quel
- Stockage IndexedDB, sauvegarde ZIP validée, serveur de synchro, service worker, validation des relations.
- Modèle `Item` générique (extensible sans migration) et helpers `cloneItems`, `duplicateProject`, `withOrder`.
- `schedule.ts` (régie, retard, recalage), `reminders.ts`, `sun.ts`, `continuity.ts`, `moments.ts` (frise), `media.ts`.
- Composants `Screen`, `Sheet`, `Tabs`, `Thumb`, `MediaViewer` (IN/OUT), `OperatorPills`, `MediaCard`, `QuickView`.
- Thème sombre et ses jetons, modes Terrain / Nuit.

### Modifier
| Fichier | Changement |
|---|---|
| `store.tsx` | Ajouter **redo** ; commit groupé pour les gestes continus |
| `exports.ts` | Médias rattachés au tournage ou à un plan de scène inclus dans les sauvegardes ; validation des plans de scène |
| `model.ts` | Champs de plan (type photo / vidéo / drone, FPS, caméra, transition, personne), bibliothèques (cadrages CU/MCU, transitions, mouvements), duplication des plans de scène |
| `screens/Stage.tsx` | Devient un **tableau de bord** : en-tête, compteurs, onglets (Frise, Photo, Vidéo, Scène, Poses, Transitions, Références, Équipe, Matériel, Checklist, Rappels, Audio, Drone, Notes) |
| `screens/common.tsx` | `MediaCard` → `ShotCard` complète ; import de médias par glisser-déposer qui **crée** les éléments |
| `screens/FieldMode.tsx` | Swipe, appui long, NEXT + équipe, MY SHOTS, caméra → cadrage (phase 11) |
| `screens/Presets.tsx` | Templates d'étape et de scène |
| `Spatial.tsx` | Remplacé par le Scene Designer ; l'ancien plan reste lisible et **convertible** (jamais effacé) |

### Créer
```
src/scene/
  types.ts            ScenePlan, SceneElement (architecture, zone, objet, rangées, personne, foule,
                      caméra, lumière, soleil, drone, audio, note), Motion, TimelineCue
  catalog.ts          bibliothèque : objets, rôles, capteurs, supports, lumières, mouvements, cadrages
  geometry.ts         champ de vision (capteur × focale), largeur de cadre, estimation de la valeur de plan
  motion.ts           moteur d'animation pur : position / orientation d'un élément à l'instant t
  ops.ts              opérations pures : ajouter, déplacer, tourner, dupliquer, grouper, aligner, calques
  templates.ts        cérémonie 4 caméras, salle, flashmob, chambre (préparatifs), first look
  SceneDesigner.tsx   orchestration (sélection, outil, brouillon, lecture)
  SceneCanvas.tsx     SVG zoom / pan / pinch, calques mémorisés
  nodes.tsx           CameraNode, PersonNode, CrowdNode, LightNode, ObjectNode, ZoneNode, WallNode, DroneNode
  overlays.tsx        FovCone, LightCone, MotionPath, poignées de rotation
  AssetLibrary.tsx    bibliothèque par glisser / toucher
  Inspector.tsx       propriétés en divulgation progressive
  LayersPanel.tsx     calques : afficher, verrouiller
  TimelinePanel.tsx   pistes, clips déplaçables, PLAY / PAUSE / RESET / LOOP, vitesse
  CameraCard.tsx      fiche caméra : opérateur, objectif, mission, référence épinglée
  scene.css
src/screens/
  PoseBoard.tsx       moodboard des poses
  MediaDrop.tsx       zone de dépôt multiple (plans, poses, références)
  BulkAdd.tsx         ajout en masse de plans
```

---

## 4. Architecture proposée

### 4.1 Principes
- **Modules indépendants** et **logique pure testable** (`geometry`, `motion`, `ops`) séparée des composants.
- **Brouillon local pendant les gestes** : un glisser met à jour l'état du composant ; le store n'est écrit qu'au relâchement → une seule entrée d'annulation, une seule écriture IndexedDB.
- **Rendu par calques** : architecture, décor et foules rendus une fois (mémorisés) ; seuls les éléments animés sont recalculés à chaque image pendant la lecture.
- **Foules** : 200 invités = un élément « foule » (nombre, zone), dessiné en un seul tracé.
- **Unités réelles** : coordonnées en **mètres**, indispensables pour calculer le champ de vision et la valeur de plan.
- **Divulgation progressive** : l'inspecteur montre l'essentiel, le reste sous « Plus ».

### 4.2 Flux
```
Store (workspace) ──► Stage dashboard ──► onglet Scène ──► SceneDesigner
                                                         ├─ SceneCanvas (lecture seule du plan + brouillon)
                                                         ├─ Inspector / AssetLibrary / Layers
                                                         └─ TimelinePanel ──► motion.poseAt(t)
Jour J ──► étape ──► CameraCard (lecture seule) ──► référence en grand
```

### 4.3 Calcul du champ de vision
`champ horizontal = 2 · atan(largeur capteur / (2 · focale))` — plein format 36 mm, Super 35 24,9 mm, APS-C 23,5 mm, Micro 4/3 17,3 mm, 1" 13,2 mm.
À la distance du sujet, la largeur du cadre donne une **valeur de plan estimée** (hauteur 16/9 : < 0,4 m gros plan, < 0,65 m plan poitrine, < 1 m plan taille… > 6 m plan d'ensemble). Exemple : 85 mm plein format à 3 m → cadre de 1,27 m de large → **plan poitrine**.

### 4.4 Moteur d'animation
`poseAt(élément, t)` renvoie position et orientation à l'instant *t* selon le mouvement : fixe, pan (rotation seule), tilt (indication), push-in / pull-out (avance selon l'axe), truck / travelling (latéral), orbit / arc 180° / 360° (autour d'une cible), tracking / follow (suit un élément animé), trajectoire libre (courbe dessinée), crane / drone (altitude). Une seule horloge pour toute la scène : les personnes et les caméras s'animent ensemble.

---

## 5. Modèle de données (évolutions **non destructives**)

| Où | Ajout | Compatibilité |
|---|---|---|
| Plan (`shots`) | `media` étendu : `photo` / `video` / `drone` (« vide » = vidéo et photo, comme aujourd'hui) ; `fps`, `cameraLabel`, `person`, `transition`, `lens` | Champs optionnels, anciens plans inchangés |
| Pose (`poses`) | `stageId`, `favorite` ; statut « fait » déjà géré | idem |
| Transition (`transitions`) | `stageId`, types étendus (match cut, whip pan, foreground wipe, J-cut…) | idem |
| Projet | `scenePlans?: ScenePlan[]` | Absent = aucun plan ; validé à l'import, remappé à la copie |
| Médias | un média peut appartenir au tournage (couverture) ou à un plan de scène (fond) | Correction du bug de sauvegarde |
| Preset | `kind?: "tournage" | "étape" | "scène"`, `scenePlans?` | Anciens presets = « tournage » |
| Ancien multicam | `placements` **conservés** ; conversion en plan de scène à la demande | Rien n'est effacé |

```ts
ScenePlan { id, name, stageId?, venueId?, width, height,           // mètres
            background?: { mediaId, x, y, width, rotation, opacity, locked },
            north?: number,                                          // orientation pour le soleil
            elements: SceneElement[], cues: TimelineCue[], duration, layers? }
SceneElement { id, kind, name, x, y, rotation, layer, locked?, hidden?, groupId?, …propres au type,
               motion?: { type, start, duration, path?, targetId?, distance?, sweep?, easing? } }
```

---

## 6. Roadmap

| Phase | Contenu | Critère d'acceptation |
|---|---|---|
| **1** | Audit (ce document), lint, correction du bug de sauvegarde, redo | `npm run verifier` + lint verts |
| **2** | Tableau de bord d'étape, compteurs photo / vidéo / poses / transitions, shot cards, **ajout en masse**, **glisser-déposer d'images qui crée les plans**, transitions visibles | Une étape affiche « 24 vidéo · 30 photo · 8 poses · 2 transitions » ; 10 photos déposées = 10 plans illustrés |
| **3** | Pose Board / moodboard photo | 30 références importées d'un geste, plein écran, favori, ordre, fait |
| **4** | Scene Designer 2D : toile zoom / pan / pinch, murs, zones, objets, fond photo, calques, undo / redo | Construire une église (rangées, allée, autel) sur tablette |
| **5** | Caméras, capteurs, focales, cône de champ, fiche caméra, référence épinglée | 85 mm plein format à 3 m → « plan poitrine » affiché |
| **6** | Personnes, rôles, foules, groupes | 200 invités sans ralentissement |
| **7** | Bibliothèque de mouvements, trajectoires dessinées | Push-in, orbit, arc 180°, pan visibles sur le plan |
| **8** | Moteur d'animation + timeline (PLAY, PAUSE, RESET, LOOP, vitesse, clips déplaçables) | First look animé (mariée avance, marié se retourne, 3 caméras) |
| **9** | Lighting Designer + soleil orienté | Setup fenêtre : cône lumineux + direction du soleil à l'heure prévue |
| **10** | Drone | Trajectoire et altitude distinctes des caméras au sol |
| **11** | Day-of Mode refondu, MY SHOTS, caméra → cadrage | Christopher ne voit que ses caméras et ses plans |
| **12** | Exports : call sheet, shot list, plan de scène HD, viewer autonome, animation vidéo ; storyboard, fast cut | Un fichier ouvrable sans l'app |
| **13** | Mise en page tablette / mobile paysage, performance, hors ligne | Profil de performance, mode avion |
| **14** | Tests réels (iPhone, iPad) | Protocole `docs/QA-TERRAIN.md` coché |

---

## 7. Risques et parades

| Risque | Parade |
|---|---|
| Régression sur les données réelles (« Andy & Maeva ») | Champs uniquement additifs ; anciens plans multicam conservés ; tests d'import/copie ; aucun test d'écriture sur l'origine réelle |
| Toile lente avec beaucoup d'éléments | Brouillon local pendant les gestes, calques mémorisés, foules en un seul tracé, mesure avec 200 invités / 10 caméras / 20 lumières |
| Gestes tactiles (pinch, rotation) difficiles à tester sans appareil | Logique de gestes isolée et testée ; essais réels en phase 14 |
| Poids des médias (fonds de scène, références vidéo) | Miniatures, original seulement en grand, limites d'export existantes |
| Complexité de l'interface | Divulgation progressive, valeurs par défaut intelligentes, templates |
| Aucun dépôt git | Copie de sécurité avant chaque phase ; proposer `git init` |
| Export vidéo selon le navigateur (WebM) | Déjà géré dans l'ancien multicam : réutiliser la détection et prévenir si indisponible |

---

## 8. Ordre d'implémentation et contrôle

À chaque phase : copie de sécurité → développement → `npm run lint` → `npm run verifier` (tests, types, build) → contrôle navigateur **ordinateur, tablette (768 px), mobile (375 px)** → mise à jour de `docs/REPRISE.md`.

Règles : aucun bouton sans action réelle ; aucune donnée existante modifiée sans validation ; tout en français ; thème sombre.
