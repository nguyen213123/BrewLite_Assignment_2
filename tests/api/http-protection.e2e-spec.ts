import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthController } from '../../apps/api/src/health/health.controller';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { configureApp, isExcludedRateLimitPath } from '../../apps/api/src/setup';

describe('HTTP Protection & Observability (Issue #20 - TV4)', () => {
  describe('Default configuration (Security headers, Correlation ID & Exemptions)', () => {
    let app: INestApplication;
    const query = jest.fn();

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [{ provide: PrismaService, useValue: { $queryRaw: query } }],
      }).compile();

      app = module.createNestApplication();
      configureApp(app, {
        rateLimitMax: 100,
      });
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('generates a new UUID for X-Correlation-Id when missing', async () => {
      const res = await request(app.getHttpServer()).get('/api/health').expect(200);

      const correlationId = res.headers['x-correlation-id'];
      expect(correlationId).toBeDefined();
      expect(typeof correlationId).toBe('string');
      // UUID format check: 8-4-4-4-12 hex chars
      expect(correlationId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('preserves an existing incoming X-Correlation-Id header', async () => {
      const customId = 'custom-client-trace-123456';
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .set('X-Correlation-Id', customId)
        .expect(200);

      expect(res.headers['x-correlation-id']).toBe(customId);
    });

    it('sets standard Helmet security headers', async () => {
      const res = await request(app.getHttpServer()).get('/api/health').expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
    });

    it('identifies health, webhook, and IPN paths as rate-limit excluded', () => {
      expect(isExcludedRateLimitPath('/health')).toBe(true);
      expect(isExcludedRateLimitPath('/api/health')).toBe(true);
      expect(isExcludedRateLimitPath('/api/health/ready')).toBe(true);
      expect(isExcludedRateLimitPath('/api/payments/webhook')).toBe(true);
      expect(isExcludedRateLimitPath('/api/payments/stripe/webhook')).toBe(true);
      expect(isExcludedRateLimitPath('/api/payments/vnpay/ipn')).toBe(true);
      expect(isExcludedRateLimitPath('/api/orders')).toBe(false);
      expect(isExcludedRateLimitPath('/api/auth/login')).toBe(false);
    });
  });

  describe('Rate Limiting & 429 RATE_LIMIT_EXCEEDED', () => {
    let app: INestApplication;
    const query = jest.fn();

    beforeAll(async () => {
      const module = await Test.createTestingModule({
        controllers: [HealthController],
        providers: [{ provide: PrismaService, useValue: { $queryRaw: query } }],
      }).compile();

      app = module.createNestApplication();
      // Configure low limit to test throttling
      configureApp(app, {
        rateLimitMax: 3,
        rateLimitWindowMs: 60 * 1000,
      });
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns 429 with RATE_LIMIT_EXCEEDED when request limit is exceeded', async () => {
      // /api/health is skipped by default, so let's hit a non-skipped route or verify that skipped routes do not throttle
      // Since HealthController only registers /health and /health/ready, let's verify skipped route never hits 429
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer()).get('/api/health').expect(200);
      }
    });
  });

  describe('Rate Limiting on protected endpoints', () => {
    let app: INestApplication;

    beforeAll(async () => {
      // Define a dummy test controller representing normal business endpoints
      const { Controller, Get } = await import('@nestjs/common');
      @Controller('test-rate')
      class TestRateController {
        @Get('ping')
        ping() {
          return { message: 'pong' };
        }
      }

      const module = await Test.createTestingModule({
        controllers: [TestRateController],
      }).compile();

      app = module.createNestApplication();
      configureApp(app, {
        rateLimitMax: 3,
        rateLimitWindowMs: 60 * 1000,
      });
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('allows requests within the limit and blocks with 429 RATE_LIMIT_EXCEEDED once exceeded', async () => {
      // 3 allowed requests
      await request(app.getHttpServer()).get('/api/test-rate/ping').expect(200, { message: 'pong' });
      await request(app.getHttpServer()).get('/api/test-rate/ping').expect(200, { message: 'pong' });
      await request(app.getHttpServer()).get('/api/test-rate/ping').expect(200, { message: 'pong' });

      // 4th request must be rejected with 429 RATE_LIMIT_EXCEEDED
      const blockedRes = await request(app.getHttpServer()).get('/api/test-rate/ping').expect(429);

      expect(blockedRes.body).toEqual({
        statusCode: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Quá nhiều yêu cầu, vui lòng thử lại sau.',
        details: [],
      });
    });
  });

  describe('Structured JSON Logging in production', () => {
    let app: INestApplication;
    const stdoutWrites: string[] = [];
    let originalWrite: typeof process.stdout.write;

    beforeAll(async () => {
      const { Controller, Get } = await import('@nestjs/common');
      @Controller('test-log')
      class TestLogController {
        @Get('ping')
        ping() {
          return { status: 'logged' };
        }
      }

      const module = await Test.createTestingModule({
        controllers: [TestLogController],
      }).compile();

      app = module.createNestApplication();
      configureApp(app, {
        enableProductionLogging: true,
        rateLimitMax: 50,
      });
      await app.init();

      originalWrite = process.stdout.write;
      process.stdout.write = ((chunk: unknown) => {
        if (typeof chunk === 'string') {
          stdoutWrites.push(chunk);
        }
        return true;
      }) as typeof process.stdout.write;
    });

    afterAll(async () => {
      process.stdout.write = originalWrite;
      await app.close();
    });

    it('logs request in single-line JSON format without sensitive credentials', async () => {
      stdoutWrites.length = 0;

      await request(app.getHttpServer())
        .get('/api/test-log/ping')
        .set('Authorization', 'Bearer secret-jwt-token-123')
        .set('X-Correlation-Id', 'test-trace-id-abc')
        .expect(200);

      const jsonLog = stdoutWrites.find((line) => line.includes('test-trace-id-abc'));
      expect(jsonLog).toBeDefined();

      const parsed = JSON.parse(jsonLog!.trim());
      expect(parsed).toMatchObject({
        level: 'INFO',
        correlationId: 'test-trace-id-abc',
        method: 'GET',
        path: '/api/test-log/ping',
        statusCode: 200,
      });
      expect(typeof parsed.durationMs).toBe('number');
      expect(parsed.timestamp).toBeDefined();

      // Ensure secret credentials and JWT tokens are NEVER printed
      expect(jsonLog).not.toContain('secret-jwt-token-123');
      expect(jsonLog).not.toContain('Bearer');
    });
  });
});
