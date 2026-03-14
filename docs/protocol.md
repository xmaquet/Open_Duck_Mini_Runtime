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

