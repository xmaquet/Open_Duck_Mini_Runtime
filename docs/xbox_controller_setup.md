# Manette Xbox en Bluetooth (Raspberry Pi / Linux)

Ce guide complète le README : appairage **BlueZ** (`bluetoothctl`) puis test avec **pygame** (joystick Linux `/dev/input/js*`), comme dans `mini_bdx_runtime.xbox_controller`.

## Prérequis

- Bluetooth actif sur le Pi (`sudo raspi-config` → interface Bluetooth, ou équivalent).
- Paquets : `bluez` (fournit `bluetoothctl`), `python3-pygame` **ou** l’extra pip `.[control]` dans le venv.
- Le runtime installé en éditable : `pip install -e .` (et idéalement `pip install -e ".[control]"` si pygame n’est pas fourni par le système).

## Piège fréquent : `bluetoothctl` est un shell interactif

- L’invite ressemble à `[bluetooth]#` ou `[bluetoothctl]>`.
- **Tu n’es pas dans bash** : une commande du type `python ...` sera interprétée par bluetoothctl, pas par le shell — **ça ne lance pas Python**.
- Pour revenir au terminal normal : taper **`exit`** (ou Ctrl+D), puis lancer les commandes Python.

## Séquence d’appairage recommandée

1. Allume la manette Xbox et mets-la en **mode appairage** (bouton sync en haut, LED qui clignote).

2. Dans un terminal **bash** :

```bash
bluetoothctl
```

3. Dans l’invite bluetoothctl :

```text
power on
agent on
default-agent
scan on
```

4. Attends qu’une ligne apparaisse avec le nom du périphérique (souvent « Xbox Wireless Controller » ou similaire) et note l’adresse **MAC** `XX:XX:XX:XX:XX:XX`.

5. Toujours dans bluetoothctl :

```text
pair XX:XX:XX:XX:XX:XX
trust XX:XX:XX:XX:XX:XX
connect XX:XX:XX:XX:XX:XX
```

6. La LED doit rester **allumée** (connecté).

7. **Quitter** bluetoothctl :

```text
exit
```

Tu dois retrouver l’invite bash habituelle (`$` ou `user@host:~$`).

## Lancer le test du contrôleur (après `exit`)

À la **racine du dépôt**, avec le venv activé :

```bash
source .venv/bin/activate
pip install -e ".[control]"   # si pygame n’est pas déjà dispo dans le venv
```

Commandes équivalentes (recommandé : pas de chemin fichier ambigu) :

```bash
python -m mini_bdx_runtime.xbox_controller
```

Ou, après installation du package :

```bash
bdx-xbox-controller
```

Script d’aide :

```bash
bash tools/test_xbox_controller.sh
```

## SSH sans écran (session sans DISPLAY)

Pygame/SDL peut exiger un pilote vidéo factice :

```bash
export SDL_VIDEODRIVER=dummy
python -m mini_bdx_runtime.xbox_controller
```

Le script `tools/test_xbox_controller.sh` définit `SDL_VIDEODRIVER=dummy` automatiquement s’il n’y a ni `DISPLAY` ni `WAYLAND_DISPLAY`.

## Dépannage rapide

| Symptôme | Piste |
|----------|--------|
| `Invalid command` en tapant `python` | Tu es encore dans **bluetoothctl** → `exit`. |
| Fichier introuvable avec un chemin `mini_bdx_runtime/.../xbox_controller.py` | Préfère `python -m mini_bdx_runtime.xbox_controller` depuis la racine avec venv activé. |
| Retrouver le fichier | `find . -name 'xbox_controller.py'` depuis la racine du clone. |
| Manette listée mais pas de joystick pygame | `connect` non fait ou manette endormie — rallumer / reconnecter. |
| `Aucun joystick détecté` (message du runtime) | Bluetooth + pair + **connect** + être sorti de bluetoothctl. |
| Permission joystick | En général l’utilisateur `pi` peut lire `/dev/input/js0` ; sinon vérifier groupes `input` / règles udev. |

## Dépendances côté code

- **pygame** : sous-système joystick (événements Linux).
- Pas besoin de **root** pour un test standard si les permissions `/dev/input/*` sont correctes.
