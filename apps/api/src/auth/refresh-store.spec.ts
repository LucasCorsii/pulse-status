import { HybridRefreshStore, MemoryRefreshStore, hashToken } from './refresh-store';

describe('MemoryRefreshStore', () => {
  it('revokes and checks tokens', async () => {
    const store = new MemoryRefreshStore();
    await expect(store.isRevoked('abc')).resolves.toBe(false);
    await store.revoke('abc');
    await expect(store.isRevoked('abc')).resolves.toBe(true);
  });

  it('expires entries', async () => {
    const store = new MemoryRefreshStore();
    await store.revoke('old', -1);
    await expect(store.isRevoked('old')).resolves.toBe(false);
  });

  it('never stores the raw token', () => {
    const hash = hashToken('super-secret-token');
    expect(hash).not.toContain('super-secret-token');
    expect(hash).toHaveLength(64);
  });
});

describe('HybridRefreshStore', () => {
  it('revokes in both layers and reads from either', async () => {
    const local = new MemoryRefreshStore();
    const remote = new MemoryRefreshStore();
    const store = new HybridRefreshStore(local, remote);
    await store.revoke('token');
    await expect(local.isRevoked('token')).resolves.toBe(true);
    await expect(remote.isRevoked('token')).resolves.toBe(true);
    await expect(store.isRevoked('token')).resolves.toBe(true);
  });

  it('degrades safely when the remote layer fails', async () => {
    const local = new MemoryRefreshStore();
    const failing = {
      revoke: async () => {
        throw new Error('redis down');
      },
      isRevoked: async () => {
        throw new Error('redis down');
      },
    };
    const store = new HybridRefreshStore(local, failing);
    await expect(store.revoke('token')).resolves.toBeUndefined();
    await expect(store.isRevoked('token')).resolves.toBe(true);
  });
});
