# Missions, angles et démo de mariage — Implementation Plan

**Goal:** Entrer dans le déroulé du mariage, exécuter les missions photo/vidéo et consulter des angles de référence sans perdre le contexte.
**Architecture:** Conserver les projets et éléments existants. Les angles sont les médias d'une pose/d'un plan, avec couverture explicite et titre personnalisable ; partage d'un composant de galerie. Vue de scène simplifiée locale, sans supprimer d'éléments. Démo additive et indépendante.
**Tech Stack:** React 19, TypeScript, IndexedDB, SVG, Vitest, Playwright.

1. `src/screens/ReferenceGallery.tsx`, `ShotViewer.tsx`, `PoseBoard.tsx`, `common.tsx` : galerie par pose/plan, swipe entre angles, ajout multiple, titre, couverture, boucle vidéo. Préserver navigation entre missions distincte et références existantes.
2. `QuickStatus.tsx`, `MissionBoard.tsx`, `App.tsx` : entrée sur déroulé, sujet mariée/marié/couple et étape, prochain travail, cocher/refaire/archiver sans modale, galerie photographe en navigation principale. Conserver tableau de bord ancien via /studio.
3. `scene/SceneCanvas.tsx`, `SceneDesigner.tsx`, `StageScene.tsx`, `CameraCard.tsx` : affichage épuré/grille/champs/décor/labels désactivables ; références caméra ajoutables depuis sa fiche ; mouvements et flèches conservés.
4. `weddingDemo.ts`, `DemoButton.tsx`, `Welcome.tsx`, `Shoots.tsx`, `public/demo-wedding/` : démo additive, références sous licence vérifiée, photos d'un couple noir, étapes, poses, plans, angles, transitions, affectations et scènes animées.
5. Tests métier ciblés et tests navigateur sur démo : création sans écrasement, galerie, import/cover, swipe, statuts, affichage scène, sauvegarde/restauration, portrait/paysage. `npm run verifier`. Documenter provenance, résultats et limites dans docs/REPRISE.md.

Pas de dépôt Git dans Visionnary : sauvegarde fichiers avant modifications, pas de worktree/commit disponible. Aucun écrasement du studio pour charger la démo. Références illustratives explicitement distinguées des vraies variantes photographiques d'une même séance.
