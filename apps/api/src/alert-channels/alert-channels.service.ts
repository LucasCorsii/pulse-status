import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { isMailConfigured } from '../alerts/mail';
import { assertHttpUrl } from '../common/ssrf';
import { CreateChannelDto, UpdateChannelDto, toSafeChannel } from './dto';

@Injectable()
export class AlertChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const channels = await this.prisma.alertChannel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return channels.map(toSafeChannel);
  }

  private assertConfigurationOk(type: string, configuration: unknown): void {
    const config = (configuration ?? {}) as Record<string, unknown>;
    if (type === 'EMAIL') {
      if (!isMailConfigured()) {
        throw new BadRequestException('Email channel unavailable: SMTP not configured');
      }
      const to = String(config.to ?? config.email ?? '');
      if (!to || !to.includes('@'))
        throw new BadRequestException('EMAIL channel requires "to" email');
    }
    if (type === 'WEBHOOK' || type === 'SLACK') {
      const url = String(config.url ?? config.webhookUrl ?? '');
      if (!url) throw new BadRequestException('Webhook channel requires "url"');
      assertHttpUrl(url); // esquema http/https; DNS/redirect validado no disparo
    }
  }

  async create(userId: string, dto: CreateChannelDto) {
    this.assertConfigurationOk(dto.type, dto.configuration);
    const created = await this.prisma.alertChannel.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        configuration: dto.configuration as object,
        isEnabled: dto.isEnabled ?? true,
      },
    });
    return toSafeChannel(created);
  }

  async update(userId: string, id: string, dto: UpdateChannelDto) {
    const existing = await this.prisma.alertChannel.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Channel not found');
    if (dto.configuration) {
      this.assertConfigurationOk(existing.type, dto.configuration);
    }
    const updated = await this.prisma.alertChannel.update({ where: { id }, data: dto as never });
    return toSafeChannel(updated);
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.alertChannel.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Channel not found');
    await this.prisma.alertChannel.delete({ where: { id } });
    return { ok: true };
  }
}
