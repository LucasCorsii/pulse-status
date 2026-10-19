import { cookieConfig } from './cookies';

describe('cookieConfig', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it('defaults to lax + insecure in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.COOKIE_SAMESITE;
    delete process.env.COOKIE_SECURE;
    delete process.env.COOKIE_DOMAIN;
    expect(cookieConfig()).toEqual({ sameSite: 'lax', secure: false, domain: undefined });
  });

  it('defaults to cross-site none + secure in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.COOKIE_SAMESITE;
    delete process.env.COOKIE_SECURE;
    expect(cookieConfig()).toEqual({ sameSite: 'none', secure: true, domain: undefined });
  });

  it('always forces secure when SameSite=None', () => {
    process.env.NODE_ENV = 'development';
    process.env.COOKIE_SAMESITE = 'none';
    process.env.COOKIE_SECURE = '0';
    expect(cookieConfig().secure).toBe(true);
  });

  it('honours an explicit same-site domain configuration', () => {
    process.env.NODE_ENV = 'production';
    process.env.COOKIE_SAMESITE = 'lax';
    process.env.COOKIE_DOMAIN = '.pulse.example.com';
    expect(cookieConfig()).toEqual({
      sameSite: 'lax',
      secure: true,
      domain: '.pulse.example.com',
    });
  });
});
