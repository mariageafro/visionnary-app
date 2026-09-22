# VISIONNARY — MASTER PROMPT CODEX
## Application complète de préparation, réalisation et suivi de tournages de mariage
Version consolidée — mobile + tablette + desktop — offline-first

> IMPORTANT POUR CODEX  
> La maquette visuelle jointe dans la discussion sert uniquement de **référence d’identité visuelle** (dark luxury, ivoire, doré, premium, lisible).  
> Le but n’est **pas** de reproduire une simple maquette statique. Il faut concevoir et construire **une vraie application fonctionnelle**, éditable et exploitable sur le terrain, avec une architecture produit cohérente, des données réelles, des workflows, des états, des interactions, des exports et une synchronisation multi-supports.

---

# 0. OBJECTIF PRODUIT

Créer **VISIONNARY**, un véritable assistant de réalisation pour les équipes photo/vidéo de mariage.

L’application doit transformer :

**INSPIRATIONS → REPÉRAGE → DÉCOUPAGE → SHOT LIST → PLACEMENT CAMÉRAS → LUMIÈRE / SON → MISSIONS ÉQUIPE → JOUR J → SUIVI DES PLANS → PRÉ-MONTAGE → EXPORTS / DAVINCI RESOLVE**

VISIONNARY doit permettre à une équipe de préparer un mariage presque comme une production cinéma, puis d’exécuter cette préparation très rapidement sur le terrain.

Le produit doit être :
- premium ;
- très visuel ;
- rapide ;
- agréable ;
- simple en apparence ;
- puissant en profondeur ;
- personnalisable ;
- pensé pour le mariage haut de gamme ;
- adapté aux styles luxe, Vogue / éditorial, cinématique, dynamique et néoclassique ;
- efficace aussi bien pour la vidéo que pour la photo.

Les deux premiers projets pilotes pourront être :
- **Mariage 24 — Domaine des Rois** ;
- **Mariage 26**.

Ces noms sont uniquement des exemples de projets et ne doivent pas être codés en dur.

---

# 1. PLATEFORMES

L’application doit fonctionner sur :

## Mobile
Priorité : exécution terrain.

Usages principaux :
- voir l’étape en cours ;
- voir le prochain plan ;
- vérifier l’image / vidéo de référence ;
- voir le cadrage attendu ;
- voir le mouvement ;
- voir sa mission ;
- lancer un minuteur ;
- cocher une tâche ;
- recevoir un rappel ;
- voir ce qu’il manque ;
- passer au plan suivant ;
- fonctionner hors ligne.

## Tablette
Priorité : direction / réalisation / briefing.

Usages :
- storyboard ;
- plans du lieu ;
- placement multicam ;
- animation de mouvements ;
- briefing équipe ;
- inspirations ;
- poses ;
- suivi global du tournage ;
- modifications rapides.

## Desktop
Priorité : préparation avancée.

Usages :
- drag & drop ;
- import massif ;
- création de templates ;
- découpage détaillé ;
- pré-timeline ;
- gestion des médias ;
- planification des lieux ;
- placement caméra ;
- édition complète ;
- exports ;
- préparation de plusieurs mariages.

## Règle fondamentale multi-supports

Sur les trois supports, l’utilisateur doit pouvoir :
- créer ;
- modifier ;
- supprimer ;
- dupliquer ;
- archiver ;
- réordonner ;
- ajouter des médias ;
- affecter une personne ;
- modifier un plan ;
- créer une scène ;
- créer une checklist ;
- créer un rappel ;
- exporter.

L’interface change selon la taille de l’écran, mais les données restent communes.

Prévoir une architecture **offline-first** :
- données du mariage téléchargeables avant le jour J ;
- images et vidéos de référence disponibles hors ligne ;
- checklists disponibles hors ligne ;
- modifications locales ;
- file d’attente de synchronisation ;
- résolution claire des conflits au retour du réseau ;
- indicateur de dernière synchronisation.

---

# 2. IDENTITÉ VISUELLE

Utiliser la maquette jointe comme direction visuelle officielle.

Style :
- dark luxury ;
- noir profond ;
- anthracite ;
- ivoire ;
- beige chaud ;
- doré champagne ;
- interface cinéma / mariage premium ;
- arrondis élégants ;
- ombres fines ;
- photos immersives ;
- typographie très lisible.

Ne pas sacrifier l’ergonomie au design.

Prévoir :
- mode sombre ;
- mode terrain haute lisibilité ;
- mode nuit discret ;
- éventuellement un mode clair pour desktop ;
- gros boutons tactiles ;
- informations essentielles visibles en quelques secondes ;
- contrastes suffisants en extérieur.

L’application doit donner envie d’être utilisée pendant un tournage.

---

# 3. PHILOSOPHIE UX

VISIONNARY possède deux profondeurs d’utilisation.

## A. MODE PRÉPARATION

Complet et riche :
- création ;
- analyse ;
- planification ;
- import ;
- annotations ;
- animation ;
- placement ;
- templates ;
- pré-montage ;
- exports.

## B. MODE JOUR J

Minimal et extrêmement lisible.

Le cadreur ou réalisateur doit pouvoir comprendre en 3 à 5 secondes :
- ce qu’il doit filmer ;
- où il doit se mettre ;
- avec quelle caméra / focale ;
- quel cadrage ;
- quel mouvement ;
- quelle référence ;
- combien de temps il reste ;
- ce qui vient ensuite.

Ne jamais transformer le mode jour J en usine à gaz.

---

# 4. STRUCTURE CENTRALE DES DONNÉES

Prévoir au minimum les entités suivantes :

- User
- Team
- TeamMember
- WeddingProject
- Couple
- Contact
- Venue / Location
- LocationZone
- WeddingStage
- Scene
- Shot
- Take
- PhotoPose
- Inspiration
- InspirationClip
- Storyboard
- CameraPlacement
- CameraMovement
- LightPlan
- LightSource
- AudioPlan
- AudioSource
- Interview
- InterviewQuestion
- Transition
- Equipment
- EquipmentAssignment
- Task
- Checklist
- ChecklistItem
- Reminder
- TimelineEvent
- Briefing
- Template
- Preset
- WeatherSnapshot
- SunData
- Document
- Note
- ExportPackage
- PreEditTimeline
- MusicCue
- StorytellingAudioCue
- SyncPlan / TimecodePlan
- BackupPlan
- UserPreference
- ProjectVersion / History

Toutes les relations doivent être pensées pour permettre la duplication et les templates.

---

# 5. CRÉATION D’UN NOUVEAU MARIAGE

Créer un assistant de configuration initiale.

Demander notamment :
- nom du couple ;
- date ;
- lieux ;
- heures ;
- cérémonie civile oui/non ;
- cérémonie religieuse oui/non ;
- cérémonie traditionnelle oui/non ;
- cérémonie laïque oui/non ;
- réception oui/non ;
- nombre d’invités ;
- filles d’honneur oui/non ;
- garçons d’honneur oui/non ;
- first look oui/non ;
- flashmob oui/non ;
- ouverture de bal oui/non ;
- discours oui/non ;
- interviews oui/non ;
- drone envisagé oui/non ;
- photo oui/non ;
- vidéo oui/non ;
- pré-wedding oui/non ;
- Same-Day Edit éventuel ;
- live éventuel ;
- style artistique ;
- durée cible du film final ;
- durée teaser / reel ;
- niveau de dynamisme ;
- importance des fast cuts ;
- moments prioritaires ;
- demandes du couple ;
- traditions particulières ;
- contraintes.

