#!/usr/bin/env bash
#
# Open Duck Mini Runtime — installation complète (clone Git optionnel, venv, paquets système).
#
# Usage typique (machine neuve, script téléchargé ailleurs) :
#   curl -fsSL https://raw.githubusercontent.com/xmaquet/Open_Duck_Mini_Runtime/v2/install.sh -o install.sh
#   bash install.sh
#
# Depuis un dépôt déjà cloné (le répertoire contenant ce script est utilisé par défaut) :
#   chmod +x install.sh && ./install.sh
#
# Variables d'environnement (toutes optionnelles) :
#   REPO_URL   URL git (défaut : https://github.com/xmaquet/Open_Duck_Mini_Runtime.git)
#   REPO_DIR   Dossier cible du clone / dépôt existant
#              Défaut : si ce script est dans un dépôt git → ce répertoire ;
#                       sinon → $HOME/Open_Duck_Mini_Runtime
#   BRANCH     Branche à suivre (défaut : v2)
#   GIT_SHALLOW  Si "1" (défaut), clone avec --depth 1. Mettre "0" pour historique complet.
#   SKIP_GIT_PULL  Si "1", ne jamais faire git pull (fetch + checkout quand même si dépôt existant).
#
# Comportement Git prudent : si le working tree a des modifications locales, aucun pull automatique
# (évite d'écraser un fork en cours). Message explicite dans ce cas.
#

set -euo pipefail

# ---------------------------------------------------------------------------
# Journalisation
# ---------------------------------------------------------------------------
info() { echo "[$(date -Iseconds)] [INFO]  $*"; }
warn() { echo "[$(date -Iseconds)] [WARN]  $*" >&2; }
error() { echo "[$(date -Iseconds)] [ERROR] $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Configuration (surcharge possible via l'environnement)
# ---------------------------------------------------------------------------
REPO_URL="${REPO_URL:-https://github.com/xmaquet/Open_Duck_Mini_Runtime.git}"
BRANCH="${BRANCH:-v2}"
GIT_SHALLOW="${GIT_SHALLOW:-1}"
SKIP_GIT_PULL="${SKIP_GIT_PULL:-0}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# REPO_DIR : explicite > dépôt courant si .git présent > défaut $HOME
if [[ -n "${REPO_DIR:-}" ]]; then
  :
elif [[ -d "${SCRIPT_DIR}/.git" ]]; then
  REPO_DIR="${SCRIPT_DIR}"
  info "Dépôt Git détecté autour de ce script → REPO_DIR=${REPO_DIR}"
else
  REPO_DIR="${HOME}/Open_Duck_Mini_Runtime"
  info "Pas de .git à côté du script → REPO_DIR par défaut : ${REPO_DIR}"
fi

# ---------------------------------------------------------------------------
# Garde-fous OS / outils
# ---------------------------------------------------------------------------
info "=== Open Duck Mini Runtime — installation ==="

if [[ "$(uname -s)" != "Linux" ]]; then
  warn "OS non-Linux : ce script vise Debian / Raspberry Pi OS. Poursuite à tes risques."
fi

if ! command -v apt-get >/dev/null 2>&1; then
  error "apt-get introuvable — Debian / Ubuntu / Raspberry Pi OS requis pour les paquets listés."
fi

if ! command -v sudo >/dev/null 2>&1 && [[ "${EUID:-0}" -ne 0 ]]; then
  error "sudo introuvable et tu n'es pas root — impossible d'exécuter apt."
fi

if ! command -v python3 >/dev/null 2>&1; then
  error "python3 introuvable."
fi

PY_VER="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")')"
info "Python : $(command -v python3) — ${PY_VER}"

if ! python3 -c 'import sys; sys.exit(0 if (3, 11) <= sys.version_info < (3, 14) else 1)' 2>/dev/null; then
  error "Python 3.11 à 3.13 requis (voir setup.cfg)."
fi

# ---------------------------------------------------------------------------
# Clone ou mise à jour du dépôt
# ---------------------------------------------------------------------------
APT_UPDATE_DONE=0
_apt_update_once() {
  if [[ "${APT_UPDATE_DONE}" -eq 0 ]]; then
    info "[apt] update (première fois cette session)…"
    sudo apt-get update -y
    APT_UPDATE_DONE=1
  fi
}

# git requis pour clone/fetch — installation minimale avant le clone (machine neuve)
if ! command -v git >/dev/null 2>&1; then
  info "[apt] git absent — installation minimale avant clone…"
  _apt_update_once
  sudo apt-get install -y git ca-certificates
fi
command -v git >/dev/null 2>&1 || error "git toujours introuvable après installation."

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  info "[git] Aucun dépôt dans ${REPO_DIR} — clonage depuis ${REPO_URL} (branche ${BRANCH})…"
  PARENT="$(dirname "${REPO_DIR}")"
  mkdir -p "${PARENT}"
  CLONE_ARGS=(-b "${BRANCH}" --single-branch)
  if [[ "${GIT_SHALLOW}" == "1" ]]; then
    CLONE_ARGS+=(--depth 1)
  fi
  git clone "${CLONE_ARGS[@]}" "${REPO_URL}" "${REPO_DIR}"
else
  info "[git] Dépôt existant : ${REPO_DIR}"
  pushd "${REPO_DIR}" >/dev/null
  info "[git] Remotes :"
  git remote -v || true
  info "[git] fetch --all --prune…"
  git fetch --all --prune
  popd >/dev/null
fi

