# VISIONNARY — Plan d’implémentation

Objectif : application locale de préparation et suivi de tournage, issue du cahier des charges complet et de la référence visuelle fournis.

Architecture : React/TypeScript/Vite ; IndexedDB pour les données et médias ; service worker pour le shell ; serveur Node local séparé pour sauvegarde et synchronisation versionnée. Aucune connexion au backend MariageAfro. Synchronisation explicite en cas de conflit, jamais d’écrasement silencieux. Notifications système selon permissions ; pas de promesse de rappel en arrière-plan sur iOS sans application native.

1. Modèle partagé : projet > étapes > plans et prises ; modules équipe, lieux, références, matériel, audio/lumière, missions, rappels, pré/postproduction, live, SDE, danse. Champs dédiés et liens par identifiants.
2. Navigation responsive, tokens anthracite/ivoire/champagne, dashboard calculé depuis les projets, états vides et projet de démonstration explicitement identifié.
3. CRUD, réordonnancement, duplication, archivage, recherche, historique, presets modifiables, import médias IndexedDB, clips IN/OUT.
4. Mode terrain, chronomètre basé sur heure réelle, états des plans, suivi des prises, checklists.
5. Éditeur multicam 2D avec trajectoires, lecture et export SVG/PNG/vidéo lorsque supportée ; pré-timeline et exports CSV/JSON/EDL.
6. Pack ZIP de sauvegarde comprenant médias, restauration validée, impression/PDF via navigateur, partage par fichier. Serveur de sync authentifié et conflits affichés.
7. Tests métier (duplication, import, statuts, exports), build, tests navigateur desktop/mobile/tablette, persistence et offline. Documenter les limites restantes et tests physiques à faire.

Livraison locale d’abord. La signature Apple, les tests iPhone/iPad physiques et le déploiement public nécessitent leurs environnements réels. Pas d’API IA payante dans les fonctions locales.