Chaque choix doit personnaliser automatiquement le squelette du projet.

Exemple :
si le mariage n’a pas de mairie, ne pas imposer une section mairie.

Si le mariage a une cérémonie traditionnelle, permettre d’ajouter ses propres sous-étapes.

---

# 6. TABLEAU DE BORD GÉNÉRAL

Afficher :
- prochain mariage ;
- J-X ;
- progression globale ;
- progression préparation ;
- progression des plans ;
- progression checklist ;
- nombre de scènes ;
- nombre de plans ;
- nombre d’opérateurs ;
- alertes ;
- rappels ;
- météo ;
- trajet ;
- lever du soleil ;
- coucher du soleil ;
- golden hour ;
- blue hour ;
- tâches restantes ;
- documents manquants ;
- état offline / sync.

Raccourcis :
- Inspirations
- Plans & scènes
- Lieux
- Équipe
- Matériel
- Timeline
- Checklist
- Rappels
- Briefing
- Audio
- Lumière
- Placement caméras
- Pré-montage

---

# 7. LISTE DES MARIAGES

Vues :
- à venir ;
- en préparation ;
- jour J ;
- montage ;
- terminé ;
- brouillon ;
- archivé.

Afficher :
- nom ;
- date ;
- lieu ;
- style ;
- progression % ;
- nombre de plans ;
- nombre de scènes ;
- couverture média ;
- équipe ;
- alertes.

Prévoir :
- calendrier ;
- recherche ;
- filtres ;
- tri ;
- duplication ;
- création depuis template.

---

# 8. FICHE MARIAGE

Centraliser :
- couple ;
- date ;
- horaires ;
- lieux ;
- nombre d’invités ;
- style ;
- prestations ;
- équipe ;
- contacts ;
- wedding planner ;
- déroulé ;
- notes ;
- documents ;
- traditions ;
- personnes importantes ;
- demandes clients.

Créer trois champs très visibles :
- **À CAPTURER ABSOLUMENT**
- **À ÉVITER**
- **PERSONNES / MOMENTS PRIORITAIRES**

Ajouter une zone :
- direction artistique ;
- palettes ;
- inspirations principales ;
- musique / tonalité ;
- rythme du film ;
- mots-clés du mariage.

---

# 9. DÉROULÉ DU JOUR J

Créer :
- vue timeline ;
- vue liste ;
- vue par lieu ;
- vue par opérateur ;
- vue régie ;
- vue simple terrain.

Chaque bloc contient :
- heure prévue ;
- heure réelle ;
- durée prévue ;
- retard / avance ;
- lieu ;
- scène ;
- nombre de plans ;
- équipe ;
- checklist ;
- rappels ;
- lumière ;
- audio ;
- matériel nécessaire.

Permettre de lancer le chronomètre d’une étape.

Afficher :
- temps écoulé ;
- temps restant ;
- T-5 minutes ;
- T-2 minutes ;
- dépassement.

Si la journée prend du retard :
- afficher le décalage ;
- recalculer les horaires prévisionnels ;
- mettre en évidence les scènes à compresser ;
- ne jamais modifier silencieusement les horaires sans validation du responsable.

---

# 10. CHECKLISTS

Créer des checklists :
- avant départ ;
- matériel ;
- arrivée lieu ;
- préparatifs ;
- mairie ;
- cérémonie ;
- cocktail ;
- couple shoot ;
- ouverture de bal ;
- flashmob ;
- discours ;
- soirée ;
- fin de journée ;
- sauvegarde.

Chaque checklist :
- personnalisable ;
- assignable ;
- duplicable ;
- transformable en template.

Exemples importants :
- batteries chargées ;
- cartes vides / formatées ;
- ND ;
- casque audio ;
- drone ;
- test transmetteur ;
- intercom ;
- micro marié ;
- micro mariée ;
- enregistreur table DJ ;
- test audio ;
- plans de salle vide ;
- retrait micros ;
- récupération enregistreurs ;
- sauvegarde.

---

# 11. RAPPELS INTELLIGENTS

Créer plusieurs types de déclencheurs :
- heure fixe ;
- X minutes avant une scène ;
- X minutes après une scène ;
- quand une scène commence ;
- quand une scène se termine ;
- quand une tâche est cochée ;
- quand un plan critique reste non tourné ;
- selon l’heure du coucher du soleil.

Exemples de rappels liés :
- poser micro marié → plus tard retirer micro marié ;
- poser micro mariée → plus tard retirer micro mariée ;
- brancher enregistreur DJ → récupérer enregistreur DJ ;
- lancer drone → récupérer drone / vérifier batteries ;
- mettre lumière → éteindre / récupérer lumière ;
- démarrer sauvegarde → confirmer seconde copie.

Prévoir des rappels en chaîne :
**préparer → exécuter → vérifier → récupérer → sécuriser**.

---

# 12. INSPIRATIONS

Importer :
- photos ;
- vidéos ;
- fichiers ;
- galerie mobile ;
- desktop drag & drop ;
- liens de référence quand nécessaire.

Catégories :
- Lieux
- Mariée
- Marié
- Couple
- Garçons d’honneur
- Filles d’honneur
- Famille
- Cérémonie
- Mairie
- Traditionnel
- Cocktail
- Dîner
- Soirée
- Décor
- B-roll
- Transitions
- Lumière
- Drone
- Photo
- Poses
- Flashmob
- Ouverture de bal
- Interviews
- Sound design
- Éditorial / Vogue

Chaque inspiration :
- tags ;
- notes ;
- favoris ;
- scène liée ;
- plan lié ;
- transition liée ;
- pose liée ;
- opérateur concerné ;
- exportable.

## Découpage des vidéos d’inspiration

Très important :
une vidéo de référence peut contenir plusieurs idées.

Permettre de :
- ouvrir la vidéo ;
- définir IN / OUT ;
- créer plusieurs clips de référence ;
- transformer chaque clip en plan distinct ;
- conserver le lien avec la vidéo source.

Exemple :
une vidéo inspiration de 20 secondes peut produire :
- Plan A ;
- Plan B ;
- transition C ;
- pose D.

---

# 13. SHOT LIST / PLANS & SCÈNES

Organisation :
WeddingStage → Scene → Shot → Take.

États d’un plan :
- prévu ;
- prêt ;
- en cours ;
- tourné ;
- excellent ;
- à refaire ;
- sauté ;
- impossible ;
- bonus.

Priorités :
- MUST HAVE ;
- IMPORTANT ;
- BONUS.

Afficher une progression :
- 12 / 15 plans tournés ;
- % ;
- plans critiques manquants.

Créer aussi un **Coverage Score** simple basé sur les catégories réellement couvertes, sans remplacer le jugement humain.

---

# 14. CALCULATEUR DE COUVERTURE / NOMBRE DE PLANS

Fonction importante.

