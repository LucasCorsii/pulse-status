import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { AlertsService } from '../alerts/alerts.service';
import { shouldOpenIncident, shouldResolveIncident } from '../incidents/incident.policy';
import { httpCheck } from './http-check';

const QUEUE_NAME = 'monitor-checks';

function redisConnection(): IORedis | null {
  if (process.env.SKIP_REDIS === '1') return null;
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return new IORedis(url, { maxRetriesPerRequest: null });
}

@Injectable()
export class ChecksService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChecksService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private connection: IORedis | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly alerts: AlertsService,
  ) {}

  async onModuleInit() {
    if (process.env.SKIP_QUEUE === '1') return;
    try {
      this.connection = redisConnection();
      if (!this.connection) return;
      this.queue = new Queue(QUEUE_NAME, { connection: this.connection });
      const workerConnection = redisConnection();
      if (!workerConnection) return;
      this.worker = new Worker(
        QUEUE_NAME,
        async (job) => this.runCheck(job.data.monitorId as string),
        {
          connection: workerConnection,
          concurrency: 10,
        },
      );
      this.worker.on('failed', (job, err) =>
        this.logger.warn(`check job ${job?.id} failed: ${err.message}`),
      );
      // Sincroniza agendamentos a cada 60s.
      this.timer = setInterval(() => void this.syncSchedules(), 60_000);
      void this.syncSchedules();
    } catch (err) {
      this.logger.warn(`queue disabled: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
    this.connection?.disconnect();
  }

  private jobOptions(monitor: { intervalSec: number }): JobsOptions {
    return {
      repeat: { every: Math.max(monitor.intervalSec, 15) * 1000 },
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    };
  }

  async syncSchedules() {
    if (!this.queue) return;
    try {
      const monitors = await this.prisma.monitor.findMany({
        where: { status: { not: 'PAUSED' } },
        select: { id: true, intervalSec: true },
      });
      for (const m of monitors) {
        await this.queue
          .add(
            `check:${m.id}`,
            { monitorId: m.id },
            {
              ...this.jobOptions(m),
              jobId: `check:${m.id}`,
            },
          )
          .catch(() => undefined);
      }
    } catch (err) {
      this.logger.warn(`syncSchedules failed: ${(err as Error).message}`);
    }
  }

  async runCheck(monitorId: string): Promise<void> {
    const monitor = await this.prisma.monitor.findUnique({ where: { id: monitorId } });
    if (!monitor || monitor.status === 'PAUSED') return;

    const result = await httpCheck(monitor.url, monitor.timeoutMs);
    const checkResult = result.ok ? 'SUCCESS' : 'FAILURE';

    await this.prisma.check.create({
      data: {
        monitorId,
        result: checkResult,
        statusCode: result.statusCode,
        latencyMs: result.latencyMs,
        errorMessage: result.errorMessage,
      },
    });

    // Conta falhas consecutivas recentes (últimas 10).
    const recent = await this.prisma.check.findMany({
      where: { monitorId },
      orderBy: { checkedAt: 'desc' },
      take: 10,
      select: { result: true },
    });
    const ordered = [...recent].reverse().map((c) => c.result);
    // Inclui o check atual que já está em `recent` (primeiro). Conta cauda de falhas.
    let consecutive = 0;
    for (let i = ordered.length - 1; i >= 0; i -= 1) {
      if (ordered[i] === 'FAILURE') consecutive += 1;
      else break;
    }
    const openIncident = await this.prisma.incident.findFirst({
      where: { monitorId, status: 'OPEN' },
    });

    const newStatus = result.ok ? 'UP' : consecutive >= 1 ? 'DOWN' : monitor.status;
    if (newStatus !== monitor.status) {
      await this.prisma.monitor.update({ where: { id: monitorId }, data: { status: newStatus } });
    }

    if (shouldOpenIncident(consecutive, Boolean(openIncident))) {
      const incident = await this.prisma.incident.create({
        data: { monitorId, cause: result.errorMessage ?? `Status ${result.statusCode}` },
      });
      this.events.broadcastIncident(
        { monitorId, incidentId: incident.id, state: 'opened' },
        { ownerId: monitor.userId, isPublic: monitor.isPublic },
      );
      await this.alerts.notifyOwner(monitor.userId, 'down', {
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
      });
    } else if (shouldResolveIncident(checkResult, Boolean(openIncident)) && openIncident) {
      await this.prisma.incident.update({
        where: { id: openIncident.id },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
      this.events.broadcastIncident(
        { monitorId, incidentId: openIncident.id, state: 'resolved' },
        { ownerId: monitor.userId, isPublic: monitor.isPublic },
      );
      await this.alerts.notifyOwner(monitor.userId, 'up', {
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
      });
    }

    this.events.broadcastStatus(
      {
        monitorId,
        status: newStatus,
        result: checkResult,
        latencyMs: result.latencyMs,
        checkedAt: new Date().toISOString(),
      },
      { ownerId: monitor.userId, isPublic: monitor.isPublic },
    );
  }
}
