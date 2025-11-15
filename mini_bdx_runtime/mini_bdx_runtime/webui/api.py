from __future__ import annotations

from typing import Any, Dict, Optional

from flask import Blueprint, jsonify, request

from . import get_devices, _get_assets_dir, _feature_flags

api_bp = Blueprint("api", __name__)


def _ok(data: Dict[str, Any] | None = None, **kwargs):
    payload = {"ok": True}
    if data:
        payload.update(data)
    if kwargs:
        payload.update(kwargs)
    return jsonify(payload)


def _err(msg: str, **extra):
    payload = {"ok": False, "error": msg}
    payload.update(extra)
    return jsonify(payload), 400


@api_bp.get("/sound/list")
def list_sounds():
    import os

    try:
        assets = _get_assets_dir()
        wavs = [f for f in os.listdir(assets) if f.lower().endswith(".wav")]
        return _ok({"sounds": sorted(wavs)})
    except Exception as e:
        return _err(f"audio_unavailable: {e}")


@api_bp.post("/sound/play")
def play_sound():
    devices = get_devices()
    sounds = devices["sounds"]
    if sounds is None:
        return _err("audio_unavailable")
    name = request.args.get("name") or (request.json or {}).get("name")
    if not name:
        return _err("missing_name")
    try:
        sounds.play(name)
        return _ok({"played": name})
    except Exception as e:
        return _err(f"play_failed: {e}")


@api_bp.post("/eyes/on")
def eyes_on():
    devices = get_devices()
    eyes = devices["eyes"]
    if eyes is None:
        return _err("eyes_unavailable")
    try:
        # Mode fixe: forcer ON en stoppant le blink et mettant l'état
        eyes.stop()
        # Ré-instancier pour ON continu minimal: on simule ON en ne clignotant pas
        from mini_bdx_runtime.eyes import Eyes  # type: ignore
        import digitalio, board  # type: ignore

        # Méthode simple: contrôle direct GPIO (évite thread)
        left = digitalio.DigitalInOut(board.D24)
        left.direction = digitalio.Direction.OUTPUT
        right = digitalio.DigitalInOut(board.D23)
        right.direction = digitalio.Direction.OUTPUT
        left.value = True
        right.value = True
        return _ok({"state": "on"})
    except Exception as e:
        return _err(f"eyes_on_failed: {e}")


@api_bp.post("/eyes/off")
def eyes_off():
    devices = get_devices()
    eyes = devices["eyes"]
    try:
        if eyes is not None:
            eyes.stop()
        # Forcer OFF sur GPIO même sans instance
        try:
            import digitalio, board  # type: ignore

            left = digitalio.DigitalInOut(board.D24)
            left.direction = digitalio.Direction.OUTPUT
            right = digitalio.DigitalInOut(board.D23)
            right.direction = digitalio.Direction.OUTPUT
            left.value = False
            right.value = False
        except Exception:
            pass
        return _ok({"state": "off"})
    except Exception as e:
        return _err(f"eyes_off_failed: {e}")


@api_bp.post("/eyes/mode")
def eyes_mode():
    mode = (request.json or {}).get("mode")
    if mode not in {"blink", "steady_on", "steady_off"}:
        return _err("invalid_mode")
    devices = get_devices()
    # Reconfiguration simple: blink = ré-instancier; steady_on/off = routes dédiées
    if mode == "blink":
        try:
            from mini_bdx_runtime.eyes import Eyes  # type: ignore

            # Stop ancienne instance si présente
            if devices["eyes"] is not None:
                try:
                    devices["eyes"].stop()
                except Exception:
                    pass
            # Nouvelle instance blink
            # Note: on ne remonte pas la référence globale ici pour garder simplicité
            Eyes()
            return _ok({"mode": "blink"})
        except Exception as e:
            return _err(f"eyes_blink_failed: {e}")
    elif mode == "steady_on":
        return eyes_on()
    else:
        return eyes_off()


@api_bp.post("/projector/on")
def projector_on():
    devices = get_devices()
    p = devices["projector"]
    if p is None:
        return _err("projector_unavailable")
    try:
        if not getattr(p, "on", False):
            p.switch()
        return _ok({"state": True})
    except Exception as e:
        return _err(f"projector_on_failed: {e}")


@api_bp.post("/projector/off")
def projector_off():
    devices = get_devices()
    p = devices["projector"]
    if p is None:
        return _err("projector_unavailable")
    try:
        if getattr(p, "on", False):
            p.switch()
        return _ok({"state": False})
    except Exception as e:
        return _err(f"projector_off_failed: {e}")


@api_bp.post("/projector/toggle")
def projector_toggle():
    devices = get_devices()
    p = devices["projector"]
    if p is None:
        return _err("projector_unavailable")
    try:
        p.switch()
        return _ok({"state": getattr(p, "on", False)})
    except Exception as e:
        return _err(f"projector_toggle_failed: {e}")


@api_bp.post("/antennas/set")
def antennas_set():
    devices = get_devices()
    ants = devices["antennas"]
    if ants is None:
        return _err("antennas_unavailable")
    data = request.json or {}
    left = data.get("left")
    right = data.get("right")
    try:
        if left is not None:
            ants.set_position_left(float(left))
        if right is not None:
            ants.set_position_right(float(right))
        return _ok({"left": left, "right": right})
    except Exception as e:
        return _err(f"antennas_set_failed: {e}")


@api_bp.post("/antennas/preset")
def antennas_preset():
    presets = {
        "neutral": (0.0, 0.0),
        "up": (1.0, 1.0),
        "down": (-1.0, -1.0),
        "left": (-1.0, 1.0),
        "right": (1.0, -1.0),
    }
    name = (request.json or {}).get("name")
    if name not in presets:
        return _err("invalid_preset")
    devices = get_devices()
    ants = devices["antennas"]
    if ants is None:
        return _err("antennas_unavailable")
    try:
        l, r = presets[name]
        ants.set_position_left(l)
        ants.set_position_right(r)
        return _ok({"preset": name, "left": l, "right": r})
    except Exception as e:
        return _err(f"antennas_preset_failed: {e}")


@api_bp.get("/feet/status")
def feet_status():
    devices = get_devices()
    fc = devices["feet"]
    if fc is None:
        # Tentative de ré-initialisation à la volée (ex: Blinka installé après démarrage)
        try:
            from mini_bdx_runtime.feet_contacts import FeetContacts  # type: ignore
            import sys

            fc = FeetContacts()
            # Met à jour le cache du module webui
            webui_mod = sys.modules.get(__package__)
            if webui_mod is not None:
                setattr(webui_mod, "_feet", fc)
        except Exception as e:
            # Retourne l'erreur précise pour faciliter le debug
            return _err("feet_unavailable", detail=str(e))
    try:
        left, right = fc.get()
        return _ok({"left": bool(left), "right": bool(right)})
    except Exception as e:
        return _err(f"feet_status_failed: {e}")


