# Serveur de synchro en ligne — pour une vraie collaboration d'équipe

Le site public (`mariageafro.github.io/visionnary-app/`) est **statique** : chaque visiteur a sa
propre copie locale, personne ne voit les modifications des autres. Ce n'est pas suffisant pour
une équipe qui doit cocher des tâches, ajouter des plans ou valider des poses ensemble sur un
mariage réel.

Le serveur qui règle ça **existe déjà** : `server/index.mjs`. Compte protégé par mot de passe,
un seul espace de travail partagé, détection de conflit (deux écritures en même temps → la
deuxième est refusée avec un message clair plutôt que d'écraser la première). Testé
(`server/server.test.mjs`, 4 tests verts). Il ne tournait jusqu'ici qu'en local (port 4311).

## Ce qui a été préparé

- Le serveur écoute maintenant sur `$PORT` si la variable existe (sinon 4311 comme avant) —
  obligatoire pour n'importe quel hébergeur cloud, qui impose son propre port.
- Le garde-fou existant est volontairement resté strict : dès que `HOST` n'est pas `127.0.0.1` /
  `localhost`, le serveur **refuse de démarrer** sans `ALLOWED_ORIGINS` explicite, et refuse de
  démarrer si aucun compte n'a encore été créé (`data/account.json` absent). Ça évite qu'un
  serveur tout juste déployé, sans mot de passe encore posé, soit ouvert à qui le trouve.

## Ce qu'il reste à faire — et pourquoi ce n'est pas quelque chose que je peux faire à ta place

1. **Créer le compte toi-même, en local d'abord.** `npm run server` (port 4311), ouvre l'app,
   panneau Synchro (`#/sync`), crée le compte avec **ton** mot de passe. Je ne dois jamais choisir
   ou saisir un mot de passe à ta place — même pour un outil interne.
2. **Choisir un hébergeur avec un disque qui survit aux redémarrages.** C'est le point le plus
   important : beaucoup d'offres « gratuites » (Render, Railway…) remettent le disque à zéro à
   chaque redéploiement ou réveil du service. Pour de vraies données de mariage, ce n'est **pas**
   acceptable — un redéploiement effacerait le compte et le travail de l'équipe sans prévenir.
   Recommandation : un plan payant modeste avec disque persistant (Render Starter ≈ 7 $/mois avec
   un disque attaché, Fly.io avec un volume, ou une petite VM Hostinger puisque vous en avez déjà
   une pour mariageafro.net). Je peux préparer la configuration exacte une fois le choix fait — je
   ne peux pas créer le compte d'hébergement à ta place.
3. **Copier `data/` du compte local vers le disque persistant du serveur déployé**, pour ne pas
   repartir de zéro (ou recréer le compte directement là-bas).
4. Une fois le serveur en ligne avec une URL stable (ex. `https://sync.mariageafro.net` ou
   `https://visionnary-sync.onrender.com`) : dans l'app, panneau Synchro → se connecter à
   cette URL. Chaque membre de l'équipe fait pareil avec le même compte partagé.

## En attendant

Le site public reste ce qu'il est : une vitrine consultable par tous, chacun avec sa propre copie
locale — utile pour montrer le rendu, pas pour cocher des tâches en équipe. Pour préparer les deux
prochains mariages dès maintenant, la méthode qui marche déjà : travailler en local
(`npm run dev`, `http://127.0.0.1:4730`), exporter une sauvegarde ZIP (`Fichiers & sauvegarde`) et
la faire circuler à l'équipe par un autre moyen (mail, message) en attendant le serveur en ligne.
