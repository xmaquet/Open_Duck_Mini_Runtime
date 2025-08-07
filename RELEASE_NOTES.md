# 📝 Note de version — xmaquet/Open_Duck_Mini_Runtime
**Version initiale du fork – août 2025**  
Fork basé sur : [apirrone/Open_Duck_Mini_Runtime](https://github.com/apirrone/Open_Duck_Mini_Runtime)

---

## 🎯 Objectif du fork

Ce dépôt est une copie (fork) du runtime du robot **Open Duck Mini (v2)**, développé pour fonctionner sur un Raspberry Pi Zero 2W avec une architecture modulaire Python.  
L’objectif de ce fork est de :
- documenter et comprendre l’architecture du runtime original,
- expérimenter des adaptations pédagogiques ou industrielles,
- tester des extensions matérielles ou logicielles,
- potentiellement réintégrer des améliorations via des **pull requests**.

---

## 🔍 Analyse technique du dépôt original

Le projet Open Duck Mini Runtime est un environnement embarqué destiné à piloter un robot quadrupède léger via un Raspberry Pi. Il repose sur une architecture Python modulaire, des scripts de calibration et des outils de diagnostic intégrés.

### ✔️ Structure principale
- `mini_bdx_runtime/` : cœur du runtime (boucle principale, contrôle des moteurs, communication, capteurs, etc.).
- `scripts/` : scripts CLI pour calibrer, tester ou démarrer différents composants (moteurs, IMU, manette, modèle ONNX, etc.).

### 🧩 Fonctionnalités clés
- **Support IMU + moteurs via I²C et USB**, avec configuration fine des règles `udev`.
- **Contrôle par manette Xbox One** via Bluetooth, avec mappage interactif des commandes (marche, rotation, sprint, etc.).
- **Chargement et exécution d’un modèle de marche** pré-entraîné (renforcement via MuJoCo → export ONNX).
- **Système de calibration des joints** (`find_soft_offsets.py`) avec mise à jour dynamique du fichier `duck_config.json`.
- **Interface audio via haut-parleur I²S**, configurable dans le JSON.

### ⚙️ Outils et configuration
- Installation via environnement virtuel Python (`pip install -e .`).
- Support de Raspberry Pi 0/2/3/5 avec modules GPIO spécifiques (`RPi.GPIO` ou `lgpio`).
- Guide très détaillé dans le README : installation complète, configuration matérielle, pairing Bluetooth, etc.

---

## 📌 Intérêt du fork

Ce fork permettra d’explorer :
- une adaptation à un **contexte pédagogique ou démonstratif** (ex. escape game robotisé),
- des **modifications du comportement du robot** (posture, parcours, interactions vocales…),
- une **simplification ou industrialisation** du runtime pour intégration dans un autre système (ex. kiosque interactif, vitrine d’exposition),
- l'intégration éventuelle dans un système de **télémétrie, de logs ou de contrôle à distance** (ESP32, Wi-Fi, etc.).

---

## 📎 Prochaine étape

- [ ] Renommer et commenter les scripts principaux selon leur usage dans le nouveau contexte.
- [ ] Ajouter une documentation pour les cas d’usage spécifiques (par exemple : Open Duck Mini en mode "démonstrateur embarqué").
- [ ] Ajouter une nouvelle branche pour expérimentations (`xmaquet/dev`).