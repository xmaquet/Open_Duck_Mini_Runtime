"""
Pont Android / runtime : reçoit des ControllerFrame JSON (cf. docs/protocol.md),
produit le même type de sortie que XBoxController.get_last_command().

Transport actuellement supporté :
  - TCP (--tcp-port) : une ligne JSON par message (UTF-8, \\n).
  - stdin (--stdin) : idem, pour tests en pipe.

L’app Android parle **BLE GATT** (pas RFCOMM). Sur la Pi : ``pip install -e ".[ble]"`` puis
``bdx-ble-robot`` ou ``python -m mini_bdx_runtime.ble_gatt_server`` (voir ``ble_gatt_server.py``).
RFCOMM (--rfcomm) reste optionnel pour tests avec PyBluez.

Pygame ne permet pas d’« enregistrer » un joystick virtuel sans périphérique OS (ex. uinput) :
l’exposition au runtime se fait par **même interface** que la manette physique
(`get_last_command`), pas via pygame.joystick.
"""

from __future__ import annotations

import argparse
import json
import socket
import sys
import threading
import time
from dataclasses import dataclass, field
from queue import Queue
from typing import Any, Optional

import numpy as np

from mini_bdx_runtime.buttons import Buttons
from mini_bdx_runtime.xbox_controller import (
    HEAD_PITCH_RANGE,
    HEAD_ROLL_RANGE,
    HEAD_YAW_RANGE,
    X_RANGE,
    Y_RANGE,
    YAW_RANGE,
)


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, float(x)))


@dataclass
class VirtualJoystickState:
    """État analogique + boutons aligné sur ControllerFrame v1 (docs/protocol.md)."""

    lx: float = 0.0
    ly: float = 0.0
    rx: float = 0.0
    ry: float = 0.0
    lt: float = 0.0
    rt: float = 0.0
    A: bool = False
    B: bool = False
    X: bool = False
    Y: bool = False
    LB: bool = False
    RB: bool = False
    dpad_up: bool = False
    dpad_down: bool = False
    estop: bool = False
    ts_ms: int = 0
    seq: int = 0

    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def copy_locked(self) -> "VirtualJoystickState":
        with self._lock:
            return VirtualJoystickState(
                lx=self.lx,
                ly=self.ly,
                rx=self.rx,
                ry=self.ry,
                lt=self.lt,
                rt=self.rt,
                A=self.A,
                B=self.B,
                X=self.X,
                Y=self.Y,
                LB=self.LB,
                RB=self.RB,
                dpad_up=self.dpad_up,
                dpad_down=self.dpad_down,
                estop=self.estop,
                ts_ms=self.ts_ms,
                seq=self.seq,
            )

    def apply_json(self, obj: dict[str, Any]) -> None:
        """Met à jour depuis un dict JSON déjà parsé (schéma v1)."""
        if int(obj.get("v", 0)) != 1:
            return
        axes = obj.get("axes") or {}
        tr = obj.get("triggers") or {}
        bt = obj.get("buttons") or {}
        dpad = obj.get("dpad") or {}
        safety = obj.get("safety") or {}
        with self._lock:
            self.ts_ms = int(obj.get("ts_ms", 0))
            self.seq = int(obj.get("seq", 0))
            self.lx = _clamp(axes.get("lx", 0.0), -1.0, 1.0)
            self.ly = _clamp(axes.get("ly", 0.0), -1.0, 1.0)
            self.rx = _clamp(axes.get("rx", 0.0), -1.0, 1.0)
            self.ry = _clamp(axes.get("ry", 0.0), -1.0, 1.0)
            self.lt = _clamp(tr.get("lt", 0.0), 0.0, 1.0)
            self.rt = _clamp(tr.get("rt", 0.0), 0.0, 1.0)
            self.A = bool(bt.get("A", False))
            self.B = bool(bt.get("B", False))
            self.X = bool(bt.get("X", False))
            self.Y = bool(bt.get("Y", False))
            self.LB = bool(bt.get("LB", False))
            self.RB = bool(bt.get("RB", False))
            self.dpad_up = bool(dpad.get("up", False))
            self.dpad_down = bool(dpad.get("down", False))
            self.estop = bool(safety.get("estop", False))


def parse_controller_frame_line(line: str, target: VirtualJoystickState) -> bool:
    """Parse une ligne JSON ; retourne False si ignorée."""
    line = line.strip()
    if not line:
        return False
    try:
        obj = json.loads(line)
    except json.JSONDecodeError:
        return False
    target.apply_json(obj)
    return True


