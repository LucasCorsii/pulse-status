// PLAN.md: abrir incidente após 2 falhas consecutivas; resolver após 1 sucesso.
export const FAILURES_TO_OPEN = 2;

export function shouldOpenIncident(consecutiveFailures: number, hasOpenIncident: boolean): boolean {
  return !hasOpenIncident && consecutiveFailures >= FAILURES_TO_OPEN;
}

export function shouldResolveIncident(
  result: 'SUCCESS' | 'FAILURE',
  hasOpenIncident: boolean,
): boolean {
  return hasOpenIncident && result === 'SUCCESS';
}

export function countConsecutiveFailures(recentResults: Array<'SUCCESS' | 'FAILURE'>): number {
  let count = 0;
  for (let i = recentResults.length - 1; i >= 0; i -= 1) {
    if (recentResults[i] === 'FAILURE') count += 1;
    else break;
  }
  return count;
}
