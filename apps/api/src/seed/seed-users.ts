import * as bcrypt from 'bcrypt';
import type { PrismaClient } from '../generated/prisma/client';
import { AUTH_POLICY } from '../modules/auth/auth-policy';

export const SEED_ADMIN_ID = '99999999-9999-4999-8999-999999999901';
export const SEED_ADMIN_EMAIL = 'admin@gmail.com';
export const LEGACY_ADMIN_EMAIL = 'admin@brewlite.local';
const LEGACY_PASSWORDS = { ADMIN: 'Admin123!', STAFF: 'Staff123!' } as const;

function seedPassword(env: NodeJS.ProcessEnv, key: string): string {
  const password = env[key];
  if (!password || password.trim().length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error(`${key} phải được cấu hình riêng, từ 8 ký tự đến 72 byte UTF-8`);
  }
  if (Object.values(LEGACY_PASSWORDS).some(value => value === password)) {
    throw new Error(`${key} không được dùng mật khẩu mặc định của bản seed cũ`);
  }
  return password;
}

export function seedAccounts(env: NodeJS.ProcessEnv) {
  return [
    { id: SEED_ADMIN_ID, email: SEED_ADMIN_EMAIL, role: 'ADMIN' as const, key: 'SEED_ADMIN_PASSWORD' },
    { id: '99999999-9999-4999-8999-999999999902', email: 'staff@brewlite.local', role: 'STAFF' as const, key: 'SEED_STAFF_PASSWORD' },
  ].map(({ key, ...account }) => ({ ...account, password: seedPassword(env, key) }));
}

export async function seedUsers(prisma: PrismaClient, env: NodeJS.ProcessEnv) {
  const accounts = seedAccounts(env);
  const locked: string[] = [];
  await prisma.$transaction(async tx => {
    for (const account of accounts) {
      const byEmail = await tx.user.findUnique({ where: { email: account.email } });
      if (byEmail && (byEmail.id !== account.id || byEmail.role !== account.role)) {
        throw new Error(`Seed từ chối email đã thuộc tài khoản khác: ${account.email}`);
      }
      const byId = byEmail ?? await tx.user.findUnique({ where: { id: account.id } });
      if (byId) {
        const legacyAdmin = byId.id === SEED_ADMIN_ID && byId.email === LEGACY_ADMIN_EMAIL && byId.role === 'ADMIN';
        if (byId.role !== account.role || (byId.email !== account.email && !legacyAdmin)) {
          throw new Error(`Seed từ chối ID đã thuộc tài khoản khác: ${account.id}`);
        }
        const usesDefault = await bcrypt.compare(LEGACY_PASSWORDS[account.role], byId.passwordHash);
        if (legacyAdmin || (usesDefault && byId.active)) {
          await tx.user.update({ where: { id: byId.id }, data: {
            ...(legacyAdmin ? { email: SEED_ADMIN_EMAIL } : {}), active: false,
          } });
          locked.push(account.email);
        }
        // Valid accounts retain password, role and lock state, even if env passwords change.
        continue;
      }
      const passwordHash = await bcrypt.hash(account.password, AUTH_POLICY.bcryptCost);
      const created = await tx.user.upsert({
        where: { email: account.email },
        create: { id: account.id, email: account.email, passwordHash, role: account.role, active: true, loyaltyPoints: 0 },
        update: {},
      });
      if (created.id !== account.id || created.role !== account.role) {
        throw new Error(`Seed từ chối email đã thuộc tài khoản khác: ${account.email}`);
      }
    }
  }, { timeout: 20000 });
  if (locked.length) console.warn(`Đã khóa tài khoản seed cũ cần đổi mật khẩu: ${locked.join(', ')}. Xem README trước khi sử dụng lại.`);
  return accounts.length;
}

/** Explicit maintenance action; never invoked by ordinary seed. */
export async function resetSeedAdmin(prisma: PrismaClient, env: NodeJS.ProcessEnv) {
  const passwordHash = await bcrypt.hash(seedPassword(env, 'SEED_ADMIN_PASSWORD'), AUTH_POLICY.bcryptCost);
  await prisma.$transaction(async tx => {
    const existing = await tx.user.findUnique({ where: { id: SEED_ADMIN_ID } });
    if (!existing || existing.role !== 'ADMIN' || existing.email !== SEED_ADMIN_EMAIL) {
      throw new Error('Chỉ đặt lại admin có đúng ID và email seed hiện tại; chạy seed nâng cấp trước nếu email còn cũ');
    }
    await tx.user.update({ where: { id: SEED_ADMIN_ID }, data: { passwordHash, active: true } });
  });
}