class AndroidBridgeController:
    """
    Même contrat fonctionnel que XBoxController pour le runtime :
    thread à command_freq, file d’une trame, get_last_command().
    Les entrées viennent d’un VirtualJoystickState alimenté par le transport (TCP/RFCOMM/stdin).
    """

    def __init__(
        self,
        command_freq: float,
        only_head_control: bool = False,
        virtual: Optional[VirtualJoystickState] = None,
    ):
        self.command_freq = command_freq
        self.only_head_control = only_head_control
        self.head_control_mode = only_head_control

        self.last_commands = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
        self.last_left_trigger = 0.0
        self.last_right_trigger = 0.0

        self.virtual = virtual if virtual is not None else VirtualJoystickState()
        self._prev_y = False

        self.A_pressed = False
        self.B_pressed = False
        self.X_pressed = False
        self.Y_pressed = False
        self.LB_pressed = False
        self.RB_pressed = False

        self.buttons = Buttons()
        self.cmd_queue: Queue = Queue(maxsize=1)

        threading.Thread(target=self._commands_worker, daemon=True).start()

    def _commands_worker(self) -> None:
        while True:
            self.cmd_queue.put(self._compute_commands())
            time.sleep(1.0 / self.command_freq)

    def _compute_commands(self):
        """Reprend la logique de xbox_controller.XBoxController.get_commands (sans pygame)."""
        st = self.virtual.copy_locked()

        if st.estop:
            self._prev_y = False
            return (
                np.zeros(7, dtype=float),
                False,
                False,
                False,
                False,
                False,
                False,
                0.0,
                0.0,
                0,
            )

        # Convention déjà appliquée côté Android (protocol.md) : même repère que après -1*axis pygame
        l_x = st.lx
        l_y = st.ly
        r_x = st.rx
        r_y = st.ry

        left_trigger = float(np.around(st.lt, 3))
        right_trigger = float(np.around(st.rt, 3))
        if left_trigger < 0.1:
            left_trigger = 0.0
        if right_trigger < 0.1:
            right_trigger = 0.0

        last_commands = list(self.last_commands)

        if not self.head_control_mode:
            lin_vel_y = l_x
            lin_vel_x = l_y
            ang_vel = r_x
            if lin_vel_x >= 0:
                lin_vel_x *= np.abs(X_RANGE[1])
            else:
                lin_vel_x *= np.abs(X_RANGE[0])

            if lin_vel_y >= 0:
                lin_vel_y *= np.abs(Y_RANGE[1])
            else:
                lin_vel_y *= np.abs(Y_RANGE[0])

            if ang_vel >= 0:
                ang_vel *= np.abs(YAW_RANGE[1])
            else:
                ang_vel *= np.abs(YAW_RANGE[0])

            last_commands[0] = lin_vel_x
            last_commands[1] = lin_vel_y
            last_commands[2] = ang_vel
        else:
            last_commands[0] = 0.0
            last_commands[1] = 0.0
            last_commands[2] = 0.0
            last_commands[3] = 0.0

            head_yaw = l_x
            head_pitch = l_y
            head_roll = r_x

            if head_yaw >= 0:
                head_yaw *= np.abs(HEAD_YAW_RANGE[0])
            else:
                head_yaw *= np.abs(HEAD_YAW_RANGE[1])

            if head_pitch >= 0:
                head_pitch *= np.abs(HEAD_PITCH_RANGE[0])
            else:
                head_pitch *= np.abs(HEAD_PITCH_RANGE[1])

            if head_roll >= 0:
                head_roll *= np.abs(HEAD_ROLL_RANGE[0])
            else:
                head_roll *= np.abs(HEAD_ROLL_RANGE[1])

            last_commands[4] = head_pitch
            last_commands[5] = head_yaw
            last_commands[6] = head_roll

        # Bascule mode tête : front montant sur Y (comme JOYBUTTONDOWN sur manette)
        if st.Y and not self._prev_y and not self.only_head_control:
            self.head_control_mode = not self.head_control_mode
        self._prev_y = st.Y

        up_down = 0
        if st.dpad_up:
            up_down = 1
        elif st.dpad_down:
            up_down = -1

        return (
            np.around(last_commands, 3),
            st.A,
            st.B,
            st.X,
            st.Y,
            st.LB,
            st.RB,
            left_trigger,
            right_trigger,
            up_down,
        )

    def get_last_command(self):
        A_pressed = False
        B_pressed = False
        X_pressed = False
        Y_pressed = False
        LB_pressed = False
        RB_pressed = False
        up_down = 0
        try:
            (
                self.last_commands,
                A_pressed,
                B_pressed,
                X_pressed,
                Y_pressed,
                LB_pressed,
                RB_pressed,
                self.last_left_trigger,
                self.last_right_trigger,
                up_down,
            ) = self.cmd_queue.get(False)
        except Exception:
            pass

        self.buttons.update(
            A_pressed,
            B_pressed,
            X_pressed,
            Y_pressed,
            LB_pressed,
            RB_pressed,
            up_down == 1,
            up_down == -1,
        )

        return (
            self.last_commands,
            self.buttons,
            self.last_left_trigger,
            self.last_right_trigger,
        )


