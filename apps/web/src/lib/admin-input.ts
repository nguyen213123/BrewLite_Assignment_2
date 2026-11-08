export const MAX_ADMIN_QUANTITY = 2_147_483_647;

/** Empty inputs must never become an unintended zero-price or stock update. */
export function parseAdminQuantity(raw: string | number, max = MAX_ADMIN_QUANTITY): number | null {
  if (typeof raw === 'string' && raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 && value <= max ? value : null;
}
