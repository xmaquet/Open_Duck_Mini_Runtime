#!/usr/bin/env bash
set -euo pipefail

# Script de vérification post-install (runtime + Web UI)
# À lancer après l'installation pour valider l'environnement.
# Usage:
#   bash scripts/bdx_post_install_check.sh
# Options:
#   TEST_WEBUI=1 PORT=8080 bash scripts/bdx_post_install_check.sh
#

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "Ce script est prévu pour Linux (Raspberry Pi OS)."
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

FAIL=0

note() { echo -e "[INFO]  $*"; }
ok()   { echo -e "[OK]    $*"; }
warn() { echo -e "[WARN]  $*"; }
err()  { echo -e "[ERROR] $*"; FAIL=$((FAIL+1)); }

note "Dossier projet: ${ROOT_DIR}"

if [[ -d ".venv" ]]; then
  # shellcheck source=/dev/null
  source ".venv/bin/activate"
  ok "Environnement virtuel activé (.venv)"
else
  warn "Pas de .venv trouvé; tentative avec python système"
fi

note "Vérification Python/pip"
python --version || { err "python indisponible"; }
pip --version || { err "pip indisponible"; }

note "Vérification duck_config.json"
if [[ -f "$HOME/duck_config.json" ]]; then
  ok "duck_config.json trouvé: $HOME/duck_config.json"
else
  warn "duck_config.json absent (utilisation des valeurs par défaut probable)"
fi

note "Vérification imports Python essentiels"
python - << 'PY' || exit 1
import importlib, sys
mods = [
    "mini_bdx_runtime.duck_config",
    "mini_bdx_runtime.mini_bdx_runtime.eyes",
    "mini_bdx_runtime.mini_bdx_runtime.projector",
    "mini_bdx_runtime.mini_bdx_runtime.antennas",
    "mini_bdx_runtime.mini_bdx_runtime.feet_contacts",
    "mini_bdx_runtime.mini_bdx_runtime.sounds",
]
ok = True
for m in mods:
    try:
        importlib.import_module(m)
        print(f"[OK]    import {m}")
    except Exception as e:
        ok = False
        print(f"[ERROR] import {m} -> {e}")
sys.exit(0 if ok else 1)
PY
if [[ $? -ne 0 ]]; then
  err "Au moins un import a échoué"
else
  ok "Imports essentiels OK"
fi

note "Test rapide FeetContacts (lecture unique si possible)"
python - << 'PY'
try:
    from mini_bdx_runtime.mini_bdx_runtime.feet_contacts import FeetContacts
    fc = FeetContacts()
    try:
        print("[OK]    Feet status:", fc.get())
    finally:
        try:
            fc.stop()
        except Exception:
            pass
except Exception as e:
    print(f"[WARN]  FeetContacts indisponible: {e}")
PY

TEST_WEBUI="${TEST_WEBUI:-0}"
PORT="${PORT:-8080}"
if [[ "${TEST_WEBUI}" == "1" ]]; then
  note "Test Web UI: lancement temporaire sur le port ${PORT}"
  # Essai n°1: chemin court
  set +e
  python -m mini_bdx_runtime.webui --port "${PORT}" >/tmp/bdx_webui_test.log 2>&1 &
  PID=$!
  sleep 1
  if ! kill -0 "${PID}" 2>/dev/null; then
    # Essai n°2: chemin imbriqué (selon installation)
    python -m mini_bdx_runtime.mini_bdx_runtime.webui --port "${PORT}" >/tmp/bdx_webui_test.log 2>&1 &
    PID=$!
    sleep 1
  fi
  # Attente que /api/health réponde
  for i in $(seq 1 20); do
    if curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
      ok "Web UI répond sur /api/health"
      break
    fi
    sleep 0.5
  done
  if ! kill -0 "${PID}" 2>/dev/null; then
    err "Le serveur Web UI ne s'est pas lancé"
  else
    kill "${PID}" 2>/dev/null || true
    sleep 1
    ok "Serveur Web UI arrêté"
  fi
  set -e
else
  note "Test Web UI désactivé (TEST_WEBUI != 1)."
fi

echo
if [[ ${FAIL} -eq 0 ]]; then
  ok "Vérifications terminées sans erreur."
  exit 0
else
  err "Vérifications terminées avec ${FAIL} erreur(s)."
  exit 1
fi