def _run_tcp_server(host: str, port: int, virtual: VirtualJoystickState) -> None:
    """Serveur TCP : chaque connexion envoie des lignes JSON terminées par \\n."""

    def handle_client(conn: socket.socket) -> None:
        buf = b""
        try:
            while True:
                chunk = conn.recv(4096)
                if not chunk:
                    break
                buf += chunk
                while b"\n" in buf:
                    line, buf = buf.split(b"\n", 1)
                    try:
                        text = line.decode("utf-8")
                    except UnicodeDecodeError:
                        continue
                    parse_controller_frame_line(text, virtual)
        finally:
            conn.close()

    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((host, port))
    srv.listen(4)
    print(f"[xbox_bridge] TCP listening on {host}:{port} (JSON lines, UTF-8)")

    while True:
        c, addr = srv.accept()
        print(f"[xbox_bridge] client connected {addr}")
        threading.Thread(target=handle_client, args=(c,), daemon=True).start()


def _run_stdin(virtual: VirtualJoystickState) -> None:
    """Lit stdin ligne par ligne (bloquant ; à lancer dans un thread)."""

    def _loop() -> None:
        for line in sys.stdin:
            parse_controller_frame_line(line, virtual)

    threading.Thread(target=_loop, daemon=True).start()


def _try_run_rfcomm(port: int, virtual: VirtualJoystickState) -> bool:
    try:
        import bluetooth  # type: ignore  # PyBluez
    except ImportError:
        return False

    s = bluetooth.BluetoothSocket(bluetooth.RFCOMM)
    s.bind(("", port))
    s.listen(1)
    print(f"[xbox_bridge] RFCOMM listening on channel {port}")

    def accept_loop() -> None:
        while True:
            client, addr = s.accept()
            print(f"[xbox_bridge] RFCOMM client {addr}")
            buf = b""
            try:
                while True:
                    chunk = client.recv(4096)
                    if not chunk:
                        break
                    buf += chunk
                    while b"\n" in buf:
                        line, buf = buf.split(b"\n", 1)
                        try:
                            text = line.decode("utf-8")
                        except UnicodeDecodeError:
                            continue
                        parse_controller_frame_line(text, virtual)
            finally:
                client.close()

    threading.Thread(target=accept_loop, daemon=True).start()
    return True


def main() -> None:
    ap = argparse.ArgumentParser(description="Pont JSON → API type XBoxController (Android / tests)")
    ap.add_argument("--tcp-port", type=int, default=8765, help="Port TCP (0 = désactivé)")
    ap.add_argument("--tcp-host", type=str, default="0.0.0.0", help="Adresse d’écoute TCP")
    ap.add_argument("--stdin", action="store_true", help="Lire aussi des lignes JSON sur stdin")
    ap.add_argument("--rfcomm", type=int, default=0, help="Canal RFCOMM PyBluez (0 = désactivé)")
    ap.add_argument("--freq", type=float, default=20.0, help="Hz command worker (comme la manette)")
    ap.add_argument("--head-only", action="store_true", help="only_head_control=True")
    args = ap.parse_args()

    ctrl = AndroidBridgeController(args.freq, only_head_control=args.head_only)

    if args.stdin:
        _run_stdin(ctrl.virtual)

    if args.tcp_port > 0:
        threading.Thread(
            target=_run_tcp_server,
            args=(args.tcp_host, args.tcp_port, ctrl.virtual),
            daemon=True,
        ).start()

    if args.rfcomm > 0 and not _try_run_rfcomm(args.rfcomm, ctrl.virtual):
        print(
            "[xbox_bridge] RFCOMM demandé mais PyBluez indisponible : "
            "pip install pybluez (souvent capricieux sur Pi récents — préfère TCP).",
            file=sys.stderr,
        )

    if args.tcp_port <= 0 and not args.stdin and args.rfcomm <= 0:
        print(
            "Aucun transport actif. Exemples :\n"
            "  python -m mini_bdx_runtime.xbox_bridge --tcp-port 8765\n"
            "  printf '%s\\n' '{\"v\":1,\"ts_ms\":0,\"seq\":1,\"axes\":{\"lx\":0,\"ly\":0,\"rx\":0,\"ry\":0},"
            "\"triggers\":{\"lt\":0,\"rt\":0},\"buttons\":{\"A\":false,\"B\":false,\"X\":false,\"Y\":false,"
            "\"LB\":false,\"RB\":false},\"dpad\":{\"up\":false,\"down\":false},\"safety\":{\"estop\":false}}' "
            "| nc -q1 127.0.0.1 8765",
            file=sys.stderr,
        )
        sys.exit(2)

    print("[xbox_bridge] Running (Ctrl+C to stop). Dump get_last_command():")
    try:
        while True:
            print(ctrl.get_last_command())
            time.sleep(0.05)
    except KeyboardInterrupt:
        print("\n[xbox_bridge] stopped.")


if __name__ == "__main__":
    main()
