## Déploiement de la Web UI BDX (Raspberry Pi Zero 2W)

### Prérequis
- Raspberry Pi OS (Lite recommandé)
- Python 3 et `python3-venv` (le script ci-dessous s’en charge)

### Installation

```bash
# Sur le Pi
sudo apt update
sudo apt install -y git

git clone <URL_DU_REPO> Open_Duck_Mini_Runtime
cd Open_Duck_Mini_Runtime

# Script d’installation
bash scripts/install_bdx_webui.sh
```

Le script:
- crée le venv `.venv`,
- installe le runtime en mode editable + `Flask` via l’extra `[webui]`,
- vérifie l’installation.

### Lancement du serveur

```bash
source .venv/bin/activate
python -m mini_bdx_runtime.webui --port 8080
```

Ouvrez depuis un autre appareil:

```
http://<ip_du_pi>:8080
```

Vous pouvez aussi définir le port via variable d’environnement:

```bash
export BDX_WEBUI_PORT=8080
python -m mini_bdx_runtime.webui
```

### Exemple d’unité systemd

Fichier (exemple) `/etc/systemd/system/bdx-webui.service`:

```
[Unit]
Description=BDX Web UI
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Open_Duck_Mini_Runtime
Environment=BDX_WEBUI_PORT=8080
ExecStart=/home/pi/Open_Duck_Mini_Runtime/.venv/bin/python -m mini_bdx_runtime.webui
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Commandes:

```bash
sudo systemctl daemon-reload
sudo systemctl enable bdx-webui.service
sudo systemctl start bdx-webui.service
sudo systemctl status bdx-webui.service
```

### Notes matérielles
- Sans hardware, l’API renvoie des erreurs non bloquantes (audio/LEDs/etc. indisponibles). Les tests de pieds (switchs) retournent une erreur si GPIO absent.
- Les fonctionnalités “IMU” / “marche” ne sont pas exposées ici (placeholders uniquement).


