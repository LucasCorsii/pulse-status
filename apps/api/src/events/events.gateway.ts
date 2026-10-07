import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { getJwtSecrets } from '../auth/jwt-config';
import { publicRoom, roomsForMonitorEvent, userRoom } from './rooms';

export interface MonitorStatusEvent {
  monitorId: string;
  status: string;
  result: string;
  latencyMs: number | null;
  checkedAt: string;
}

// PLAN.md: gateway WebSocket no mesmo processo NestJS, namespace /events.
// Anônimos entram apenas na sala `public`; autenticados entram também em `user:{id}`.
@WebSocketGateway({ namespace: '/events', cors: { origin: true, credentials: true } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwt?: JwtService) {}

  private userIdFromSocket(client: Socket): string | null {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ??
        (client.handshake.query?.token as string | undefined) ??
        null;
      if (!token) return null;
      const payload = this.jwt?.verify<{ sub: string }>(token, {
        secret: getJwtSecrets().accessSecret,
      });
      return payload?.sub ?? null;
    } catch {
      return null;
    }
  }

  handleConnection(client: Socket) {
    const userId = this.userIdFromSocket(client);
    if (userId) {
      void client.join([publicRoom(), userRoom(userId)]);
      client.data.userId = userId;
    } else {
      void client.join(publicRoom());
      client.data.userId = null;
    }
    this.logger.debug(`events connected: user=${userId ?? 'anon'}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`events disconnected: user=${client.data?.userId ?? 'anon'}`);
  }

  broadcastStatus(event: MonitorStatusEvent, opts: { ownerId: string; isPublic: boolean }) {
    if (!this.server) return;
    const { rooms } = roomsForMonitorEvent(opts.ownerId, opts.isPublic);
    for (const room of rooms) this.server.to(room).emit('monitor.status', event);
  }

  broadcastIncident(
    event: { monitorId: string; incidentId: string; state: 'opened' | 'resolved' },
    opts: { ownerId: string; isPublic: boolean },
  ) {
    if (!this.server) return;
    const { rooms } = roomsForMonitorEvent(opts.ownerId, opts.isPublic);
    for (const room of rooms) this.server.to(room).emit('incident.update', event);
  }
}
