import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { AlertChannelType } from '@prisma/client';

export class CreateChannelDto {
  @IsString()
  name!: string;

  @IsEnum(AlertChannelType)
  type!: AlertChannelType;

  @IsObject()
  configuration!: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  configuration?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}

// Nunca expor configuration (URLs/tokens) nas respostas — PLAN.md.
export function toSafeChannel(channel: { configuration?: unknown } & Record<string, unknown>) {
  const { configuration, ...rest } = channel;
  void configuration;
  return { ...rest, hasConfiguration: true };
}
