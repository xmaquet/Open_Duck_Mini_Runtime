import type { ControllerFrameV1, RobotLogMessage, TransportStatus } from './types';

export type TransportEvent =
  | { type: 'status'; status: TransportStatus }
  | { type: 'log'; log: RobotLogMessage };

export type TransportListener = (event: TransportEvent) => void;

export interface Transport {
  getStatus(): TransportStatus;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(frame: ControllerFrameV1): Promise<void>;
  setListener(listener: TransportListener | null): void;
}

