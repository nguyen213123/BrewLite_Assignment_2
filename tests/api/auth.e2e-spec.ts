import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../../apps/api/src/app.module';
import { configureApp } from '../../apps/api/src/setup';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { AuthService } from '../../apps/api/src/modules/auth/auth.service';
import { AUTH_POLICY } from '../../apps/api/src/modules/auth/auth-policy';

const TEST_SECRET = 'this-is-a-valid-test-jwt-secret-with-at-least-32-characters';

describe('Auth module (Issue #6)', () => {
  let app: INestApplication;
  const mockUsers: Map<
    string,
    {
      id: string;
      email: string;
      passwordHash: string;
      role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
      active?: boolean;
      createdAt?: Date;
      loyaltyPoints: number;
    }
  > = new Map();

  const mockPrisma = {
    user: {
      findUnique: jest.fn().mockImplementation(async ({ where }: { where: { id?: string; email?: string } }) => {
        if (where.id) return mockUsers.get(where.id) ?? null;
        if (where.email) {
          for (const user of mockUsers.values()) {
            if (user.email === where.email) return user;
          }
        }
        return null;
      }),
      findMany: jest.fn().mockImplementation(async ({ where }: { where?: { role?: 'CUSTOMER' | 'STAFF' | 'ADMIN' } }) => {
        const list = [...mockUsers.values()];
        return where?.role ? list.filter(u => u.role === where.role) : list;
      }),
      create: jest.fn().mockImplementation(async ({ data }: { data: { email: string; passwordHash: string; role: 'CUSTOMER' | 'STAFF' | 'ADMIN'; active?: boolean; loyaltyPoints: number } }) => {
        const id = data.role === 'STAFF' ? '22222222-3333-4444-8555-666666666666' : '11111111-2222-3333-4444-555555555555';
        const user = { id, active: true, createdAt: new Date('2026-11-08T00:00:00.000Z'), ...data };
        mockUsers.set(id, user);
        return user;
      }),
      update: jest.fn().mockImplementation(async ({ where, data }: { where: { id: string }; data: { active?: boolean } }) => {
        const existing = mockUsers.get(where.id);
        if (!existing) throw new Error('User not found');
        const updated = { ...existing, ...data };
        mockUsers.set(where.id, updated);
        return updated;
      }),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET;
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    mockUsers.clear();
    jest.clearAllMocks();
  });

  describe('JWT_SECRET configuration check', () => {
    it('throws error when JWT_SECRET is missing or under 32 characters', () => {
      const authService = new AuthService(mockPrisma as unknown as PrismaService);
      const original = process.env.JWT_SECRET;
      try {
        delete process.env.JWT_SECRET;
        expect(() => authService.onModuleInit()).toThrow(
          /JWT_SECRET must be configured with at least 32 characters/,
        );

        process.env.JWT_SECRET = 'short';
        expect(() => authService.onModuleInit()).toThrow(
          /JWT_SECRET must be configured with at least 32 characters/,
        );
      } finally {
        process.env.JWT_SECRET = original;
      }
    });
  });

  describe('POST /api/auth/register', () => {
    it('successfully registers a customer account with trimmed and lowercased email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: '  TestUser@Example.COM  ', password: 'ValidPassword123!' })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.tokenType).toBe('Bearer');
      expect(response.body.expiresIn).toBe(3600);
      expect(response.body.user).toEqual({
        id: '11111111-2222-3333-4444-555555555555',
        email: 'testuser@example.com',
        role: 'CUSTOMER',
        loyaltyPoints: 0,
      });

      // Assert password is NOT returned
      expect(response.body).not.toHaveProperty('password');
      expect(response.body).not.toHaveProperty('passwordHash');

      // Verify token is valid JWT
      const decoded = jwt.verify(response.body.accessToken, TEST_SECRET, {
        issuer: AUTH_POLICY.issuer,
        audience: AUTH_POLICY.audience,
      }) as jwt.JwtPayload;
      expect(decoded.sub).toBe('11111111-2222-3333-4444-555555555555');
      expect(decoded.role).toBe('CUSTOMER');
    });

    it('rejects registration with duplicate email with 409 EMAIL_ALREADY_EXISTS', async () => {
      mockUsers.set('existing-id', {
        id: 'existing-id',
        email: 'duplicate@example.com',
        passwordHash: 'hash',
        role: 'CUSTOMER',
        loyaltyPoints: 0,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'duplicate@example.com', password: 'ValidPassword123!' })
        .expect(409);

      expect(response.body.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('rejects registration containing forbidden role field with 400 VALIDATION_ERROR', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'staff@example.com', password: 'ValidPassword123!', role: 'STAFF' })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it('rejects passwords shorter than 8 characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'user@example.com', password: '123' })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/login', () => {
    it('successfully logs in with valid credentials', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', AUTH_POLICY.bcryptCost);
      mockUsers.set('user-1', {
        id: 'user-1',
        email: 'login@example.com',
        passwordHash,
        role: 'CUSTOMER',
        loyaltyPoints: 15,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'CorrectPassword123!' })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.tokenType).toBe('Bearer');
      expect(response.body.user).toEqual({
        id: 'user-1',
        email: 'login@example.com',
        role: 'CUSTOMER',
        loyaltyPoints: 15,
      });
    });

    it('rejects invalid password with 401 INVALID_CREDENTIALS', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', AUTH_POLICY.bcryptCost);
      mockUsers.set('user-1', {
        id: 'user-1',
        email: 'login@example.com',
        passwordHash,
        role: 'CUSTOMER',
        loyaltyPoints: 0,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'WrongPassword' })
        .expect(401);

      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects non-existent email with 401 INVALID_CREDENTIALS', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'AnyPassword123!' })
        .expect(401);

      expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns current user profile with valid JWT', async () => {
      const user = {
        id: 'user-me-1',
        email: 'me@example.com',
        passwordHash: 'hash',
        role: 'CUSTOMER' as const,
        loyaltyPoints: 42,
      };
      mockUsers.set(user.id, user);

      const token = jwt.sign({ sub: user.id, role: user.role }, TEST_SECRET, {
        issuer: AUTH_POLICY.issuer,
        audience: AUTH_POLICY.audience,
        expiresIn: 3600,
      });

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        id: user.id,
        email: user.email,
        role: user.role,
        loyaltyPoints: 42,
      });
    });

    it('rejects request without Authorization header with 401 UNAUTHORIZED', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects tampered or malformed token with 401 UNAUTHORIZED', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-string')
        .expect(401);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects token signed with wrong secret with 401 UNAUTHORIZED', async () => {
      const wrongToken = jwt.sign({ sub: 'user-1', role: 'CUSTOMER' }, 'different-secret-that-does-not-match-at-all-32chars', {
        issuer: AUTH_POLICY.issuer,
        audience: AUTH_POLICY.audience,
        expiresIn: 3600,
      });

      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${wrongToken}`)
        .expect(401);

      expect(response.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Staff account management & RBAC (feature/auth-account)', () => {
    const adminId = '99999999-9999-4999-8999-999999999901';
    const customerId = '99999999-9999-4999-8999-999999999902';
    const staffId = '22222222-3333-4444-8555-666666666666';

    function signToken(id: string, role: 'CUSTOMER' | 'STAFF' | 'ADMIN') {
      return jwt.sign({ sub: id, role }, TEST_SECRET, {
        issuer: AUTH_POLICY.issuer,
        audience: AUTH_POLICY.audience,
        expiresIn: 3600,
      });
    }

    beforeEach(async () => {
      const passwordHash = await bcrypt.hash('ValidPass123!', AUTH_POLICY.bcryptCost);
      mockUsers.set(adminId, {
        id: adminId,
        email: 'admin@brewlite.local',
        passwordHash,
        role: 'ADMIN',
        active: true,
        loyaltyPoints: 0,
      });
      mockUsers.set(customerId, {
        id: customerId,
        email: 'customer@brewlite.local',
        passwordHash,
        role: 'CUSTOMER',
        active: true,
        loyaltyPoints: 0,
      });
    });

    it('forbids CUSTOMER and STAFF from creating or listing staff accounts (403 FORBIDDEN)', async () => {
      const customerToken = signToken(customerId, 'CUSTOMER');
      await request(app.getHttpServer())
        .post('/api/auth/staff')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ email: 'newstaff@brewlite.local', password: 'StaffPassword123!' })
        .expect(403);

      await request(app.getHttpServer())
        .get('/api/auth/staff')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      mockUsers.set(staffId, {
        id: staffId,
        email: 'staff@brewlite.local',
        passwordHash: 'hash',
        role: 'STAFF',
        active: true,
        loyaltyPoints: 0,
      });
      const staffToken = signToken(staffId, 'STAFF');
      await request(app.getHttpServer())
        .post('/api/auth/staff')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ email: 'another@brewlite.local', password: 'StaffPassword123!' })
        .expect(403);
    });

    it('allows ADMIN to create, list, lock and unlock STAFF account with immediate effect', async () => {
      const adminToken = signToken(adminId, 'ADMIN');

      // 1. Admin creates STAFF account
      const createdRes = await request(app.getHttpServer())
        .post('/api/auth/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: '  Barista01@BrewLite.local ', password: 'StaffPassword123!' })
        .expect(201);

      expect(createdRes.body).toEqual(
        expect.objectContaining({
          id: staffId,
          email: 'barista01@brewlite.local',
          role: 'STAFF',
          active: true,
        }),
      );

      // 2. Admin lists STAFF accounts
      const listRes = await request(app.getHttpServer())
        .get('/api/auth/staff')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(listRes.body.data).toHaveLength(1);
      expect(listRes.body.data[0].email).toBe('barista01@brewlite.local');

      // 3. Staff logs in and gets a valid JWT token
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'barista01@brewlite.local', password: 'StaffPassword123!' })
        .expect(200);
      const staffToken = loginRes.body.accessToken as string;
      expect(loginRes.body.user.role).toBe('STAFF');

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      // 4. Admin locks the STAFF account -> takes effect IMMEDIATELY even with existing valid JWT
      const lockRes = await request(app.getHttpServer())
        .patch(`/api/auth/staff/${staffId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: false })
        .expect(200);
      expect(lockRes.body.active).toBe(false);

      const meLockedRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
      expect(meLockedRes.body.code).toBe('ACCOUNT_LOCKED');

      const loginLockedRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'barista01@brewlite.local', password: 'StaffPassword123!' })
        .expect(403);
      expect(loginLockedRes.body.code).toBe('ACCOUNT_LOCKED');

      // 5. Admin unlocks the STAFF account -> access restored immediately
      const unlockRes = await request(app.getHttpServer())
        .patch(`/api/auth/staff/${staffId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ active: true })
        .expect(200);
      expect(unlockRes.body.active).toBe(true);

      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);
    });
  });
});
