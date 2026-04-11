# Protocole de contrôle (Android → Robot)

Ce document définit le **contrat d’échange** entre l’application Android (UI tactile) et le runtime du robot.

## Source de vérité (runtime existant)

Le modèle de commandes et les conventions viennent de :
- `mini_bdx_runtime/mini_bdx_runtime/xbox_controller.py`
- `mini_bdx_runtime/mini_bdx_runtime/buttons.py`
- consommateurs : `scripts/v2_rl_walk_mujoco.py`, `scripts/head_puppet.py`, `scripts/antennas_controller_test.py`

Le runtime “marche RL” utilise :
- `last_commands`: tableau de **7 floats**
- `Buttons`: structure d’états et d’événements (`is_pressed`, `triggered`)
- `left_trigger`, `right_trigger`: **floats [0..1]**

## Objectif du protocole

L’app Android ne doit **pas inventer** un nouveau modèle. Elle doit transmettre une représentation qui permet de reconstruire :
- les mêmes `Buttons.update(...)` (donc les mêmes `triggered`)
- les mêmes commandes analogiques (axes + triggers) utilisées dans `xbox_controller.py`

## Message envoyé (ControllerFrame)

Transport : BLE (GATT write, préférence “write without response” + throttling).

Encodage : **UTF‑8 JSON** (simple, robuste).  
(Une version binaire pourra être ajoutée plus tard si besoin, sans changer la sémantique.)

### Schéma JSON

```json
{
  "v": 1,
  "ts_ms": 1710000000000,
  "seq": 123,
  "axes": { "lx": 0.0, "ly": 0.0, "rx": 0.0, "ry": 0.0 },
  "triggers": { "lt": 0.0, "rt": 0.0 },
  "buttons": { "A": false, "B": false, "X": false, "Y": false, "LB": false, "RB": false },
  "dpad": { "up": false, "down": false },
  "safety": { "estop": false }
}
```

### Contraintes valeurs (sécurité)

- `axes.*` doivent être clampés dans **[-1, 1]**
- `triggers.*` doivent être clampés dans **[0, 1]**
- `triggers.*` : deadzone recommandée **0.1** (comme dans `xbox_controller.py`)
- si `safety.estop == true` : le robot doit considérer la frame comme **neutre**

## Conventions de signe (alignement XboxController)

Dans `xbox_controller.py`, les axes pygame sont multipliés par `-1`.  
Pour émuler le comportement manette physique, l’app Android applique la même convention :

- `lx = -ui.leftStick.x`
- `ly = -ui.leftStick.y`
- `rx = -ui.rightStick.x`
- `ry = -ui.rightStick.y` (actuellement non utilisé côté robot, mais transmis pour compat)

## Reconstruction côté robot (référence)

À réception d’une `ControllerFrame`, le runtime robot doit :

1. Mettre à jour les événements boutons :
   - `Buttons.update(A,B,X,Y,LB,RB,dpad_up,dpad_down)`
2. Produire les commandes analogiques (équivalent `xbox_controller.get_commands()`):
   - mode locomotion (par défaut) :
     - `lin_vel_x = ly * X_RANGE`
     - `lin_vel_y = lx * Y_RANGE`
     - `yaw = rx * YAW_RANGE`
   - mode tête : bascule sur **front montant** de `Y` (comme actuellement)
3. Utiliser `lt/rt` pour les antennes (cf. scripts existants) :
   - `antennas.left = rt`, `antennas.right = lt`

## GATT (BLE)

Pour minimiser les changements, on conserve les UUIDs utilisés dans le prototype Figma :

- **Service** : `12345678-1234-5678-1234-56789abcdef0`
- **TX (Android → Robot)** characteristic (write) : `12345678-1234-5678-1234-56789abcdef1`
- **RX (Robot → Android)** characteristic (notify, optionnel) : `12345678-1234-5678-1234-56789abcdef2`

L’app Android écrit des `ControllerFrame` sur TX.  
Le robot peut envoyer des logs/états sur RX (JSON libre, ex. `{ "type": "log", "level": "info", "message": "..." }`).

## Réception côté robot (Python)

