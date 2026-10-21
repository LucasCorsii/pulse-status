import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { EventsModule } from '../events/events.module';
import { ChecksService } from './checks.service';

@Module({
  imports: [EventsModule, AlertsModule],
  providers: [ChecksService],
  exports: [ChecksService],
})
export class ChecksModule {}
