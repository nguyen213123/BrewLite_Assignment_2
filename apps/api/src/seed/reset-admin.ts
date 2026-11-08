import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { resetSeedAdmin } from './seed-users';

const prisma = new PrismaClient({ adapter: new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? 'postgresql://brewlite:brewlite_dev@localhost:5432/brewlite?schema=public',
}) });
resetSeedAdmin(prisma, process.env)
  .then(() => console.log('Đã đổi mật khẩu và kích hoạt admin seed.'))
  .catch(() => { console.error('Không thể đặt lại admin. Kiểm tra mật khẩu mới, ID/email/role và kết nối database theo README.'); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
