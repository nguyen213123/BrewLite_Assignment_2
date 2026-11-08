import * as bcrypt from 'bcrypt';
import type { PrismaClient } from '../generated/prisma/client';
import { AUTH_POLICY } from '../modules/auth/auth-policy';

export function seedAccounts(env: NodeJS.ProcessEnv) {
  return [
    { id: '99999999-9999-4999-8999-999999999901', email: 'admin@gmail.com', role: 'ADMIN' as const, key: 'SEED_ADMIN_PASSWORD' },
    { id: '99999999-9999-4999-8999-999999999902', email: 'staff@brewlite.local', role: 'STAFF' as const, key: 'SEED_STAFF_PASSWORD' },
  ].map(({ key, ...account }) => {
    const password = env[key];
    if (!password || password.trim().length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error(`${key} phải được cấu hình riêng, từ 8 ký tự đến 72 byte UTF-8`);
    }
    return { ...account, password };
  });
}

export async function seedUsers(prisma: PrismaClient, env: NodeJS.ProcessEnv) {
  const accounts = seedAccounts(env);
  await prisma.$transaction(async tx => {
    for (const account of accounts) {
      const existing = await tx.user.findUnique({ where: { email: account.email } });
      if (existing) {
        if (existing.id !== account.id || existing.role !== account.role) {
          throw new Error(`Seed từ chối email đã thuộc tài khoản khác: ${account.email}`);
        }
        // Re-running seed must not change passwords, roles or locked status.
        continue;
      }
      const passwordHash = await bcrypt.hash(account.password, AUTH_POLICY.bcryptCost);
      const created = await tx.user.upsert({
        where: { email: account.email },
        create: { id: account.id, email: account.email, passwordHash, role: account.role, active: true, loyaltyPoints: 0 },
        update: {},
      });
      // A public registration may have won the email race after findUnique.
      if (created.id !== account.id || created.role !== account.role) {
        throw new Error(`Seed từ chối email đã thuộc tài khoản khác: ${account.email}`);
      }
    }
  }, { timeout: 20000 });
  return accounts.length;
}
