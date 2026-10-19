import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

function stripBrackets(ip: string): string {
  return ip.replace(/^\[(.*)\]$/, '$1');
}

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
  '192.0.0.0/24',
  '192.0.2.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
];

function isBlockedIpv4(ip: string): boolean {
  return BLOCKED_V4_CIDRS.some((cidr) => inCidr(ip, cidr));
}

// Converte um literal IPv6 (incluindo forma com IPv4 embutido e zona) em 16 bytes.
function ipv6ToBytes(input: string): Uint8Array | null {
  let ip = stripBrackets(input).toLowerCase();
  const zone = ip.indexOf('%');
  if (zone !== -1) ip = ip.slice(0, zone);
  if (ip.includes('.')) {
    const lastColon = ip.lastIndexOf(':');
    if (lastColon === -1) return null;
    const v4 = ip.slice(lastColon + 1);
    if (!net.isIPv4(v4)) return null;
    const p = v4.split('.').map(Number);
    const g1 = (((p[0] & 0xff) << 8) | (p[1] & 0xff)).toString(16);
    const g2 = (((p[2] & 0xff) << 8) | (p[3] & 0xff)).toString(16);
    ip = `${ip.slice(0, lastColon + 1)}${g1}:${g2}`;
  }
  const halves = ip.split('::');
  if (halves.length > 2) return null;
  const parseGroups = (part: string): number[] =>
    part === ''
      ? []
      : part.split(':').map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  let groups: number[];
  if (halves.length === 2) {
    const left = parseGroups(halves[0]);
    const right = parseGroups(halves[1]);
    const missing = 8 - left.length - right.length;
    if (missing < 1) return null;
    groups = [...left, ...new Array<number>(missing).fill(0), ...right];
  } else {
    groups = parseGroups(halves[0]);
  }
  if (groups.length !== 8 || groups.some((g) => !Number.isInteger(g) || g < 0 || g > 0xffff)) {
    return null;
  }
  const bytes = new Uint8Array(16);
  groups.forEach((g, i) => {
    bytes[i * 2] = (g >> 8) & 0xff;
    bytes[i * 2 + 1] = g & 0xff;
  });
  return bytes;
}

function embeddedIpv4(bytes: Uint8Array, offset: number): string {
  return `${bytes[offset]}.${bytes[offset + 1]}.${bytes[offset + 2]}.${bytes[offset + 3]}`;
}

function isBlockedIpv6Bytes(bytes: Uint8Array): boolean {
  const isZeroRange = (start: number, end: number) => {
    for (let i = start; i < end; i += 1) if (bytes[i] !== 0) return false;
    return true;
  };
  // :: (unspecified)
  if (isZeroRange(0, 16)) return true;
  // ::1 (loopback)
  if (isZeroRange(0, 15) && bytes[15] === 1) return true;
  // ::ffff:0:0/96 — IPv4-mapped; avalia o IPv4 embutido.
  if (isZeroRange(0, 10) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return isBlockedIpv4(embeddedIpv4(bytes, 12));
  }
  // 64:ff9b::/96 — NAT64; avalia o IPv4 embutido.
  if (
    bytes[0] === 0x00 &&
    bytes[1] === 0x64 &&
    bytes[2] === 0xff &&
    bytes[3] === 0x9b &&
    isZeroRange(4, 12)
  ) {
    return isBlockedIpv4(embeddedIpv4(bytes, 12));
  }
  // 2002::/16 — 6to4; avalia o IPv4 embutido.
  if (bytes[0] === 0x20 && bytes[1] === 0x02) {
    return isBlockedIpv4(embeddedIpv4(bytes, 2));
  }
  // 2001::/32 — Teredo; sempre bloqueia (encapsula IPv4 arbitrário).
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x00 && bytes[3] === 0x00) return true;
  // fc00::/7 — unique local.
  if ((bytes[0] & 0xfe) === 0xfc) return true;
  // fe80::/10 — link-local e fec0::/10 — site-local.
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true;
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0xc0) return true;
  // ff00::/8 — multicast.
  if (bytes[0] === 0xff) return true;
  // 2001:db8::/32 — documentation.
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) return true;
  return false;
}

export function isBlockedIp(ip: string): boolean {
  const normalized = stripBrackets(ip);
  if (net.isIPv4(normalized)) return isBlockedIpv4(normalized);
  if (net.isIPv6(normalized)) {
    const bytes = ipv6ToBytes(normalized);
    if (!bytes) return true;
    return isBlockedIpv6Bytes(bytes);
  }
  return true; // tipo desconhecido: bloqueia por padrão
}

