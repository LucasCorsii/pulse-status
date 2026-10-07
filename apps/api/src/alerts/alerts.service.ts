import { Injectable } from '@nestjs/common';
import { AlertChannelType } from '@prisma/client';
import { PrismaService } from '../prisma.service';

interface ChannelRow {
  id: string;
  type: AlertChannelType;
  configuration: unknown;
  isEnabled: boolean;
}

// MVP (PLAN.md): e-mail, webhook genérico e Slack. Sem log de segredos.
@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async notifyOwner(
    ownerId: string,
    event: 'down' | 'up',
    monitor: { id: string; name: string; url: string },
  ): Promise<void> {
    let channels: ChannelRow[];
    try {
      channels = (await this.prisma.alertChannel.findMany({
        where: { userId: ownerId, isEnabled: true },
      })) as ChannelRow[];
    } catch {
      return;
    }
    const text =
      event === 'down'
        ? `🔴 ${monitor.name} está DOWN (${monitor.url})`
        : `🟢 ${monitor.name} voltou UP (${monitor.url})`;
    await Promise.allSettled(channels.map((c) => this.dispatch(c, text, monitor)));
  }

  private async dispatch(
    channel: ChannelRow,
    text: string,
    monitor: { id: string; name: string; url: string },
  ): Promise<void> {
    const config = (channel.configuration ?? {}) as Record<string, unknown>;
    try {
      if (channel.type === 'WEBHOOK' || channel.type === 'SLACK') {
        const url = String(config.url ?? config.webhookUrl ?? '');
        if (!url) return;
        await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text, monitorId: monitor.id, monitorName: monitor.name }),
          signal: AbortSignal.timeout(8000),
        });
      } else if (channel.type === 'EMAIL') {
        // MVP sem SMTP configurado: registra apenas o fato, sem segredos.
        // eslint-disable-next-line no-console
        console.log(
          `[alerts][email] channel=${channel.id} monitor=${monitor.id} event=${text.slice(0, 2)}`,
        );
      }
    } catch {
      // Alertas nunca quebram a checagem.
    }
  }
}
