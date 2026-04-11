# Notes de version — xmaquet/Open_Duck_Mini_Runtime

Fork de référence : [apirrone/Open_Duck_Mini_Runtime](https://github.com/apirrone/Open_Duck_Mini_Runtime)

---

## Branche `feature/bdx_webui` (2026) — contrôle tablette Android en BLE

### Objectif

Permettre de piloter l’Open Duck Mini depuis une **tablette Android** via **Bluetooth Low Energy** direct (tablette = central BLE, Raspberry Pi = serveur GATT), avec un **contrat JSON** aligné sur la manette Xbox existante (`get_last_command()`, `Buttons`, triggers).

### Réalisations principales

- **Protocole** (`docs/protocol.md`) : schéma `ControllerFrame` v1, UUID GATT fixes, conventions de signe et reconstruction côté robot.
- **UI web** (`android_ui/`) : transport TypeScript vers le natif, envoi ~**20 Hz**, **clamp**, deadzone triggers, **watchdog** et **arrêt d’urgence** côté logique UI ; retrait du flux **Web Bluetooth** au profit du natif.
- **Application Android** (`android_app/`) : projet **Capacitor** ; build/sync depuis `android_ui/dist` ; plugin Kotlin **RobotBlePlugin** (scan, connect, write, notify, permissions, reconnexion).
- **Runtime Pi** :
  - `mini_bdx_runtime/ble_gatt_server.py` : serveur GATT **bluez-peripheral** 0.1.x, service TX/RX, réassemblage d’écritures fragmentées, option `--dump`, **`--dbus-adapter`** pour BlueZ 5.8x (nœuds sous `/org/bluez` sans `Adapter1`).
  - `mini_bdx_runtime/xbox_bridge.py` : **`AndroidBridgeController`** + **`VirtualJoystickState`** ; option TCP `--tcp-port`.
- **Packaging** : extra pip **`.[ble]`** avec `bluez-peripheral>=0.1.7,<0.2` (correction : pas de release 1.x sur PyPI) ; script console **`bdx-ble-robot`** ; fichier secours **`extras/requirements-ble.txt`**.
- **Documentation** : `docs/architecture.md`, `README.md` / `README_FR.md`, `docs/bdx_bluetooth_control.md`, ce fichier.

### Utilisation rapide (Pi)

```bash
sudo apt install bluez
sudo usermod -aG bluetooth $USER   # puis re-login
pip install --no-cache-dir -e ".[ble]"
bdx-ble-robot --dump
```

### Dépôt sur la machine embarquée

Si `origin` pointe encore vers **apirrone**, ajouter le remote **xmaquet** et tirer **`feature/bdx_webui`** pour disposer de l’extra `ble` et des scripts.

---

## Version initiale du fork — août 2025

Fork basé sur le runtime **Open Duck Mini (v2)** pour Raspberry Pi (Pi Zero 2W, Pi 5, etc.).

### Objectifs initiaux du fork

- Documenter et adapter l’architecture du runtime d’origine.
- Expérimenter des extensions (pédagogie, démo, industrialisation légère).
- Proposer des PR vers le dépôt amont si pertinent.

### Fonctionnalités héritées du dépôt amont (rappel)

- IMU, moteurs (Feetech / bus), calibration (`find_soft_offsets.py`), `duck_config.json`.
- Contrôle **manette Xbox** Bluetooth + pygame.
- Marche RL via modèle **ONNX** (`v2_rl_walk_mujoco.py`, extra `.[rl]`).
- Audio I²S, scripts de test moteurs / IMU.

### Pistes documentées plus tard dans le fork

- Cas d’usage « démonstrateur », télémétrie, intégrations tierces.
