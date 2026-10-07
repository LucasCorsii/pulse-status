import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

export interface MonitorStatusEvent {
  monitorId: string;
  status: string;
  result: string;
  latencyMs: number | null;
  checkedAt: string;
}

// PLAN.md: gateway WebSocket no mesmo processo NestJS, namespace /events.
@WebSocketGateway({ namespace: '/events', cors: { origin: true, credentials: true } })
export class EventsGateway {
  @WebSocketServer()
  server!: Server;

  broadcastStatus(event: MonitorStatusEvent) {
    this.server?.emit('monitor.status', event);
  }

  broadcastIncident(event: {
    monitorId: string;
    incidentId: string;
    state: 'opened' | 'resolved';
  }) {
    this.server?.emit('incident.update', event);
  }
}
