import { validate } from 'class-validator';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { seedAccounts, seedUsers } from '../../apps/api/src/seed/seed-users';
import { AuthService } from '../../apps/api/src/modules/auth/auth.service';
import { AUTH_POLICY } from '../../apps/api/src/modules/auth/auth-policy';
import { AdminService } from '../../apps/api/src/modules/auth/admin.service';
import { AdminCreatePromotionDto } from '../../apps/api/src/modules/auth/dto/auth.dto';
import { PromotionCodeDto } from '../../apps/api/src/common/dto/shared.dto';
import { PaymentsController } from '../../apps/api/src/modules/payments/payments.controller';

const seedEnv = { SEED_ADMIN_PASSWORD: 'PrivateAdminPass123!', SEED_STAFF_PASSWORD: 'PrivateStaffPass123!' };

describe('Logic and security repairs', () => {
  it('requires explicit seed passwords instead of falling back to known credentials', () => {
    expect(() => seedAccounts({})).toThrow('SEED_ADMIN_PASSWORD');
    expect(() => seedAccounts({ ...seedEnv, SEED_STAFF_PASSWORD: '' })).toThrow('SEED_STAFF_PASSWORD');
    expect(() => seedAccounts({ ...seedEnv, SEED_ADMIN_PASSWORD: 'a'.repeat(73) })).toThrow('SEED_ADMIN_PASSWORD');
  });

  it('refuses to promote a customer registered with the seed email', async () => {
    const user = {
      findUnique: jest.fn().mockResolvedValue({ id: 'customer', role: 'CUSTOMER' }),
      upsert: jest.fn(),
    };
    const db = { $transaction: async (work: (tx: unknown) => Promise<unknown>) => work({ user }) };
    await expect(seedUsers(db as never, seedEnv)).rejects.toThrow('Seed từ chối');
    expect(user.upsert).not.toHaveBeenCalled();
  });

  it('preserves existing seed passwords, roles and locked status on rerun', async () => {
    const accounts = await Promise.all(seedAccounts(seedEnv).map(async account => ({ ...account, passwordHash: await bcrypt.hash(account.password, 4), active: false })));
    const user = {
      findUnique: jest.fn(async ({ where }: { where: { email: string } }) => accounts.find(a => a.email === where.email)),
      upsert: jest.fn(),
    };
    const db = { $transaction: async (work: (tx: unknown) => Promise<unknown>) => work({ user }) };
    await expect(seedUsers(db as never, seedEnv)).resolves.toBe(2);
    expect(user.upsert).not.toHaveBeenCalled();
  });

  it('never changes a customer who wins the email race while seed is hashing', async () => {
    const user = {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({ id: 'customer', role: 'CUSTOMER' }),
    };
    const db = { $transaction: async (work: (tx: unknown) => Promise<unknown>) => work({ user }) };
    await expect(seedUsers(db as never, seedEnv)).rejects.toThrow('Seed từ chối');
    expect(user.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
  });

  it('rejects an existing customer JWT after the DB role changes to ADMIN', async () => {
    const secret = 'regression-jwt-secret-longer-than-thirty-two-characters';
    const auth = new AuthService({ user: { findUnique: async () => ({ id: 'u', email: 'u@example.test', role: 'ADMIN', active: true }) } } as never);
    Reflect.set(auth, 'secret', secret);
    const sign = (role: string) => jwt.sign({ role }, secret, {
      subject: 'u', issuer: AUTH_POLICY.issuer, audience: AUTH_POLICY.audience, expiresIn: 3600,
    });
    await expect(auth.verifyAccessToken(sign('CUSTOMER'))).rejects.toMatchObject({ response: { code: 'UNAUTHORIZED' } });
    await expect(auth.verifyAccessToken(sign('ADMIN'))).resolves.toMatchObject({ role: 'ADMIN' });
  });

  it('uses the same code alphabet for creating and applying vouchers', async () => {
    for (const code of ['SALE 10', 'SALE@10', 'SALE.10', 'GIẢM10', 'SALE_10', 'SALE-10']) {
      const creation = Object.assign(new AdminCreatePromotionDto(), {
        code, type: 'PERCENT', value: 10, minSubtotal: 0,
        startsAt: '2026-11-08T00:00:00Z', endsAt: '2026-12-08T00:00:00Z',
      });
      const redemption = Object.assign(new PromotionCodeDto(), { code });
      expect((await validate(creation)).length === 0).toBe((await validate(redemption)).length === 0);
    }
  });

  it('excludes refunded and duplicate payments from revenue', async () => {
    const findMany = jest.fn(async (args: { take?: number; select?: unknown }) => args.take ? [] : [
      { status: 'COMPLETED', payments: [] }, // primary payment refunded
      { status: 'PAID', payments: [{ amount: 50000 }] },
      { status: 'CANCELLED', payments: [{ amount: 50000 }] }, // late payment pending manual refund
    ]);
    const empty = { findMany: async () => [] };
    const db = { user: empty, order: { findMany }, product: empty, ingredient: empty, promotion: empty };
    const overview = await new AdminService(db as never).getOverview();
    expect(overview.stats.totalRevenue).toBe(50000);
    expect(findMany).toHaveBeenCalledWith({ select: { status: true, payments: {
      where: { status: 'SUCCEEDED', isDuplicate: false }, select: { amount: true },
    } } });
  });

  it('does not call VNPay if staff wins the order lock before a refund starts', async () => {
    let locked = false;
    const gateway = { refundTransaction: jest.fn() };
    const tx = {
      $queryRaw: jest.fn(async () => { locked = true; }),
      order: { findUnique: jest.fn(async () => {
        expect(locked).toBe(true);
        return { id: 'order', status: 'PREPARING' };
      }) },
      idempotencyRecord: { updateMany: jest.fn(), update: jest.fn() },
    };
    const db = { $transaction: async (work: (client: unknown) => Promise<unknown>) => work(tx) };
    const controller = new PaymentsController({} as never, gateway as never, db as never, {} as never, {} as never);
    Reflect.set(controller, 'findTargetVnPayPayment', async () => ({
      order: { id: 'order', code: 'BL-TEST', status: 'PAID' },
      payment: { status: 'SUCCEEDED', amount: 100000, idempotencyRecordId: 'attempt', idempotency: { httpStatus: 200 } },
      meta: { provider: 'VNPAY' },
    }));
    await expect(controller.refundVnPayTransaction({ id: 'u', email: 'u@example.test', role: 'CUSTOMER' }, {}, {} as never))
      .rejects.toMatchObject({ response: { code: 'ORDER_NOT_REFUNDABLE' } });
    expect(gateway.refundTransaction).not.toHaveBeenCalled();
    expect(tx.idempotencyRecord.updateMany).not.toHaveBeenCalled();
  });
});
