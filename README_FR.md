# 🦆 Open Duck Mini Runtime — Guide d'installation (FR)

Ce guide explique comment préparer, configurer et lancer le robot **Open Duck Mini** sur un **Raspberry Pi Zero 2W** (ou Pi 5 avec adaptations).

---

Repo fork : https://github.com/xmaquet/Open_Duck_Mini_Runtime  

- Branche **`v2`** : alignée sur le runtime classique (manette, RL, etc.).  
- Branche **`feature/bdx_webui`** : contrôle **tablette Android en BLE** (serveur GATT sur la Pi + app Capacitor).

## 1️⃣ Préparation du Raspberry Pi

### Installation de Raspberry Pi OS
1. Télécharger **Raspberry Pi OS Lite (64 bits)** :  
   https://www.raspberrypi.com/software/operating-systems/
2. Suivre ce tutoriel pour l’installation sur carte SD :  
   https://www.raspberrypi.com/documentation/computers/getting-started.html
3. Avec **Raspberry Pi Imager**, préconfigurer :
   - Nom d’utilisateur et mot de passe
   - Connexion Wi-Fi (ex. partage de connexion de votre téléphone)
   - Activation du SSH

💡 **Astuce** : Avec le hotspot de votre téléphone, vous pouvez vous connecter au Pi n’importe où.

---

### Activer SSH (si non fait lors de l’installation)
1. Démarrer avec un écran et un clavier.
2. Se connecter au Wi-Fi.
3. Activer SSH via `raspi-config` ou l’interface graphique.

---

## 2️⃣ Mises à jour & outils nécessaires

```bash
sudo apt update
sudo apt upgrade
sudo apt install git python3-pip python3-virtualenvwrapper
# Optionnel : sudo apt install python3-picamzero
```

Ajouter à la fin de `~/.bashrc` :
```bash
export WORKON_HOME=$HOME/.virtualenvs
export PROJECT_HOME=$HOME/Devel
source /usr/share/virtualenvwrapper/virtualenvwrapper.sh
```

---

## 3️⃣ Configuration matérielle

### Activer I²C
```bash
sudo raspi-config → Interface Options → I2C
```
(Option possible : régler la vitesse à 400 kHz)

### Réduire la latence USB (FTDI)
Créer `/etc/udev/rules.d/99-usb-serial.rules` :
```bash
SUBSYSTEM=="usb-serial", DRIVER=="ftdi_sio", ATTR{latency_timer}="1"
```

### Règles Udev pour la carte moteur
⚠️ **À compléter** (non défini dans le guide original).

---

## 4️⃣ Commande manette Xbox (Bluetooth)

Objectif : piloter le robot via une manette **Xbox** connectée en Bluetooth au Raspberry Pi (pygame / `bdx-xbox-controller`).

1. Allumer et mettre la manette en mode synchronisation.
2. Sur le Raspberry Pi :
```bash
bluetoothctl
scan on
pair <adresse_mac>
trust <adresse_mac>
connect <adresse_mac>
```
3. Tester :
```bash
workon open-duck-mini-runtime  # ou active ton venv
pip install -e .[control]
python -m mini_bdx_runtime.xbox_controller
```

---

## 5️⃣ Haut-parleur I²S

Tutoriel Adafruit :  
https://learn.adafruit.com/adafruit-max98357-i2s-class-d-mono-amp?view=all  
⚠️ Ne pas activer `/dev/zero`.

---

## 6️⃣ Installation du Runtime

### Créer un environnement Python
```bash
mkvirtualenv -p python3 open-duck-mini-runtime
workon open-duck-mini-runtime
```

### Cloner et installer
```bash
git clone --depth 1 --branch v2 https://github.com/xmaquet/Open_Duck_Mini_Runtime
cd Open_Duck_Mini_Runtime
pip install -e .
```

📌 Pour Raspberry Pi 5 :
```bash
pip uninstall -y RPi.GPIO
pip install lgpio
```

---

## 7️⃣ Tests

### IMU
```bash
python3 mini_bdx_runtime/mini_bdx_runtime/raw_imu.py
```
Test réseau :
```bash
python3 scripts/imu_server.py
python3 scripts/imu_client.py --ip <ip_du_pi>
```

### Moteurs
```bash
python3 scripts/check_motors.py
```

---

## 8️⃣ Configuration `duck_config.json`
Créer le fichier :
```bash
cp example_config.json ~/duck_config.json
```
Paramètres configurables :
- Orientation IMU
- Modules d’expression
- Offsets des articulations

