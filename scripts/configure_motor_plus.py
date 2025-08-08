#!/usr/bin/env python3
"""
Enhanced Feetech motor configuration utility for Open Duck Mini.

Features vs original:
  - CLI options for PID (P/I/D), acceleration, mode, baudrate, and post-op lock
  - Safe workflow with explicit warnings before motion
  - Optional torque off after zeroing to allow horn installation
  - Scan-only mode and auto-detect of current motor ID
  - JSON log of old/new parameters for traceability

Usage examples:
  python configure_motor_plus.py --id 10
  python configure_motor_plus.py --id 21 --P 40 --accel 50 --lock 1 --torque-off-after
  python configure_motor_plus.py --id 12 --scan-only  # just detect current ID

Requires:
  from pypot.feetech import FeetechSTS3215IO
"""
import argparse
import json
import sys
import time
from datetime import datetime

try:
    from pypot.feetech import FeetechSTS3215IO
except Exception as e:
    print("ERROR: pypot.feetech not available. Install pypot from GitHub.", file=sys.stderr)
    raise

DEFAULT_ID = 1  # factory default

def parse_args():
    ap = argparse.ArgumentParser(description="Configure a Feetech STS3215 motor (Open Duck Mini)")
    ap.add_argument("--port", default="/dev/ttyACM0",
                    help="Serial port, e.g. /dev/ttyACM0 (hint: ls /dev/tty* | grep -i usb)")
    ap.add_argument("--baudrate", type=int, default=1_000_000, help="Serial baudrate (default: 1,000,000)")
    ap.add_argument("--timeout", type=float, default=0.1, help="Serial timeout seconds (default: 0.1)")

    ap.add_argument("--id", type=int, required=False,
                    help="Target ID to assign to the motor (required unless --scan-only).")
    ap.add_argument("--scan-only", action="store_true",
                    help="Only scan and report current motor ID. No changes applied.")

    # Control params
    ap.add_argument("--P", type=int, default=32, help="P coefficient (default: 32)")
    ap.add_argument("--I", type=int, default=0, help="I coefficient (default: 0)")
    ap.add_argument("--D", type=int, default=0, help="D coefficient (default: 0)")
    ap.add_argument("--accel", type=int, default=0, help="Acceleration (default: 0)")
    ap.add_argument("--max-accel", type=int, default=0, help="Maximum acceleration (default: 0)")
    ap.add_argument("--mode", type=int, default=0, help="Mode (0 = position)")
    ap.add_argument("--move-to-zero", action="store_true",
                    help="Move the motor to goal position 0 at the end (safe prompt before motion).")
    ap.add_argument("--torque-off-after", action="store_true",
                    help="Disable torque after zeroing to allow horn installation.")
    ap.add_argument("--lock", type=int, choices=[0,1], default=None,
                    help="Lock (1) or unlock (0) EEPROM after changes. Default: do not change lock.")

    ap.add_argument("--log", default="motor_config_log.json",
                    help="Path to JSON log file (appended). Set to '-' to disable logging.")
    return ap.parse_args()

def scan_id(io) -> int:
    # Try default first
    try:
        io.get_present_position([DEFAULT_ID])
        return DEFAULT_ID
    except Exception:
        pass
    # Then brute-force scan
    for i in range(0, 255):
        try:
            io.get_present_position([i])
            return i
        except Exception:
            continue
    return None

def snapshot(io, mid):
    data = {}
    try:
        data["P"] = io.get_P_coefficient([mid])[0]
        data["I"] = io.get_I_coefficient([mid])[0]
        data["D"] = io.get_D_coefficient([mid])[0]
        data["accel"] = io.get_acceleration([mid])[0]
        data["max_accel"] = io.get_maximum_acceleration([mid])[0]
        data["mode"] = io.get_mode([mid])[0]
    except Exception as e:
        data["error"] = f"read_error: {e!r}"
    return data

