# Prompts standard pour Cursor – BDX Open Duck Mini

## 1. Analyser un fichier

Contexte : Open Duck Mini Runtime (BDXv2), code Python pour un robot sur Raspberry Pi Zero 2W.

TÂCHE :
Analyse le fichier suivant et explique-moi :
- son rôle dans le runtime,
- les points sensibles (hardware, performance, erreurs possibles),
- comment il interagit avec le reste du projet.

CONTRAINTES :
- Ne propose pas encore de modifications.
- Réponds de façon structurée avec des sections.


## 2. créer une UI pour tester toutes les fonctions sauf la marche (version lourde)

Contexte général
Tu travailles dans le dépôt suivant : Open_Duck_Mini_Runtime (fork BDX), ouvert dans Cursor.
Ce dépôt contient le runtime embarqué pour le robot Open Duck Mini, prévu pour tourner sur un Raspberry Pi Zero 2W, avec des scripts de test dans le dossier `scripts/` et le package principal dans `mini_bdx_runtime/`.

Objectif
Je veux créer et déployer sur le Raspberry Pi Zero une **interface web légère** (UI web) permettant de **tester toutes les fonctions BDX** disponibles dans ce runtime, à l’exception de la marche (le RL/walk reste traité à part et ne doit pas être intégré dans l’UI pour l’instant).

Cette UI sera hébergée sur le Pi (Raspberry Pi OS Lite, pas d’interface graphique locale), et sera utilisée depuis un navigateur sur un autre appareil du réseau (PC, tablette, smartphone).

Choix techniques (à respecter)
- Backend en Python, lancé sur le Pi.
- Framework web : **[À COMPLÉTER : Flask / FastAPI / autre (préciser)]**
- UI côté client :
  - HTML/CSS/JS simples, ou petit front minimaliste.
  - Pas de framework front lourd (pas de React/Angular/Vue pour l’instant), sauf si tu justifies clairement que c’est raisonnable sur un Pi Zero 2W.
- Pas de nouvelle dépendance très lourde (CPU/RAM) ni difficile à installer sur Raspberry Pi OS.
- Code organisé proprement dans un sous-dossier dédié, par exemple :
  - `mini_bdx_runtime/webui/` pour le serveur Python
  - `mini_bdx_runtime/webui/static/` et `mini_bdx_runtime/webui/templates/` pour les ressources front si tu utilises un moteur de templates.

Fonctionnalités à couvrir dans l’UI
1. Page d’accueil / Dashboard
   - Informations de base :
     - État du robot (en ligne / hors ligne, ou au minimum “backend web OK”).
     - Version du runtime (`mini_bdx_runtime`).
   - Boutons ou liens vers les différentes pages de test (IMU, moteurs, audio, etc.).
   - Zone de log ou d’événements récents (texte simple).

2. Tests capteurs / IMU
   - Bouton pour lancer un test IMU équivalent à ce que fait `raw_imu.py` ou `imu_server.py` (sans pour autant lancer des scripts bloquants en parallèle si possible).
   - Affichage en temps quasi réel (ou en snapshots) de quelques mesures IMU de base (angles / accélération brute).
   - Gestion propre en cas d’absence d’IMU (ex.: message clair au lieu d’un crash).

3. Tests moteurs
   - Interface permettant d’envoyer des commandes simples aux moteurs (par exemple déplacements de quelques articulations, ou une séquence simple) en se basant sur la logique déjà présente dans `scripts/check_motors.py` et les modules de contrôle moteurs.
   - Possibilité de faire au moins :
     - Un test “tous les moteurs bougent dans une amplitude raisonnable”.
     - Un test individuel par moteur ou par groupe de moteurs.
   - Gestion des erreurs (moteur non joignable, bus non configuré, etc.) avec retour dans l’UI.

4. Tests audio / autres actionneurs
   - Bouton pour jouer un son de test (si le runtime contient déjà la logique audio).
   - Prévoir un ou plusieurs “slots” génériques pour d’autres actionneurs (LED, projecteur, etc.) **[À COMPLÉTER : lister les actionneurs BDX que je veux exposer si déjà connus]**.

