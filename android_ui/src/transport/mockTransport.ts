import type { ControllerFrameV1, TransportStatus } from './types';
import type { Transport, TransportListener } from './transport';

export class MockTransport implements Transport {
  private status: TransportStatus = { connected: false, mode: 'simulation' };
  private listener: TransportListener | null = null;

  getStatus(): TransportStatus {
    return this.status;
  }

  setListener(listener: TransportListener | null): void {
    this.listener = listener;
  }

  async connect(): Promise<void> {
    this.status = { connected: true, mode: 'simulation', deviceName: 'Simulation' };
    this.listener?.({ type: 'status', status: this.status });
    this.listener?.({ type: 'log', log: { type: 'log', level: 'success', message: 'Mode simulation activé' } });
  }

  async disconnect(): Promise<void> {
    this.status = { connected: false, mode: 'simulation' };
    this.listener?.({ type: 'status', status: this.status });
    this.listener?.({ type: 'log', log: { type: 'log', level: 'warning', message: 'Déconnecté (simulation)' } });
  }

  async send(frame: ControllerFrameV1): Promise<void> {
    // Throttle & perf: ne rien faire par défaut, juste debug ponctuel si besoin.
    // eslint-disable-next-line no-console
    console.debug('[MockTransport] frame', frame);
  }
}

