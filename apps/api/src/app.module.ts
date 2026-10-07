import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MonitorsModule } from './monitors/monitors.module';
import { AlertChannelsModule } from './alert-channels/alert-channels.module';
import { StatusModule } from './status/status.module';
import { HealthModule } from './health/health.module';
import { ChecksModule } from './checks/checks.module';
import { EventsModule } from './events/events.module';
import { AlertsModule } from './alerts/alerts.module';
import { PrismaModule } from './prisma.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    MonitorsModule,
    AlertChannelsModule,
    StatusModule,
    HealthModule,
    ChecksModule,
    EventsModule,
    AlertsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