L’utilisateur indique :
- durée du film final ;
- durée du teaser ;
- style ;
- niveau de fast cuts ;
- nombre d’étapes ;
- nombre de caméras ;
- importance du B-roll ;
- durée moyenne souhaitée des plans.

L’application doit estimer :
- nombre recommandé de plans ;
- minimum indispensable ;
- quantité de B-roll ;
- quantité de détails ;
- quantité de plans couple ;
- quantité de plans mariée seule ;
- marié seul ;
- filles d’honneur ;
- garçons d’honneur ;
- famille ;
- cérémonie ;
- réactions ;
- plans d’ambiance ;
- plans de sécurité ;
- plans drone ;
- transitions.

Ne pas présenter ce calcul comme une vérité absolue : c’est un assistant adaptable.

Prévoir des presets :
- Cinématique lent
- Luxe éditorial / Vogue
- Néoclassique
- Dynamique
- Fast Cuts
- Documentaire
- Hybride

---

# 15. FICHE DÉTAILLÉE D’UN PLAN

Chaque plan doit contenir :

## Identité
- numéro ;
- titre ;
- scène ;
- étape ;
- priorité ;
- statut.

## Référence
- image de référence ;
- vidéo de référence ;
- clip IN/OUT ;
- rendu souhaité.

## Type de plan
- establishing ;
- master ;
- très large ;
- large ;
- plein pied ;
- américain ;
- taille ;
- poitrine ;
- rapproché ;
- gros plan ;
- très gros plan ;
- détail ;
- insert ;
- réaction ;
- cutaway ;
- plan de sécurité.

## Angle
- face ;
- 3/4 ;
- profil ;
- dos ;
- plongée ;
- contre-plongée ;
- top shot ;
- shoulder ;
- POV ;
- low angle ;
- high angle.

## Composition
- règle des tiers ;
- centré ;
- symétrie ;
- espace négatif ;
- leading lines ;
- profondeur ;
- foreground ;
- background.

## Focale
- focale cible ;
- objectif suggéré ;
- possibilité d’indiquer alternatives.

## Caméra
- modèle ;
- profil ;
- fréquence ;
- shutter ;
- ISO ;
- ouverture ;
- WB ;
- ND ;
- stabilisation.

## Mouvement
- fixe ;
- push in ;
- push out ;
- travelling ;
- lateral tracking ;
- orbit ;
- arc ;
- pan ;
- tilt ;
- crane / jib ;
- handheld ;
- gimbal ;
- slider ;
- reveal ;
- whip ;
- drone.

## Sujet
- qui est présent ;
- position ;
- pose ;
- action ;
- direction du regard ;
- mouvement ;
- vitesse du mouvement.

## Lumière
- naturelle / artificielle ;
- orientation ;
- key ;
- fill ;
- rim / backlight ;
- contre-jour ;
- réflecteur ;
- lumière disponible ;
- lumière à ajouter ;
- effet voulu.

## Son
- son requis oui/non ;
- source ;
- micro ;
- ambiance ;
- dialogue ;
- speech ;
- sound design prévu.

## Production
- opérateur ;
- caméra ;
- durée de tournage allouée ;
- accessoires ;
- matériel ;
- dépendances ;
- note ;
- transition suivante ;
- plan précédent.

---

# 16. GESTION DES PRISES

Chaque plan peut avoir plusieurs prises.

Créer :
- Take 1
- Take 2
- Take 3…

Pour chaque prise :
- OK ;
- favorite ;
- best take ;
- problème focus ;
- problème son ;
- problème cadrage ;
- refaire ;
- commentaire.

Permettre de sélectionner :
**BEST TAKE**.

Même si l’application n’enregistre pas directement les rushs, elle doit pouvoir conserver la notation utile au montage.

---

# 17. CONTINUITÉ CINÉMA

Ajouter des aides discrètes :
- règle des 180° ;
- direction des mouvements ;
- direction du regard ;
- raccord gauche / droite ;
- continuité accessoires ;
- position des mains ;
- position du couple ;
- continuité lumière ;
- continuité décor.

Permettre un avertissement si deux plans successifs risquent de casser la direction visuelle.

---

# 18. LIEUX

Ajouter autant de lieux que nécessaire :
- maison mariée ;
- maison marié ;
- hôtel ;
- mairie ;
- église ;
- domaine ;
- parc ;
- salle ;
- lieu traditionnel ;
- lieu couple shoot.

Pour chaque lieu :
- adresse ;
- GPS ;
- accès ;
- parking ;
- contact ;
- horaires ;
- photos ;
- vidéos ;
- documents ;
- zones internes.

Créer des zones :
- façade ;
- jardin ;
- escalier ;
- balcon ;
- chambre ;
- couloir ;
- hall ;
- autel ;
- allée ;
- piste ;
- scène ;
- tables ;
- cuisine / prestataires ;
- parking ;
- spot drone.

---

# 19. REPÉRAGE VISUEL

Sur une photo du lieu, permettre :
- annotation ;
- flèches ;
- zones ;
- repères ;
- caméra ;
- lumière ;
- sujet ;
- déplacement.

Créer des notes :
- meilleur angle ;
- arrière-plan ;
- obstacle ;
- bruit ;
- soleil ;
- contre-jour ;
- réflecteur ;
- sécurité ;
- drone.

---

# 20. PLACEMENT MULTICAM & ANIMATION

Module central.

Créer une vue :
- 2D ;
- éventuellement 2.5D ;
- extensible vers 3D plus tard.

Éléments à déposer :
- mariée ;
- marié ;
- couple ;
- officiant ;
- témoins ;
- garçons d’honneur ;
- filles d’honneur ;
- invités ;
- enfants ;
- DJ ;
- musiciens ;
- danseurs ;
- caméra A/B/C/D ;
- photographe ;
- drone ;
- lumière ;
- micro ;
- enceinte ;
- décor ;
- portes ;
- tables ;
- escaliers ;
- balcon ;
- piste.

Chaque caméra :
- position ;
- hauteur ;
- orientation ;
- focale ;
- valeur de plan ;
- opérateur ;
- rôle ;
- champ approximatif ;
- image de référence attendue.

Exemple cérémonie :
- Cam A côté gauche : portrait mariée ;
- Cam B côté droit : portrait marié ;
- Cam C centre : plan large ;
- Cam D : réactions invités ;
- Drone : plan d’ensemble extérieur quand autorisé.

## Animation

Permettre de dessiner :
- trajectoire mariée ;
- trajectoire marié ;
- trajectoire couple ;
- trajectoire caméra ;
- travelling ;
- push out ;
- orbit ;
- pan ;
- drone.

Bouton PLAY :
- le sujet se déplace ;
- la caméra se déplace ;
- les flèches indiquent le mouvement ;
- possibilité de visualiser la durée.

Chaque animation peut être exportée.

---

# 21. EXPORT D’UNE SCÈNE / D’UN PLAN

Pour une personne qui n’a pas VISIONNARY, permettre :
- PNG ;
- PDF ;
- fiche image ;
- mini vidéo MP4 ;
- boucle animée ;
- pack de scène ;
- éventuellement lien web lecture seule.

Le pack cadreur doit pouvoir contenir :
- heure ;
- lieu ;
- caméra ;
- position ;
- focale ;
- cadrage ;
- mouvement ;
- image de référence ;
- vidéo de référence ;
- animation ;
- mission ;
- rappel ;
- notes.

