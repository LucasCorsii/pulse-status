import dns from 'node:dns/promises';
import net from 'node:net';

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] * 256 + parts[1]) * 256 + parts[2]) * 256 + parts[3];
}

function inCidr(ip: string, cidr: string): boolean {
  const [base, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask);
}

const BLOCKED_V4_CIDRS = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.2.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
];

export function isBlockedIp(ip: string): boolean {
  const normalized = ip.replace(/^\[(.*)\]$/, '$1');
  if (net.isIPv4(normalized)) {
    return BLOCKED_V4_CIDRS.some((cidr) => inCidr(normalized, cidr));
  }
  if (net.isIPv6(normalized)) {
    const lower = normalized.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower === '::ffff:127.0.0.1') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local
    if (lower.startsWith('fe80:') || lower.startsWith('fe80::')) return true; // link-local
    if (lower.startsWith('::ffff:10.') || lower.startsWith('::ffff:192.168.')) return true;
    if (lower.startsWith('::ffff:172.')) return true;
    if (lower.startsWith('::ffff:169.254.')) return true;
    return false;
  }
  return true; // tipo desconhecido: bloqueia por padrão
}

export async function assertPublicHostname(hostname: string): Promise<void> {
  const name = hostname.toLowerCase();
  if (name === 'localhost' || name.endsWith('.localhost')) {
    throw new Error('Blocked destination (localhost)');
  }
  if (name === 'metadata.google.internal' || name === 'instance-data') {
    throw new Error('Blocked destination (cloud metadata)');
  }
  if (net.isIP(name)) {
    if (isBlockedIp(name)) throw new Error('Blocked destination (private IP)');
    return;
  }
  let addresses: Array<{ address: string }>;
  try {
    addresses = await dns.lookup(name, { all: true });
  } catch {
    throw new Error('Blocked destination (DNS resolution failed)');
  }
  if (addresses.length === 0) throw new Error('Blocked destination (no DNS records)');
  for (const a of addresses) {
    if (isBlockedIp(a.address)) {
      throw new Error('Blocked destination (resolves to private IP)');
    }
  }
}

export function assertHttpUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Blocked destination (invalid URL)');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Blocked destination (only http/https allowed)');
  }
  if (!parsed.hostname) throw new Error('Blocked destination (invalid URL)');
  return parsed;
}

export interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxRedirects?: number;
}

// fetch com política anti-SSRF: valida DNS antes de cada request e segue
// redirects manualmente (máx. 5), validando cada destino.
export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxRedirects = options.maxRedirects ?? 5;
  let current = rawUrl;
  let redirects = 0;
  for (;;) {
    const parsed = assertHttpUrl(current);
    await assertPublicHostname(parsed.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(current, {
        method: options.method ?? 'GET',
        headers: options.headers,
        body: options.body,
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      await res.body?.cancel().catch(() => undefined);
      if (!location) return res;
      if (redirects >= maxRedirects) throw new Error('Blocked destination (too many redirects)');
      redirects += 1;
      current = new URL(location, current).toString();
      continue;
    }
    return res;
  }
}
