#!/usr/bin/env bash
# Test manette Xbox (pygame) : vérifie venv, bluetoothctl, détection joystick, puis lance le lecteur.
# Usage : depuis n'importe où —  bash tools/test_xbox_controller.sh
#         ou : cd tools && ./test_xbox_controller.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

echo "=== Test manette Xbox (Open Duck Mini Runtime) ==="
echo "Racine dépôt : ${REPO_ROOT}"

if [[ ! -d ".venv" ]]; then
  echo "ERREUR : .venv introuvable à la racine du dépôt."
  echo "         Crée le venv puis : pip install -e .  et pour pygame : pip install -e \".[control]\""
  echo "         Ou lance ./install.sh depuis la racine."
  exit 1
fi

# shellcheck source=/dev/null
source .venv/bin/activate

if ! command -v bluetoothctl >/dev/null 2>&1; then
  echo "AVERTISSEMENT : bluetoothctl absent (paquet bluez). Utile pour l’appairage : sudo apt install bluez"
else
  echo "OK : bluetoothctl présent."
fi

if ! python -c "import pygame" 2>/dev/null; then
  echo "ERREUR : pygame non importable dans ce venv."
  echo "         Installe : pip install --no-cache-dir -e \".[control]\""
  echo "         Ou le paquet système : sudo apt install python3-pygame (avec venv --system-site-packages)."
  exit 1
fi

echo ""
echo "Contrôle rapide pygame (nombre de joysticks) :"
n="$(python -c "import pygame; pygame.init(); pygame.joystick.init(); print(pygame.joystick.get_count())")"
echo "  Joysticks détectés : ${n}"
if [[ "${n}" == "0" ]]; then
  echo ""
  echo "AVERTISSEMENT : aucun joystick — appaire/connecte la manette (voir docs/xbox_controller_setup.md),"
  echo "puis quitte bluetoothctl avec « exit » avant de lancer Python. Lancement quand même pour le message d’erreur détaillé…"
  echo ""
fi

# SSH sans bureau : SDL a souvent besoin d’un pilote vidéo factice pour pygame.
if [[ -z "${DISPLAY:-}" ]] && [[ -z "${WAYLAND_DISPLAY:-}" ]]; then
  export SDL_VIDEODRIVER="${SDL_VIDEODRIVER:-dummy}"
  echo "Pas de DISPLAY : SDL_VIDEODRIVER=${SDL_VIDEODRIVER} (recommandé pour pygame en SSH)."
fi

echo ""
echo "Lancement du lecteur (Ctrl+C pour arrêter). Commandes équivalentes :"
echo "  python -m mini_bdx_runtime.xbox_controller"
echo "  bdx-xbox-controller   (après pip install -e .)"
echo ""

exec python -m mini_bdx_runtime.xbox_controller
