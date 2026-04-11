"""
Serveur GATT Linux (BlueZ) pour l’app Android : mêmes UUID que RobotBlePlugin + docs/protocol.md.

La tablette est le **central BLE** (client GATT), le Raspberry Pi le **périphérique** (serveur).
Liaison **Bluetooth LE directe** (pas besoin de Wi‑Fi entre les deux).

Dépendances : ``pip install -e ".[ble]"`` — groupe ``bluetooth`` recommandé pour éviter sudo.

Voir aussi : README / docs/protocol.md § « Serveur GATT sur la Pi ».
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from typing import Any

# UUID alignés sur RobotBlePlugin.kt et docs/protocol.md
SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0"
TX_UUID = "12345678-1234-5678-1234-56789abcdef1"  # Android → robot (write)
RX_UUID = "12345678-1234-5678-1234-56789abcdef2"  # robot → Android (notify / read)


def _try_apply_json_frames(buf: bytearray, virtual: Any) -> None:
    """Décode UTF-8, extrait un ou plusieurs objets JSON (raw_decode), met à jour virtual."""
    if not buf:
        return
    try:
        text = buf.decode("utf-8")
    except UnicodeDecodeError:
        return
    dec = json.JSONDecoder()
    idx = 0
    text = text.lstrip()
    while idx < len(text):
        try:
            obj, end = dec.raw_decode(text, idx)
        except json.JSONDecodeError:
            tail = text[idx:].encode("utf-8")
            buf.clear()
            buf.extend(tail)
            return
        if isinstance(obj, dict) and int(obj.get("v", 0)) == 1:
            virtual.apply_json(obj)
        idx = end
        while idx < len(text) and text[idx].isspace():
            idx += 1
    buf.clear()


def main() -> None:
    try:
        from bluez_peripheral.advert import Advertisement
        from bluez_peripheral.agent import NoIoAgent
        # 0.1.7 : Service n’est pas dans bluez_peripheral.gatt.__init__ ; chemins stables depuis la doc officielle.
        from bluez_peripheral.gatt.characteristic import (
            characteristic,
            CharacteristicFlags as CharFlags,
        )
        from bluez_peripheral.gatt.service import Service
        from bluez_peripheral.util import Adapter, get_message_bus
        from dbus_next.errors import InterfaceNotFoundError
    except ImportError as e:
        print(
            "Dépendance BLE manquante : pip install --no-cache-dir -e \".[ble]\"\n"
            f"({e})",
            file=sys.stderr,
        )
        sys.exit(1)

    ap = argparse.ArgumentParser(description="Serveur GATT Open Duck Mini (Android → Pi)")
    ap.add_argument("--name", default="Open Duck Mini", help="Nom affiché en publicité BLE")
    ap.add_argument("--freq", type=float, default=20.0, help="Hz pour AndroidBridgeController")
    ap.add_argument("--head-only", action="store_true", help="only_head_control")
    ap.add_argument("--dump", action="store_true", help="Afficher get_last_command() périodiquement")
    ap.add_argument("--no-agent", action="store_true", help="Ne pas enregistrer NoIoAgent (si pairing déjà géré)")
    ap.add_argument(
        "--dbus-adapter",
        default=None,
        metavar="PATH",
        help="Chemin D-Bus explicite (ex. /org/bluez/hci0). Sinon : premier objet sous /org/bluez qui expose org.bluez.Adapter1.",
    )
    args = ap.parse_args()

    from mini_bdx_runtime.xbox_bridge import AndroidBridgeController, VirtualJoystickState

    shared_virtual = VirtualJoystickState()

    class RobotDuckGattService(Service):
        """Service unique : TX (write JSON), RX (notify + read)."""

        def __init__(self, v: VirtualJoystickState) -> None:
            self.virtual = v
            self._tx_buf = bytearray()
            self._rx_value = b'{"type":"log","level":"info","message":"GATT TX ready"}'
            super().__init__(SERVICE_UUID, True)

        @characteristic(
            TX_UUID,
            CharFlags.READ | CharFlags.WRITE | CharFlags.WRITE_WITHOUT_RESPONSE,
        )
        def tx_characteristic(self, options):  # noqa: ARG002
            return b""

        @tx_characteristic.setter
        def tx_characteristic(self, value, options):
            data = bytes(value)
            o = options.offset
            if o > 0:
                end = o + len(data)
                if len(self._tx_buf) < end:
                    self._tx_buf.extend(b"\x00" * (end - len(self._tx_buf)))
                self._tx_buf[o:end] = data
            else:
                self._tx_buf.extend(data)
            if len(self._tx_buf) > 65536:
                self._tx_buf.clear()
                return
            _try_apply_json_frames(self._tx_buf, self.virtual)

        @characteristic(RX_UUID, CharFlags.NOTIFY | CharFlags.READ)
        def rx_characteristic(self, options):  # noqa: ARG002
            return bytes(self._rx_value)

        def notify_json(self, obj: dict) -> None:
            self._rx_value = json.dumps(obj, separators=(",", ":")).encode("utf-8")
            self.rx_characteristic.changed(self._rx_value)

    async def run() -> None:
        bus = await get_message_bus()

        async def _resolve_adapter() -> Adapter:
            # Adapter.get_first() (bluez-peripheral 0.1.7) suppose que tout enfant de /org/bluez est un hci ;
            # BlueZ 5.8x ajoute d’autres nœuds sans org.bluez.Adapter1 → InterfaceNotFoundError.
            if args.dbus_adapter:
                paths = [args.dbus_adapter]
            else:
                root = await bus.introspect("org.bluez", "/org/bluez")
                paths = [f"/org/bluez/{n.name}" for n in root.nodes]
            last: BaseException | None = None
            for path in paths:
                intro = await bus.introspect("org.bluez", path)
                proxy = bus.get_proxy_object("org.bluez", path, intro)
                try:
                    return Adapter(proxy)
                except InterfaceNotFoundError as e:
                    last = e
                    continue
            raise RuntimeError(
                "Aucun adaptateur Bluetooth (org.bluez.Adapter1). "
                "Vérifie : sudo systemctl start bluetooth ; bluetoothctl power on. "
                "Sinon essaie : --dbus-adapter /org/bluez/hci0"
            ) from last

        adapter = await _resolve_adapter()
        try:
            if not await adapter.get_powered():
                await adapter.set_powered(True)
        except Exception as e:
            print(f"[ble_gatt] Impossible d’allumer l’adaptateur ({e}).", file=sys.stderr)

        srv = RobotDuckGattService(shared_virtual)
        await srv.register(bus, adapter=adapter)

        if not args.no_agent:
            try:
                agent = NoIoAgent()
                await agent.register(bus)
            except Exception as e:
                print(
                    f"[ble_gatt] NoIoAgent indisponible ({e}) — réessaie avec sudo ou --no-agent",
                    file=sys.stderr,
                )

        advert = Advertisement(
            args.name,
            [SERVICE_UUID],
            appearance=0,
            timeout=0,
            discoverable=True,
        )
        await advert.register(bus, adapter=adapter)

        ctrl = AndroidBridgeController(
            args.freq, only_head_control=args.head_only, virtual=shared_virtual
        )

        print(
            "[ble_gatt] Publicité + service enregistrés. Connecte la tablette (scan filtré sur ce service UUID).",
            flush=True,
        )
        srv.notify_json(
            {
                "type": "log",
                "level": "info",
                "message": "Connecté au serveur GATT Pi (TX/RX prêts).",
            }
        )

        if args.dump:

            async def _dump() -> None:
                while True:
                    line = await asyncio.to_thread(ctrl.get_last_command)
                    print(line, flush=True)
                    await asyncio.sleep(0.1)

            asyncio.create_task(_dump())

        try:
            while True:
                await asyncio.sleep(3600)
        except asyncio.CancelledError:
            pass

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        print("\n[ble_gatt] Arrêt.", file=sys.stderr)


if __name__ == "__main__":
    main()
