import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { getJwtSecrets } from './auth/jwt-config';

async function bootstrap() {
  // Falha rápido em produção sem segredos (revisão PR #1 P1-3).
  getJwtSecrets();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  const webOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({ origin: webOrigin.split(','), credentials: true });
  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}
// eslint-disable-next-line no-console
bootstrap().catch((err) => console.error(err));
