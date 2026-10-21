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
import { ACCESS_COOKIE } from '../auth/cookies';
import { publicRoom, roomsForMonitorEvent, userRoom } from './rooms';

export interface MonitorStatusEvent {
  monitorId: string;
  status: string;
  result: string;
  latencyMs: number | null;
  checkedAt: string;
}

function allowedOrigins(): string[] {
  return (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) {
  // Sem `Origin` (clientes não-browser) é permitido; navegadores ficam na allowlist.
  if (!origin || allowedOrigins().includes(origin)) return callback(null, true);
  return callback(new Error('Origin not allowed'));
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key) result[key] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return result;
}

// PLAN.md: gateway WebSocket no mesmo processo NestJS, namespace /events.
// Anônimos entram apenas na sala `public`; autenticados entram também em `user:{id}`.
// A autenticação usa o cookie HttpOnly (navegador) ou `auth.token` (clientes de API).
@WebSocketGateway({ namespace: '/events', cors: { origin: corsOrigin, credentials: true } })
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
        parseCookies(client.handshake.headers?.cookie)[ACCESS_COOKIE] ??
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
