#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Ce script doit être exécuté sur Linux (Raspberry Pi OS)." >&2
  exit 1
fi

echo "[1/5] apt update + prérequis"
sudo apt update -y
sudo apt install -y python3 python3-venv python3-pip

echo "[2/5] Création (ou réutilisation) du venv .venv"
if [[ ! -d ".venv" ]]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
python -m pip install --upgrade pip

echo "[3/5] Installation des dépendances du runtime (editable) + extra [webui]"
pip install -e .[webui]

echo "[4/5] Vérification Flask"
python -c "import flask; print('Flask OK:', flask.__version__)"

cat <<'EON'
[5/5] Installation terminée.

Pour lancer le serveur web UI:

  source .venv/bin/activate
  python -m mini_bdx_runtime.webui --port 8080

Depuis un autre appareil du réseau, ouvrez:
  http://<ip_du_pi>:8080

Astuce:
  Exporter le port via variable d'environnement:
    export BDX_WEBUI_PORT=8080
    python -m mini_bdx_runtime.webui
EON


