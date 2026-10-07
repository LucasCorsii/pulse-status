import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { summarizeChecks } from '../uptime/uptime';

// Página pública de status: somente monitores com isPublic=true.
// O :slug é o id do monitor (documentado; sem coluna slug no schema MVP).
@Controller('status')
export class StatusController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listPublic() {
    const monitors = await this.prisma.monitor.findMany({
      where: { isPublic: true },
      select: { id: true, name: true, url: true, status: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { monitors };
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    const monitor = await this.prisma.monitor.findFirst({
      where: { id: slug, isPublic: true },
    });
    if (!monitor) throw new NotFoundException('Status page not found');
    const checks = await this.prisma.check.findMany({
      where: { monitorId: monitor.id },
      orderBy: { checkedAt: 'desc' },
      take: 50,
    });
    const openIncidents = await this.prisma.incident.findMany({
      where: { monitorId: monitor.id, status: 'OPEN' },
      orderBy: { startedAt: 'desc' },
    });
    const summary = summarizeChecks(
      checks.map((c) => ({ result: c.result, latencyMs: c.latencyMs })),
    );
    return {
      monitor: { id: monitor.id, name: monitor.name, status: monitor.status },
      summary,
      checks,
      openIncidents,
    };
  }
}
