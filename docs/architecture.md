## Architecture Android (UI tablette) → Robot

Objectif : remplacer la manette Xbox physique par une UI tactile Android, tout en restant aligné sur le modèle runtime existant.

### Composants

- **`android_ui/`** : frontend existant (React + TypeScript + Vite) avec composants manette.
- **`android_app/`** : wrapper Capacitor (Android) qui embarque les assets web buildés.
- **Plugin natif** : `android_app/android/.../RobotBlePlugin.kt` (BLE en Kotlin).
- **Runtime robot** : Python (ce repo) – reçoit des commandes via BLE (côté robot à implémenter séparément).

### Flux de données

1. UI tactile met à jour un `UiControllerState` (sticks, boutons, triggers).
2. Couche transport TS convertit vers une `ControllerFrameV1` (alignée sur `xbox_controller.py`) et envoie à **20 Hz**.
3. Capacitor appelle le plugin natif Kotlin.
4. Kotlin BLE écrit les frames sur la characteristic TX (GATT write).
5. Robot consomme les frames et reconstruit `Buttons.triggered` + `last_commands`.

### Sécurité robotique (implémentée côté Android)

- **Clamp** : axes \([-1,1]\), triggers \([0,1]\)
- **Deadzone triggers** : 0.1 (comme `xbox_controller.py`)
- **Watchdog natif** : si aucune frame reçue de l’UI depuis un délai, envoi périodique de commandes neutres
- **E‑Stop** : combo `Start+Select` ⇒ `safety.estop=true` + commandes neutres (latched côté natif)
- **Reconnexion** : tentative de reconnexion BLE si la connexion tombe (best-effort)

### Build / exécution Android

Prérequis : Node.js + Android Studio.

Depuis `android_app/` :

1. Build web:
   - `npm run build:web`
2. Copier assets web vers Capacitor:
   - `npm run sync:web`
3. Synchroniser Capacitor/Android:
   - `npm run cap:sync`
4. Ouvrir Android Studio:
   - `npm run android:open`

### Références

- Contrat de protocole : `docs/protocol.md`
- Source de vérité runtime : `mini_bdx_runtime/mini_bdx_runtime/xbox_controller.py`, `mini_bdx_runtime/mini_bdx_runtime/buttons.py`