---

# 22. LUMIÈRE

Créer une vraie section lumière.

## Données solaires
Pour chaque lieu et date :
- lever du soleil ;
- coucher du soleil ;
- golden hour ;
- blue hour ;
- direction approximative du soleil ;
- évolution dans la journée.

## Plan lumière
Pour chaque scène :
- lumière naturelle ;
- fenêtre ;
- soleil ;
- ombre ;
- contre-jour ;
- key ;
- fill ;
- rim ;
- LED ;
- soft light ;
- bounce ;
- réflecteur ;
- practicals ;
- bougies ;
- lumières salle ;
- lumière DJ.

## Presets
- Editorial portrait
- Vogue / dramatic
- Soft bridal
- Golden hour
- Backlight couple
- Interview
- First dance
- Flashmob
- Dancefloor
- Cake
- Night exterior

Pouvoir afficher un petit schéma sujet / source / caméra.

---

# 23. OUVERTURE DE BAL / DANSE / FLASHMOB

Créer des presets spécifiques.

Permettre :
- placement du couple ;
- placement invités ;
- position caméras ;
- caméra balcon / plongée ;
- drone si possible ;
- opérateur gimbal ;
- plans réactions ;
- plans pieds ;
- gros plans mains ;
- plan sécurité ;
- plans foule ;
- mouvements de lumière ;
- effets lumière ;
- fumée / étincelles si présentes ;
- transitions possibles.

Prévoir une animation du dispositif.

---

# 24. PHOTO / POSES

Créer une bibliothèque de poses.

Catégories :
- mariée seule ;
- marié seul ;
- couple ;
- garçons d’honneur ;
- filles d’honneur ;
- famille ;
- parents ;
- éditorial Vogue ;
- naturel ;
- mouvement ;
- marche ;
- escaliers ;
- assis ;
- miroir ;
- fenêtre ;
- voile ;
- voiture ;
- nuit.

Chaque pose :
- image ;
- vidéo facultative ;
- position sujet ;
- mains ;
- regard ;
- orientation ;
- focale ;
- lumière ;
- durée ;
- instruction simple à donner au couple.

Sur le terrain :
bouton **POSE SUIVANTE**.

---

# 25. DRONE

Bibliothèque presets :
- establishing ;
- top down ;
- reveal ;
- push in ;
- pull out ;
- orbit ;
- tracking ;
- flyover ;
- rise ;
- descent ;
- follow car ;
- exit church / venue establishing.

Pour chaque drone shot :
- lieu ;
- heure ;
- météo ;
- vent ;
- batterie ;
- priorité ;
- opérateur ;
- sécurité ;
- réglementation / autorisation à vérifier ;
- plan alternatif au sol.

---

# 26. AUDIO

Créer une section audio complète.

Sources :
- micro marié ;
- micro mariée ;
- officiant ;
- témoin ;
- DJ / console ;
- enregistreur ;
- ambiance ;
- caméra ;
- secours.

Checklist :
- branché ;
- armé ;
- enregistrement actif ;
- niveaux ;
- casque ;
- batterie ;
- carte ;
- récupération.

Prévoir un plan de synchronisation :
- timecode si utilisé ;
- référence clap / sync ;
- appareil source ;
- notes multicam.

---

# 27. INTERVIEWS

Pour chaque interview :
- personne ;
- relation ;
- lieu ;
- heure ;
- durée ;
- caméra ;
- lumière ;
- micro ;
- questions ;
- réponses / notes ;
- meilleur passage.

Bibliothèque de questions :
- mariée ;
- marié ;
- parents ;
- témoins ;
- famille ;
- amis ;
- wedding planner.

Prévoir les interviews “à chaud” et les témoignages.

---

# 28. STORYTELLING AUDIO

Permettre de taguer les éléments de narration.

Catégories recommandées :
- welcome ;
- power statements ;
- bride ;
- groom ;
- first look ;
- vows ;
- first kiss ;
- wishes ;
- speeches ;
- reactions ;
- ambience.

Ces catégories doivent pouvoir être liées à la pré-timeline.

---

# 29. ÉQUIPE

Pour chaque membre :
- photo ;
- nom ;
- rôle ;
- téléphone ;
- disponibilité ;
- matériel ;
- missions ;
- scènes ;
- caméras ;
- checklists ;
- briefings.

Rôles types :
- réalisateur ;
- cadreur ;
- photographe ;
- assistant ;
- coordinateur ;
- superviseur ;
- monteur ;
- drone ;
- audio.

Créer une vue :
**QUI FAIT QUOI ?**

Détecter les conflits :
ex. même opérateur assigné à deux scènes simultanées.

---

# 30. BRIEFINGS

Créer :
- briefing général ;
- briefing mariage ;
- briefing opérateur ;
- briefing scène ;
- briefing cérémonie ;
- briefing flashmob ;
- briefing lumière ;
- briefing audio ;
- briefing matériel.

Chaque briefing :
- heure ;
- lieu ;
- objectif ;
- style ;
- mission ;
- plan ;
- références ;
- contraintes ;
- points d’attention.

Export :
- PDF ;
- PNG ;
- message résumé ;
- pack scène.

---

# 31. MÉTÉO / TRAJET / SOLEIL

Afficher :
- météo ;
- pluie ;
- température ;
- vent ;
- rafales ;
- heure par heure ;
- lever / coucher ;
- golden hour ;
- blue hour ;
- trajet ;
- temps de route ;
- heure de départ recommandée.

Créer des alertes :
- pluie possible ;
- vent drone ;
- coucher de soleil proche ;
- retard trajet.

---

# 32. MATÉRIEL

Créer un inventaire personnalisable.

Catégories :
- caméras ;
- objectifs ;
- batteries ;
- cartes ;
- gimbals ;
- trépieds ;
- lumière ;
- drone ;
- audio ;
- intercom ;
- filtres ;
- câbles ;
- chargeurs ;
- SSD ;
- accessoires.

Possibilité de :
- assigner matériel à opérateur ;
- assigner matériel à scène ;
- marquer chargé ;
- marquer présent ;
- marquer retour ;
- signaler panne.

---

# 33. MISSIONS / TODO

Chaque utilisateur possède :
- Mes missions
- Mes plans
- Mes rappels
- Ma checklist
- Mon matériel
- Mes horaires

Une mission contient :
- titre ;
- moment ;
- lieu ;
- plan lié ;
- priorité ;
- statut ;
- notes.

---

# 34. PRÉ-MONTAGE

Créer un éditeur de timeline préparatoire.

Ne pas chercher à remplacer DaVinci Resolve.

But :
prévisualiser la structure du film.

Pistes possibles :
- image principale ;
- B-roll ;
- drone ;
- audio ;
- discours ;
- musique ;
- transitions ;
- notes ;
- placeholders.

Fonctions :
- drag & drop ;
- ordre ;
- durée approximative ;
- placeholder référence ;
- rythme ;
- sections.

Styles :
- slow cinematic ;
- luxury editorial ;
- Vogue ;
- neoclassical ;
- dynamic ;
- fast cut.

---

# 35. STRUCTURE NARRATIVE

Prévoir des templates de structure.

