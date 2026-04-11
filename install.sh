#!/usr/bin/env bash
# Installation locale du runtime (dépôt déjà cloné, ex. sur Raspberry Pi OS / Debian Trixie).
# Usage : depuis la racine du repo —  chmod +x install.sh && ./install.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log() { echo "[$(date -Iseconds)] $*"; }

log "=== Open Duck Mini Runtime — installation ==="

if [[ "$(uname -s)" != "Linux" ]]; then
  log "AVERTISSEMENT : ce script cible Linux (Raspberry Pi / Debian). Poursuite quand même."
fi

if [[ -r /proc/device-tree/model ]]; then
  MODEL="$(tr -d '\0' < /proc/device-tree/model)"
  log "Plateforme : ${MODEL}"
else
  log "Plateforme : (non-Raspberry Pi ou device-tree absent)"
fi

if ! command -v python3 >/dev/null 2>&1; then
  log "ERREUR : python3 introuvable."
  exit 1
fi

PY_VER="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")')"
log "Interpréteur : $(command -v python3) — Python ${PY_VER}"

if ! python3 -c 'import sys; sys.exit(0 if (3, 11) <= sys.version_info < (3, 14) else 1)' 2>/dev/null; then
  log "ERREUR : Python 3.11 à 3.13 requis (projet déclaré compatible dans setup.cfg / pyproject.toml)."
  exit 1
fi

log "[apt] Mise à jour des paquets système et dépendances de build / runtime…"
sudo apt update
sudo apt install -y \
  pkg-config \
  python3-venv python3-dev swig \
  python3-numpy python3-scipy python3-pygame python3-opencv \
  libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev libsdl2-ttf-dev \
  libfreetype6-dev libportmidi-dev libjpeg-dev libpng-dev

log "[tmp] TMPDIR → ~/tmp (évite de saturer le tmpfs /tmp lors des installs pip)"
mkdir -p "${HOME}/tmp"
export TMPDIR="${HOME}/tmp"

log "[venv] Création ou réutilisation de .venv avec --system-site-packages (numpy/pygame/opencv système)"
if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv --system-site-packages
else
  log "Répertoire .venv existant — réutilisation (supprime-le pour recréer le venv)."
fi
# shellcheck source=/dev/null
source .venv/bin/activate

log "[pip] Mise à jour pip / setuptools / wheel"
python -m pip install --upgrade pip setuptools wheel

log "[pip] Installation du package en mode éditable (--no-cache-dir, sans encombrer tmpfs)"
pip install --no-cache-dir -e .

log "=== Install DONE ==="
log "Activer l’environnement :  source ${SCRIPT_DIR}/.venv/bin/activate"
log "Extras utiles :  pip install --no-cache-dir -e \".[control]\"   # manette"
log "                 pip install --no-cache-dir -e \".[rl]\"       # inférence ONNX (marche)"
log "                 pip install --no-cache-dir -e \".[hardware]\"  # bus / IMU matériel"
