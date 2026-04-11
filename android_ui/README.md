# Interface Android (bundle Figma)

Bundle généré depuis Figma : `Interface de manette Xbox`  
Source : `https://www.figma.com/design/hDRmNe5rpwWgXgk8W2ur6I/Interface-de-manette-Xbox`

## Lancer en dev

```bash
npm i
npm run dev
```

Pour empaqueter dans l’APK Android, enchaîner avec les scripts du dossier **`android_app/`** (`build:web`, `sync:web`, `cap:sync`, etc. — voir **`docs/architecture.md`**).

## Contrat d’échange (actuel)

L’UI maintient un état manette et émet des trames **JSON** alignées sur le runtime (`ControllerFrame` v1). Le transport vers le robot passe par l’app **Capacitor** (`../android_app/`) : le plugin Kotlin **BLE natif** écrit sur la caractéristique GATT **TX** (plus de dépendance au Web Bluetooth dans la WebView).

Voir **`docs/protocol.md`** (schéma JSON, UUID) et **`docs/architecture.md`** (chaîne UI → Kotlin → Pi).