Exemple film long :
1. intro cinématique ;
2. storyline ;
3. préparatifs ;
4. cérémonie ;
5. couple / cocktail ;
6. réception ;
7. discours ;
8. ouverture de bal ;
9. soirée ;
10. outro.

Permettre à l’utilisateur de créer sa propre structure.

Prévoir aussi des formats :
- teaser 30 sec ;
- reel ;
- teaser 1–2 min ;
- film 5–20 min ;
- film 30–45 min ;
- film 45+ min.

---

# 36. FAST CUTS / RYTHME / EFFETS

Chaque séquence peut recevoir un style :
- lent ;
- normal ;
- dynamique ;
- fast cuts.

Ajouter des suggestions de couverture :
si une séquence est en fast cuts, conseiller plus de :
- détails ;
- inserts ;
- changement de valeurs de plans ;
- micro mouvements ;
- angles ;
- B-roll ;
- réactions.

Bibliothèque d’effets / intentions :
- match cut ;
- speed ramp ;
- whip ;
- foreground transition ;
- flash ;
- flare ;
- rack focus ;
- silhouette ;
- reflection ;
- shadow ;
- reveal.

Ce sont des aides de préparation, pas des effets destructifs appliqués automatiquement.

---

# 37. TRANSITIONS

Créer une bibliothèque.

Deux familles :
## Transition de tournage
créée physiquement à la prise.

## Transition de montage
prévue pour relier les plans.

Chaque transition :
- source ;
- cible ;
- direction ;
- référence vidéo ;
- mouvement ;
- opérateur ;
- durée ;
- instructions.

Afficher :
**Plan 12 → Transition → Plan 13**

---

# 38. SAUVEGARDE / FICHIERS

Créer :
- notes de sauvegarde ;
- état cartes ;
- SSD principal ;
- SSD backup ;
- nombre de copies ;
- statut vérification.

À la fin de journée :
- cartes récupérées ;
- audio récupéré ;
- drone récupéré ;
- fichiers vérifiés ;
- copie 1 ;
- copie 2 ;
- matériel rangé.

---

# 39. EXPORT POST-PRODUCTION

Prévoir autant que possible :
- PDF shot list ;
- CSV ;
- JSON sauvegarde projet ;
- EDL ;
- XML compatible Resolve si techniquement pertinent ;
- rapport de tournage ;
- liste des BEST TAKES ;
- notes montage ;
- structure de pré-timeline.

Ne jamais dépendre d’un export propriétaire unique.

---

# 40. MODE FIN DE JOURNÉE

Checklist finale :
- enregistrements arrêtés ;
- micros récupérés ;
- batteries récupérées ;
- cartes récupérées ;
- drone récupéré ;
- rushs sécurisés ;
- backups ;
- plans manquants ;
- incidents ;
- notes montage.

Afficher un récapitulatif :
- plans prévus ;
- plans tournés ;
- plans excellents ;
- plans manquants ;
- tâches restantes ;
- sauvegardes ;
- incidents.

---

# 41. PLAN B / IMPREVUS

Chaque scène doit pouvoir contenir :
- plan principal ;
- plan B ;
- plan pluie ;
- plan manque de temps ;
- plan faible lumière ;
- plan drone impossible.

Un clic permet de basculer vers le plan alternatif.

---

# 42. TEMPLATES

Tout doit pouvoir devenir template :
- mariage complet ;
- étape ;
- scène ;
- shot list ;
- pose ;
- mouvement ;
- transition ;
- éclairage ;
- audio ;
- briefing ;
- checklist ;
- interview ;
- drone ;
- flashmob ;
- cérémonie ;
- pré-montage.

Permettre :
- duplication ;
- édition ;
- import ;
- export.

---

# 43. RECHERCHE & FILTRES

Recherche globale :
- plan ;
- personne ;
- lieu ;
- inspiration ;
- tâche ;
- caméra ;
- scène.

Filtres :
- à faire ;
- critique ;
- bonus ;
- par opérateur ;
- par caméra ;
- par lieu ;
- par étape ;
- photo / vidéo ;
- tourné / manquant ;
- lumière ;
- drone ;
- audio.

---

# 44. HISTORIQUE / ANNULATION

Pour les modifications importantes :
- undo / redo ;
- historique des modifications ;
- versions principales du projet.

Ne pas perdre une préparation entière à cause d’une mauvaise manipulation.

---

# 45. PARTAGE & PERMISSIONS

Rôles :
- propriétaire ;
- réalisateur ;
- opérateur ;
- photographe ;
- assistant ;
- lecture seule.

Chaque personne ne voit éventuellement que :
- ses missions ;
- ses plans ;
- son matériel ;
- ses rappels.

Le réalisateur garde la vue globale.

---

# 46. MODE TERRAIN

Interface volontairement simplifiée.

Afficher en priorité :
- heure ;
- retard / avance ;
- scène en cours ;
- temps restant ;
- prochain plan ;
- référence ;
- valeur de plan ;
- focale ;
- mouvement ;
- opérateur ;
- checklist ;
- bouton validation.

Boutons terrain :
- FAIT
- EXCELLENT
- À REFAIRE
- SAUTER
- PLAN SUIVANT
- VOIR RÉFÉRENCE
- VOIR ANIMATION

Prévoir mode grosse typographie.

---

# 47. NOTIFICATIONS

Ne pas spammer.

Catégories :
- critique ;
- timing ;
- lumière ;
- audio ;
- matériel ;
- mission ;
- météo ;
- sauvegarde.

L’utilisateur choisit :
- son ;
- vibration ;
- silencieux ;
- montre connectée si disponible plus tard.

---

# 48. ACCESSIBILITÉ TERRAIN

Prévoir :
- usage une main ;
- zones tactiles larges ;
- pas de textes minuscules ;
- gestes simples ;
- écran lisible au soleil ;
- mode nuit ;
- cache automatique du superflu en mode tournage.

---

# 49. SÉCURITÉ / BONNES PRATIQUES

Ne pas créer de système qui encourage une prise de risque.

Drone :
- rappeler réglementation locale ;
- météo ;
- batterie ;
- zones interdites ;
- plan alternatif.

Équipement :
- sauvegarde ;
- contrôle ;
- récupération.

---

# 50. PROPOSITION D’ARCHITECTURE TECHNIQUE

Avant de coder massivement, proposer une architecture adaptée à :
- iPhone ;
- iPad ;
- Android futur ;
- web desktop ;
- éventuellement desktop natif plus tard.

Priorité :
- code partagé ;
- offline-first ;
- performances ;
- stockage local ;
- sync ;
- médias optimisés ;
- cache vidéo ;
- base structurée.

Codex doit expliquer brièvement le choix technique avant implémentation.

Ne pas créer trois produits incohérents séparés.

---

# 51. APPROCHE DE DÉVELOPPEMENT

Procéder par phases.

## Phase 1 — Fondation
- navigation ;
- design system ;
- comptes ;
- projets ;
- données ;
- responsive.

## Phase 2 — Préparation
- mariage ;
- timeline ;
- lieux ;
- inspirations ;
- shot lists ;
- équipe.

## Phase 3 — Réalisation avancée
- multicam ;
- animation ;
- lumière ;
- audio ;
- photo ;
- drone ;
- interviews.

