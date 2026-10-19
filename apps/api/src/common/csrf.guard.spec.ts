import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { CsrfOriginGuard } from './csrf.guard';

function contextFor(method: string, headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: <T>(): T => ({ method, headers }) as unknown as T,
    }),
  } as unknown as ExecutionContext;
}

describe('CsrfOriginGuard', () => {
  const prev = { ...process.env };
  const guard = new CsrfOriginGuard();

  beforeEach(() => {
    process.env.WEB_ORIGIN = 'http://localhost:3000';
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it('allows safe methods regardless of origin', () => {
    expect(guard.canActivate(contextFor('GET', { origin: 'https://evil.example' }))).toBe(true);
  });

  it('allows mutating requests from an allowed origin', () => {
    expect(guard.canActivate(contextFor('POST', { origin: 'http://localhost:3000' }))).toBe(true);
  });

  it('allows non-browser clients without an Origin header', () => {
    expect(guard.canActivate(contextFor('POST', {}))).toBe(true);
  });

  it('falls back to Referer when Origin is absent', () => {
    expect(
      guard.canActivate(contextFor('DELETE', { referer: 'http://localhost:3000/dashboard' })),
    ).toBe(true);
  });

  it('rejects a mutating request from a foreign origin', () => {
    expect(() => guard.canActivate(contextFor('POST', { origin: 'https://evil.example' }))).toThrow(
      ForbiddenException,
    );
  });

  it('rejects a foreign origin even when Authorization is present', () => {
    expect(() =>
      guard.canActivate(
        contextFor('POST', {
          origin: 'https://evil.example',
          authorization: 'Bearer something',
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
