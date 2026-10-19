import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

// Regressão do achado P1 da revisão: o grafo de módulos precisa resolver
// (ChecksService injeta EventsGateway e AlertsService). Sem banco/Redis reais.
describe('AppModule wiring', () => {
  const prev = { ...process.env };

  beforeAll(() => {
    process.env.SKIP_DB_CONNECT = '1';
    process.env.SKIP_QUEUE = '1';
    process.env.SKIP_REDIS = '1';
  });

  afterAll(() => {
    process.env = { ...prev };
  });

  it('boots the full application context without unresolved dependencies', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await moduleRef.init();
    await moduleRef.close();
    expect(moduleRef).toBeDefined();
  });
});
