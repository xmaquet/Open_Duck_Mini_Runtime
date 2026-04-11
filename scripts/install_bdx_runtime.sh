#!/usr/bin/env bash
set -euo pipefail

# Bootstrap d'installation du runtime sur Raspberry Pi (optionnel: support manette via pygame)
# Usage basique (Pi via SSH/puTTY) :
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/xmaquet/Open_Duck_Mini_Runtime/v2/scripts/install_bdx_runtime.sh)"
#
# Avec options :
#   REPO=https://github.com/xmaquet/Open_Duck_Mini_Runtime.git BRANCH=v2 bash -c "$(curl -fsSL https://raw.githubusercontent.com/xmaquet/Open_Duck_Mini_Runtime/v2/scripts/install_bdx_runtime.sh)"
#   WITH_CONTROL=1 bash -c "$(curl -fsSL https://raw.githubusercontent.com/xmaquet/Open_Duck_Mini_Runtime/v2/scripts/install_bdx_runtime.sh)"
#
# Variables d'environnement supportées :
#   REPO   : URL du repo à cloner (défaut: fork xmaquet)
#   BRANCH : branche à utiliser (défaut: v2)
#   DIR    : dossier cible (défaut: Open_Duck_Mini_Runtime)
#   WITH_CONTROL : si "1", installe pygame (+ deps système) pour lire une manette (Xbox/Android)
#

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Ce script doit être exécuté sur Linux (Raspberry Pi OS)." >&2
  exit 1
fi

REPO="${REPO:-https://github.com/xmaquet/Open_Duck_Mini_Runtime.git}"
BRANCH="${BRANCH:-v2}"
DIR="${DIR:-Open_Duck_Mini_Runtime}"
WITH_CONTROL="${WITH_CONTROL:-0}"

echo "[1/6] apt update + prérequis système"
sudo apt update -y
sudo apt install -y git python3 python3-venv python3-pip pkg-config bluez python3-dev swig \
  python3-numpy python3-scipy python3-pygame python3-opencv \
  libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev libsdl2-ttf-dev \
  libfreetype6-dev libportmidi-dev libjpeg-dev libpng-dev

if [[ ! -d "$DIR/.git" ]]; then
  echo "[2/6] Clonage du dépôt ($REPO) dans '$DIR' (branche: $BRANCH)"
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$DIR"
else
  echo "[2/6] Dépôt déjà présent, mise à jour..."
  pushd "$DIR" >/dev/null
  git fetch --prune
  git checkout "$BRANCH"
  git pull --rebase origin "$BRANCH" || true
  popd >/dev/null
fi

echo "[3/6] Création/activation de l'environnement virtuel (system-site-packages + TMPDIR hors tmpfs)"
mkdir -p "${HOME}/tmp"
export TMPDIR="${HOME}/tmp"
pushd "$DIR" >/dev/null
if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv --system-site-packages
fi
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel

echo "[4/6] Installation du runtime (editable)"
pip install --no-cache-dir -e .

if [[ "$WITH_CONTROL" == "1" ]]; then
  echo "[5/6] Installation support manette (pygame) via l'extra [control]"
  pip install --no-cache-dir -e ".[control]"
else
  echo "[5/6] Étape support manette ignorée (WITH_CONTROL != 1)"
fi

echo "[6/6] Installation terminée."
echo
echo "Pour activer l'environnement et utiliser le runtime :"
echo "  source .venv/bin/activate"
if [[ "$WITH_CONTROL" == "1" ]]; then
  echo "Pour tester la lecture d'une manette (après appairage Bluetooth, voir README / docs/xbox_controller_setup.md) :"
  echo "  bash tools/test_xbox_controller.sh"
  echo "  ou : python -m mini_bdx_runtime.xbox_controller"
fi
popd >/dev/null


