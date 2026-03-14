# Prompts standard pour Cursor – BDX Open Duck Mini

Repo (branche `v2`) : https://github.com/xmaquet/Open_Duck_Mini_Runtime/tree/v2

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

## 2. Lien de commandes via Bluetooth (manette Xbox / émulation Android)

Contexte général
Tu travailles dans le dépôt suivant : Open Duck Mini Runtime (fork BDX), ouvert dans Cursor.
Ce dépôt contient le runtime embarqué pour le robot Open Duck Mini, prévu pour tourner sur un Raspberry Pi Zero 2W.

Objectif
On veut piloter le robot via un **lien de commandes Bluetooth** :
- aujourd’hui : **manette Xbox** appairée au Pi,
- bientôt : **Android** qui émule une manette (le Pi la voit comme un joystick/gamepad).

IMPORTANT
- On ne fait **pas** de Web UI embarquée.
- On ne touche pas à la marche RL dans cette étape (juste le lien de commandes).

TÂCHE
- Identifie les modules existants à réutiliser :
  - `mini_bdx_runtime/xbox_controller.py` (lecture joystick via `pygame`)
  - `mini_bdx_runtime/buttons.py` (détection d’actions/boutons)
  - tout consommateur existant de ces commandes dans `scripts/` ou le runtime
- Propose une architecture “control loop” simple :
  - un process lit la manette à fréquence fixe,
  - traduit en commandes (vitesses / actions),
  - injecte ces commandes là où le runtime les consomme (sans serveur web).
- Donne un plan de déploiement sur Pi :
  - appairage Bluetooth (`bluetoothctl`),
  - installation Python (extra `.[control]`),
  - commande de test (`python -m mini_bdx_runtime.xbox_controller`).
- Anticipe l’émulation Android :
  - le runtime ne doit pas dépendre d’un modèle exact de manette,
  - seule la couche “mapping” doit éventuellement être configurable.

CONTRAINTES
- Pas d’API HTTP, pas de pages web, pas de `Flask`.
- Pas de dépendances lourdes non nécessaires.