5. Exclusions
   - Ne pas intégrer pour l’instant :
     - La marche contrôlée par la politique RL (`v2_rl_walk_mujoco.py`, etc.).
   - Prévoir éventuellement un placeholder dans l’UI “marche / RL (à venir)” mais sans logique derrière.

Contraintes d’architecture
- Le serveur web doit être lancé via une commande simple, du type :
  - `python -m mini_bdx_runtime.webui`  
  ou
  - `python scripts/bdx_webui_server.py`
- Il doit être facile de changer le port (par défaut, **[À COMPLÉTER : ex. 8000 ou 8080]**).
- Prévoir la future mise en service via `systemd` :
  - Documenter dans un commentaire ou un fichier `docs/bdx_webui_deploy.md` un exemple de service systemd (même si tu ne crées pas le fichier `.service` dans ce commit).

Attentes sur le code
1. Étape 1 : Analyse du repo
   - Identifie les modules et scripts existants qui peuvent être réutilisés pour :
     - IMU, moteurs, audio, etc.
   - Liste-les brièvement dans ta réponse, avec un court résumé de leur rôle.

2. Étape 2 : Proposition de design
   - Propose une architecture claire pour la web UI :
     - Arborescence des fichiers (backend + templates + static).
     - Principales routes HTTP / endpoints.
     - Structure des pages (sections / composants).
   - Décris cette architecture textuellement avant de toucher au code.

3. Étape 3 : Implémentation
   - Implémente le backend web dans un module dédié.
   - Implémente une première version minimaliste de l’UI :
     - Une page HTML de base,
     - Un peu de JS pour appeler les endpoints de test (fetch/ajax),
     - Du CSS simple pour que ce soit utilisable sur mobile/tablette en salon.
   - Intègre les tests IMU et moteurs sous forme de boutons / actions simples.
   - Gère proprement les erreurs matérielles (absence de capteur, test lancé sur une machine de dev sans hardware, etc.), avec retour JSON lisible et messages clairs dans l’UI.

4. Étape 4 : Documentation et tests
   - Ajouter une courte documentation dans `docs/bdx_webui.md` ou similaire :
     - Comment lancer le serveur web en local (PC de dev).
     - Comment le lancer sur le Pi Zero (commande à exécuter).
     - Comment accéder à l’UI depuis un autre appareil sur le réseau (URL du type `http://<ip_du_pi>:<port>`).
   - Proposer au moins un test manuel à faire pour valider chaque page (test IMU, test moteurs, test audio).

Contraintes générales
- Ne modifie pas les scripts critiques existants liés à la marche (RL) sans nécessité, et ne les appelle pas depuis l’UI.
- Limite les modifications aux fichiers vraiment nécessaires.
- Commente ton code de façon claire (en français si possible).
- Quand tu produis le code, montre-le moi sous forme de diff (ou de blocs de fichiers complets) facile à copier/coller.

À faire maintenant
1. Commence par analyser le dépôt, identifier les modules/script à réutiliser et proposer un design d’architecture pour cette web UI.
2. Une fois le design validé, passe à l’implémentation étape par étape.
3. N’hésite pas à me proposer plusieurs options légères si un point est ambigu (par exemple, choix exact du framework web).

## 3. UI légère pour les tests de fonction

Contexte général
Tu travailles dans le dépôt suivant : Open_Duck_Mini_Runtime (fork BDX), ouvert dans Cursor.
Ce dépôt contient le runtime embarqué pour le robot Open Duck Mini, prévu pour tourner sur un Raspberry Pi Zero 2W, avec des scripts de test dans le dossier `scripts/` et le package principal dans `mini_bdx_runtime/`.

Objectif
Je veux créer et déployer sur le Raspberry Pi Zero une **interface web légère** (UI web) permettant de TESTER les éléments suivants du robot :
- le SON,
- les YEUX du bot,
- le PROJECTEUR,
- les SERVOS qui commandent les ANTENNES,
- les SWITCHS des PIEDS (en dehors du mode de marche).

