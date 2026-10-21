import { assertHttpUrl, assertPublicHostname, isBlockedIp, pinnedLookup } from './ssrf';

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
    expect(isBlockedIp('::')).toBe(true);
    expect(isBlockedIp('fe80::1')).toBe(true);
    expect(isBlockedIp('fc00::1')).toBe(true);
    expect(isBlockedIp('fd12:3456::1')).toBe(true);
    expect(isBlockedIp('ff02::1')).toBe(true);
    expect(isBlockedIp('[::1]')).toBe(true);
    expect(isBlockedIp('2606:4700:4700::1111')).toBe(false);
  });

  it('blocks every IPv4-mapped IPv6 form, including hex notation', () => {
    expect(isBlockedIp('::ffff:127.0.0.1')).toBe(true);
    expect(isBlockedIp('::ffff:7f00:1')).toBe(true);
    expect(isBlockedIp('::ffff:10.0.0.5')).toBe(true);
    expect(isBlockedIp('::ffff:a00:5')).toBe(true);
    expect(isBlockedIp('::ffff:192.168.0.1')).toBe(true);
    expect(isBlockedIp('::ffff:c0a8:1')).toBe(true);
    expect(isBlockedIp('::ffff:169.254.169.254')).toBe(true);
    expect(isBlockedIp('::ffff:a9fe:a9fe')).toBe(true);
    expect(isBlockedIp('::ffff:8.8.8.8')).toBe(false);
  });

  it('blocks NAT64 and 6to4 embeddings of private IPv4', () => {
    expect(isBlockedIp('64:ff9b::7f00:1')).toBe(true);
    expect(isBlockedIp('64:ff9b::8.8.8.8')).toBe(false);
    expect(isBlockedIp('2002:7f00:1::')).toBe(true);
    expect(isBlockedIp('2001::1')).toBe(true);
  });

  it('rejects non-http schemes', () => {
    expect(() => assertHttpUrl('ftp://example.com')).toThrow();
    expect(() => assertHttpUrl('file:///etc/passwd')).toThrow();
  });

  it('blocks localhost, metadata and private literals without network', async () => {
    await expect(assertPublicHostname('localhost')).rejects.toThrow();
    await expect(assertPublicHostname('metadata.google.internal')).rejects.toThrow();
    await expect(assertPublicHostname('127.0.0.1')).rejects.toThrow();
    await expect(assertPublicHostname('169.254.169.254')).rejects.toThrow();
    await expect(assertPublicHostname('::ffff:7f00:1')).rejects.toThrow();
    await expect(assertPublicHostname('[::ffff:127.0.0.1]')).rejects.toThrow();
  });

  it('pinned lookup supports both single-address and all-addresses modes', async () => {
    const destination = { address: '93.184.216.34', family: 4 as const };
    const lookup = pinnedLookup(destination);

    const all = await new Promise<unknown>((resolve, reject) => {
      lookup('example.com', { all: true }, (err, address) =>
        err ? reject(err) : resolve(address),
      );
    });
    expect(all).toEqual([{ address: '93.184.216.34', family: 4 }]);

    const single = await new Promise<unknown>((resolve, reject) => {
      lookup('example.com', {}, (err, address, family) =>
        err ? reject(err) : resolve({ address, family }),
      );
    });
    expect(single).toEqual({ address: '93.184.216.34', family: 4 });
  });
});
