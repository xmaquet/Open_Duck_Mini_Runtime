# Open Duck Mini Runtime

## Raspberry Pi zero 2W setup

### Install Raspberry Pi OS

Download Raspberry Pi OS Lite (64-bit) from here : https://www.raspberrypi.com/software/operating-systems/

Follow the instructions here to install the OS on the SD card : https://www.raspberrypi.com/documentation/computers/getting-started.html

With the Raspberry Pi Imager, you can pre-configure session, wifi and ssh. Do it like below :

![imager_setup](https://github.com/user-attachments/assets/7a4987b2-de83-41dd-ab7f-585259685f16)

> Tip: I configure the rasp to connect to my phone's hotspot, this way I can connect to it from anywhere.

### Setup SSH (If not setup during the installation)

When first booting on the rasp, you will need to connect a screen and a keyboard. The first thing you should do is connect to a wifi network and enable SSH.

To do so, you can follow this guide : https://www.raspberrypi.com/documentation/computers/configuration.html#setting-up-wifi

Then, you can connect to your rasp using SSH without having to plug a screen and a keyboard.

### Update the system and install necessary stuff

```bash
sudo apt update
sudo apt upgrade
sudo apt install git
sudo apt install python3-pip
sudo apt install python3-virtualenvwrapper
(optional) sudo apt install python3-picamzero

```

Add this to the end of the `.bashrc`:

```bash
export WORKON_HOME=$HOME/.virtualenvs
export PROJECT_HOME=$HOME/Devel
source /usr/share/virtualenvwrapper/virtualenvwrapper.sh
```

### Enable I2C

`sudo raspi-config` -> `Interface Options` -> `I2C`

TODO set 400KHz ?

### Set the usbserial latency timer

```bash
cd  /etc/udev/rules.d/
sudo touch 99-usb-serial.rules
sudo nano 99-usb-serial.rules
# copy the following line in the file
SUBSYSTEM=="usb-serial", DRIVER=="ftdi_sio", ATTR{latency_timer}="1"
```

### Set the udev rules for the motor control board

TODO


### Xbox Controller Setup (Bluetooth)

Guide détaillé : **[docs/xbox_controller_setup.md](docs/xbox_controller_setup.md)**  
Script de test : **`tools/test_xbox_controller.sh`**

**Prérequis** : Bluetooth actif ; paquet **`bluez`** (`sudo apt install bluez`) pour `bluetoothctl`. Pygame : `python3-pygame` / venv `--system-site-packages` ou `pip install -e ".[control]"`.

**Important** : `bluetoothctl` ouvre un **shell interactif** (invite du type `[bluetooth]#`). Tant que tu y es, **`python ...` ne s’exécute pas** comme sous bash. Il faut d’abord quitter avec **`exit`**, puis lancer Python.

1. Manette en mode appairage (sync, LED clignotante).
2. Dans bash :

```bash
bluetoothctl
```

3. Dans bluetoothctl :

```text
power on
agent on
default-agent
scan on
```

4. Repère la ligne avec la manette (ex. « Xbox Wireless Controller ») et l’adresse `XX:XX:XX:XX:XX:XX`.

5. Toujours **dans bluetoothctl** :

```text
pair XX:XX:XX:XX:XX:XX
trust XX:XX:XX:XX:XX:XX
connect XX:XX:XX:XX:XX:XX
```

6. LED fixe = connecté. Puis **`exit`** pour revenir au shell normal.

7. Depuis la **racine du dépôt**, avec le venv activé :

```bash
source .venv/bin/activate
pip install -e ".[control]"   # si pygame n’est pas déjà disponible
python -m mini_bdx_runtime.xbox_controller
```

Équivalents : commande installée **`bdx-xbox-controller`**, ou **`bash tools/test_xbox_controller.sh`**.

#### Dépannage (manette Xbox / Bluetooth)

| Problème | Que faire |
|----------|-----------|
| `Invalid command` ou erreur bizarre en tapant `python` | Tu es encore dans **bluetoothctl** → tape **`exit`**. |
| « Fichier introuvable » avec un chemin vers `xbox_controller.py` | Utilise plutôt **`python -m mini_bdx_runtime.xbox_controller`** (après `pip install -e .`). |
| Retrouver le fichier dans le clone | `find . -name "xbox_controller.py"` |
| Manette vue au scan mais pygame ne voit rien | `connect` non fait, manette endormie, ou pas sorti de bluetoothctl. |
| Message « Aucun joystick détecté » | Voir [docs/xbox_controller_setup.md](docs/xbox_controller_setup.md) ; vérifier Bluetooth + extra `.[control]`. |
| SSH sans écran | `export SDL_VIDEODRIVER=dummy` (fait automatiquement par `tools/test_xbox_controller.sh`). |

**Dépendances** : **pygame** (joystick Linux) ; pas de root nécessaire en général si `/dev/input/js*` est lisible par ton utilisateur.

## Speaker wiring and configuration
Follow this tutorial

> For now, don't activate `/dev/zero` when they ask

https://learn.adafruit.com/adafruit-max98357-i2s-class-d-mono-amp?view=all


## Install the runtime

### Prérequis (Debian / Raspberry Pi OS, ex. Trixie)

**Python** : 3.11 à 3.13 (déclaré dans `setup.cfg`).

**Dépendances système** (SDL / headers pour pygame, numpy & scipy via apt pour limiter les compilations) :

```bash
sudo apt update
sudo apt install -y \
  pkg-config bluez \
  python3-venv python3-dev swig \
  python3-numpy python3-scipy python3-pygame python3-opencv \
  libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev libsdl2-ttf-dev \
  libfreetype6-dev libportmidi-dev libjpeg-dev libpng-dev
```

**Espace temporaire pip** : sur Raspberry Pi, `/tmp` est souvent un **tmpfs** (RAM) et peut saturer lors des installs `pip` (wheels, builds). Utiliser un répertoire sur la carte SD :

```bash
mkdir -p ~/tmp
export TMPDIR=$HOME/tmp
```

Tu peux ajouter `export TMPDIR=$HOME/tmp` à ton `~/.bashrc` pour que ce soit permanent.

**Environnement virtuel recommandé** : avec paquets scientifiques déjà fournis par Debian, créer le venv avec **`--system-site-packages`** évite de recompiler numpy / pygame / OpenCV :

```bash
python3 -m venv .venv --system-site-packages
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
pip install --no-cache-dir -e .
```

**Installation automatisée** (`install.sh`) :

- **Depuis un dépôt déjà cloné** (le script détecte le `.git` à côté de lui et travaille dans ce dossier) :

```bash
chmod +x install.sh
./install.sh
```

- **Machine neuve** (clone dans `~/Open_Duck_Mini_Runtime` par défaut, branche `v2`) : télécharge le script puis lance-le, ou exporte les variables avant :

```bash
curl -fsSL https://raw.githubusercontent.com/xmaquet/Open_Duck_Mini_Runtime/v2/install.sh -o install.sh
bash install.sh
# optionnel : REPO_DIR, REPO_URL, BRANCH, GIT_SHALLOW=0, SKIP_GIT_PULL=1 — voir l’en-tête de install.sh
```

Le script installe `git` si besoin, clone ou met à jour le dépôt (**sans `git pull` si le working tree n’est pas propre**), copie `example_config.json` vers `~/duck_config.json` seulement si absent, puis apt / venv / `pip install -e .` et contrôles `numpy` / `pygame` / `cv2`.

**Extras pip** (optionnels) :

- `.[control]` — pygame côté pip si tu n’utilises pas uniquement le paquet système (manette ; commande **`bdx-xbox-controller`** après install).
- `.[rl]` — **onnxruntime** pour la marche RL (`v2_rl_walk_mujoco.py`, `onnx_infer`).
- `.[hardware]` — bus Feetech / IMU (`rustypot`, `pypot`, Adafruit BNO055).
- `.[ble]` — **serveur GATT** sur la Pi pour l’app Android (`bdx-ble-robot`, `bluez-peripheral` + BlueZ).

Exemple :

```bash
pip install --no-cache-dir -e ".[control,rl]"
```

### Méthode classique (virtualenvwrapper)

```bash
mkvirtualenv -p python3 open-duck-mini-runtime
workon open-duck-mini-runtime
```

Clone ce dépôt sur le Pi, puis :

```bash
git clone https://github.com/apirrone/Open_Duck_Mini_Runtime
cd Open_Duck_Mini_Runtime
git checkout v2
# Recommandé : venv --system-site-packages + TMPDIR (voir ci-dessus)
pip install -e .
```

### Raspberry Pi 5 (GPIO)

```bash
pip uninstall -y RPi.GPIO
pip install lgpio
```


## Test the IMU

```bash
python3 mini_bdx_runtime/mini_bdx_runtime/raw_imu.py
```

You can also run `python3 scripts/imu_server.py` on the robot and `python3 scripts/imu_client.py --ip <robot_ip>` on your computer to check that the frame is oriented correctly. 

> To find the ip address of the robot, run `ifconfig` on the robot

## Test motors

This will allow you to verify all your motors are connected and configured.

```bash
python3 scripts/check_motors.py
```

## Make your duck_config.json

Copy `example_config.json` in the home directory of your duck and rename it `duck_config.json`.

`cp example_config.json ~/duck_config.json`

In this file, you can configure some stuff, like registering if you installed the expression features, installed the imu upside down or and other stuff. You also write the joints offsets of your duck here

## Find the joints offsets

This script will guide you through finding the joints offsets of your robot that you can then write in your `duck_config.json`

> This procedure won't be necessary in the future as we will be flashing the offsets directly in each motor's eeprom.

```bash
cd scripts/
python find_soft_offsets.py
```

## Run the walk !

Installe d’abord l’extra **RL** (wheel `onnxruntime`, voir `setup.cfg` → `[options.extras_require]` → `rl`) :

```bash
pip install --no-cache-dir -e ".[rl]"
```

Download the [latest policy checkpoint ](https://github.com/apirrone/Open_Duck_Mini/blob/v2/BEST_WALK_ONNX_2.onnx) and copy it to your duck.

`cd scripts/`

`python v2_rl_walk_mujoco.py --onnx_model_path <path_to>/BEST_WALK_ONNX_2.onnx`



```
- The commands are : 
- A to pause/unpause
- X to turn on/off the projector
- B to play a random sound
- Y to turn on/off head control (very experimental, I don't recommend trying that, it can break your duck's head)
- left and right triggers to control the left and right antennas
- LB (new!) press and hold to increase the walking frequency, kind of a sprint mode 🙂
```

## Android tablet control (BLE) — branch `feature/bdx_webui`

This fork adds a **native BLE path** from an Android app to the Pi: the tablet is the BLE **central**, the Pi runs a **GATT server** (`bluez-peripheral` + BlueZ). No Wi‑Fi is required for control.

| Topic | Location |
|--------|----------|
| JSON frame contract, UUIDs, Pi commands | **[docs/protocol.md](docs/protocol.md)** |
| End-to-end architecture (UI → Kotlin → Pi) | **[docs/architecture.md](docs/architecture.md)** |
| Xbox vs Android control overview | **[docs/bdx_bluetooth_control.md](docs/bdx_bluetooth_control.md)** |
| Fallback BLE requirements file | **`extras/requirements-ble.txt`** |

### On the Raspberry Pi

1. **System**: `sudo apt install bluez` ; add user to group `bluetooth` (`sudo usermod -aG bluetooth $USER`) then **log out / reconnect** (or reboot).
2. **Repo**: use this fork and the branch that contains BLE packaging, e.g.  
   `git clone …` then `git checkout feature/bdx_webui` **or** add remote `xmaquet` and pull that branch (if your default `origin` still points to `apirrone/Open_Duck_Mini_Runtime`).
3. **Python**: from the repo root with venv active:

```bash
pip install --no-cache-dir -e ".[ble]"
bdx-ble-robot --dump    # optional: prints bridge commands; Ctrl+C to stop
```

Equivalent: `python -m mini_bdx_runtime.ble_gatt_server`.

Useful flags: `--name "Open Duck Mini"`, `--no-agent` if pairing is already handled, `--dbus-adapter /org/bluez/hci0` if adapter autodetection fails on BlueZ 5.8+.

### Packaging notes

- Extra **`.[ble]`** installs **`bluez-peripheral`** in the **0.1.x** line (PyPI has no 1.x release; constraint is `>=0.1.7,<0.2`).
- If pip says the extra **`ble`** is unknown, your `setup.cfg` is outdated → `git pull` the correct branch, or:  
  `pip install -r extras/requirements-ble.txt` then `pip install -e .`.

### Android app (Capacitor)

Web UI lives in **`android_ui/`**; the installable app is **`android_app/`** (Capacitor + Kotlin BLE plugin). Build flow: see **`docs/architecture.md`** (`build:web`, `sync:web`, `cap:sync`, open in Android Studio).

### Using the bridge in Python scripts

`mini_bdx_runtime.xbox_bridge` exposes **`AndroidBridgeController`** with the same **`get_last_command()`** shape as the Xbox path when a **`VirtualJoystickState`** is fed from BLE (what `ble_gatt_server` does). Optional TCP relay: `python -m mini_bdx_runtime.xbox_bridge --tcp-port 8765`.

You may see a harmless **ONNXRuntime GPU discovery** log on Pi at import time; it does not affect BLE.