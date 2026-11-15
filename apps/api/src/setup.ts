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
  trustProxy?: boolean | number | string;
}

const DEFAULT_PRODUCTION_RATE_LIMIT_MAX = 1000;
const DEFAULT_TEST_RATE_LIMIT_MAX = 5000;

export function resolveRateLimitMax(override?: number): number {
  if (override !== undefined) return override;
  if (process.env.RATE_LIMIT_MAX) {
    const parsed = Number(process.env.RATE_LIMIT_MAX);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return process.env.NODE_ENV === 'test'
    ? DEFAULT_TEST_RATE_LIMIT_MAX
    : DEFAULT_PRODUCTION_RATE_LIMIT_MAX;
}

export function resolveCorsOrigin(raw = process.env.FRONTEND_URL): string {
  const value = raw?.trim().replace(/\/+$/, '');
  return value || 'http://localhost:3000';
}

export function resolveTrustProxy(
  override?: boolean | number | string,
  rawEnv = process.env.TRUST_PROXY,
): boolean | number | string {
  if (override !== undefined) return override;
  const trimmed = rawEnv?.trim();
  if (!trimmed) return 1;
  if (trimmed === 'false') return false;
  if (trimmed === 'true') return true;
  const asNumber = Number(trimmed);
  return Number.isInteger(asNumber) && asNumber >= 0 ? asNumber : trimmed;
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

  // 3. Global Prefix & Reverse Proxy Trust (Render/proxy forwards client IP via X-Forwarded-For)
  app.setGlobalPrefix('api');
  const httpInstance = app.getHttpAdapter()?.getInstance?.() as
    | { set?: (setting: string, val: unknown) => void }
    | undefined;
  if (typeof httpInstance?.set === 'function') {
    httpInstance.set('trust proxy', resolveTrustProxy(options?.trustProxy));
  }

  // 4. CORS Configuration (must run before rate limiter so 429 responses include CORS headers)
  app.enableCors({
    origin: resolveCorsOrigin(),
    credentials: false,
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
    exposedHeaders: ['Idempotency-Replayed', 'Retry-After'],
  });

  // 5. Rate Limiting
  const maxRequests = resolveRateLimitMax(options?.rateLimitMax);

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
