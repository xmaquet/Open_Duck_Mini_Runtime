import type { ControllerFrameV1, UiControllerState } from './types';
import { clamp, deadzone01 } from './math';

const TRIGGER_DEADZONE = 0.1;

export function isEmergencyStop(ui: UiControllerState): boolean {
  // Aligné “minimalement” à l’UI existante: combo Start+Select = arrêt d’urgence.
  return Boolean(ui.buttons.Start && ui.buttons.Select);
}

export function uiToControllerFrame(ui: UiControllerState, seq: number, nowMs: number = Date.now()): ControllerFrameV1 {
  const estop = isEmergencyStop(ui);

  // Convention runtime (xbox_controller.py): axes pygame sont inversés via -1*get_axis(...)
  const lx = clamp(-ui.leftStick.x, -1, 1);
  const ly = clamp(-ui.leftStick.y, -1, 1);
  const rx = clamp(-ui.rightStick.x, -1, 1);
  const ry = clamp(-ui.rightStick.y, -1, 1);

  const lt = deadzone01(ui.triggers.LT, TRIGGER_DEADZONE);
  const rt = deadzone01(ui.triggers.RT, TRIGGER_DEADZONE);

  const frame: ControllerFrameV1 = {
    v: 1,
    ts_ms: nowMs,
    seq,
    axes: estop ? { lx: 0, ly: 0, rx: 0, ry: 0 } : { lx, ly, rx, ry },
    triggers: estop ? { lt: 0, rt: 0 } : { lt, rt },
    buttons: {
      A: estop ? false : !!ui.buttons.A,
      B: estop ? false : !!ui.buttons.B,
      X: estop ? false : !!ui.buttons.X,
      Y: estop ? false : !!ui.buttons.Y,
      LB: estop ? false : !!ui.buttons.LB,
      RB: estop ? false : !!ui.buttons.RB,
    },
    dpad: {
      up: estop ? false : !!ui.dpad.up,
      down: estop ? false : !!ui.dpad.down,
    },
    safety: { estop },
  };

  return frame;
}

