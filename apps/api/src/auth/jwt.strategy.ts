import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { getJwtSecrets } from './jwt-config';

function cookieExtractor(req: Request): string | null {
  const fromCookie = (req as Request & { cookies?: Record<string, string> }).cookies?.ps_access;
  return typeof fromCookie === 'string' && fromCookie ? fromCookie : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecrets().accessSecret,
    });
  }

  validate(payload: { sub: string; email: string }) {
    return { id: payload.sub, email: payload.email };
  }
}
