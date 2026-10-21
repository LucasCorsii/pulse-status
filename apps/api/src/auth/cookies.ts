import type { CookieOptions, Response } from 'express';

export const ACCESS_COOKIE = 'ps_access';
export const REFRESH_COOKIE = 'ps_refresh';
export const ACCESS_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type SameSiteOption = 'lax' | 'strict' | 'none';

export interface CookieConfig {
  secure: boolean;
  sameSite: SameSiteOption;
  domain?: string;
}

function isProduction(): boolean {
  return (process.env.NODE_ENV ?? 'development').toLowerCase() === 'production';
}

// Default: `lax` em desenvolvimento (web/api mesmo site) e `none` em produção
// (Vercel + Render são cross-site). `secure` é sempre forçado para `none`,
// pois os navegadores rejeitam `SameSite=None` sem `Secure`.
export function cookieConfig(): CookieConfig {
  const requested = (process.env.COOKIE_SAMESITE ?? '').toLowerCase();
  const sameSite: SameSiteOption =
    requested === 'lax' || requested === 'strict' || requested === 'none'
      ? requested
      : isProduction()
        ? 'none'
        : 'lax';
  const envSecure = process.env.COOKIE_SECURE;
  const secure = sameSite === 'none' ? true : envSecure ? envSecure === '1' : isProduction();
  return {
    secure,
    sameSite,
    domain: process.env.COOKIE_DOMAIN || undefined,
  };
}

function baseOptions(): CookieOptions {
  const { secure, sameSite, domain } = cookieConfig();
  return { httpOnly: true, secure, sameSite, domain, path: '/' };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, { ...baseOptions(), maxAge: ACCESS_MAX_AGE_MS });
  res.cookie(REFRESH_COOKIE, refreshToken, { ...baseOptions(), maxAge: REFRESH_MAX_AGE_MS });
}

export function clearAuthCookies(res: Response): void {
  const { secure, sameSite, domain } = cookieConfig();
  const options: CookieOptions = { httpOnly: true, secure, sameSite, domain, path: '/' };
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
}
