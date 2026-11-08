import { randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../apps/api/src/app.module';
import { configureApp } from '../../apps/api/src/setup';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { LEGACY_SEED_PASSWORDS } from '../../apps/api/src/modules/auth/legacy-password-policy';
import { createTempDatabase, type TempDatabase } from './support/temp-database';

jest.setTimeout(30000);
const integration = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;
integration('STAFF unlock cannot bypass legacy password quarantine', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let db: TempDatabase | undefined;
  let adminToken: string;
  const originalEnv = { ...process.env };
  beforeAll(async () => {
    db = await createTempDatabase(originalEnv.DATABASE_URL);
    process.env.DATABASE_URL = db.url;
    process.env.JWT_SECRET = 'staff-unlock-integration-secret-longer-than-32';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init(); await app.listen(0, '127.0.0.1');
    prisma = app.get(PrismaService);
    const admin = await prisma.user.create({ data: { email: `admin-${randomUUID()}@example.com`, role: 'ADMIN', passwordHash: await bcrypt.hash('PrivateAdmin123!', 4) } });
    adminToken = (await login(admin.email, 'PrivateAdmin123!').expect(200)).body.accessToken as string;
  }, 120000);
  afterAll(async () => {
    try { await app?.close(); } finally { process.env = originalEnv; await db?.drop(); }
  }, 60000);
  const login = (email: string, password: string) => request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
  const status = (route: string, id: string, active: boolean) => request(app.getHttpServer())
    .patch(`/api/auth/${route}/${id}/status`).auth(adminToken, { type: 'bearer' }).send({ active });
  async function fixture(password: string) {
    const user = await prisma.user.create({ data: {
      email: `staff-${randomUUID()}@example.com`, role: 'STAFF', active: true, passwordHash: await bcrypt.hash(password, 4),
    } });
    // An actual token issued before the account was quarantined, not a fabricated JWT.
    const token = (await login(user.email, password).expect(200)).body.accessToken as string;
    return { user, token };
  }

  for (const route of ['staff', 'admin/users']) {
    it(`${route} refuses to reactivate a locked STAFF with the old seed password`, async () => {
      const { user, token } = await fixture(LEGACY_SEED_PASSWORDS.STAFF);
      await status(route, user.id, false).expect(200);
      const denied = await status(route, user.id, true).expect(409);
      expect(denied.body.code).toBe('LEGACY_PASSWORD_RESET_REQUIRED');
      expect(denied.body.message).toContain('đổi mật khẩu');
      expect(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({ active: false, passwordHash: user.passwordHash });
      expect((await login(user.email, LEGACY_SEED_PASSWORDS.STAFF).expect(403)).body.code).toBe('ACCOUNT_LOCKED');
      expect((await request(app.getHttpServer()).get('/api/orders/staff').auth(token, { type: 'bearer' }).expect(403)).body.code).toBe('ACCOUNT_LOCKED');
      // Repeated attempts through either route cannot reopen the account.
      await status(route === 'staff' ? 'admin/users' : 'staff', user.id, true).expect(409);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).active).toBe(false);
    });

    it(`${route} still locks and unlocks STAFF using a private password`, async () => {
      const password = 'PrivateBaristaPassword123!';
      const { user, token } = await fixture(password);
      await status(route, user.id, false).expect(200);
      await login(user.email, password).expect(403);
      await status(route, user.id, true).expect(200);
      expect(await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).toMatchObject({ active: true, passwordHash: user.passwordHash, role: 'STAFF' });
      await login(user.email, password).expect(200);
      await request(app.getHttpServer()).get('/api/orders/staff').auth(token, { type: 'bearer' }).expect(200);
    });
  }
});
