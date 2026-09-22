# VISIONNARY

Application locale de préparation et de suivi de tournages de mariage, séparée de MariageAfro.

## Ouvrir

```sh
npm install
npm run build
npm run server
```

Ouvrir **http://127.0.0.1:4311**. Le serveur ne se connecte à aucun modèle IA et ne consomme pas de tokens. Le premier lancement permet de créer un tournage ou de charger une démonstration explicitement fictive.

Développement : `npm run dev` sur **http://127.0.0.1:4730**. L’aperçu de développement n’installe pas le cache hors ligne. Les données du navigateur sont propres à chaque adresse et port : utilisez la sauvegarde ZIP pour transférer vos projets entre les adresses, et conservez une adresse stable au quotidien.

## Fonctions présentes

- Projets personnalisables ; préparation, fiches, checklists, équipe, matériel, rappels.
- Déroulé, détail des étapes en frise par moment (côté mariée / côté marié en parallèle, horaires estimés modifiables, essentiels manquants), régie et proposition de recalage à valider.
- Mode Jour J « Maintenant → Ensuite » dans l'ordre de la journée, par cadreur, avec filtre des essentiels manquants.
- Plans photo/vidéo, prises notées, références média, clips IN/OUT, presets modifiables.
- Multicam 2D, trajectoires animées et exports SVG/PNG/vidéo selon le navigateur.
- Pré-timeline, CSV, JSON, EDL de préparation, fiches imprimables en PDF.
- Médias locaux avec miniatures, sauvegarde ZIP et restauration validée.
- Cache de production versionné automatiquement, statut hors ligne visible dans Fichiers & sauvegarde.
- Serveur de synchronisation manuelle protégé par compte local, versionnement et conflits explicites.

## Vérifier

`npm run verifier` lance les tests métier, stockage, cache, serveur puis TypeScript et la construction.

Voir [QA terrain](docs/QA-TERRAIN.md), [synchronisation](docs/SYNC.md) et [reprise du 22 septembre](docs/memory/reprise-2026-09-22.md).

## Limites connues

- Pas encore de validation sur iPhone/iPad physiques ; PWA mobile exige une origine HTTPS adaptée.
- Pas de compte cloud ni de rôles d’équipe avec restrictions serveur individuelles ; les affectations actuelles organisent les missions.
- Rappels fiables seulement tant que l’application tourne ; les notifications lorsque l’app est fermée nécessitent une intégration native/push.
- Le module live prépare le direct ; il ne remplace pas un encodeur. L’EDL contient des placeholders de préparation, pas un montage final des rushs.
- Une archive restaurable est limitée à 250 Mo ; la synchronisation serveur accepte 32 Mo par média. Utiliser des références vidéo allégées.
- Un seul onglet d’édition à la fois par studio local ; la fusion collaborative automatique reste à développer.
