# Interface Android (bundle Figma)

Bundle généré depuis Figma : `Interface de manette Xbox`  
Source : `https://www.figma.com/design/hDRmNe5rpwWgXgk8W2ur6I/Interface-de-manette-Xbox`

## Lancer en dev

```bash
npm i
npm run dev
```

## Contrat d’échange (actuel)

L’UI maintient un `ControllerState` et l’envoie en JSON vers le robot (voir `src/app/App.tsx`), via Web Bluetooth (voir `src/app/components/BluetoothManager.tsx`).

## Note Web Bluetooth (Android)

Web Bluetooth requiert un **contexte sécurisé** (HTTPS, ou `http://localhost` en dev). En production, si tu embarques cette UI dans une app Android, le plus robuste est souvent d’utiliser le **BLE natif** (et d’éviter les limites WebView).