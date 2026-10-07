import {
  countConsecutiveFailures,
  shouldOpenIncident,
  shouldResolveIncident,
} from './incident.policy';

describe('incident policy (PLAN.md: 2 falhas abrem, 1 sucesso resolve)', () => {
  it('opens after two consecutive failures', () => {
    expect(shouldOpenIncident(1, false)).toBe(false);
    expect(shouldOpenIncident(2, false)).toBe(true);
  });

  it('does not reopen when one is already open', () => {
    expect(shouldOpenIncident(5, true)).toBe(false);
  });

  it('resolves on first success', () => {
    expect(shouldResolveIncident('SUCCESS', true)).toBe(true);
    expect(shouldResolveIncident('FAILURE', true)).toBe(false);
    expect(shouldResolveIncident('SUCCESS', false)).toBe(false);
  });

  it('counts trailing failures', () => {
    expect(countConsecutiveFailures(['SUCCESS', 'FAILURE', 'FAILURE'])).toBe(2);
    expect(countConsecutiveFailures(['FAILURE', 'SUCCESS'])).toBe(0);
  });
});
