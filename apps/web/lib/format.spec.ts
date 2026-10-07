import { formatLatency, formatUptime } from './format';

describe('format utils', () => {
  it('formats uptime and latency', () => {
    expect(formatUptime(99.955)).toBe('100.0%');
    expect(formatLatency(250)).toBe('250ms');
    expect(formatLatency(1500)).toBe('1.50s');
    expect(formatLatency(null)).toBe('—');
  });
});
