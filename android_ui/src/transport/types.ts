export type LogLevel = 'info' | 'warning' | 'error' | 'success';

export interface UiControllerState {
  leftStick: { x: number; y: number };
  rightStick: { x: number; y: number };
  buttons: {
    A: boolean;
    B: boolean;
    X: boolean;
    Y: boolean;
    LB: boolean;
    RB: boolean;
    Start: boolean;
    Select: boolean;
  };
  dpad: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
  triggers: {
    LT: number;
    RT: number;
  };
}

export interface ControllerFrameV1 {
  v: 1;
  ts_ms: number;
  seq: number;
  axes: { lx: number; ly: number; rx: number; ry: number };
  triggers: { lt: number; rt: number };
  buttons: { A: boolean; B: boolean; X: boolean; Y: boolean; LB: boolean; RB: boolean };
  dpad: { up: boolean; down: boolean };
  safety: { estop: boolean };
}

export interface RobotLogMessage {
  type: 'log';
  level: LogLevel;
  message: string;
}

export interface TransportStatus {
  connected: boolean;
  mode: 'android-ble' | 'simulation';
  deviceName?: string;
  lastError?: string;
}

