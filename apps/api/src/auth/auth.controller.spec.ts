import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './cookies';

const USER = { id: 'u1', email: 'a@b.test', name: null };
const RESULT = { user: USER, accessToken: 'access-token', refreshToken: 'refresh-token' };

function fakeResponse() {
  const cookies: Record<string, { value: string; options: Record<string, unknown> }> = {};
  const cleared: string[] = [];
  const res = {
    cookie(name: string, value: string, options: Record<string, unknown>) {
      cookies[name] = { value, options };
      return res;
    },
    clearCookie(name: string) {
      cleared.push(name);
      return res;
    },
  };
  return { res: res as unknown as Response, cookies, cleared };
}

function requestWith(headers: Record<string, string>, cookies?: Record<string, string>): Request {
  return { headers, cookies } as unknown as Request;
}

function buildService(): AuthService {
  return {
    register: jest.fn().mockResolvedValue(RESULT),
    login: jest.fn().mockResolvedValue(RESULT),
    refresh: jest.fn().mockResolvedValue(RESULT),
    logout: jest.fn().mockResolvedValue({ ok: true }),
  } as unknown as AuthService;
}

describe('AuthController token delivery', () => {
  it('keeps tokens out of the JSON body for browsers and sets HttpOnly cookies', async () => {
    const controller = new AuthController(buildService());
    const { res, cookies } = fakeResponse();
    const body = await controller.register(
      { email: USER.email, password: 'password123' },
      requestWith({}),
      res,
    );
    expect(body).toEqual({ user: USER });
    expect(cookies[ACCESS_COOKIE].options.httpOnly).toBe(true);
    expect(cookies[REFRESH_COOKIE].options.httpOnly).toBe(true);
    expect(cookies[REFRESH_COOKIE].value).toBe('refresh-token');
  });

  it('returns tokens in the body only for opted-in API clients', async () => {
    const controller = new AuthController(buildService());
    const { res } = fakeResponse();
    const body = await controller.login(
      { email: USER.email, password: 'password123' },
      requestWith({ 'x-pulse-client': 'api' }),
      res,
    );
    expect(body).toEqual(RESULT);
  });

  it('refreshes from the HttpOnly cookie when no body token is provided', async () => {
    const service = buildService();
    const controller = new AuthController(service);
    const { res } = fakeResponse();
    await controller.refresh({}, requestWith({}, { [REFRESH_COOKIE]: 'cookie-token' }), res);
    expect(service.refresh).toHaveBeenCalledWith('cookie-token');
  });

  it('revokes the refresh token and clears cookies on logout', async () => {
    const service = buildService();
    const controller = new AuthController(service);
    const { res, cleared } = fakeResponse();
    await controller.logout({}, requestWith({}, { [REFRESH_COOKIE]: 'cookie-token' }), res);
    expect(service.logout).toHaveBeenCalledWith('cookie-token');
    expect(cleared).toEqual([ACCESS_COOKIE, REFRESH_COOKIE]);
  });
});
