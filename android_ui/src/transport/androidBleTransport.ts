import { registerPlugin } from '@capacitor/core';
import type { ControllerFrameV1, RobotLogMessage, TransportStatus } from './types';
import type { Transport, TransportListener } from './transport';

type RobotBlePlugin = {
  connect(options?: { deviceAddress?: string; serviceUuid?: string; txUuid?: string; rxUuid?: string; autoReconnect?: boolean }): Promise<{ deviceName?: string }>;
  disconnect(): Promise<void>;
  send(options: { payload: string }): Promise<void>;
  emergencyStop(options: { enabled: boolean }): Promise<void>;
  addListener(
    eventName: 'status' | 'rx',
    listenerFunc: (event: any) => void
  ): Promise<{ remove: () => Promise<void> }>;
};

const RobotBle = registerPlugin<RobotBlePlugin>('RobotBle');

export class AndroidBleTransport implements Transport {
  private status: TransportStatus = { connected: false, mode: 'android-ble' };
  private listener: TransportListener | null = null;
  private estop = false;
  private unsubscribers: Array<() => Promise<void>> = [];

  getStatus(): TransportStatus {
    return this.status;
  }

  setListener(listener: TransportListener | null): void {
    this.listener = listener;
  }

  private emitStatus(): void {
    this.listener?.({ type: 'status', status: this.status });
  }

  private emitLog(log: RobotLogMessage): void {
    this.listener?.({ type: 'log', log });
  }

  async connect(): Promise<void> {
    try {
      // Écoute status/rx (logs)
      if (this.unsubscribers.length === 0) {
        const statusSub = await RobotBle.addListener('status', (ev: any) => {
          const connected = !!ev?.connected;
          this.status = { ...this.status, connected };
          this.emitStatus();
        });
        this.unsubscribers.push(statusSub.remove);

        const rxSub = await RobotBle.addListener('rx', (ev: any) => {
          const text = typeof ev?.text === 'string' ? ev.text : '';
          if (!text) return;
          try {
            const msg = JSON.parse(text);
            if (msg?.type === 'log' && typeof msg.message === 'string') {
              this.emitLog({
                type: 'log',
                level: (msg.level as any) ?? 'info',
                message: msg.message,
              });
            } else {
              this.emitLog({ type: 'log', level: 'info', message: text });
            }
          } catch {
            this.emitLog({ type: 'log', level: 'info', message: text });
          }
        });
        this.unsubscribers.push(rxSub.remove);
      }

      const res = await RobotBle.connect({ autoReconnect: true });
      this.status = { connected: true, mode: 'android-ble', deviceName: res?.deviceName ?? 'Robot' };
      this.emitStatus();
      this.emitLog({ type: 'log', level: 'success', message: 'Connexion BLE établie' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.status = { connected: false, mode: 'android-ble', lastError: msg };
      this.emitStatus();
      this.emitLog({ type: 'log', level: 'error', message: `Connexion BLE impossible: ${msg}` });
      throw e;
    }
  }

  async disconnect(): Promise<void> {
    await RobotBle.disconnect();
    this.status = { connected: false, mode: 'android-ble' };
    this.emitStatus();
    this.emitLog({ type: 'log', level: 'warning', message: 'Déconnecté' });
  }

  async send(frame: ControllerFrameV1): Promise<void> {
    // Le clamp/estop est déjà géré avant envoi, mais on garde un e-stop “latched” côté natif.
    if (frame.safety.estop !== this.estop) {
      this.estop = frame.safety.estop;
      await RobotBle.emergencyStop({ enabled: this.estop });
    }
    const payload = JSON.stringify(frame);
    await RobotBle.send({ payload });
  }
}

