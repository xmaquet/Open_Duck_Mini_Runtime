#!/usr/bin/env bash
set -euo pipefail

# Installation complète du runtime Open Duck Mini + Web UI (optionnelle)
# Utilisation recommandée (sur le Pi via SSH/PuTTY) :
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/xmaquet/Open_Duck_Mini_Runtime/feature/bdx_webui/scripts/bdx_full_install.sh)"
#
# Variables d'environnement supportées (toutes optionnelles) :
#   REPO        : URL du repo git (défaut: https://github.com/xmaquet/Open_Duck_Mini_Runtime.git)
#   BRANCH      : Branche à déployer (défaut: v2)
#   DIR         : Dossier cible (défaut: Open_Duck_Mini_Runtime)
#   WITH_WEBUI  : 1 pour installer la Web UI Flask, 0 pour ignorer (défaut: 1)
#   SYSTEMD     : 1 pour créer/activer un service systemd, 0 sinon (défaut: 0)
#   PORT        : Port HTTP de la Web UI (défaut: 8080)
#

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Ce script doit être exécuté sur Linux (Raspberry Pi OS)." >&2
  exit 1
fi

REPO="${REPO:-https://github.com/xmaquet/Open_Duck_Mini_Runtime.git}"
BRANCH="${BRANCH:-v2}"
DIR="${DIR:-Open_Duck_Mini_Runtime}"
WITH_WEBUI="${WITH_WEBUI:-1}"
SYSTEMD="${SYSTEMD:-0}"
PORT="${PORT:-8080}"

echo "[1/8] apt update + prérequis système"
sudo apt update -y
sudo apt install -y git python3 python3-venv python3-pip

if [[ "$WITH_WEBUI" == "1" ]]; then
  echo "[1b] Installation dépendances système pour pygame/SDL (Web UI)"
  sudo apt install -y pkg-config \
    libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev libsdl2-ttf-dev \
    libfreetype6-dev libjpeg-dev zlib1g-dev libasound2-dev libportmidi-dev
fi

echo "[2/8] Clonage/Mise à jour du dépôt"
if [[ ! -d "$DIR/.git" ]]; then
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$DIR"
else
  pushd "$DIR" >/dev/null
  git fetch --prune
  git checkout "$BRANCH"
  git pull --rebase origin "$BRANCH" || true
  popd >/dev/null
fi

echo "[3/8] Création/Activation de l’environnement virtuel"
pushd "$DIR" >/dev/null
if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
python -m pip install --upgrade pip

echo "[4/8] Installation du runtime (editable)"
pip install -e .

echo "[5/8] Ajustements spécifiques (Raspberry Pi 5 uniquement)"
if [[ -r /proc/device-tree/model ]] && grep -qi "Raspberry Pi 5" /proc/device-tree/model; then
  # Voir README du projet
  pip uninstall -y RPi.GPIO || true
  pip install lgpio
fi

if [[ "$WITH_WEBUI" == "1" ]]; then
  echo "[6/8] Installation de la Web UI (Flask) via l'extra [webui]"
  pip install -e .[webui]
fi

echo "[7/8] duck_config.json (création si absent)"
if [[ ! -f "$HOME/duck_config.json" ]] && [[ -f "example_config.json" ]]; then
  cp example_config.json "$HOME/duck_config.json"
  echo "  -> Copié example_config.json vers ~/duck_config.json"
fi

if [[ "$SYSTEMD" == "1" ]] && [[ "$WITH_WEBUI" == "1" ]]; then
  echo "[8/8] Création d'un service systemd (root) pour la Web UI"
  SERVICE_NAME="bdx-webui.service"
  SERVICE_PATH="/etc/systemd/system/${SERVICE_NAME}"
  WORKDIR="$(pwd)"
  PYBIN="${WORKDIR}/.venv/bin/python"

  sudo bash -c "cat > '${SERVICE_PATH}'" <<EOF
[Unit]
Description=BDX Web UI
After=network.target

[Service]
Type=simple
User=${SUDO_USER:-$USER}
WorkingDirectory=${WORKDIR}
Environment=BDX_WEBUI_PORT=${PORT}
ExecStart=${PYBIN} -m mini_bdx_runtime.webui
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable "${SERVICE_NAME}"
  sudo systemctl restart "${SERVICE_NAME}"
  echo "Service systemd installé: ${SERVICE_NAME}"
  echo "  journalctl -u ${SERVICE_NAME} -f"
else
  echo "[8/8] Étape systemd ignorée (SYSTEMD != 1)"
fi

popd >/dev/null

echo
echo "Installation terminée."
echo
echo "Activer l'environnement :"
echo "  source ${DIR}/.venv/bin/activate"
if [[ "$WITH_WEBUI" == "1" ]]; then
  echo "Lancer la Web UI (manuel) :"
  echo "  python -m mini_bdx_runtime.webui --port ${PORT}"
  echo "Depuis un navigateur : http://<ip_du_pi>:${PORT}"
fi


