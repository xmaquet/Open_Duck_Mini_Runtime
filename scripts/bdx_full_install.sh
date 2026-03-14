#!/usr/bin/env bash
set -euo pipefail

# Installation complète du runtime Open Duck Mini (optionnel: support manette via pygame)
# Utilisation recommandée (sur le Pi via SSH/PuTTY) :
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/xmaquet/Open_Duck_Mini_Runtime/v2/scripts/bdx_full_install.sh)"
#
# Variables d'environnement supportées (toutes optionnelles) :
#   REPO        : URL du repo git (défaut: https://github.com/xmaquet/Open_Duck_Mini_Runtime.git)
#   BRANCH      : Branche à déployer (défaut: v2)
#   DIR         : Dossier cible (défaut: Open_Duck_Mini_Runtime)
#   WITH_CONTROL: 1 pour installer pygame (lecture manette Xbox/Android), 0 sinon (défaut: 1)
#

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Ce script doit être exécuté sur Linux (Raspberry Pi OS)." >&2
  exit 1
fi

REPO="${REPO:-https://github.com/xmaquet/Open_Duck_Mini_Runtime.git}"
BRANCH="${BRANCH:-v2}"
DIR="${DIR:-Open_Duck_Mini_Runtime}"
WITH_CONTROL="${WITH_CONTROL:-1}"

echo "[1/8] apt update + prérequis système"
sudo apt update -y
sudo apt install -y git python3 python3-venv python3-pip

if [[ "$WITH_CONTROL" == "1" ]]; then
  echo "[1b] Installation dépendances système pour pygame/SDL (manette)"
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

if [[ "$WITH_CONTROL" == "1" ]]; then
  echo "[6/8] Installation du support manette (pygame) via l'extra [control]"
  pip install -e .[control]
fi

echo "[7/8] duck_config.json (création si absent)"
if [[ ! -f "$HOME/duck_config.json" ]] && [[ -f "example_config.json" ]]; then
  cp example_config.json "$HOME/duck_config.json"
  echo "  -> Copié example_config.json vers ~/duck_config.json"
fi

echo "[8/8] Étape systemd: non applicable (pas de serveur Web UI)"

popd >/dev/null

echo
echo "Installation terminée."
echo
echo "Activer l'environnement :"
echo "  source ${DIR}/.venv/bin/activate"
if [[ "$WITH_CONTROL" == "1" ]]; then
  echo "Tester la lecture d'une manette :"
  echo "  python -m mini_bdx_runtime.xbox_controller"
fi


