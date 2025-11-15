#!/usr/bin/env bash
set -euo pipefail

# Bootstrap d'installation du runtime (et optionnellement de la Web UI) sur Raspberry Pi
# Usage basique (Pi via SSH/puTTY) :
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/xmaquet/Open_Duck_Mini_Runtime/v2/scripts/install_bdx_runtime.sh)"
#
# Avec options :
#   BRANCH=feature/bdx_webui bash -c "$(curl -fsSL https://raw.githubusercontent.com/xmaquet/Open_Duck_Mini_Runtime/v2/scripts/install_bdx_runtime.sh)"
#   REPO=https://github.com/xmaquet/Open_Duck_Mini_Runtime.git BRANCH=v2 bash -c "$(curl -fsSL https://raw.githubusercontent.com/xmaquet/Open_Duck_Mini_Runtime/v2/scripts/install_bdx_runtime.sh)"
#   WITH_WEBUI=1 bash -c "$(curl -fsSL https://raw.githubusercontent.com/xmaquet/Open_Duck_Mini_Runtime/v2/scripts/install_bdx_runtime.sh)"
#
# Variables d'environnement supportées :
#   REPO   : URL du repo à cloner (défaut: fork xmaquet)
#   BRANCH : branche à utiliser (défaut: v2)
#   DIR    : dossier cible (défaut: Open_Duck_Mini_Runtime)
#   WITH_WEBUI : si "1", installe la web UI (Flask) en plus du runtime
#

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Ce script doit être exécuté sur Linux (Raspberry Pi OS)." >&2
  exit 1
fi

REPO="${REPO:-https://github.com/xmaquet/Open_Duck_Mini_Runtime.git}"
BRANCH="${BRANCH:-v2}"
DIR="${DIR:-Open_Duck_Mini_Runtime}"
WITH_WEBUI="${WITH_WEBUI:-0}"

echo "[1/6] apt update + prérequis système"
sudo apt update -y
sudo apt install -y git python3 python3-venv python3-pip

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

echo "[3/6] Création/activation de l'environnement virtuel"
pushd "$DIR" >/dev/null
if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
python -m pip install --upgrade pip

echo "[4/6] Installation du runtime (editable)"
pip install -e .

if [[ "$WITH_WEBUI" == "1" ]]; then
  echo "[5/6] Installation de la Web UI (Flask) via l'extra [webui]"
  # Utilise le script dédié si présent (gère aussi apt et contrôles)
  if [[ -f "scripts/install_bdx_webui.sh" ]]; then
    bash scripts/install_bdx_webui.sh
  else
    pip install -e .[webui]
  fi
else
  echo "[5/6] Étape Web UI ignorée (WITH_WEBUI != 1)"
fi

echo "[6/6] Installation terminée."
echo
echo "Pour activer l'environnement et utiliser le runtime :"
echo "  source .venv/bin/activate"
if [[ "$WITH_WEBUI" == "1" ]]; then
  echo "Pour lancer la Web UI :"
  echo "  python -m mini_bdx_runtime.webui --port 8080"
  echo "Puis ouvrez: http://<ip_du_pi>:8080"
fi
popd >/dev/null