## Phase 4 — Terrain
- offline ;
- rappels ;
- timers ;
- mode tournage ;
- missions ;
- progression.

## Phase 5 — Pré-montage
- timeline ;
- storytelling ;
- transitions ;
- export Resolve.

## Phase 6 — Partage
- export ;
- briefs ;
- lecture sans application ;
- packs cadreur.

---

# 52. CRITÈRES DE QUALITÉ

Ne pas considérer une page terminée si :
- elle est seulement jolie mais non fonctionnelle ;
- les boutons ne font rien ;
- l’ajout / modification n’existe pas ;
- les données ne persistent pas ;
- mobile et desktop ne partagent pas les données ;
- le mode offline ne fonctionne pas pour les fonctions critiques ;
- les médias ne sont pas gérés ;
- l’état des plans n’est pas conservé.

---

# 53. IDÉES SUPPLÉMENTAIRES AUTORISÉES

Codex peut proposer de nouvelles fonctions si elles :
- simplifient le tournage ;
- évitent des oublis ;
- améliorent la narration ;
- réduisent le temps de préparation ;
- évitent les conflits équipe ;
- améliorent la sécurité des fichiers ;
- améliorent la qualité des images.

Avant d’ajouter une fonction importante :
- expliquer son bénéfice ;
- éviter le gadget ;
- préserver la simplicité terrain.

---

# 54. NON-NÉGOCIABLES

Ne jamais oublier :
- images de référence ;
- vidéos de référence ;
- découpage vidéo inspiration en plusieurs plans ;
- plans personnalisables ;
- progression en % ;
- nombre de plans ;
- missions ;
- timing ;
- countdown ;
- rappels ;
- rappels inverses / retrait matériel ;
- lieux ;
- photos de lieux ;
- placement multicam ;
- image de cadrage attendue pour chaque caméra ;
- animations ;
- mouvements caméra ;
- mouvements du couple ;
- poses ;
- lumière ;
- lever / coucher soleil ;
- golden hour ;
- cadrage ;
- angles ;
- valeurs de plans ;
- focales ;
- arrière-plan ;
- audio ;
- micros ;
- enregistreur DJ ;
- interviews ;
- questions ;
- drone ;
- transitions ;
- garçons / filles d’honneur ;
- flashmob ;
- ouverture de bal ;
- fast cuts ;
- style luxe / Vogue / néoclassique / dynamique ;
- templates ;
- export à une personne sans application ;
- offline ;
- mobile ;
- tablette ;
- desktop ;
- édition complète sur les trois supports ;
- pré-montage ;
- Resolve / exports de postproduction ;
- backups ;
- plan B ;
- suivi réel de la journée.

---

# 55. LIVRABLES ATTENDUS DE CODEX

Avant ou pendant le développement, fournir :
- architecture globale ;
- routes / pages ;
- structure de navigation ;
- data model ;
- composants réutilisables ;
- logique responsive ;
- logique offline ;
- logique sync ;
- états métier ;
- workflows ;
- plan de développement ;
- premiers écrans fonctionnels.

Ensuite construire l’application étape par étape.

Pour chaque page implémentée, vérifier :
1. affichage mobile ;
2. affichage tablette ;
3. affichage desktop ;
4. création ;
5. modification ;
6. suppression ;
7. réorganisation si pertinente ;
8. persistance ;
9. fonctionnement offline si critique ;
10. navigation vers les autres modules.

---

# 56. RÉSULTAT FINAL RECHERCHÉ

VISIONNARY doit donner la sensation qu’avant même le mariage, le réalisateur a déjà préparé :
- son film ;
- ses images ;
- ses cadrages ;
- ses mouvements ;
- son équipe ;
- sa lumière ;
- son son ;
- son timing ;
- ses transitions ;
- ses plans de secours.

Puis, le jour J, l’application devient un **assistant discret de réalisation**.

Elle ne doit pas prendre le dessus sur le mariage.

Elle doit permettre à l’équipe de regarder l’écran quelques secondes, comprendre immédiatement ce qu’elle doit faire, puis retourner filmer.

Signature produit :

**VISIONNARY — Shoot • Create • Emotion**

**Chaque plan a son moment. Chaque moment crée une histoire.**

**On n’oublie rien, on fait les choses bien.**

---

# 57. AJOUTS OBLIGATOIRES — REPÉRAGE, PRÉ-WEDDING, SAME-DAY EDIT, LIVE, DANSE, MONTAGE ET TESTS LOCAUX

Les points ci-dessous font partie du périmètre obligatoire de VISIONNARY et doivent être intégrés au produit, aux données, aux écrans et aux workflows. Ils ne doivent pas rester sous forme de simples notes.

## 57.1 REPÉRAGE DES LIEUX — VERSION COMPLÈTE

Le module **Lieux / Repérage** doit être beaucoup plus qu'une simple fiche adresse.

Pour chaque lieu, stocker :
- nom du lieu ;
- adresse complète ;
- coordonnées GPS ;
- lien de navigation ;
- contact du lieu ;
- téléphone ;
- email ;
- horaires d'accès ;
- heure autorisée d'arrivée prestataires ;
- parking ;
- entrée prestataires ;
- accès PMR si utile ;
- règles du lieu ;
- restrictions photo / vidéo ;
- restrictions drone ;
- restrictions lumière ;
- restrictions son ;
- contraintes électriques ;
- zones interdites ;
- documents utiles ;
- plans du bâtiment ;
- photos ;
- vidéos ;
- captures de repérage ;
- notes de visite.

Créer des **zones internes** :
- façade ;
- entrée ;
- chambre mariée ;
- chambre marié ;
- couloir ;
- escalier ;
- balcon ;
- terrasse ;
- jardin ;
- cérémonie ;
- autel ;
- allée ;
- salle ;
- piste ;
- scène ;
- espace gâteau ;
- zone cocktail ;
- parking ;
- spot drone ;
- zone interview ;
- zone photo couple.

Pour chaque zone, permettre de définir :
- meilleur angle ;
- arrière-plan ;
- heure idéale ;
- soleil ;
- contre-jour ;
- ombre ;
- lumière disponible ;
- lumière à installer ;
- bruit ;
- circulation des invités ;
- position possible des caméras ;
- position couple ;
- position invités ;
- position équipe ;
- mouvement possible ;
- focale conseillée ;
- plan large / moyen / serré possibles ;
- photos et vidéos de référence.

Ajouter une vue **Repérage terrain** spécialement pensée pour tablette et mobile :
- importer une photo sur place ;
- dessiner dessus ;
- ajouter une flèche ;
- poser une caméra ;
- poser une lumière ;
- poser le couple ;
- marquer une zone ;
- ajouter une note vocale / texte ;
- sauvegarder immédiatement offline.

## 57.2 DÉROULÉ GLOBAL — TOUTES LES ÉTAPES POSSIBLES

Le déroulé doit être entièrement personnalisable.

