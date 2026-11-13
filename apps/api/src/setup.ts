import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ApiError } from './common/errors/api-error';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import { validationDetails } from './common/dto/shared.dto';

export interface ConfigureAppOptions {
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  enableProductionLogging?: boolean;
}

export function isExcludedRateLimitPath(urlPath: string): boolean {
  return (
    urlPath === '/health' ||
    urlPath === '/health/ready' ||
    urlPath === '/api/health' ||
    urlPath === '/api/health/ready' ||
    urlPath.startsWith('/health/') ||
    urlPath.startsWith('/api/health/') ||
    urlPath.includes('/webhook') ||
    urlPath.includes('/ipn')
  );
}

export function configureApp(app: INestApplication, options?: ConfigureAppOptions) {
  // 1. Correlation ID & Structured Logging Middleware
  const isProduction = options?.enableProductionLogging ?? (process.env.NODE_ENV === 'production');
  app.use((req: Request, res: Response, next: NextFunction) => {
    const rawHeader = req.headers['x-correlation-id'];
    const correlationId = (typeof rawHeader === 'string' && rawHeader.trim())
      ? rawHeader.trim()
      : randomUUID();

    res.setHeader('X-Correlation-Id', correlationId);
    (req as Request & { correlationId?: string }).correlationId = correlationId;

    if (isProduction) {
      const startTime = Date.now();
      res.on('finish', () => {
        const durationMs = Date.now() - startTime;
        const logEntry = {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          correlationId,
          method: req.method,
          path: req.originalUrl || req.url,
          statusCode: res.statusCode,
          durationMs,
        };
        process.stdout.write(`${JSON.stringify(logEntry)}\n`);
      });
    }

    next();
  });

  // 2. Helmet Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // 3. Global Prefix
  app.setGlobalPrefix('api');

  // 4. Rate Limiting
  const maxRequests =
    options?.rateLimitMax ??
    (process.env.RATE_LIMIT_MAX
      ? Number(process.env.RATE_LIMIT_MAX)
      : process.env.NODE_ENV === 'test'
        ? 5000
        : 100);

  const windowMs =
    options?.rateLimitWindowMs ??
    (process.env.RATE_LIMIT_WINDOW_MS
      ? Number(process.env.RATE_LIMIT_WINDOW_MS)
      : 15 * 60 * 1000);

  app.use(
    rateLimit({
      windowMs,
      limit: maxRequests,
      standardHeaders: 'draft-7',
      legacyHeaders: true,
      skip: (req: Request) => {
        const targetPath = req.originalUrl || req.path || req.url || '';
        return isExcludedRateLimitPath(targetPath);
      },
      handler: (_req: Request, res: Response) => {
        res.status(429).json({
          statusCode: 429,
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.',
          details: [],
        });
      },
    }),
  );

  // 5. CORS Configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: false,
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
    exposedHeaders: ['Idempotency-Replayed', 'Retry-After'],
  });

  // 6. Global Filters & Validation Pipes
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // EmptyQueryDto intentionally has no fields; whitelist still rejects unknown query keys.
      forbidUnknownValues: false,
      validationError: { target: false, value: false },
      exceptionFactory: (errors) =>
        new ApiError(400, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', validationDetails(errors)),
    }),
  );
}
