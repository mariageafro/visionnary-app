# Estimations Google Maps

Le calcul du planning fonctionne sans compte Google à partir d'une durée saisie. Aucune clé ni requête payante n'est activée par défaut.

Pour activer les estimations :
1. Créer un projet Google Maps Platform, activer la facturation et l'API Routes.
2. Créer une clé restreinte à Routes API et aux adresses IP du serveur selon son hébergement. Définir quotas et alertes dans le projet Google.
3. Configurer `GOOGLE_MAPS_API_KEY` dans l'environnement privé du serveur Node et le redémarrer. Ne jamais placer la clé dans une variable VITE, le code client ou un fichier public.
4. Se connecter au compte Visionnary via Compte & synchronisation. En développement Vite relaie `/api` vers le port 4311.
5. Renseigner deux adresses et une date future dans Trajets & installation puis Estimer avec Google.

L'appel est déclenché explicitement, pas en boucle. Google retourne une prévision de trafic à l'heure de départ calculée (ou une hypothèse initiale de 30 minutes si aucune durée n'est encore renseignée). Recalculer après une modification importante de l'horaire ; le planning conserve la durée en local et marque les estimations anciennes. Le trafic varie, la marge reste nécessaire.

Documentation : https://developers.google.com/maps/documentation/routes/compute_route_directions
https://developers.google.com/maps/documentation/routes/config_trade_offs

Les adresses et l'heure prévue sont envoyées à Google seulement lors de la demande d'estimation. La clé reste sur le serveur. Une durée manuelle n'est jamais présentée comme du trafic mesuré.
