import { toSafeChannel } from './dto';

describe('toSafeChannel', () => {
  it('strips configuration secrets', () => {
    const safe = toSafeChannel({
      id: '1',
      name: 'slack',
      configuration: { url: 'https://secret-webhook' },
    });
    expect(safe).not.toHaveProperty('configuration');
    expect(safe).toMatchObject({ id: '1', hasConfiguration: true });
  });
});