export interface ResolvedDestination {
  address: string;
  family: number;
}

function assertHostnameAllowed(name: string): void {
  if (name === 'localhost' || name.endsWith('.localhost')) {
    throw new Error('Blocked destination (localhost)');
  }
  if (name === 'metadata.google.internal' || name === 'instance-data') {
    throw new Error('Blocked destination (cloud metadata)');
  }
}

// Resolve o hostname e retorna um destino concreto já validado. O endereço
// retornado deve ser fixado (pin) na conexão para evitar DNS rebinding.
export async function resolvePinnedAddress(hostname: string): Promise<ResolvedDestination> {
  const name = stripBrackets(hostname).toLowerCase();
  assertHostnameAllowed(name);
  if (net.isIP(name)) {
    if (isBlockedIp(name)) throw new Error('Blocked destination (private IP)');
    return { address: name, family: net.isIPv6(name) ? 6 : 4 };
  }
  let addresses: Array<{ address: string; family: number }>;
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
  const chosen = addresses[0];
  return { address: chosen.address, family: chosen.family };
}

export async function assertPublicHostname(hostname: string): Promise<void> {
  await resolvePinnedAddress(hostname);
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

export interface SafeFetchResult {
  status: number;
  headers: http.IncomingHttpHeaders;
  location: string | null;
  text: string;
}

const MAX_BODY_BYTES = 64 * 1024;

function requestOnce(
  parsed: URL,
  destination: ResolvedDestination,
  method: string,
  headers: Record<string, string> | undefined,
  body: string | undefined,
  timeoutMs: number,
): Promise<SafeFetchResult> {
  return new Promise((resolve, reject) => {
    const isHttps = parsed.protocol === 'https:';
    const hostname = stripBrackets(parsed.hostname);
    const port = parsed.port ? Number(parsed.port) : isHttps ? 443 : 80;
    const finalHeaders: Record<string, string> = { ...(headers ?? {}) };
    if (!Object.keys(finalHeaders).some((h) => h.toLowerCase() === 'host')) {
      finalHeaders.host = parsed.host;
    }
    if (
      body !== undefined &&
      !Object.keys(finalHeaders).some((h) => h.toLowerCase() === 'content-length')
    ) {
      finalHeaders['content-length'] = String(Buffer.byteLength(body));
    }

    const request = (isHttps ? https : http).request(
      {
        protocol: parsed.protocol,
        hostname,
        port,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: finalHeaders,
        timeout: timeoutMs,
        // Fixa o IP já validado: impede que o hostname seja re-resolvido
        // (rebinding) entre a validação e a conexão real.
        lookup: (
          _host: string,
          _opts: unknown,
          callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
        ) => {
          callback(null, destination.address, destination.family);
        },
        servername: isHttps && !net.isIP(hostname) ? hostname : undefined,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          if (size < MAX_BODY_BYTES) {
            chunks.push(chunk);
            size += chunk.length;
          }
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            location: (res.headers.location as string | undefined) ?? null,
            text: Buffer.concat(chunks).toString('utf8').slice(0, MAX_BODY_BYTES),
          });
        });
        res.on('error', reject);
      },
    );
    request.on('timeout', () => request.destroy(new Error('Blocked destination (timeout)')));
    request.on('error', reject);
    if (body !== undefined) request.write(body);
    request.end();
  });
}

// Fetch com política anti-SSRF: valida DNS antes de cada request, fixa o IP
// validado na conexão e segue redirects manualmente (máx. 5), validando cada destino.
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxRedirects = options.maxRedirects ?? 5;
  let current = rawUrl;
  let method = options.method ?? 'GET';
  let body = options.body;
  for (let redirects = 0; ; redirects += 1) {
    const parsed = assertHttpUrl(current);
    const destination = await resolvePinnedAddress(parsed.hostname);
    const result = await requestOnce(parsed, destination, method, options.headers, body, timeoutMs);
    if (result.status >= 300 && result.status < 400) {
      if (!result.location) return result;
      if (redirects >= maxRedirects) throw new Error('Blocked destination (too many redirects)');
      // Segue a semântica padrão: 303 e (301/302 após POST) viram GET sem corpo.
      if (
        result.status === 303 ||
        ((result.status === 301 || result.status === 302) && method !== 'GET')
      ) {
        method = 'GET';
        body = undefined;
      }
      current = new URL(result.location, current).toString();
      continue;
    }
    return result;
  }
}