def append_log(path, record):
    if path == "-":
        return
    try:
        try:
            with open(path, "r", encoding="utf-8") as f:
                arr = json.load(f)
        except FileNotFoundError:
            arr = []
        arr.append(record)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(arr, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"WARNING: failed to write log to {path}: {e}", file=sys.stderr)

def main():
    args = parse_args()
    if args.scan_only and args.id is None:
        # OK
        pass
    elif not args.scan_only and args.id is None:
        print("ERROR: --id is required unless you use --scan-only", file=sys.stderr)
        sys.exit(2)

    io = FeetechSTS3215IO(args.port, baudrate=args.baudrate, use_sync_read=True, timeout=args.timeout)

    mid = scan_id(io)
    if mid is None:
        print("ERROR: No motor detected on the bus. Check power, wiring, and port.", file=sys.stderr)
        sys.exit(1)

    print(f"Detected motor ID: {mid}")
    if args.scan_only:
        snap = snapshot(io, mid)
        print("Current parameters:", json.dumps(snap, indent=2))
        sys.exit(0)

    before = snapshot(io, mid)

    # Ensure EEPROM is writable
    try:
        print("Unlocking EEPROM (set_lock 0)...")
        io.set_lock({mid: 0})
    except Exception as e:
        print(f"WARNING: could not unlock EEPROM: {e}", file=sys.stderr)

    # Apply configuration
    try:
        print(f"Setting mode={args.mode}, max_accel={args.max_accel}, accel={args.accel} ...")
        io.set_mode({mid: args.mode})
        io.set_maximum_acceleration({mid: args.max_accel})
        io.set_acceleration({mid: args.accel})

        print(f"Setting PID: P={args.P}, I={args.I}, D={args.D} ...")
        io.set_P_coefficient({mid: args.P})
        io.set_I_coefficient({mid: args.I})
        io.set_D_coefficient({mid: args.D})
    except Exception as e:
        print(f"ERROR: failed to set parameters: {e}", file=sys.stderr)
        sys.exit(1)

    # Change ID if needed
    if args.id != mid:
        try:
            print(f"Changing ID {mid} -> {args.id} ...")
            io.change_id({mid: int(args.id)})
            # After change, target ID is now args.id
            mid = int(args.id)
            time.sleep(0.5)
        except Exception as e:
            print(f"ERROR: failed to change ID: {e}", file=sys.stderr)
            sys.exit(1)

    # Optional move to zero with explicit confirmation
    if args.move_to_zero:
        print("⚠️  The motor WILL MOVE to goal position 0.")
        input("Make sure the joint can move freely, then press <Enter> to continue... ")
        try:
            io.set_goal_position({mid: 0})
            time.sleep(1.0)
        except Exception as e:
            print(f"ERROR: failed to move to zero: {e}", file=sys.stderr)

    if args.torque_off_after:
        try:
            print("Disabling torque to allow horn installation...")
            io.disable_torque([mid])
        except Exception as e:
            print(f"WARNING: failed to disable torque: {e}", file=sys.stderr)

    # Optional lock after
    if args.lock is not None:
        try:
            print(f"Setting lock={args.lock} ...")
            io.set_lock({mid: args.lock})
        except Exception as e:
            print(f"WARNING: failed to set lock: {e}", file=sys.stderr)

    after = snapshot(io, mid)

    # Log
    record = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "port": args.port,
        "baudrate": args.baudrate,
        "motor_id": mid,
        "applied": {
            "P": args.P, "I": args.I, "D": args.D,
            "accel": args.accel, "max_accel": args.max_accel,
            "mode": args.mode, "move_to_zero": args.move_to_zero,
            "torque_off_after": args.torque_off_after, "lock": args.lock,
        },
        "before": before,
        "after": after,
    }
    append_log(args.log, record)

    print("===")
    print("Done configuring motor.")
    print(f"Motor id: {mid}")
    print("Before:", json.dumps(before, indent=2))
    print("After :", json.dumps(after, indent=2))
    print(f"Log   : {args.log if args.log != '-' else 'disabled'}")
    print("===")

if __name__ == "__main__":
    main()
