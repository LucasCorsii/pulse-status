import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private signPair(userId: string, email: string) {
    const accessToken = this.jwt.sign(
      { sub: userId, email },
      {
        secret:
          process.env.JWT_ACCESS_SECRET ?? 'local-development-secret-do-not-use-in-production',
        expiresIn: '15m',
      },
    );
    const refreshToken = this.jwt.sign(
      { sub: userId, email, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET ?? 'local-development-refresh-secret-do-not-use',
        expiresIn: '7d',
      },
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
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string; type?: string }>(
        refreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET ?? 'local-development-refresh-secret-do-not-use',
        },
      );
      if (payload.type !== 'refresh') throw new UnauthorizedException('Invalid refresh token');
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException('Invalid refresh token');
      return {
        user: { id: user.id, email: user.email, name: user.name },
        ...this.signPair(user.id, user.email),
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
