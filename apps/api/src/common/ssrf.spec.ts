import { assertHttpUrl, assertPublicHostname, isBlockedIp } from './ssrf';

describe('ssrf policy', () => {
  it('blocks loopback and private IPv4 literals', () => {
    expect(isBlockedIp('127.0.0.1')).toBe(true);
    expect(isBlockedIp('10.1.2.3')).toBe(true);
    expect(isBlockedIp('192.168.1.1')).toBe(true);
    expect(isBlockedIp('172.16.5.4')).toBe(true);
    expect(isBlockedIp('169.254.169.254')).toBe(true);
    expect(isBlockedIp('8.8.8.8')).toBe(false);
  });

  it('blocks IPv6 private/link-local/loopback', () => {
    expect(isBlockedIp('::1')).toBe(true);
    expect(isBlockedIp('fe80::1')).toBe(true);
    expect(isBlockedIp('fc00::1')).toBe(true);
  });

  it('rejects non-http schemes', () => {
    expect(() => assertHttpUrl('ftp://example.com')).toThrow();
    expect(() => assertHttpUrl('file:///etc/passwd')).toThrow();
  });

  it('blocks localhost and metadata hostnames without network', async () => {
    await expect(assertPublicHostname('localhost')).rejects.toThrow();
    await expect(assertPublicHostname('metadata.google.internal')).rejects.toThrow();
    await expect(assertPublicHostname('127.0.0.1')).rejects.toThrow();
    await expect(assertPublicHostname('169.254.169.254')).rejects.toThrow();
  });
});
