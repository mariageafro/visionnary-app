# Vérification terrain avant utilisation réelle

Cette liste est un protocole à exécuter sur les appareils cibles. Elle ne constitue pas une certification : la présence du code ne prouve pas que les essais matériels ont été faits.

## Installation et mode hors ligne

Construire avec `npm run build`, puis servir avec `npm run preview`. Le service worker est destiné à la production uniquement. Ouvrir une première fois avec connexion, attendre son installation et recharger la page avant de tester le mode avion. L'installation échoue si un fichier requis ne peut pas être mis en cache. Une mise à jour attend la fermeture des anciennes fenêtres ; les fichiers précachés comprennent le shell HTML, ses JS/CSS et les deux images de démonstration. Les API et les requêtes d'écriture ne sont jamais mises en cache.

Sur ordinateur, `localhost` est une origine permettant les essais PWA. Sur iPhone/iPad, utiliser Safari puis Ajouter à l'écran d'accueil avec une adresse HTTPS accessible depuis l'appareil. Le `localhost` de l'ordinateur n'est pas accessible comme tel sur le téléphone. Un serveur LAN HTTP ne suffit pas pour valider les fonctions exigeant un contexte sécurisé. L'icône SVG doit être contrôlée sur Safari ; une icône PNG Apple spécifique pourra être nécessaire selon l'appareil.

## Scénarios à cocher

- [ ] Créer un projet, modifier son nom, date et lieu, recharger : données conservées.
- [ ] Ajouter et réordonner des plans ; éditer notes et checklist ; vérifier la persistance après fermeture.
- [ ] Ajouter une photo locale, recharger, passer hors ligne : l'image reste visible.
- [ ] Passer hors ligne après installation ; rouvrir et naviguer dans les pages utilisées le Jour J.
- [ ] Exporter une archive, conserver une copie externe, restaurer et vérifier projets, modèles et médias.
- [ ] Refuser un fichier invalide sans supprimer le travail en cours.
- [ ] Vérifier les formulaires et commandes avec clavier, lecteur d'écran et zoom à 200 %.
- [ ] Vérifier sur téléphone étroit, tablette et ordinateur : pas de commandes hors écran.
- [ ] Vérifier les animations avec la préférence « Réduire les animations ».
- [ ] Tester l'utilisation sans permission de notification ni géolocalisation.
- [ ] Démarrer le serveur local ; créer le compte ; sauvegarder, modifier puis restaurer une version de test.
- [ ] Simuler deux onglets et un conflit de révision ; vérifier le refus d'écrasement des projets.
- [ ] Arrêter le serveur pendant un transfert ; vérifier le message d'erreur et recommencer.
- [ ] Contrôler la consommation de stockage après plusieurs médias et la sauvegarde externe.

## Conditions réelles et fonctions restant à valider

Les données du navigateur peuvent être supprimées par l'utilisateur ou évincées par le système. Une PWA ne remplace pas une sauvegarde externe. Tester le stockage disponible, le mode économie d'énergie, la chaleur, la luminosité extérieure et les manipulations à une main sur de vrais appareils.

Ne pas compter sur des rappels exacts lorsque l'application est fermée ou en arrière-plan : les navigateurs suspendent les minuteries et les permissions varient. Sans service push et mécanisme testé sur appareil, les rappels visibles dans l'application ne sont pas des notifications garanties du système.

Restent nécessaires pour un usage équipe distant : hébergement HTTPS, comptes partagés et rôles, invitations, synchronisation multi-appareils, résolution/fusion des conflits, stockage des gros rushs et tests de sauvegarde/restauration à l'échelle. Les essais réels iOS/Android et les essais de tournage prolongé doivent être réalisés avant de présenter cette version comme prête pour un événement critique.