Exemples d'étapes :
- trajet équipe ;
- arrivée équipe ;
- repérage express ;
- installation ;
- préparatifs mariée ;
- préparatifs marié ;
- accessoires ;
- coiffure ;
- maquillage ;
- habillage ;
- portraits solo ;
- filles d'honneur ;
- garçons d'honneur ;
- first look ;
- pré-wedding ;
- mairie ;
- cérémonie religieuse ;
- cérémonie traditionnelle ;
- cérémonie laïque ;
- couple shoot ;
- photos famille ;
- photos groupes ;
- cocktail / vin d'honneur ;
- décor salle vide ;
- réception ;
- entrée mariés ;
- discours ;
- animations ;
- dîner ;
- ouverture de bal ;
- flashmob ;
- chorégraphie ;
- gâteau ;
- dancefloor ;
- interviews ;
- live ;
- Same-Day Edit ;
- projection Same-Day Edit ;
- plans de nuit ;
- fin de soirée ;
- sauvegarde ;
- débrief.

Chaque étape peut contenir :
- heure de début ;
- heure de fin ;
- durée prévue ;
- durée réelle ;
- lieu ;
- sous-lieu ;
- responsables ;
- missions ;
- checklist ;
- rappels ;
- plans ;
- références ;
- lumière ;
- audio ;
- matériel ;
- plan B ;
- notes.

## 57.3 SECTION PRÉ-WEDDING

Créer une section dédiée **Pré-Wedding**.

Elle doit permettre :
- choix du lieu ;
- moodboard ;
- tenue 1 / tenue 2 / tenue 3 ;
- poses ;
- mouvements ;
- scénarios ;
- séquences romantiques ;
- marche ;
- voiture ;
- architecture ;
- coucher de soleil ;
- nuit ;
- drone ;
- interviews / voix off ;
- musique de référence ;
- transitions ;
- plans photos ;
- plans vidéos ;
- planning de la séance ;
- durée ;
- matériel ;
- équipe ;
- lumière ;
- météo ;
- golden hour ;
- autorisations lieu ;
- plan B pluie.

Le Pré-Wedding doit pouvoir générer sa propre shot list et être relié au film principal.

## 57.4 SECTION POST-PRODUCTION / MONTAGE

Créer une section **Montage / Post-production** séparée du pré-montage.

États possibles :
- rushs reçus ;
- sauvegarde faite ;
- organisation ;
- synchronisation ;
- dérush ;
- selects ;
- multicam ;
- storyline ;
- montage principal ;
- B-roll ;
- sound design ;
- étalonnage ;
- mixage ;
- sous-titres ;
- teaser ;
- reel ;
- film long ;
- export ;
- contrôle qualité ;
- livraison ;
- corrections client ;
- terminé.

Prévoir :
- todo list montage ;
- responsable ;
- dates cibles ;
- progression en % ;
- notes de montage ;
- musique choisie / validée ;
- version du montage ;
- liste des modifications ;
- statut de livraison.

## 57.5 SAME-DAY EDIT

Créer un module **Same-Day Edit**.

Avant le mariage :
- définir si le service est actif ;
- durée cible ;
- heure de projection ;
- musique ;
- structure ;
- moments prioritaires ;
- opérateur / monteur ;
- poste de montage ;
- emplacement ;
- stockage ;
- transfert cartes ;
- timing.

Pendant la journée :
- marquer des clips comme **SDE PRIORITAIRE** ;
- bouton rapide “envoyer au Same-Day Edit” ;
- sélectionner Best Takes ;
- voir les rushs déjà transférés ;
- voir les séquences encore manquantes ;
- suivre la progression du montage.

Afficher :
- temps restant avant projection ;
- progression ;
- séquences manquantes ;
- export en cours ;
- test projection ;
- son projection ;
- câble / écran / projecteur / LED wall.

Créer une checklist spécifique Same-Day Edit.

## 57.6 TRANSMISSION EN DIRECT / LIVE STREAMING

Créer une section **Live / Transmission en direct**.

Prévoir :
- plateforme ;
- URL / destination ;
- compte ;
- statut connexion ;
- réseau principal ;
- réseau secours ;
- encodeur ;
- caméra principale ;
- caméra secondaire ;
- audio ;
- niveau audio ;
- alimentation ;
- batterie secours ;
- test live ;
- heure de démarrage ;
- heure de fin ;
- opérateur responsable ;
- rappel “LIVE ON” ;
- rappel “LIVE OFF”.

Ajouter checklist :
- connexion testée ;
- câble ;
- batterie ;
- audio ;
- image ;
- cadrage ;
- latence ;
- enregistrement local en parallèle ;
- plan secours réseau.

## 57.7 CHORÉGRAPHIE / DANSE / FLASHMOB

Créer un module **Chorégraphie & Danse**.

Il doit permettre :
- importer la musique ;
- indiquer sa durée ;
- marquer des temps / beats ;
- ajouter des points clés de chorégraphie ;
- placement des danseurs ;
- placement du couple ;
- placement invités ;
- entrée / sortie ;
- déplacements ;
- zones de mouvement ;
- vue dessus ;
- animation simplifiée ;
- placement caméra ;
- trajectoire caméra ;
- caméra fixe ;
- caméra mobile ;
- caméra en hauteur ;
- drone si adapté ;
- réaction public ;
- lumière ;
- effets lumière ;
- fumée / sparkular / autres effets si présents ;
- plans obligatoires ;
- plans bonus ;
- plans de sécurité.

Exemple de preset multicam :
- **Cam A : plan large / master de sécurité**
- **Cam B : plan moyen / suivi principal**
- **Cam C : réactions du public / invités**
- **Cam D : plan serré / détails / émotions**
- **Drone ou caméra hauteur : vue d'ensemble / mouvement global**

Ces rôles doivent rester personnalisables.

## 57.8 VALEURS DE PLAN & RÔLES CAMÉRAS

Ne jamais limiter la scène à une caméra.

Pour chaque caméra :
- nom ;
- opérateur ;
- modèle ;
- objectif ;
- focale ;
- position ;
- hauteur ;
- direction ;
- valeur de plan ;
- sujet ;
- rôle ;
- mouvement ;
- référence photo ;
- référence vidéo ;
- animation ;
- priorité.

Valeurs de plan :
- très grand ensemble ;
- ensemble ;
- large ;
- plein pied ;
- américain ;
- taille ;
- poitrine ;
- rapproché ;
- gros plan ;
- très gros plan ;
- détail ;
- réaction ;
- insert ;
- cutaway ;
- master / sécurité.

## 57.9 OBJECTIFS, FOCALES ET RENDU

Chaque plan peut recevoir :
- objectif recommandé ;
- focale exacte ou plage ;
- alternative ;
- ouverture ;
- profondeur de champ ;
- distance sujet caméra ;
- compression souhaitée ;
- arrière-plan ;
- bokeh ;
- foreground ;
- hauteur caméra ;
- angle.

Prévoir des presets :
- 24 mm environnement ;
- 35 mm storytelling ;
- 50 mm naturel ;
- 85 mm portrait ;
- téléobjectif compression ;
- macro / détail.

Les presets doivent être modifiables selon le matériel réel.

## 57.10 LUMIÈRE — SIMULATION / APERÇU

Au-delà des notes lumière, permettre une représentation visuelle :
- caméra ;
- sujet ;
- source ;
- orientation ;
- intensité approximative ;
- couleur ;
- key ;
- fill ;
- backlight ;
- practical ;
- soleil.