[[ -d "${REPO_DIR}/.git" ]] || error "Échec : ${REPO_DIR} n'est pas un dépôt git valide après clone/fetch."

pushd "${REPO_DIR}" >/dev/null

info "[git] checkout ${BRANCH}…"
git checkout "${BRANCH}" 2>/dev/null || git checkout -b "${BRANCH}" "origin/${BRANCH}" 2>/dev/null || {
  error "Impossible de basculer sur la branche « ${BRANCH} ». Vérifie le nom (tags/branches distantes)."
}

if [[ "${SKIP_GIT_PULL}" == "1" ]]; then
  info "[git] SKIP_GIT_PULL=1 — pas de pull."
elif [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  warn "[git] Working tree non propre — pas de « git pull » (protège tes modifications locales)."
  warn "        Pour mettre à jour : commit/stash puis git pull --ff-only, ou lance avec un REPO_DIR propre."
else
  if git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1; then
    info "[git] pull --ff-only (arbre propre)…"
    if ! git pull --ff-only; then
      warn "[git] pull --ff-only a échoué (réseau, divergence, etc.) — installation pip poursuivie quand même."
    fi
  else
    warn "[git] Pas de branche amont (@{u}) — pull ignoré. Configure : git branch --set-upstream-to=origin/${BRANCH}"
  fi
fi

# ---------------------------------------------------------------------------
# Configuration utilisateur initiale (non destructive)
# ---------------------------------------------------------------------------
EXAMPLE_CFG="${REPO_DIR}/example_config.json"
USER_CFG="${HOME}/duck_config.json"
if [[ -f "${EXAMPLE_CFG}" ]]; then
  if [[ -f "${USER_CFG}" ]]; then
    info "[config] ${USER_CFG} existe déjà — pas d'écrasement."
  else
    cp "${EXAMPLE_CFG}" "${USER_CFG}"
    info "[config] Copie initiale : ${EXAMPLE_CFG} → ${USER_CFG}"
  fi
else
  warn "[config] ${EXAMPLE_CFG} absent — pas de copie vers ~/duck_config.json"
fi

# ---------------------------------------------------------------------------
# Paquets système
# ---------------------------------------------------------------------------
info "[apt] Installation des paquets (build + runtime + Bluetooth)…"
_apt_update_once
sudo apt-get install -y \
  git \
  pkg-config bluez \
  python3-venv python3-dev swig \
  python3-numpy python3-scipy python3-pygame python3-opencv \
  libsdl2-dev libsdl2-image-dev libsdl2-mixer-dev libsdl2-ttf-dev \
  libfreetype6-dev libportmidi-dev libjpeg-dev libpng-dev

# ---------------------------------------------------------------------------
# pip / tmpfs
# ---------------------------------------------------------------------------
info "[tmp] TMPDIR → ~/tmp (évite de saturer le tmpfs /tmp lors des installs pip)"
mkdir -p "${HOME}/tmp"
export TMPDIR="${HOME}/tmp"

info "[venv] Création ou réutilisation de .venv avec --system-site-packages"
if [[ ! -d "${REPO_DIR}/.venv" ]]; then
  python3 -m venv "${REPO_DIR}/.venv" --system-site-packages
else
  info "[venv] .venv existant — réutilisation. Pour recréer : rm -rf .venv && relancer ce script."
fi

# shellcheck source=/dev/null
source "${REPO_DIR}/.venv/bin/activate"

info "[pip] Mise à jour pip / setuptools / wheel"
python -m pip install --upgrade pip setuptools wheel

info "[pip] Installation du package en mode éditable (--no-cache-dir)"
pip install --no-cache-dir -e .

# ---------------------------------------------------------------------------
# Vérifications post-install
# ---------------------------------------------------------------------------
info "[check] Imports Python (numpy, pygame, cv2)…"
post_ok=1
if python -c "import numpy; print('numpy', numpy.__version__)"; then
  :
else
  warn "Import numpy échoué."
  post_ok=0
fi
if python -c "import pygame; print('pygame', pygame.version.ver)"; then
  :
else
  warn "Import pygame échoué — éventuellement : pip install --no-cache-dir -e \".[control]\""
  post_ok=0
fi
if python -c "import cv2; print('cv2', cv2.__version__)"; then
  :
else
  warn "Import cv2 échoué — vérifier python3-opencv (apt) et le venv --system-site-packages."
  post_ok=0
fi
if [[ "${post_ok}" -eq 1 ]]; then
  info "[check] Imports de base OK."
else
  warn "[check] Au moins un import a échoué — voir messages ci-dessus."
fi

popd >/dev/null

# ---------------------------------------------------------------------------
# Résumé final
# ---------------------------------------------------------------------------
info "=== Installation terminée ==="
info "Dépôt : ${REPO_DIR}"
info "Activer le venv :"
info "  source ${REPO_DIR}/.venv/bin/activate"
info "Config robot (non écrasée si déjà présente) : ${USER_CFG}"
info "Extras pip utiles :"
info "  pip install --no-cache-dir -e \".[control]\"    # manette / pygame pip"
info "  pip install --no-cache-dir -e \".[rl]\"         # ONNX / marche"
info "  pip install --no-cache-dir -e \".[hardware]\"  # bus Feetech / IMU"
info "Manette Xbox : appairer le Bluetooth avant les tests (README, docs/xbox_controller_setup.md)."
info "Test manette suggéré (depuis ${REPO_DIR}) :"
info "  bash tools/test_xbox_controller.sh"
info "  ou : source .venv/bin/activate && python -m mini_bdx_runtime.xbox_controller"
