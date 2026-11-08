import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../apps/api/src/app.module';
import { configureApp } from '../../apps/api/src/setup';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { seedUsers, resetSeedAdmin, SEED_ADMIN_ID, SEED_ADMIN_EMAIL, LEGACY_ADMIN_EMAIL } from '../../apps/api/src/seed/seed-users';
import { createTempDatabase, type TempDatabase } from './support/temp-database';

jest.setTimeout(30000);
const integration = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;
const env = { SEED_ADMIN_PASSWORD: 'SeedPrivateAdmin123!', SEED_STAFF_PASSWORD: 'SeedPrivateStaff123!' };
integration('Money checks and legacy seed upgrade on PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let db: TempDatabase | undefined;
  const originalEnv = { ...process.env };
  beforeAll(async () => {
    db = await createTempDatabase(originalEnv.DATABASE_URL);
    process.env.DATABASE_URL = db.url;
    process.env.JWT_SECRET = 'seed-money-integration-only-secret-longer-than-32';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init(); await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
  }, 120000);
  afterAll(async () => {
    try { await app?.close(); } finally { process.env = originalEnv; await db?.drop(); }
  }, 60000);
  async function cleanUsers() { await prisma.user.deleteMany(); }
  const login = (email: string, password: string) => request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
  async function oldAdmin(password = 'Admin123!') {
    return prisma.user.create({ data: { id: SEED_ADMIN_ID, email: LEGACY_ADMIN_EMAIL, role: 'ADMIN', passwordHash: await bcrypt.hash(password, 4) } });
  }

  describe('seed compatibility', () => {
    beforeEach(cleanUsers);
    it('creates a fresh database and preserves valid credentials and locks on rerun', async () => {
      await seedUsers(prisma, env);
      expect(await prisma.user.count()).toBe(2);
      const first = await prisma.user.findUniqueOrThrow({ where: { id: SEED_ADMIN_ID } });
      await prisma.user.update({ where: { id: first.id }, data: { active: false } });
      await seedUsers(prisma, { ...env, SEED_ADMIN_PASSWORD: 'AnotherPrivatePassword123!' });
      expect(await prisma.user.count()).toBe(2);
      expect(await prisma.user.findUniqueOrThrow({ where: { id: first.id } })).toMatchObject({
        passwordHash: first.passwordHash, active: false, role: 'ADMIN', email: SEED_ADMIN_EMAIL,
      });
    });
    it('upgrades the old fixed ID without duplicate keys, locks default credentials and rejects its JWT', async () => {
      const previous = await oldAdmin();
      const oldToken = (await login(LEGACY_ADMIN_EMAIL, 'Admin123!').expect(200)).body.accessToken as string;
      await seedUsers(prisma, env);
      const migrated = await prisma.user.findUniqueOrThrow({ where: { id: SEED_ADMIN_ID } });
      expect(migrated).toMatchObject({ email: SEED_ADMIN_EMAIL, role: 'ADMIN', active: false, passwordHash: previous.passwordHash });
      await request(app.getHttpServer()).get('/api/auth/me').auth(oldToken, { type: 'bearer' }).expect(403);
      await seedUsers(prisma, env);
      expect(await prisma.user.count({ where: { id: SEED_ADMIN_ID } })).toBe(1);
      await expect(resetSeedAdmin(prisma, { SEED_ADMIN_PASSWORD: 'Admin123!' })).rejects.toThrow('mặc định');
      await resetSeedAdmin(prisma, env);
      await login(SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD).expect(200);
      await login(SEED_ADMIN_EMAIL, 'Admin123!').expect(401);
      const reset = await prisma.user.findUniqueOrThrow({ where: { id: SEED_ADMIN_ID } });
      await seedUsers(prisma, { ...env, SEED_ADMIN_PASSWORD: 'IgnoredOnRerun123!' });
      expect(await prisma.user.findUniqueOrThrow({ where: { id: SEED_ADMIN_ID } })).toMatchObject({ passwordHash: reset.passwordHash, active: true });
    });
    it('preserves a custom legacy password but requires explicit reactivation after email migration', async () => {
      const previous = await oldAdmin('CustomLegacyAdmin123!');
      await seedUsers(prisma, env);
      expect(await prisma.user.findUniqueOrThrow({ where: { id: SEED_ADMIN_ID } })).toMatchObject({ passwordHash: previous.passwordHash, active: false, email: SEED_ADMIN_EMAIL });
    });
    it('refuses a customer owning the target email and leaves the old admin untouched', async () => {
      await oldAdmin();
      const customer = await prisma.user.create({ data: { email: SEED_ADMIN_EMAIL, passwordHash: await bcrypt.hash('Customer123!', 4) } });
      await expect(seedUsers(prisma, env)).rejects.toThrow('Seed từ chối');
      expect(await prisma.user.findUniqueOrThrow({ where: { id: customer.id } })).toMatchObject({ role: 'CUSTOMER' });
      expect(await prisma.user.findUniqueOrThrow({ where: { id: SEED_ADMIN_ID } })).toMatchObject({ email: LEGACY_ADMIN_EMAIL });
    });
    it('locks known default credentials even when the email was already migrated', async () => {
      await prisma.user.create({ data: { id: SEED_ADMIN_ID, email: SEED_ADMIN_EMAIL, role: 'ADMIN', passwordHash: await bcrypt.hash('Admin123!', 4) } });
      await seedUsers(prisma, env);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: SEED_ADMIN_ID } })).active).toBe(false);
    });
  });

  describe('admin money HTTP boundaries', () => {
    let token: string;
    beforeAll(async () => {
      await cleanUsers();
      await seedUsers(prisma, env);
      token = (await login(SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD).expect(200)).body.accessToken as string;
    });
    const patch = (path: string, body: object) => request(app.getHttpServer()).patch(`/api/auth/admin/${path}`).auth(token, { type: 'bearer' }).send(body);
    const promo = (body: object) => request(app.getHttpServer()).post('/api/auth/admin/promotions').auth(token, { type: 'bearer' }).send(body);
    async function product(offset = 0) {
      return prisma.product.create({ data: { name: 'Boundary coffee', description: '', imageUrl: 'http://localhost/test.png', price: 1000000000,
        sizes: { create: [{ size: 'S', price: 1000000000 }, { size: 'L', price: 1000000000 + offset }] },
      }, include: { sizes: { orderBy: { size: 'asc' } } } });
    }
    it('accepts exactly 2 billion when every size remains in range', async () => {
      const p = await product();
      await patch(`products/${p.id}`, { price: 2000000000, expectedVersion: 0 }).expect(200);
      const saved = await prisma.product.findUniqueOrThrow({ where: { id: p.id }, include: { sizes: true } });
      expect(saved.price).toBe(2000000000); expect(saved.sizes.every(size => size.price === 2000000000)).toBe(true);
    });
    it('rejects 2 billion plus one before changing the product', async () => {
      const p = await product();
      const response = await patch(`products/${p.id}`, { price: 2000000001, expectedVersion: 0 }).expect(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect((await prisma.product.findUniqueOrThrow({ where: { id: p.id } })).version).toBe(0);
    });
    it('rolls back the base price, every size and version if a larger size would exceed the cap', async () => {
      const p = await product(10000);
      const response = await patch(`products/${p.id}`, { price: 2000000000, expectedVersion: 0 }).expect(400);
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(await prisma.product.findUniqueOrThrow({ where: { id: p.id }, include: { sizes: { orderBy: { size: 'asc' } } } })).toEqual(p);
    });
    it('bounds topping and voucher money while allowing a zero percent-discount cap', async () => {
      const topping = await prisma.topping.create({ data: { name: 'Boundary topping', price: 0 } });
      await patch(`toppings/${topping.id}`, { price: 2000000000 }).expect(200);
      await patch(`toppings/${topping.id}`, { price: 2000000001 }).expect(400);
      const base = { type: 'FIXED', value: 2000000000, minSubtotal: 2000000000, startsAt: '2026-01-01T00:00:00Z', endsAt: '2030-01-01T00:00:00Z' };
      await promo({ ...base, code: randomUUID().slice(0, 8).toUpperCase() }).expect(201);
      for (const field of ['value', 'minSubtotal']) {
        await promo({ ...base, code: randomUUID().slice(0, 8).toUpperCase(), [field]: 2000000001 }).expect(400);
      }
      await promo({ ...base, type: 'PERCENT', value: 100, maxDiscount: 2000000000, code: 'PERCENT_CAP' }).expect(201);
      await promo({ ...base, type: 'PERCENT', value: 100, maxDiscount: 2000000001, code: 'BAD_CAP' }).expect(400);
      await promo({ ...base, type: 'PERCENT', value: 100, maxDiscount: 0, code: 'ZERO_CAP' }).expect(201);
      await promo({ ...base, maxDiscount: 100, code: 'FIXED_CAP' }).expect(400);
    });
  });
});
