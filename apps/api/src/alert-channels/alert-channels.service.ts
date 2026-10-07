import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
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

  async create(userId: string, dto: CreateChannelDto) {
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
