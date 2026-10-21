import { AlertsService } from './alerts.service';
import { safeFetch } from '../common/ssrf';

jest.mock('../common/ssrf', () => ({ safeFetch: jest.fn() }));

const mockedFetch = safeFetch as jest.Mock;

function buildPrisma(channels: unknown[]) {
  return {
    alertChannel: { findMany: jest.fn().mockResolvedValue(channels) },
  };
}

const monitor = { id: 'monitor-1', name: 'API', url: 'https://api.example.test' };

describe('AlertsService', () => {
  beforeEach(() => mockedFetch.mockReset());

  it('posts the incident text to webhook and Slack channels', async () => {
    mockedFetch.mockResolvedValue({ status: 200, headers: {}, location: null, text: '' });
    const prisma = buildPrisma([
      {
        id: 'c1',
        type: 'WEBHOOK',
        configuration: { url: 'https://hooks.example.test/pulse' },
        isEnabled: true,
      },
      {
        id: 'c2',
        type: 'SLACK',
        configuration: { webhookUrl: 'https://hooks.slack.com/services/x' },
        isEnabled: true,
      },
    ]);
    const service = new AlertsService(prisma as never);

    await service.notifyOwner('owner-1', 'down', monitor);

    expect(prisma.alertChannel.findMany).toHaveBeenCalledWith({
      where: { userId: 'owner-1', isEnabled: true },
    });
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    const [url, options] = mockedFetch.mock.calls[0];
    expect(url).toBe('https://hooks.example.test/pulse');
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({ 'content-type': 'application/json' });
    expect(JSON.parse(options.body)).toEqual({
      text: 'Pulse Status: API está DOWN (https://api.example.test)',
      monitorId: 'monitor-1',
      monitorName: 'API',
    });
    expect(mockedFetch.mock.calls[1][0]).toBe('https://hooks.slack.com/services/x');
  });

  it('never lets a failing channel break the check', async () => {
    mockedFetch.mockRejectedValue(new Error('Blocked destination (private IP)'));
    const prisma = buildPrisma([
      {
        id: 'c1',
        type: 'WEBHOOK',
        configuration: { url: 'https://169.254.169.254/latest' },
        isEnabled: true,
      },
    ]);
    const service = new AlertsService(prisma as never);

    await expect(service.notifyOwner('owner-1', 'up', monitor)).resolves.toBeUndefined();
  });

  it('skips channels without a destination', async () => {
    const prisma = buildPrisma([{ id: 'c1', type: 'WEBHOOK', configuration: {}, isEnabled: true }]);
    const service = new AlertsService(prisma as never);

    await service.notifyOwner('owner-1', 'down', monitor);

    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
