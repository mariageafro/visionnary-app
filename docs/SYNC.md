# Compte et sauvegarde serveur locale

Le compte est propre à ce serveur VISIONNARY, partagé par les appareils qui y sont explicitement connectés. Il ne correspond pas à Apple, Google ou à un compte cloud. Les projets restent utilisables dans le navigateur sans connexion au compte local.

## Démarrage

1. Installer les dépendances avec `npm install`.
2. Lancer `npm run server` dans un terminal : écoute sur `127.0.0.1:4311` uniquement.
3. Pour une utilisation construite, lancer `npm run build`, puis ouvrir `http://127.0.0.1:4311` : le serveur sert directement `dist/` et les API sur la même origine. Pour développer, lancer `npm run dev` dans un autre terminal ; le proxy `/api` doit viser ce serveur. Les origines locales sur les ports 4730 (dev), 5173, 4173 et 4311 sont acceptées par défaut.
4. Ouvrir la section compte/synchronisation et créer un identifiant avec un mot de passe de 12 caractères minimum.
5. Choisir explicitement « Envoyer les projets et médias » pour sauvegarder. Aucun envoi automatique n'est effectué.

## Données et restauration

Le dossier `data/`, ignoré par Git, contient le compte et les sauvegardes. Le mot de passe est stocké sous forme de dérivé scrypt avec sel ; les fichiers sont privés au niveau des permissions du système. Les projets et médias ne sont pas chiffrés sur disque. Protéger les sauvegardes de cet ordinateur et son compte utilisateur.

L'envoi inclut les projets, les modèles et les médias locaux de 32 Mo maximum chacun. Les originaux vidéo volumineux doivent rester dans le stockage de production de l'équipe ; leur synchronisation n'est pas prise en charge. Les médias sont transférés en base64, ce qui augmente temporairement la mémoire et la taille du transfert. Les miniatures sont facultatives et ne sont pas transférées séparément.

« Télécharger la version serveur » remplace l'espace local après confirmation et importe les médias dans le stockage du navigateur. Exporter une archive locale avant cette opération pour préserver des changements locaux. Une erreur de transfert doit être résolue avant de considérer une sauvegarde comme complète. Les médias et les projets ne sont pas transférés dans une transaction unique : un transfert interrompu peut laisser des médias inutilisés sur le serveur. Un média existant est immuable : renvoyer exactement le même contenu est accepté, mais un contenu différent avec le même identifiant est refusé (409). Importer un nouveau média pour remplacer un original.

La révision protège les projets contre un écrasement silencieux : si le serveur a changé, l'envoi est refusé. L'interface propose de télécharger sa version ou d'annuler. Il n'existe pas encore de fusion automatique. Au premier envoi d'une session, si un espace distant existe, il faut le télécharger avant de le modifier. Exporter le travail local auparavant.

## Limites et sécurité

- Session de huit heures, cookie HttpOnly et SameSite Strict ; un redémarrage du serveur ferme les sessions.
- Origine contrôlée sur les mutations ; tentatives de connexion limitées.
- Aucun service exposé sur le réseau par défaut et aucun hébergement cloud. Le mode LAN ci-dessous permet un échange manuel entre appareils vers un serveur commun ; il ne fournit ni collaboration en temps réel ni fusion automatique.
- Un téléphone ne peut pas atteindre le serveur de l'ordinateur par `localhost`, qui désigne le téléphone lui-même.
- Aucun partage entre collaborateurs, contrôle de rôles, récupération par email ou récupération de mot de passe intégrés.
- Ne pas exposer ce serveur directement sur Internet. Un déploiement équipe nécessite HTTPS, configuration des origines, authentification et autorisations adaptées, sauvegardes, quotas et supervision.

## Mode réseau local explicite (LAN)

Créer d'abord le compte avec le serveur lié à `127.0.0.1`, puis arrêter ce serveur. Construire l'application avec `npm run build`. Pour un essai sur un réseau privé de confiance, remplacer l'adresse d'exemple par l'adresse LAN réelle de l'ordinateur :

```sh
HOST=0.0.0.0 ALLOWED_ORIGINS=http://192.168.1.20:4311 npm run server
```

Ouvrir **cette même adresse** sur l'ordinateur et sur les appareils. Chaque appareil se connecte au même compte puis envoie ou télécharge manuellement les projets et médias. Les changements locaux ne se diffusent pas automatiquement. Les fichiers du navigateur restent associés à leur origine : passer de localhost à l'adresse LAN ne transporte pas les données locales ; utiliser la sauvegarde serveur ou une archive.

`HOST` reste `127.0.0.1` si absent. Toute autre interface non locale exige des `ALLOWED_ORIGINS` explicites **et un compte déjà créé** ; le serveur refuse sinon de démarrer. Cette variable accepte une liste d'origines exactes séparées par des virgules, sans chemin ni slash final ; elle remplace les valeurs par défaut. Le pare-feu doit autoriser le port 4311 si l'accès LAN est souhaité. La configuration ne modifie aucun réglage du pare-feu ou du routeur.

L'HTTP LAN n'est pas chiffré et sert uniquement aux essais sur réseau de confiance. Pour utiliser des identifiants et données réels sur plusieurs appareils, placer le serveur derrière un accès HTTPS de confiance et déclarer son origine HTTPS dans `ALLOWED_ORIGINS`. Les sessions ouvertes avec une origine HTTPS reçoivent un cookie `Secure`. Le serveur Node ne délivre pas de certificat TLS et ne configure pas le proxy HTTPS : cette infrastructure reste à installer. Ne pas faire confiance à un en-tête de proxy pour contourner le contrôle d'origine.

HTTPS est également requis sur téléphone pour valider l'installation PWA et le service worker ; une adresse LAN HTTP n'est pas une validation du fonctionnement hors ligne sur iOS/Android. Fermer le serveur coupe les transferts entre appareils mais laisse les données déjà stockées dans chaque navigateur utilisables. Les tests automatiques couvrent authentification, origines, conflit concurrent, isolation des fichiers et médias immuables ; les transferts réels entre téléphone et ordinateur restent à tester sur le réseau cible.

## Cache de production

La version du service worker est désormais calculée automatiquement à chaque build depuis son contenu et la liste des assets. Tous les chunks et les polices WOFF/WOFF2 sont précachés ; il n’est plus nécessaire d’incrémenter manuellement `v1`. Le statut est affiché dans Fichiers & sauvegarde. Fermer les anciens onglets permet l’activation d’une mise à jour en attente.