- Module **`mini_bdx_runtime.xbox_bridge`** : parse les mêmes lignes JSON et expose une API **`AndroidBridgeController.get_last_command()`** identique à **`XBoxController.get_last_command()`** (à utiliser dans les scripts RL / tête à la place de la manette physique).
- Transport **TCP** intégré (`python -m mini_bdx_runtime.xbox_bridge --tcp-port 8765`) : une ligne JSON UTF-8 terminée par `\n` par trame (compatible avec un relais Wi‑Fi ou un tunnel).

### Serveur GATT sur la Raspberry Pi (BLE direct tablette ↔ Pi)

- **Rôle** : la tablette est le **central BLE** (client), le Pi le **périphérique** (serveur GATT). Pas besoin de Wi‑Fi pour le contrôle : le lien est **Bluetooth Low Energy**.
- **Paquets** : `bluez`, `pip install -e ".[ble]"` (apporte `bluez-peripheral`). Utilisateur dans le groupe `bluetooth` : `sudo usermod -aG bluetooth $USER` (déconnexion / reconnexion).
- **Commande** : `bdx-ble-robot` ou `python -m mini_bdx_runtime.ble_gatt_server` (options `--name`, `--dump`, `--no-agent`, etc.).
- **Si `does not provide the extra 'ble'`** : le `setup.cfg` du clone est trop ancien → `git pull`, ou installe les deps à la main puis réinstalle le paquet pour les scripts console :
  ```bash
  pip install --no-cache-dir -r extras/requirements-ble.txt
  pip install --no-cache-dir -e .
  ```
  Ensuite `bdx-ble-robot` est dans `.venv/bin/` ; sinon : `python -m mini_bdx_runtime.ble_gatt_server --dump`.
- **Pairing** : l’agent `NoIoAgent` peut exiger des droits élevés ; en cas d’échec, lancer avec `sudo` ou `--no-agent` si le pairing est déjà en place.
- L’app Android scanne le **service UUID** ci-dessus puis écrit sur **TX** ; le Pi réassemble les octets (écritures longues / chunks) et met à jour l’état consommé par `AndroidBridgeController`.

### Dépannage (Pi / BlueZ / pip)

| Symptôme | Cause probable | Piste |
|----------|----------------|--------|
| `does not provide the extra 'ble'` | Clone sur une branche ou un remote sans section `ble` dans `setup.cfg` | Utiliser la branche **`feature/bdx_webui`** du fork **xmaquet**, ou `pip install -r extras/requirements-ble.txt` puis `pip install -e .` |
| `No matching distribution found for bluez-peripheral>=1` | Ancienne contrainte erronée (PyPI n’a pas de 1.x) | `git pull` le fork à jour (`>=0.1.7,<0.2`) |
| `cannot import name 'Service' from 'bluez_peripheral.gatt'` | API 0.1.7 : `Service` est dans `gatt.service` | Mettre à jour `ble_gatt_server.py` depuis la branche du fork |
| `InterfaceNotFoundError: org.bluez.Adapter1` | BlueZ 5.8x : sous `/org/bluez`, certains nœuds ne sont pas des adaptateurs HCI | Version récente du serveur qui **filtre** les objets sans `Adapter1`, ou lancer avec **`--dbus-adapter /org/bluez/hci0`** |
| Bluetooth éteint | Adaptateur non alimenté | `bluetoothctl power on` |
| Pairing / agent | Droits D-Bus | `sudo usermod -aG bluetooth $USER` + reconnexion ; ou `--no-agent` si déjà appairé |
| Avertissement ONNX « GPU device discovery failed » sur Pi | Import `onnxruntime` ailleurs dans la chaîne | Sans impact sur le BLE ; ignorer ou retarder l’import ONNX si les logs gênent |

### Options CLI utiles (`bdx-ble-robot` / `ble_gatt_server`)

- **`--name`** : nom d’affichage en publicité BLE.
- **`--dump`** : affiche périodiquement `get_last_command()` (test sans script RL).
- **`--freq`** : fréquence de la boucle `AndroidBridgeController` (Hz).
- **`--head-only`** : `only_head_control` côté pont.
- **`--no-agent`** : ne pas enregistrer `NoIoAgent` (pairing déjà géré ou souci de permissions).
- **`--dbus-adapter PATH`** : chemin D-Bus explicite de l’adaptateur (ex. `/org/bluez/hci0`).

