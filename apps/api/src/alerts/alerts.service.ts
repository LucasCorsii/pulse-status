import { Injectable } from '@nestjs/common';
import { AlertChannelType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { assertHttpUrl, assertPublicHostname, safeFetch } from '../common/ssrf';
import { isMailConfigured, sendAlertEmail } from './mail';

interface ChannelRow {
  id: string;
  type: AlertChannelType;
  configuration: unknown;
  isEnabled: boolean;
}

function webhookUrlFrom(config: Record<string, unknown>): string {
  return String(config.url ?? config.webhookUrl ?? '');
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
        ? `Pulse Status: ${monitor.name} está DOWN (${monitor.url})`
        : `Pulse Status: ${monitor.name} voltou UP (${monitor.url})`;
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
        const url = webhookUrlFrom(config);
        if (!url) return;
        // Anti-SSRF: valida esquema, DNS e redirects antes do POST.
        const parsed = assertHttpUrl(url);
        await assertPublicHostname(parsed.hostname);
        await safeFetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ text, monitorId: monitor.id, monitorName: monitor.name }),
          timeoutMs: 8000,
        });
      } else if (channel.type === 'EMAIL') {
        if (!isMailConfigured()) return;
        const to = String(config.to ?? config.email ?? '');
        if (!to) return;
        await sendAlertEmail(to, `Pulse Status: ${monitor.name}`, text);
      }
    } catch {
      // Alertas nunca quebram a checagem.
    }
  }
}
