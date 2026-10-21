import { Injectable, NotFoundException } from '@nestjs/common';
import { ChecksService } from '../checks/checks.service';
import { PrismaService } from '../prisma.service';
import { summarizeChecks } from '../uptime/uptime';
import { CreateMonitorDto, UpdateMonitorDto } from './dto';

@Injectable()
export class MonitorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checksService: ChecksService,
  ) {}

  list(userId: string) {
    return this.prisma.monitor.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(userId: string, id: string) {
    const monitor = await this.prisma.monitor.findFirst({ where: { id, userId } });
    if (!monitor) throw new NotFoundException('Monitor not found');
    return monitor;
  }

  async create(userId: string, dto: CreateMonitorDto) {
    const monitor = await this.prisma.monitor.create({
      data: {
        userId,
        name: dto.name,
        url: dto.url,
        intervalSec: dto.intervalSec ?? 60,
        timeoutMs: dto.timeoutMs ?? 10000,
        isPublic: dto.isPublic ?? false,
      },
    });
    // Agenda imediatamente em vez de esperar o próximo ciclo de sincronização.
    void this.checksService.syncSchedules();
    return monitor;
  }

  async update(userId: string, id: string, dto: UpdateMonitorDto) {
    await this.get(userId, id);
    const monitor = await this.prisma.monitor.update({ where: { id }, data: dto });
    void this.checksService.syncSchedules();
    return monitor;
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.monitor.delete({ where: { id } });
    void this.checksService.syncSchedules();
    return { ok: true };
  }

  async checks(userId: string, id: string, limit = 50) {
    await this.get(userId, id);
    const take = Math.min(Math.max(limit, 1), 200);
    const checks = await this.prisma.check.findMany({
      where: { monitorId: id },
      orderBy: { checkedAt: 'desc' },
      take,
    });
    const summary = summarizeChecks(
      checks.map((c) => ({ result: c.result, latencyMs: c.latencyMs })),
    );
    return { summary, checks };
  }

  async incidents(userId: string, id: string) {
    await this.get(userId, id);
    return this.prisma.incident.findMany({
      where: { monitorId: id },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }
}
