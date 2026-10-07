import { httpCheck } from './http-check';

describe('httpCheck', () => {
  it('blocks SSRF targets without network access', async () => {
    const blocked = await httpCheck('http://127.0.0.1:9/nope', 2000);
    expect(blocked.ok).toBe(false);
    expect(blocked.errorMessage).toMatch(/Blocked/);
  }, 10000);

  it('blocks metadata address', async () => {
    const blocked = await httpCheck('http://169.254.169.254/latest/meta-data/', 2000);
    expect(blocked.ok).toBe(false);
    expect(blocked.errorMessage).toMatch(/Blocked/);
  }, 10000);
});