---

## 9️⃣ Calibration des offsets articulaires
```bash
cd scripts/
python find_soft_offsets.py
```
💡 Plus tard, ces offsets seront flashés directement dans l’EEPROM.

---

## 🔟 Lancer la marche du robot

1. Télécharger le modèle ONNX :  
   https://github.com/apirrone/Open_Duck_Mini/blob/v2/BEST_WALK_ONNX_2.onnx
2. Lancer :
```bash
cd scripts/
python v2_rl_walk_mujoco.py --onnx_model_path <chemin>/BEST_WALK_ONNX_2.onnx
```

---

## 🎮 Commandes manette

| Touche | Action |
|--------|--------|
| A | Pause / Reprise |
| X | Projecteur ON/OFF |
| B | Son aléatoire |
| Y | Contrôle tête (⚠️ instable) |
| LT / RT | Antenne gauche / droite |
| LB | Sprint |

---

✅ **Votre Open Duck Mini est prêt à marcher !**

---

## 📱 Contrôle tablette Android (BLE) — branche `feature/bdx_webui`

Cette évolution ajoute une chaîne **Bluetooth Low Energy directe** entre la tablette et la Pi : la tablette est le **client GATT**, la Pi le **serveur** (BlueZ + bibliothèque Python `bluez-peripheral`). Pas besoin de Wi‑Fi pour envoyer les commandes.

### Documentation à lire

| Sujet | Fichier |
|--------|---------|
| Format JSON des trames, UUID GATT, commandes Pi | **[docs/protocol.md](docs/protocol.md)** |
| Architecture UI web → plugin Kotlin → robot | **[docs/architecture.md](docs/architecture.md)** |
| Vue d’ensemble Xbox vs Android | **[docs/bdx_bluetooth_control.md](docs/bdx_bluetooth_control.md)** |
| Dépendance BLE seule (secours pip) | **`extras/requirements-ble.txt`** |

### Sur la Raspberry Pi

1. **Système** : `sudo apt install bluez` ; ajouter l’utilisateur au groupe `bluetooth` :  
   `sudo usermod -aG bluetooth $USER` puis **déconnexion / reconnexion SSH** (ou reboot).
2. **Dépôt** : cloner ce fork ou ajouter un remote vers **`xmaquet/Open_Duck_Mini_Runtime`**, puis basculer sur **`feature/bdx_webui`** si ton `origin` pointe encore vers `apirrone/...` (sinon tu n’as pas l’extra `ble` ni `bdx-ble-robot`).
3. **Python** (à la racine du clone, venv activé) :

```bash
pip install --no-cache-dir -e ".[ble]"
bdx-ble-robot --dump
```

Équivalent : `python -m mini_bdx_runtime.ble_gatt_server --dump`.

Options utiles : `--name "Open Duck Mini"`, `--no-agent` si le pairing est déjà réglé, `--dbus-adapter /org/bluez/hci0` si la détection d’adaptateur échoue sous BlueZ récent.

### Pièges connus (déjà corrigés dans le code du fork)

- **`bluez-peripheral`** sur PyPI est en version **0.1.x** (pas de 1.x) : l’extra `ble` impose `>=0.1.7,<0.2`.
- Sous **BlueZ 5.8x**, tous les nœuds sous `/org/bluez` ne sont pas des adaptateurs : le serveur ignore ceux qui n’exposent pas `org.bluez.Adapter1` et peut forcer le chemin avec `--dbus-adapter`.
- Message **ONNXRuntime** sur la découverte GPU au démarrage : bruit sans impact sur le BLE.

### Application Android

- UI : dossier **`android_ui/`** (Vite + React/TS), transport TS vers le natif (~20 Hz, clamp, watchdog, arrêt d’urgence côté logique UI + plugin).
- App installable : **`android_app/`** (Capacitor + plugin Kotlin **RobotBlePlugin**). Enchaînement build : voir **`docs/architecture.md`**.

### Pont Python côté robot

Le module **`mini_bdx_runtime.xbox_bridge`** fournit **`AndroidBridgeController`** (même idée que la manette Xbox pour **`get_last_command()`**) lorsqu’un **`VirtualJoystickState`** est alimenté par le serveur GATT (`ble_gatt_server`). Relais TCP possible : `python -m mini_bdx_runtime.xbox_bridge --tcp-port 8765`.