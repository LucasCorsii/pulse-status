import { getJwtSecrets } from './jwt-config';

describe('jwt-config', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it('fails fast in production without secrets', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    expect(() => getJwtSecrets()).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('rejects weak or equal secrets in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_ACCESS_SECRET = 'short';
    process.env.JWT_REFRESH_SECRET = 'short';
    expect(() => getJwtSecrets()).toThrow();
  });

  it('accepts local fallback in development/test', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    expect(() => getJwtSecrets()).not.toThrow();
  });
});
