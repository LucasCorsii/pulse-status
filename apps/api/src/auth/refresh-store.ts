import crypto from 'node:crypto';

// Revogação de refresh tokens (rotação + logout). Chaves são hashes do token
// para nunca persistir o segredo em claro. Há uma camada em memória (sempre) e,
// quando `REDIS_URL` está configurado, uma camada durável compartilhada entre
// réplicas com TTL — resolvendo a limitação process-local apontada na revisão.
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface RefreshStore {
  revoke(token: string, ttlMs?: number): Promise<void>;
  isRevoked(token: string): Promise<boolean>;
}

export class MemoryRefreshStore implements RefreshStore {
  private readonly revoked = new Map<string, number>();

  async revoke(token: string, ttlMs = DEFAULT_TTL_MS): Promise<void> {
    this.revoked.set(hashToken(token), Date.now() + ttlMs);
    this.gc();
  }

  async isRevoked(token: string): Promise<boolean> {
    const key = hashToken(token);
    const expires = this.revoked.get(key);
    if (!expires) return false;
    if (expires <= Date.now()) {
      this.revoked.delete(key);
      return false;
    }
    return true;
  }

  private gc(): void {
    if (this.revoked.size < 1000) return;
    const now = Date.now();
    for (const [key, expires] of this.revoked) {
      if (expires <= now) this.revoked.delete(key);
    }
  }
}

export interface RedisLike {
  set(key: string, value: string, mode: 'PX', ttl: number): Promise<unknown>;
  exists(key: string): Promise<number>;
}

export class RedisRefreshStore implements RefreshStore {
  constructor(
    private readonly redis: RedisLike,
    private readonly prefix = 'pulse:revoked-refresh:',
  ) {}

  async revoke(token: string, ttlMs = DEFAULT_TTL_MS): Promise<void> {
    await this.redis.set(`${this.prefix}${hashToken(token)}`, '1', 'PX', ttlMs);
  }

  async isRevoked(token: string): Promise<boolean> {
    return (await this.redis.exists(`${this.prefix}${hashToken(token)}`)) === 1;
  }
}

// Camada local sempre ativa (funciona sem Redis e sobrevive a falhas do Redis);
// a camada remota, quando presente, dá durabilidade e visão multi-réplica.
export class HybridRefreshStore implements RefreshStore {
  constructor(
    private readonly local: RefreshStore,
    private readonly remote?: RefreshStore,
  ) {}

  async revoke(token: string, ttlMs = DEFAULT_TTL_MS): Promise<void> {
    await this.local.revoke(token, ttlMs);
    try {
      await this.remote?.revoke(token, ttlMs);
    } catch {
      // Redis indisponível: mantém a revogação local e degrada com segurança.
    }
  }

  async isRevoked(token: string): Promise<boolean> {
    if (await this.local.isRevoked(token)) return true;
    try {
      return (await this.remote?.isRevoked(token)) ?? false;
    } catch {
      return false;
    }
  }
}