Prévoir des presets de lumière :
- bridal soft ;
- portrait fenêtre ;
- dramatic Vogue ;
- silhouette ;
- golden hour ;
- night portrait ;
- dancefloor ;
- flashmob ;
- first dance ;
- interview.

Quand c'est possible, afficher un **aperçu indicatif** du résultat attendu ou une référence associée. Ne jamais présenter une simulation simple comme une mesure photométrique exacte.

## 57.11 ANIMATIONS

Les animations doivent pouvoir concerner :
- caméra ;
- couple ;
- mariée ;
- marié ;
- groupe ;
- danseurs ;
- invités ;
- drone ;
- lumière mobile.

Mouvements :
- push in ;
- push out ;
- tracking ;
- follow ;
- pan ;
- tilt ;
- orbit ;
- arc ;
- reveal ;
- montée ;
- descente ;
- travelling gauche / droite ;
- recul ;
- avancée ;
- rotation.

L'utilisateur doit pouvoir :
- définir début ;
- définir fin ;
- définir trajectoire ;
- définir durée ;
- lancer l'aperçu ;
- mettre en boucle ;
- exporter en MP4 / GIF-like loop si supporté / vidéo courte.

## 57.12 MINUTAGE & MODE FAST CUTS

Chaque scène / plan peut avoir :
- temps de préparation ;
- temps de tournage ;
- temps restant ;
- alarme T-5 ;
- alarme T-2 ;
- alarme fin ;
- vibration ;
- rappel silencieux.

Créer un mode **Fast Cuts**.

Quand activé :
- augmenter la densité recommandée de plans ;
- suggérer plus de détails ;
- suggérer plus d'inserts ;
- suggérer variations d'angles ;
- suggérer micro-mouvements ;
- suggérer plans de 1 à 4 secondes selon intention ;
- suggérer transitions ;
- afficher une estimation de couverture.

L'utilisateur garde toujours le contrôle.

## 57.13 PRESETS

Créer des presets réutilisables pour :
- mariage complet ;
- préparatifs ;
- cérémonie ;
- mairie ;
- couple ;
- pré-wedding ;
- réception ;
- ouverture de bal ;
- flashmob ;
- dancefloor ;
- gâteau ;
- interviews ;
- drone ;
- lumière ;
- multicam ;
- mouvements caméra ;
- poses ;
- transitions ;
- audio ;
- Same-Day Edit ;
- Live Streaming ;
- fast cuts ;
- film luxe ;
- film Vogue ;
- film néoclassique ;
- film dynamique.

Tous les presets sont :
- éditables ;
- duplicables ;
- exportables ;
- importables ;
- activables / désactivables.

## 57.14 FORMAT PAYSAGE / PORTRAIT

Mobile et tablette doivent fonctionner :
- en portrait ;
- en paysage.

Le paysage est particulièrement important pour :
- timeline ;
- plan de salle ;
- placement multicam ;
- storyboard ;
- animation ;
- pré-montage ;
- monitoring ;
- briefing ;
- Same-Day Edit.

L'orientation ne doit pas casser la mise en page.

## 57.15 INSTALLATION LOCALE & TEST SUR APPAREILS RÉELS

Le développement initial doit permettre une installation et un test **en local**, sans attendre une publication App Store / Play Store.

Prévoir une architecture qui permette :
- développement local ;
- build local ;
- lancement sur simulateur ;
- lancement sur appareil réel ;
- test iPhone ;
- test iPad / tablette ;
- test desktop ;
- test Android plus tard si retenu.

Objectif immédiat :
avoir une version installable localement pour tester :
- ergonomie ;
- lisibilité ;
- vitesse ;
- orientation portrait / paysage ;
- comportement offline ;
- import images / vidéos ;
- notifications ;
- timers ;
- rappels ;
- lecture références ;
- placement multicam ;
- animations ;
- export.

Préparer le projet pour des builds de développement réels.

Si le stack retenu est compatible, prévoir :
- iOS Development build / sideload via outils Apple ;
- tablette iOS ;
- build Android de développement plus tard ;
- web / desktop local.

Le projet doit fonctionner **sans dépendre d'une publication publique**.

L'utilisateur indique disposer des autorisations nécessaires pour travailler sur son propre projet et ses propres appareils. Cela ne dispense pas l'application de respecter les permissions système nécessaires (photos, vidéos, notifications, micro, fichiers, réseau, localisation si activée, etc.).

## 57.16 PERMISSIONS SYSTÈME

Gérer proprement :
- galerie photos ;
- bibliothèque vidéo ;
- fichiers ;
- caméra ;
- micro ;
- notifications ;
- stockage local ;
- réseau ;
- localisation uniquement si l'utilisateur l'active ;
- calendrier si connecté plus tard.

Toujours prévoir :
- état autorisé ;
- refusé ;
- non demandé ;
- explication claire ;
- alternative si permission refusée.

## 57.17 TESTS RÉELS AVANT VALIDATION

Ne pas considérer une fonctionnalité terminée uniquement parce qu'elle marche sur desktop.

Pour chaque module critique, tester :
- iPhone réel ;
- tablette réelle ;
- desktop ;
- portrait ;
- paysage ;
- offline ;
- reprise après fermeture ;
- synchronisation ;
- gros médias ;
- batterie ;
- notifications ;
- import ;
- export.

Créer une checklist QA spécifique terrain.

## 57.18 PERFORMANCE MÉDIAS

Comme l'application contiendra beaucoup d'images et vidéos :
- générer miniatures ;
- utiliser cache ;
- ne pas charger toutes les vidéos en pleine résolution ;
- permettre téléchargement offline sélectif ;
- afficher poids du pack offline ;
- permettre “Télécharger ce mariage pour le Jour J” ;
- permettre “Supprimer les médias offline” sans supprimer le projet ;
- garder les références importantes accessibles rapidement.

## 57.19 PACK OFFLINE JOUR J

Ajouter une action claire :
**TÉLÉCHARGER POUR LE JOUR J**

Le pack doit inclure selon sélection :
- infos mariage ;
- déroulé ;
- lieux ;
- plans ;
- médias de référence ;
- animations ;
- checklists ;
- rappels ;
- briefings ;
- équipe ;
- matériel ;
- lumière ;
- audio ;
- notes ;
- documents essentiels.

Afficher :
- taille ;
- progression téléchargement ;
- date de dernière sync ;
- statut “Prêt hors ligne”.

---

# 58. RAPPEL FINAL POUR CODEX

Construire VISIONNARY comme une vraie application de production et non comme une simple collection de pages.

Le produit doit permettre de préparer un mariage depuis le premier repérage jusqu'à la fin du tournage, puis d'accompagner le montage.

Le système doit rester extrêmement personnalisable :
- chaque mariage est différent ;
- chaque lieu est différent ;
- chaque équipe est différente ;
- chaque style est différent ;
- chaque durée de film est différente ;
- chaque couple est différent.

Il faut donc combiner :
- presets rapides ;
- templates ;
- édition totale ;
- automatisations utiles ;
- mode terrain simplifié.

Le résultat attendu est un outil qui donne réellement au réalisateur et à son équipe la sensation d'avoir préparé le film avant même de tourner, tout en restant suffisamment flexible pour s'adapter à ce qui se passe réellement le jour J.
