const KNOWN_INSECURE = new Set([
  'local-development-secret-do-not-use-in-production',
  'local-development-refresh-secret-do-not-use',
  'changeme',
  'secret',
  'test-secret',
]);

export interface JwtSecrets {
  accessSecret: string;
  refreshSecret: string;
}

function isLocalEnv(): boolean {
  const env = (process.env.NODE_ENV ?? 'development').toLowerCase();
  return env === 'development' || env === 'test' || process.env.ALLOW_INSECURE_LOCAL === '1';
}

function devFallback(name: 'access' | 'refresh'): string {
  // Fallback apenas para desenvolvimento/teste local. Produção falha abaixo.
  return name === 'access'
    ? (process.env.JWT_ACCESS_SECRET ?? 'local-development-secret-do-not-use-in-production')
    : (process.env.JWT_REFRESH_SECRET ?? 'local-development-refresh-secret-do-not-use');
}

// Falha rápido em produção quando segredos estão ausentes ou fracos.
// Em desenvolvimento/teste, aceita fallback local explícito.
export function getJwtSecrets(): JwtSecrets {
  const accessSecret = process.env.JWT_ACCESS_SECRET ?? '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET ?? '';
  if (isLocalEnv()) {
    return {
      accessSecret: accessSecret || devFallback('access'),
      refreshSecret: refreshSecret || devFallback('refresh'),
    };
  }
  for (const [label, value] of [
    ['JWT_ACCESS_SECRET', accessSecret],
    ['JWT_REFRESH_SECRET', refreshSecret],
  ] as const) {
    if (!value || value.length < 32 || KNOWN_INSECURE.has(value)) {
      throw new Error(
        `${label} ausente ou fraco: configure um segredo aleatório de ao menos 32 caracteres`,
      );
    }
  }
  if (accessSecret === refreshSecret) {
    throw new Error('JWT_ACCESS_SECRET e JWT_REFRESH_SECRET devem ser diferentes');
  }
  return { accessSecret, refreshSecret };
}
