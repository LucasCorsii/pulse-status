import { RefreshTokenDenylist } from './refresh-store';

describe('RefreshTokenDenylist', () => {
  it('revokes and checks tokens', () => {
    const store = new RefreshTokenDenylist();
    expect(store.isRevoked('abc')).toBe(false);
    store.revoke('abc');
    expect(store.isRevoked('abc')).toBe(true);
  });

  it('expires entries', () => {
    const store = new RefreshTokenDenylist();
    store.revoke('old', -1);
    expect(store.isRevoked('old')).toBe(false);
  });
});
