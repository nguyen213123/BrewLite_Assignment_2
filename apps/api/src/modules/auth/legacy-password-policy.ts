import * as bcrypt from 'bcrypt';
import { ApiError } from '../../common/errors/api-error';

export const LEGACY_SEED_PASSWORDS = Object.freeze({ ADMIN: 'Admin123!', STAFF: 'Staff123!' });

type AccountPassword = { role: string; passwordHash: string };

export async function hasLegacySeedPassword(account: AccountPassword): Promise<boolean> {
  const password = account.role === 'ADMIN' ? LEGACY_SEED_PASSWORDS.ADMIN
    : account.role === 'STAFF' ? LEGACY_SEED_PASSWORDS.STAFF : undefined;
  return password !== undefined && await bcrypt.compare(password, account.passwordHash);
}

/** Shared by every status endpoint: a normal unlock must not bypass seed quarantine. */
export async function assertAccountActivationAllowed(account: AccountPassword, active: boolean): Promise<void> {
  if (active && await hasLegacySeedPassword(account)) {
    throw new ApiError(409, 'LEGACY_PASSWORD_RESET_REQUIRED',
      'Tài khoản còn dùng mật khẩu mặc định cũ. Phải đổi mật khẩu trước khi mở khóa.');
  }
}
