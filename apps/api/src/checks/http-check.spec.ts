import { httpCheck } from './http-check';

describe('httpCheck', () => {
  it('returns ok:false with error for unreachable host with short timeout', async () => {
    const result = await httpCheck('http://127.0.0.1:9/nope', 500);
    expect(result.ok).toBe(false);
    expect(typeof result.latencyMs).toBe('number');
  }, 10000);
});
