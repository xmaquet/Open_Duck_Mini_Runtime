
# Open Duck Mini Runtime (Fork)

Ce dépôt est une version **forkée** de `Open_Duck_Mini_Runtime`, intégrant les éléments du runtime du projet *Open Duck Mini* ainsi que des scripts utilitaires et de configuration.

---

## 📦 Vue d’ensemble
- **Total** : 56 fichiers (~6 MB).
- **Langages/formats** : 37 × `.py`, 9 × `.wav`, 5 × `.md`, 1 × `.json`, 1 × `.toml`, 1 × `.cfg`, 1 × `.pkl`.
- **Entrées racine** :
  - `mini_bdx_runtime/` — Package Python principal (code & assets).
  - `scripts/` — Scripts utilitaires (moteurs, IMU, enregistrements, tests).
  - Fichiers de configuration : `setup.cfg`, `pyproject.toml`, `.gitignore`.
  - Documentation : `README.md`, `README_FR.md`, `RELEASE_NOTES.md`, `TODO.md`, `checklist.md`.
  - Exemple de config : `example_config.json`.

---

## 📂 Structure principale

### `mini_bdx_runtime/`
Package Python contenant :
- `assets/` : sons utilisés par le runtime (`beep`, `happy`, `lamp`, `motor`).
- `mini_bdx_runtime/` (modules internes) :
  - **Moteurs** : `rustypot_position_hwi.py`, `poly_reference_motion.py`.
  - **Capteurs** : `imu.py`, `raw_imu.py`, `feet_contacts.py`.
  - **Commandes** : `xbox_controller.py`, `buttons.py`.
  - **Effets visuels** : `eyes.py`, `projector.py`, `antennas.py`.
  - **Audio** : `sounds.py`.
  - **Utilitaires** : `onnx_infer.py`, `rl_utils.py`, `duck_config.py`, `camera.py`.

### `scripts/`
Scripts de configuration et de test :
- **Moteurs** :
  - `configure_all_motors.py`, `configure_motor.py`, `configure_motor_plus.py`, `configure_motor_plus_fr.py` (config ID, offsets, etc.).
  - `check_motors.py`, `turn_on.py`, `turn_off.py`, `check_voltage.py`.
  - `find_soft_offsets.py`.
- **IMU** :
  - `calibrate_imu.py`, `imu_server.py`, `imu_client.py`, `fc_test.py`.
- **Acquisition & analyse** :
  - `record_data.py`, `new_record_data.py`, `plot_recorded_data.py`.
  - `polynomial_coefficients.pkl` (références de trajectoires).
- **Perception / Effets** :
  - `cam_test.py`, `head_puppet.py`, `antennas_controller_test.py`.
- **Marche / RL** :
  - `v2_rl_walk_mujoco.py` (marche avec renforcement, MuJoCo).

### Fichiers de configuration
- `example_config.json` — Exemple de `duck_config.json` (moteurs, offsets, sécurité).
- `setup.cfg` — Packaging Python (`mini-bdx-runtime`), dépendances principales :  
  `rustypot`, `pypot`, `onnxruntime`, `numpy`, `scipy`, `pygame`, `adafruit-circuitpython-bno055`, `openai`.
- `pyproject.toml` — Build backend setuptools.

### Documentation
- `README.md`, `README_FR.md` — Guides installation & usage.
- `checklist.md` — Vérifications matérielles (IMU, moteurs, yeux, antennes, caméra, haut-parleur).
- `RELEASE_NOTES.md` — Notes de version (fork et évolutions).
- `TODO.md` — Tâches en cours et futures.

---

## 🚀 Fonctionnalités couvertes
- Gestion **moteurs Feetech STS3215** via `rustypot` et `pypot`.
- Intégration **IMU BNO055** (données brutes et haut niveau).
- Contrôle via **manette Xbox** (Bluetooth).
- Affichage/animation des yeux & antennes, pilotage projecteur.
- Gestion des sons via haut-parleur I²S.
- Scripts de configuration (moteurs, offsets, calibration IMU).
- Enregistrement et visualisation de données capteurs.
- Support inférence **ONNX** et RL pour locomotion.

---

## 📑 Notes
- `duck_config.json` doit être généré à partir de `example_config.json` et adapté au matériel.
- Le dépôt inclut des assets audio et coefficients polynomiaux utiles pour les trajectoires.
- Packaging prêt avec `setuptools` mais sans `entry_points` configurés.

