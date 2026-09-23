# VISIONNARY — dossier de reprise pour une autre IA (Gemini, etc.)

Ce fichier est un point d'entrée. Il ne remplace pas la documentation détaillée déjà présente
dans le dépôt — il te dit où la trouver et dans quel ordre la lire.

## 1. Lire dans cet ordre

1. `docs/REPRISE.md` — **le journal de bord**. Chaque session y ajoute une entrée datée : ce qui a
   été fait, ce qui a été vérifié, ce qui reste. C'est la source de vérité sur l'état actuel.
2. `CURRENT_STATE_AND_REFACTOR_PLAN.md` — l'audit et le plan de refonte d'origine (état du produit,
   écarts avec le cahier des charges, architecture proposée). Une partie est déjà réalisée depuis :
   se fier à `REPRISE.md` pour ce qui a effectivement été fait.
3. `docs/CAHIER-DES-CHARGES.md` — les exigences fonctionnelles d'origine (ce que l'app doit couvrir
   pour un tournage de mariage réel).
4. `README.md` — démarrage rapide (installer, lancer, tester).

## 2. Règles non négociables (ne jamais casser)

- **Local-first, hors ligne.** Tout vit dans IndexedDB du navigateur (base `visionnary-local`).
  Aucun compte, aucun cloud, aucun serveur obligatoire. Le serveur de synchro (`server/`, port 4311)
  est optionnel et local — ne jamais le transformer en dépendance obligatoire.
- **Thème entièrement sombre.** Jamais une page blanche, sauf le mode Terrain (`data-mode="terrain"`,
  volontairement clair pour le plein soleil). Si tu ajoutes une carte avec `background: var(--ivory)`,
  associe toujours `color: var(--ink)` dans la même règle (sinon ça devient illisible en Terrain —
  bug réel corrigé le 22/09/2026, voir `REPRISE.md`).
- **Tout en français**, y compris les commentaires de code et les messages d'erreur affichés.
- **Rien ne s'efface sans confirmation.** Les suppressions passent par une confirmation ou un
  `undo` (l'historique d'annulation existe déjà dans `store.tsx`).
- **Chemins relatifs, jamais absolus** (`src="image.jpg"`, pas `src="/image.jpg"`). L'app est
  déployée sous un sous-dossier GitHub Pages (`base: './'` en mode `gh-pages` dans
  `vite.config.ts`) ET servie à la racine en local (`npm run dev`) — un chemin absolu casse l'un
  des deux.

## 3. Avant de toucher au code

```bash
npm install
npm run verifier   # lint + tests (vitest + node:test) + tsc -b + vite build
```

Doit être vert avant *et* après toute modification. Le build doit afficher `dist/…` sans erreur.

## 4. Déploiement

- **Site public** : https://mariageafro.github.io/visionnary-app/ — se redéploie tout seul à
  chaque `git push` sur `main` (`.github/workflows/deploy.yml`, build `vite build --mode gh-pages`).
- **Données** : chaque visiteur du lien public a sa **propre** base IndexedDB locale, vide au
  premier chargement, avec un bouton pour charger une démo. Ce n'est **pas** un espace de travail
  partagé — ouvrir le lien depuis deux appareils donne deux copies indépendantes. Construire une
  vraie synchro multi-appareils est un chantier à part (le serveur `server/` en pose les bases mais
  n'est pas exposé sur internet).
- **PWA installable** : `public/manifest.webmanifest` + `public/sw.js`, déjà fonctionnels en
  production (testés sur le déploiement ci-dessus). « Installer l'app » dans Chrome/Edge desktop,
  ou Safari → Partager → Sur l'écran d'accueil sur iPhone/iPad.
- **Ne jamais** viser `http://localhost:4730` dans un test automatisé ou un script : c'est
  l'origine où vivent les vraies données d'un mariage réel de l'utilisateur (« Andy & Maeva »),
  en lecture seule. Toujours tester sur `http://127.0.0.1:4730` (origine séparée) ou sur le site
  public déployé, jamais sur `localhost`.

## 5. Où sont les images de démonstration

- `public/demo-wedding/` — 6 photos + 1 vidéo, licence Pexels, créditées dans
  `public/demo-wedding/sources.html`. Utilisées par `src/weddingDemo.ts` (démo « Aïcha & Malik »).
- La démo « Sabrina & Daniel » (projet par défaut, `src/features.ts`) a ses médias importés
  directement dans IndexedDB du navigateur au fil des sessions (pas de fichiers dans le dépôt) —
  sources Pexels tracées dans `test-media/licensed/SOURCES.md`. **Ces médias ne sont pas dans le
  dépôt Git** : un visiteur du site déployé ne les verra pas tant que la démo « Sabrina & Daniel »
  n'a pas été reconstruite avec de vraies images (voir §6, chantier ouvert).
- Licence Pexels : gratuite, modification autorisée, pas de mention d'origine obligatoire —
  https://www.pexels.com/license/. Toujours consigner la source dans un des deux fichiers
  ci-dessus par cohérence avec le reste du projet, jamais parce que la licence l'exige.

## 6. Chantiers ouverts (voir le détail et le contexte dans `docs/REPRISE.md`)

- Démo « Sabrina & Daniel » entièrement illustrée dans le navigateur de test local, mais ces
  médias ne sont pas versionnés → **le site public déployé ne les a pas**. Pour que la démo
  publique soit aussi illustrée : soit exporter ces médias et les committer dans
  `public/demo-wedding-2/` en les rattachant à `features.ts`, soit reconstruire l'import côté
  `weddingDemo.ts` pour la démo par défaut aussi.
- Galerie photographe : catégories détaillées, filtre par étape, favoris et essentiels photo distincts,
  consignes éditables. Les références sont groupées par catégorie dans l'étape choisie ; pas encore
  de tableau des comptes par mission ni d'affectation de plusieurs photographes à une même pose.
- Visionneuse plein écran : le bouton « cacher les infos » existe maintenant partout — poses
  (`PoseBoard.tsx`), plans (`ShotViewer.tsx`) et caméras (`CameraCard.tsx`), depuis le 22/09/2026.
- Scène : bibliothèque avec caméra réactions public et caméra live, fonds photo entiers et
  modèle 3D GLB/OBJ local ; pas de caméra drone activable/désactivable dédiée et la cérémonie de
  démonstration n'a pas encore été reconfigurée avec une caméra réactions du public. Un template dédié existe désormais pour la mairie
  (`src/scene/templates.ts`, `id: "mairie"`) en plus de l'église et du flashmob ; la vignette de
  référence épinglée n'est affichée que dans l'inspecteur/la fiche caméra, pas encore directement
  sur l'élément caméra dans la toile (`SceneCanvas.tsx`).
- Application bureau « vraie » (Electron/Tauri) : non construite. Le choix fait avec l'utilisateur
  (22/09/2026) a été la PWA installable, plus légère et déjà fonctionnelle. Si on packages un jour
  une vraie app native, repartir de `vite.config.ts` (base) et `public/sw.js` (chemins relatifs).

## 7. Style de code à respecter

Regarde 2-3 fichiers avant d'écrire (`src/screens/common.tsx`, `src/model.ts`) : composants
fonctionnels courts, pas de classes, JSX dense sans sur-découpage, commentaires rares et seulement
quand le *pourquoi* n'est pas évident. Pas de dépendance ajoutée sans raison forte (le projet est
volontairement minimal : React + Vite + idb, rien d'autre pour l'état/routage/style).
