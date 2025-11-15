import os
import threading
from typing import Any, Dict, Optional

from flask import Flask, jsonify, render_template


# Gestion paresseuse des périphériques pour tolérer l'absence de hardware en dev PC
_eyes = None
_projector = None
_antennas = None
_sounds = None
_feet = None
_lock = threading.Lock()


def _get_assets_dir() -> str:
    # Cherche le dossier assets du package
    here = os.path.dirname(os.path.dirname(__file__))
    assets = os.path.join(os.path.dirname(here), "assets")
    if os.path.isdir(assets):
        return assets
    # Fallback: courant
    return os.path.join(os.getcwd(), "mini_bdx_runtime", "assets")


def _feature_flags() -> Dict[str, bool]:
    # Lit la config runtime si dispo, sinon heuristique
    try:
        from mini_bdx_runtime.duck_config import DuckConfig  # type: ignore

        cfg = DuckConfig()
        return {
            "eyes": bool(getattr(cfg, "eyes", False)),
            "projector": bool(getattr(cfg, "projector", False)),
            "antennas": bool(getattr(cfg, "antennas", False)),
            "speaker": bool(getattr(cfg, "speaker", False)),
            "feet": True,
        }
    except Exception:
        # En dev sans duck_config.json
        return {"eyes": False, "projector": False, "antennas": False, "speaker": False, "feet": True}


def _init_devices_once():
    global _eyes, _projector, _antennas, _sounds, _feet
    flags = _feature_flags()
    with _lock:
        if _feet is None:
            try:
                from mini_bdx_runtime.feet_contacts import FeetContacts  # type: ignore

                _feet = FeetContacts()
            except Exception:
                _feet = None
        if flags.get("eyes") and _eyes is None:
            try:
                from mini_bdx_runtime.eyes import Eyes  # type: ignore

                _eyes = Eyes()
            except Exception:
                _eyes = None
        if flags.get("projector") and _projector is None:
            try:
                from mini_bdx_runtime.projector import Projector  # type: ignore

                _projector = Projector()
            except Exception:
                _projector = None
        if flags.get("antennas") and _antennas is None:
            try:
                from mini_bdx_runtime.antennas import Antennas  # type: ignore

                _antennas = Antennas()
            except Exception:
                _antennas = None
        if flags.get("speaker") and _sounds is None:
            try:
                from mini_bdx_runtime.sounds import Sounds  # type: ignore

                _sounds = Sounds(volume=1.0, sound_directory=_get_assets_dir())
            except Exception:
                _sounds = None


def get_devices() -> Dict[str, Optional[Any]]:
    _init_devices_once()
    return {"eyes": _eyes, "projector": _projector, "antennas": _antennas, "sounds": _sounds, "feet": _feet}


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder=os.path.join(os.path.dirname(__file__), "templates"),
        static_folder=os.path.join(os.path.dirname(__file__), "static"),
    )

    # API
    from .api import api_bp  # local import pour éviter side-effects au chargement

    app.register_blueprint(api_bp, url_prefix="/api")

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/api/health")
    def health():
        # version via importlib.metadata si dispo
        version = "unknown"
        try:
            from importlib.metadata import version as pkg_version

            version = pkg_version("mini-bdx-runtime")  # nom distribution
        except Exception:
            pass
        flags = _feature_flags()
        return jsonify({"status": "ok", "version": version, "features": flags})

    return app


