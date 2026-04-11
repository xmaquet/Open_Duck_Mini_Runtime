## Contrôle BDX via Bluetooth (manette Xbox / tablette Android)

Deux chemins distincts sur la Raspberry Pi :

| Mode | Rôle du Pi | Stack côté tablette | Entrée Python typique |
|------|------------|---------------------|------------------------|
| **Manette Xbox** | Central Bluetooth classique ; la manette est un périphérique HID | Manette physique | **pygame** joystick → `xbox_controller` / `bdx-xbox-controller` |
| **UI Android (cette branche)** | **Périphérique BLE GATT** ; la tablette est le central | App **Capacitor** + plugin Kotlin | **`ble_gatt_server`** + **`AndroidBridgeController`** (`bdx-ble-robot`) |

Les deux visent le même **modèle de commandes** (`last_commands`, boutons, triggers) pour réutiliser les scripts existants (marche RL, tête, antennes).

---

### A. Manette Xbox (pygame)

Guide détaillé : **[docs/xbox_controller_setup.md](xbox_controller_setup.md)**  
Script de test : **`tools/test_xbox_controller.sh`**

Installation rapide (extrait) :

```bash
sudo apt update
sudo apt install -y bluez   # pour bluetoothctl
# venv + pip install -e ".[control]"
python -m mini_bdx_runtime.xbox_controller
# ou : bdx-xbox-controller
```

---

### B. Tablette Android (BLE GATT) — branche `feature/bdx_webui`

1. **Sur la Pi** : BlueZ + utilisateur dans le groupe `bluetooth`, puis :

```bash
pip install --no-cache-dir -e ".[ble]"
bdx-ble-robot
```

2. **Sur la tablette** : installer l’APK construit depuis **`android_app/`** (voir **[docs/architecture.md](architecture.md)**).

3. **Contrat** : UUID et JSON décrits dans **[docs/protocol.md](protocol.md)**.

Le serveur Python **`mini_bdx_runtime.ble_gatt_server`** enregistre le service GATT, reçoit les écritures sur **TX**, met à jour un **`VirtualJoystickState`** et pilote **`AndroidBridgeController`** comme un substitut de la manette.

**Fichiers clés**

- Pi : `mini_bdx_runtime/ble_gatt_server.py`, `mini_bdx_runtime/xbox_bridge.py`
- Android natif : `android_app/.../RobotBlePlugin.kt`
- UI + transport TS : `android_ui/`

**Dépannage** : tableau dans **`docs/protocol.md`** (extra `ble`, `bluez-peripheral` 0.1.x, `org.bluez.Adapter1`, `--dbus-adapter`).

---

### Bootstrap script (historique)

Pour une installation type « manette seule » depuis zéro :

```bash
WITH_CONTROL=1 bash -c "$(curl -fsSL https://raw.githubusercontent.com/xmaquet/Open_Duck_Mini_Runtime/v2/scripts/install_bdx_runtime.sh)"
```

Pour le flux **BLE tablette**, clone / checkout la branche **`feature/bdx_webui`** du fork et utilise l’extra **`.[ble]`** comme ci-dessus.
