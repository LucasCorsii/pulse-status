import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class CreateMonitorDto {
  @IsString()
  name!: string;

  @IsUrl({ require_tld: false })
  url!: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(3600)
  intervalSec?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  timeoutMs?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class UpdateMonitorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  url?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(3600)
  intervalSec?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(60000)
  timeoutMs?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