IMPORTANT :
- On NE s’occupe PAS pour l’instant :
  - des moteurs d’articulation (marche),
  - de l’IMU.
- L’UI doit cependant être pensée de façon à intégrer **plus tard** ces fonctionnalités (placeholders / sections vides).

Cette UI sera hébergée sur le Pi (Raspberry Pi OS Lite, pas d’interface graphique locale), et utilisée depuis un navigateur sur un autre appareil du réseau (PC, tablette, smartphone).

Choix techniques (à respecter)
- Backend en Python, lancé sur le Pi.
- Framework web : **Flask**
- UI côté client :
  - HTML/CSS/JS simples.
  - Pas de framework front lourd (pas de React / Angular / Vue pour le moment), sauf si tu justifies que c’est très léger et raisonnable sur un Pi Zero 2W.
- Pas de nouvelle dépendance lourde (CPU/RAM) ni difficile à installer sur Raspberry Pi OS.
- Code organisé proprement dans un sous-dossier dédié, par exemple :
  - `mini_bdx_runtime/webui/` pour le serveur Python,
  - `mini_bdx_runtime/webui/templates/` pour les pages,
  - `mini_bdx_runtime/webui/static/` pour JS/CSS.

Fonctionnalités EXACTES à couvrir dans l’UI

1. Page d’accueil / Dashboard
   - Afficher :
     - Un titre clair (ex : “BDX Test Panel – Open Duck Mini”).
     - L’état du backend (par ex. “Web UI en ligne”).
     - La version du runtime (`mini_bdx_runtime`).
   - Proposer des boutons ou liens vers des sous-pages ou sections pour :
     - Tests son,
     - Tests yeux,
     - Tests projecteur,
     - Tests servos d’antennes,
     - Tests switchs de pieds,
     - (placeholders pour IMU, moteurs de marche, etc.).

2. Tests SON
   - Boutons pour :
     - jouer un son de test simple (ex : bip / canard),
     - éventuellement 2–3 sons distincts si la logique audio existe déjà.
   - Retour dans l’UI :
     - message “son X joué” ou “erreur audio” en cas de problème.
   - Gérer proprement le cas où la partie audio n’est pas dispo sur la machine de dev (PC).

3. Tests YEUX du bot
   - Interface pour :
     - allumer/éteindre les yeux,
     - changer éventuellement un mode (ex : normal / clignotement / expression de base) .
   - Retour dans l’UI :
     - état courant des yeux,
     - erreurs éventuelles (bus / GPIO / etc.).

4. Tests PROJECTEUR
   - Boutons pour :
     - allumer / éteindre le projecteur,
     - éventuellement régler une intensité simple ou un mode si c’est pertinent .
   - Retour clair sur l’état du projecteur.

5. Tests SERVOS des ANTENNES
   - Contrôles simples (slider / boutons) pour :
     - envoyer une position “neutre” aux antennes,
     - une position “haut / bas / gauche / droite” ou quelques positions prédéfinies.
   - On reste volontairement SIMPLE, l’objectif est de valider le câblage et le contrôle des servos.
   - Gérer les erreurs (servo non joignable, etc.) avec un message lisible dans l’UI.

6. Tests SWITCHS des PIEDS (hors mode marche)
   - Page ou section qui montre l’état des switchs (pieds appuyés / non appuyés).
   - Mécanisme de rafraîchissement :
     - soit polling via JS (fetch régulier d’un endpoint),
     - soit bouton “rafraîchir l’état des pieds”.
   - Clairement indiqué que cette page est **hors mode marche** et ne déclenche pas de mouvement automatique.

Placeholders pour FUTURES fonctionnalités
- Prévoir dans l’UI (menu / sections) des entrées pour :
  - IMU / posture,
  - marche / moteurs d’articulation,
  - autres capteurs (à venir).
