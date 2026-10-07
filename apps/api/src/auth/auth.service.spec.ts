import { comparePassword, hashPassword } from './auth.service';

describe('password hashing', () => {
  it('hashes and verifies', async () => {
    const hash = await hashPassword('supersecret123');
    expect(hash).not.toContain('supersecret123');
    await expect(comparePassword('supersecret123', hash)).resolves.toBe(true);
    await expect(comparePassword('wrongpass1', hash)).resolves.toBe(false);
  });
});
