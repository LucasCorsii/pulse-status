// Revogação de refresh tokens (MVP sem coluna nova no banco).
// Armazenamento em memória com expiração; rotação a cada refresh limita a
// janela de reuso. Em deploy com múltiplas réplicas, prefira Redis/DB.
export class RefreshTokenDenylist {
  private readonly revoked = new Map<string, number>();

  revoke(token: string, ttlMs = 7 * 24 * 60 * 60 * 1000): void {
    this.revoked.set(token, Date.now() + ttlMs);
    this.gc();
  }

  isRevoked(token: string): boolean {
    const expires = this.revoked.get(token);
    if (!expires) return false;
    if (expires <= Date.now()) {
      this.revoked.delete(token);
      return false;
    }
    return true;
  }

  private gc(): void {
    if (this.revoked.size < 1000) return;
    const now = Date.now();
    for (const [token, expires] of this.revoked) {
      if (expires <= now) this.revoked.delete(token);
    }
  }
}