- Ces sections peuvent :
  - afficher “Fonctionnalité à venir (non implémentée)”
  - fournir éventuellement une courte description.

Contraintes d’architecture
- Le serveur web doit être lancé via une commande simple, par exemple :
  - `python -m mini_bdx_runtime.webui`
  ou
  - `python scripts/bdx_webui_server.py`
- Il doit être facile de configurer le port (par défaut 80).
- Le design doit rester compréhensible pour un déploiement via `systemd` plus tard.

⚙️ Déploiement sur le Pi Zero – script d’installation

Je veux en plus un **script d’installation initial** pour le Pi Zero qui :
- installe les prérequis système,
- met en place le venv si nécessaire,
- installe les dépendances Python du serveur web,
- explique comment lancer le service.

Attentes :

1. Créer un script shell dans `scripts/`, par exemple :
   - `scripts/install_bdx_webui.sh`
2. Ce script doit :
   - vérifier qu’il est lancé sur Linux,
   - exécuter les commandes de base :
     - `sudo apt update`
     - installation de Python / pip / venv si besoin,
     - installation de packages éventuels nécessaires au framework web choisi (Flask / FastAPI…),
   - créer (ou réutiliser) le venv du projet,
   - installer les dépendances Python nécessaires au serveur web (en s’appuyant sur `pyproject.toml` ou un extra `[webui]` si tu le proposes).
3. Documenter dans un fichier `docs/bdx_webui_deploy.md` (ou équivalent) :
   - les commandes à lancer sur le Pi :
     - clonage du repo,
     - exécution de `scripts/install_bdx_webui.sh`,
     - commande pour démarrer le serveur (ex : `source .venv/bin/activate && python -m mini_bdx_runtime.webui`).
   - un exemple de configuration `systemd` (en texte dans la doc, pas forcément le fichier `.service` créé dans ce commit).

Contraintes générales et exclusions
- NE PAS intégrer pour l’instant la logique de marche / RL / moteurs d’articulation.
- NE PAS intégrer la lecture IMU (juste un placeholder visuel).
- Ne pas introduire de dépendances lourdes non nécessaires.
- Ne modifier que les fichiers pertinents, en gardant les scripts existants aussi intacts que possible.
- Commente ton code de façon claire (en français si possible).

Plan de travail attendu

1. Étape 1 : Analyse
   - Identifie dans le projet les modules existants qui gèrent :
     - son,
     - yeux,
     - projecteur,
     - servos d’antennes,
     - switchs de pieds (si déjà codés).
   - Fais-moi une courte liste avec :
     - noms des fichiers/modules,
     - rôle de chacun,
     - comment tu proposes de les appeler depuis la web UI.

2. Étape 2 : Design
   - Propose une architecture pour la web UI :
     - arborescence des fichiers (backend, templates, static),
     - principales routes HTTP (par ex. `/`, `/api/sound/test`, `/api/eyes/on`, etc.),
     - structure des pages.
   - Décris cette architecture textuellement avant de générer du code.

3. Étape 3 : Implémentation
   - Implémente le backend web dans un module dédié.
   - Crée une première version de l’UI avec :
     - page d’accueil,
     - sections fonctionnelles pour :
       - son,
       - yeux,
       - projecteur,
       - servos d’antennes,
       - switchs de pieds,
       - placeholders pour IMU / marche.
   - Ajoute le script `scripts/install_bdx_webui.sh` avec un contenu cohérent.
   - Ajoute la doc `docs/bdx_webui_deploy.md`.

4. Étape 4 : Validation
   - Indique comment tester :
     - en environnement de dev (PC sans hardware, avec gestion d’erreurs propre),
     - sur le Pi une fois déployé.
   - Montre-moi les modifications en listant les fichiers créés/modifiés et en fournissant leurs contenus (ou des extraits significatifs) de manière structurée.

Commence maintenant par l’analyse (Étape 1) et la proposition de design (Étape 2) sans écrire encore tout le code, pour que je puisse valider l’approche avant implémentation complète.
