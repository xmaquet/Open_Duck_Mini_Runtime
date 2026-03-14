# UI Android (projet séparé)

Ce dossier sert de **point d’ancrage** pour le développement séparé de l’UI côté **device Android** (app native, WebView, ou web UI hébergée sur Android).

## Objectif

- Fournir une interface utilisateur externe pour piloter/observer le robot.
- Garder le runtime Pi **léger** : pas d’UI embarquée dans le runtime.

## Intégration (contrat)

L’UI Android doit idéalement piloter le runtime via un **contrat stable** (à définir) :

- **Entrées** : commandes (ex. vitesses, actions, modes) issues d’un gamepad/contrôles tactiles.
- **Sorties** : états (ex. mode courant, erreurs, niveau batterie si dispo, etc.).

Références côté runtime :
- `mini_bdx_runtime/mini_bdx_runtime/xbox_controller.py` : lecture “manette” et mapping actuel
- `docs/bdx_bluetooth_control.md` : mise en place du lien Bluetooth

## À venir

- Définition d’un schéma de messages (JSON) pour commandes/états.
- Choix du transport (BLE/GATT, WebSocket via passerelle, UDP, etc.) selon contraintes perf/latence.

