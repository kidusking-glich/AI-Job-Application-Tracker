import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type { Express, Request, Response } from 'express';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

// Reuse the initialized Nest app across warm invocations to keep cold-start
// overhead to a minimum (mirrors how src/main.ts bootstraps locally).
let app: INestApplication | undefined;

async function bootstrap(): Promise<INestApplication> {
  if (!app) {
    const instance = await NestFactory.create(AppModule);
    const expressApp = instance.getHttpAdapter().getInstance() as Express;

    // Trust the first-hop reverse proxy (Vercel) so req.ip reflects the real
    // client address in security logs and request logs.
    expressApp.set('trust proxy', 1);

    instance.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    instance.useGlobalFilters(new HttpExceptionFilter());
    instance.setGlobalPrefix('api');

    // Initialize the app without binding a TCP port (serverless mode).
    await instance.init();
    app = instance;
  }
  return app;
}

/**
 * Vercel serverless handler. Every request (API under /api/* plus SPA routes)
 * is routed through the underlying Express instance, which preserves the
 * original URL path so NestJS routing and the frontend static server work.
 */
export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  const instance = await bootstrap();
  const server = instance.getHttpAdapter().getInstance() as Express;
  server(req, res);
}
