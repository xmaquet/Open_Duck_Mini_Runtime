## Contrôle BDX via Bluetooth (manette Xbox / Android)

Objectif : piloter le robot via une manette connectée en Bluetooth au Raspberry Pi (Xbox aujourd’hui, Android en émulation bientôt).

### Installation (Pi Zero 2W)

```bash
sudo apt update
sudo apt install -y git

# Option A (recommandée) : bootstrap qui clone + installe
WITH_CONTROL=1 bash -c "$(curl -fsSL https://raw.githubusercontent.com/xmaquet/Open_Duck_Mini_Runtime/v2/scripts/install_bdx_runtime.sh)"

# Option B : si le dépôt est déjà cloné, installe localement
# cd Open_Duck_Mini_Runtime
# python3 -m venv .venv
# source .venv/bin/activate
# python -m pip install --upgrade pip
# pip install -e .[control]
```

### Appairage Bluetooth (Xbox)

```bash
bluetoothctl
scan on
pair <adresse_mac>
trust <adresse_mac>
connect <adresse_mac>
```

### Test lecture manette

```bash
source ~/Open_Duck_Mini_Runtime/.venv/bin/activate  # chemin par défaut du bootstrap
python -m mini_bdx_runtime.xbox_controller
```

### Note Android (à venir)

Si Android émule une manette Bluetooth (HID gamepad), le Pi verra un joystick similaire : l’objectif est de garder la même couche de lecture (`pygame`) et de rendre le mapping configurable si nécessaire.

