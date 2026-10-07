import { isMailConfigured } from './mail';

describe('mail config', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
  });

  it('reports unconfigured SMTP by default', () => {
    delete process.env.SMTP_URL;
    delete process.env.SMTP_HOST;
    expect(isMailConfigured()).toBe(false);
  });

  it('detects SMTP_URL', () => {
    process.env.SMTP_URL = 'smtp://user:pass@localhost:1025';
    expect(isMailConfigured()).toBe(true);
  });
});
