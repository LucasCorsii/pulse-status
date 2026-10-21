import type { AddressInfo } from 'node:net';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../../apps/api/src/app.module';
import { PrismaService } from '../../apps/api/src/prisma.service';

type ApiResult = { status: number; body: any };

describe('API integration', () => {
  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaService;
  const email = `codex-integration-${Date.now()}@example.test`;
  const secondEmail = `codex-integration-other-${Date.now()}@example.test`;
  const createdUserIds: string[] = [];

  async function request(path: string, init?: RequestInit): Promise<ApiResult> {
    const response = await fetch(`${baseUrl}/api/v1${path}`, init);
    const body = await response.json();
    return { status: response.status, body };
  }

  function json(body: unknown, token?: string, apiClient = false): RequestInit {
    return {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiClient ? { 'x-pulse-client': 'api' } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    };
  }

  beforeAll(async () => {
    if (!process.env.DATABASE_URL)
      throw new Error('DATABASE_URL must point to a disposable test database');
    process.env.SKIP_QUEUE = '1';
    process.env.JWT_ACCESS_SECRET ??= 'codex-test-access-secret-with-32-chars';
    process.env.JWT_REFRESH_SECRET ??= 'codex-test-refresh-secret-with-32-chars';

    app = await NestFactory.create(AppModule, { logger: false, abortOnError: false });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (createdUserIds.length) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await app?.close();
  });

  it('authenticates users, scopes monitors, exposes public status, and redacts alert secrets', async () => {
    const health = await request('/health');
    expect(health).toMatchObject({ status: 200, body: { status: 'ok' } });

    const firstRegistration = await request(
      '/auth/register',
      json({ email, password: 'correct-horse-1' }, undefined, true),
    );
    expect(firstRegistration.status).toBe(201);
    createdUserIds.push(firstRegistration.body.user.id as string);

    const firstLogin = await request(
      '/auth/login',
      json({ email, password: 'correct-horse-1' }, undefined, true),
    );
    expect(firstLogin.status).toBe(200);
    expect(firstLogin.body.accessToken).toEqual(expect.any(String));
    const firstToken = firstLogin.body.accessToken as string;

    const secondRegistration = await request(
      '/auth/register',
      json({ email: secondEmail, password: 'correct-horse-2' }, undefined, true),
    );
    expect(secondRegistration.status).toBe(201);
    createdUserIds.push(secondRegistration.body.user.id as string);

    const unauthorized = await request('/monitors');
    expect(unauthorized.status).toBe(401);

    const monitorResponse = await request(
      '/monitors',
      json({ name: 'Public service', url: 'https://example.com', isPublic: true }, firstToken),
    );
    expect(monitorResponse.status).toBe(201);
    const monitorId = monitorResponse.body.id as string;

    const ownList = await request('/monitors', {
      headers: { authorization: `Bearer ${firstToken}` },
    });
    expect(ownList.body).toHaveLength(1);
    const otherUserRead = await request(`/monitors/${monitorId}`, {
      headers: { authorization: `Bearer ${secondRegistration.body.accessToken}` },
    });
    expect(otherUserRead.status).toBe(404);

    const publicStatus = await request(`/status/${monitorId}`);
    expect(publicStatus).toMatchObject({ status: 200, body: { monitor: { id: monitorId } } });

    const secretUrl = 'https://hooks.example.test/private-token';
    const channel = await request(
      '/alert-channels',
      json(
        { name: 'test webhook', type: 'WEBHOOK', configuration: { url: secretUrl } },
        firstToken,
      ),
    );
    expect(channel.status).toBe(201);
    expect(JSON.stringify(channel.body)).not.toContain(secretUrl);

    const channels = await request('/alert-channels', {
      headers: { authorization: `Bearer ${firstToken}` },
    });
    expect(channels.status).toBe(200);
    expect(JSON.stringify(channels.body)).not.toContain(secretUrl);
    expect(channels.body[0]).toMatchObject({ hasConfiguration: true });
  });
});
