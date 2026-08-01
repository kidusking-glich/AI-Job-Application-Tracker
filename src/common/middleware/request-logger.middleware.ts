import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../core/prisma.service';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogger');

  constructor(private readonly prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const userId = this.extractUserId(req.headers.authorization);

    res.on('finish', () => {
      this.prisma.requestLog
        .create({
          data: {
            method: req.method,
            path: req.originalUrl ?? req.url,
            statusCode: res.statusCode,
            responseTimeMs: Date.now() - start,
            userId,
            ip: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
          },
        })
        .catch((err) =>
          this.logger.error(`Failed to log request: ${err.message}`),
        );
    });

    next();
  }

  private extractUserId(authorization?: string): string | null {
    if (!authorization?.startsWith('Bearer ')) return null;
    try {
      const payloadPart = authorization.slice(7).split('.')[1];
      if (!payloadPart) return null;
      const payload = JSON.parse(
        Buffer.from(payloadPart, 'base64url').toString('utf8'),
      );
      return typeof payload?.sub === 'string' ? payload.sub : null;
    } catch {
      return null;
    }
  }
}
