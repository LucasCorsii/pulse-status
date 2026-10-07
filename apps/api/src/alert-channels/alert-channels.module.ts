import { Module } from '@nestjs/common';
import { AlertChannelsController } from './alert-channels.controller';
import { AlertChannelsService } from './alert-channels.service';

@Module({ controllers: [AlertChannelsController], providers: [AlertChannelsService] })
export class AlertChannelsModule {}
