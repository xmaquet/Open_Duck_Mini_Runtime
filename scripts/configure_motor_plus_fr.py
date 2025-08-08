#!/usr/bin/env python3
"""
Outil amélioré de configuration des servos Feetech (Open Duck Mini) — Version FR

Fonctionnalités par rapport à l'original :
  - Options CLI pour PID (P/I/D), accélération, mode, lock après opération
  - Flux de travail sécurisé avec avertissement explicite avant tout mouvement
  - Option de coupure du couple après recentrage pour faciliter la pose du horn
  - Mode scan-only et auto-détection de l'ID courant
  - Journal JSON des paramètres avant/après pour la traçabilité

Exemples d'utilisation :
  python configure_motor_plus_fr.py --id 10
  python configure_motor_plus_fr.py --id 21 --P 40 --accel 50 --lock 1 --torque-off-after
  python configure_motor_plus_fr.py --scan-only  # détecter simplement l'ID

Dépendances :
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
    print("ERREUR : pypot.feetech indisponible. Installez pypot depuis GitHub.", file=sys.stderr)
    raise

DEFAULT_ID = 1  # ID usine

def parse_args():
    ap = argparse.ArgumentParser(description="Configurer un servo Feetech STS3215 (Open Duck Mini)")
    ap.add_argument("--port", default="/dev/ttyACM0",
                    help="Port série, ex. /dev/ttyACM0 (astuce : ls /dev/tty* | grep -i usb)")
    ap.add_argument("--baudrate", type=int, default=1_000_000, help="Vitesse série (par défaut : 1 000 000)")
    ap.add_argument("--timeout", type=float, default=0.1, help="Timeout série en secondes (défaut : 0.1)")

    ap.add_argument("--id", type=int, required=False,
                    help="ID cible à assigner au servo (requis sauf avec --scan-only).")
    ap.add_argument("--scan-only", action="store_true",
                    help="Uniquement scanner et reporter l'ID courant. Aucun changement appliqué.")

    # Paramètres de contrôle
    ap.add_argument("--P", type=int, default=32, help="Coefficient P (défaut : 32)")
    ap.add_argument("--I", type=int, default=0, help="Coefficient I (défaut : 0)")
    ap.add_argument("--D", type=int, default=0, help="Coefficient D (défaut : 0)")
    ap.add_argument("--accel", type=int, default=0, help="Accélération (défaut : 0)")
    ap.add_argument("--max-accel", type=int, default=0, help="Accélération maximale (défaut : 0)")
    ap.add_argument("--mode", type=int, default=0, help="Mode (0 = position)")
    ap.add_argument("--move-to-zero", action="store_true",
                    help="Envoyer le servo à la position 0 en fin de procédure (avec confirmation).")
    ap.add_argument("--torque-off-after", action="store_true",
                    help="Désactiver le couple après recentrage pour faciliter la pose du horn.")
    ap.add_argument("--lock", type=int, choices=[0,1], default=None,
                    help="Verrouiller (1) ou déverrouiller (0) l'EEPROM après modifications. Par défaut : ne pas changer.")

    ap.add_argument("--log", default="motor_config_log.json",
                    help="Chemin du fichier JSON de log (ajout). Mettre '-' pour désactiver.")
    return ap.parse_args()

def scan_id(io) -> int:
    """Tente d'abord l'ID usine, puis scanne 0..254."""
    try:
        io.get_present_position([DEFAULT_ID])
        return DEFAULT_ID
    except Exception:
        pass
    for i in range(0, 255):
        try:
            io.get_present_position([i])
            return i
        except Exception:
            continue
    return None

def snapshot(io, mid):
    """Capture les paramètres clés du servo pour comparaison avant/après."""
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
        print(f"AVERTISSEMENT : échec d'écriture du log {path}: {e}", file=sys.stderr)

def main():
    args = parse_args()
    if args.scan_only and args.id is None:
        pass  # OK
    elif not args.scan_only and args.id is None:
        print("ERREUR : --id est requis sauf si vous utilisez --scan-only", file=sys.stderr)
        sys.exit(2)

    io = FeetechSTS3215IO(args.port, baudrate=args.baudrate, use_sync_read=True, timeout=args.timeout)

    mid = scan_id(io)
    if mid is None:
        print("ERREUR : Aucun servo détecté sur le bus. Vérifiez alimentation, câblage et port.", file=sys.stderr)
        sys.exit(1)

    print(f"Servo détecté avec ID : {mid}")
    if args.scan_only:
        snap = snapshot(io, mid)
        print("Paramètres courants :", json.dumps(snap, indent=2, ensure_ascii=False))
        sys.exit(0)

    before = snapshot(io, mid)

    # S'assurer que l'EEPROM est modifiable
    try:
        print("Déverrouillage de l'EEPROM (set_lock 0)...")
        io.set_lock({mid: 0})
    except Exception as e:
        print(f"AVERTISSEMENT : impossible de déverrouiller l'EEPROM : {e}", file=sys.stderr)

    # Appliquer la configuration
    try:
        print(f"Réglage mode={args.mode}, max_accel={args.max_accel}, accel={args.accel} ...")
        io.set_mode({mid: args.mode})
        io.set_maximum_acceleration({mid: args.max_accel})
        io.set_acceleration({mid: args.accel})

        print(f"Réglage PID : P={args.P}, I={args.I}, D={args.D} ...")
        io.set_P_coefficient({mid: args.P})
        io.set_I_coefficient({mid: args.I})
        io.set_D_coefficient({mid: args.D})
    except Exception as e:
        print(f"ERREUR : échec d'application des paramètres : {e}", file=sys.stderr)
        sys.exit(1)

    # Changement d'ID si nécessaire
    if args.id != mid:
        try:
            print(f"Changement d'ID {mid} -> {args.id} ...")
            io.change_id({mid: int(args.id)})
            mid = int(args.id)
            time.sleep(0.5)
        except Exception as e:
            print(f"ERREUR : échec lors du changement d'ID : {e}", file=sys.stderr)
            sys.exit(1)

    # Mouvement optionnel vers zéro (avec confirmation)
    if args.move_to_zero:
        print("⚠️  Le servo VA BOUGER vers la position 0.")
        input("Assurez-vous que l'articulation peut bouger librement, puis appuyez sur <Entrée> pour continuer... ")
        try:
            io.set_goal_position({mid: 0})
            time.sleep(1.0)
        except Exception as e:
            print(f"ERREUR : impossible d'envoyer le servo à 0 : {e}", file=sys.stderr)

    if args.torque_off_after:
        try:
            print("Désactivation du couple pour faciliter la pose du horn...")
            io.disable_torque([mid])
        except Exception as e:
            print(f"AVERTISSEMENT : échec lors de la désactivation du couple : {e}", file=sys.stderr)

    # (Dé)verrouillage optionnel en fin de procédure
    if args.lock is not None:
        try:
            print(f"Application du verrouillage lock={args.lock} ...")
            io.set_lock({mid: args.lock})
        except Exception as e:
            print(f"AVERTISSEMENT : impossible d'appliquer le lock : {e}", file=sys.stderr)

    after = snapshot(io, mid)

    # Journalisation
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
    print("Configuration terminée.")
    print(f"Motor id: {mid}")
    print("Avant :", json.dumps(before, indent=2, ensure_ascii=False))
    print("Après :", json.dumps(after, indent=2, ensure_ascii=False))
    print(f"Log   : {args.log if args.log != '-' else 'désactivé'}")
    print("===")

if __name__ == "__main__":
    main()
