import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function allowedOrigins(): string[] {
  return (process.env.WEB_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

// Proteção CSRF para autenticação por cookie. Requisições que alteram estado e
// trazem `Origin` (sempre enviado por navegadores em cross-site) precisam
// pertencer à allowlist de WEB_ORIGIN. Clientes sem cookie/browser (sem
// `Origin`) seguem normalmente.
@Injectable()
export class CsrfOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const method = (request.method ?? 'GET').toUpperCase();
    if (SAFE_METHODS.has(method)) return true;

    const origin = originOf(request.headers.origin) ?? originOf(request.headers.referer);
    if (!origin) return true;
    if (allowedOrigins().includes(origin)) return true;
    throw new ForbiddenException('Origin not allowed');
  }
}
