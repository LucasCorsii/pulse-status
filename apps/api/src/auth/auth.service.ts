import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import IORedis from 'ioredis';
import { PrismaService } from '../prisma.service';
import { getJwtSecrets } from './jwt-config';
import {
  HybridRefreshStore,
  MemoryRefreshStore,
  RedisRefreshStore,
  RefreshStore,
} from './refresh-store';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResult extends AuthTokens {
  user: AuthUser;
}

@Injectable()
export class AuthService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private store: RefreshStore = new MemoryRefreshStore();
  private redis: IORedis | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  onModuleInit(): void {
    if (process.env.SKIP_REDIS === '1') return;
    const url = process.env.REDIS_URL;
    if (!url) return;
    try {
      this.redis = new IORedis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
      this.redis.on('error', (err) => this.logger.warn(`refresh-store redis: ${err.message}`));
      this.store = new HybridRefreshStore(
        new MemoryRefreshStore(),
        new RedisRefreshStore(this.redis),
      );
    } catch (err) {
      this.logger.warn(`refresh-store redis disabled: ${(err as Error).message}`);
      this.redis = null;
      this.store = new MemoryRefreshStore();
    }
  }

  onModuleDestroy(): void {
    this.redis?.disconnect();
  }

  async isRefreshRevoked(token: string): Promise<boolean> {
    return this.store.isRevoked(token);
  }

  async revokeRefresh(token: string): Promise<void> {
    await this.store.revoke(token);
  }

  private signPair(userId: string, email: string): AuthTokens {
    const { accessSecret, refreshSecret } = getJwtSecrets();
    const accessToken = this.jwt.sign(
      { sub: userId, email },
      { secret: accessSecret, expiresIn: '15m' },
    );
    const refreshToken = this.jwt.sign(
      { sub: userId, email, type: 'refresh' },
      { secret: refreshSecret, expiresIn: '7d' },
    );
    return { accessToken, refreshToken };
  }

  async register(email: string, password: string, name?: string): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await hashPassword(password);
    const user = await this.prisma.user.create({ data: { email, passwordHash, name } });
    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...this.signPair(user.id, user.email),
    };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...this.signPair(user.id, user.email),
    };
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    if (!refreshToken || (await this.store.isRevoked(refreshToken))) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    try {
      const { refreshSecret } = getJwtSecrets();
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string; type?: string }>(
        refreshToken,
        { secret: refreshSecret },
      );
      if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid refresh token');
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('Invalid refresh token');
      // Rotação: o refresh antigo morre ao emitir um par novo.
      await this.store.revoke(refreshToken);
      return {
        user: { id: user.id, email: user.email, name: user.name },
        ...this.signPair(user.id, user.email),
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken?: string): Promise<{ ok: boolean }> {
    if (refreshToken) await this.store.revoke(refreshToken);
    return { ok: true };
  }
}
