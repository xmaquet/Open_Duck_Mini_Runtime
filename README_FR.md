# 🦆 Open Duck Mini Runtime — Guide d'installation (FR)

Ce guide explique comment préparer, configurer et lancer le robot **Open Duck Mini** sur un **Raspberry Pi Zero 2W** (ou Pi 5 avec adaptations).

---

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

## 4️⃣ Connexion de la manette Xbox One (Bluetooth)

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
python3 mini_bdx_runtime/mini_bdx_runtime/xbox_controller.py
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
git clone https://github.com/apirrone/Open_Duck_Mini_Runtime
cd Open_Duck_Mini_Runtime
git checkout v2
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