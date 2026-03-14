#!/usr/bin/env bash
set -euo pipefail

# Script de vérification post-install (runtime)
# À lancer après l'installation pour valider l'environnement.
# Usage:
#   bash scripts/bdx_post_install_check.sh
#

FAIL=0

note() { echo -e "[INFO]  $*"; }
ok()   { echo -e "[OK]    $*"; }
warn() { echo -e "[WARN]  $*"; }
err()  { echo -e "[ERROR] $*"; FAIL=$((FAIL+1)); }

if [[ "$(uname -s)" != "Linux" ]]; then
  warn "Ce script est prévu pour Linux (Raspberry Pi OS)."
fi

# Détermination de la racine du projet
# - Si DIR ou REPO_DIR est fourni(e), on l'utilise
# - Sinon: si on est dans le repo cloné, on détecte via setup.cfg
# - Sinon: fallback sur $HOME/Open_Duck_Mini_Runtime si présent, ou PWD
if [[ -n "${DIR:-${REPO_DIR:-}}" ]]; then
  ROOT_DIR="${DIR:-${REPO_DIR}}"
else
  if [[ -n "${BASH_SOURCE:-}" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  else
    SCRIPT_DIR="${PWD}"
  fi
  if [[ -f "${SCRIPT_DIR}/../setup.cfg" ]]; then
    ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
  elif [[ -f "./setup.cfg" ]]; then
    ROOT_DIR="${PWD}"
  elif [[ -d "${HOME}/Open_Duck_Mini_Runtime" && -f "${HOME}/Open_Duck_Mini_Runtime/setup.cfg" ]]; then
    ROOT_DIR="${HOME}/Open_Duck_Mini_Runtime"
  else
    ROOT_DIR="${PWD}"
  fi
fi
cd "${ROOT_DIR}"
note "Dossier projet: ${ROOT_DIR}"

# Activation du venv si possible
if [[ -n "${VENV_PATH:-}" && -f "${VENV_PATH}/bin/activate" ]]; then
  # shellcheck source=/dev/null
  source "${VENV_PATH}/bin/activate"
  ok "Environnement virtuel activé (${VENV_PATH})"
elif [[ -f ".venv/bin/activate" ]]; then
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

echo
if [[ ${FAIL} -eq 0 ]]; then
  ok "Vérifications terminées sans erreur."
  exit 0
else
  err "Vérifications terminées avec ${FAIL} erreur(s)."
  exit 1
fi


