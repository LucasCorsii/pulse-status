import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { getJwtSecrets } from './jwt-config';
import { RefreshTokenDenylist } from './refresh-store';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

const revokedRefreshTokens = new RefreshTokenDenylist();

export function __testOnlyResetRevoked(): void {
  // placeholder para testes futuros; o store é por-módulo.
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  isRefreshRevoked(token: string): boolean {
    return revokedRefreshTokens.isRevoked(token);
  }

  revokeRefresh(token: string): void {
    revokedRefreshTokens.revoke(token);
  }

  private signPair(userId: string, email: string) {
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

  async register(email: string, password: string, name?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await hashPassword(password);
    const user = await this.prisma.user.create({ data: { email, passwordHash, name } });
    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...this.signPair(user.id, user.email),
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...this.signPair(user.id, user.email),
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken || revokedRefreshTokens.isRevoked(refreshToken)) {
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
      revokedRefreshTokens.revoke(refreshToken);
      return {
        user: { id: user.id, email: user.email, name: user.name },
        ...this.signPair(user.id, user.email),
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken?: string) {
    if (refreshToken) revokedRefreshTokens.revoke(refreshToken);
    return { ok: true };
  }
}
