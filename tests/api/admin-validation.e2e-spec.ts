import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AdminService } from '../../apps/api/src/modules/auth/admin.service';
import { AdminUpdateProductDto, AdminUpdateToppingDto, AdminUpdateIngredientDto, AdminCreatePromotionDto, MAX_ADMIN_INTEGER } from '../../apps/api/src/modules/auth/dto/auth.dto';

describe('Admin input validation regressions', () => {
  it('rejects explicit null values while allowing omitted patch fields', async () => {
    expect(await validate(plainToInstance(AdminUpdateProductDto, { expectedVersion: 1 }))).toEqual([]);
    for (const field of ['name', 'price', 'active']) {
      const errors = await validate(plainToInstance(AdminUpdateProductDto, { expectedVersion: 1, [field]: null }));
      expect(errors.some(error => error.property === field)).toBe(true);
    }
    for (const field of ['price', 'active']) {
      expect((await validate(plainToInstance(AdminUpdateToppingDto, { [field]: null }))).length).toBeGreaterThan(0);
    }
  });

  it('trims names before validating and rejects whitespace-only names', async () => {
    expect((await validate(plainToInstance(AdminUpdateProductDto, { expectedVersion: 1, name: '  \t ' }))).length).toBeGreaterThan(0);
    const dto = plainToInstance(AdminUpdateProductDto, { expectedVersion: 1, name: '  Coffee  ' });
    expect(await validate(dto)).toEqual([]);
    expect(dto.name).toBe('Coffee');
  });

  it('rejects price, stock and voucher values outside database integer bounds', async () => {
    for (const value of [MAX_ADMIN_INTEGER + 1, 3000000000, Number.MAX_SAFE_INTEGER]) {
      expect((await validate(plainToInstance(AdminUpdateProductDto, { expectedVersion: 1, price: value }))).length).toBeGreaterThan(0);
      expect((await validate(plainToInstance(AdminUpdateIngredientDto, { expectedVersion: 1, stock: value }))).length).toBeGreaterThan(0);
      expect((await validate(plainToInstance(AdminUpdateToppingDto, { price: value }))).length).toBeGreaterThan(0);
      const voucher = { code: 'SALE10', type: 'FIXED', value, minSubtotal: 0, startsAt: '2026-01-01T00:00:00Z', endsAt: '2027-01-01T00:00:00Z' };
      expect((await validate(plainToInstance(AdminCreatePromotionDto, voucher))).some(error => error.property === 'value')).toBe(true);
    }
    expect(await validate(plainToInstance(AdminUpdateIngredientDto, { expectedVersion: 1, stock: MAX_ADMIN_INTEGER }))).toEqual([]);
  });

  it('returns a validation error when shifting the base price would overflow a larger size', async () => {
    const tx = {
      product: { findUnique: async () => ({ price: 50000 }), updateMany: async () => ({ count: 1 }) },
      productSize: { findMany: async () => [{ id: 'l', price: 60000 }], update: jest.fn() },
    };
    const admin = new AdminService({ $transaction: async (work: (client: unknown) => Promise<unknown>) => work(tx) } as never);
    await expect(admin.updateProduct('p', { expectedVersion: 1, price: MAX_ADMIN_INTEGER }))
      .rejects.toMatchObject({ response: { code: 'VALIDATION_ERROR', statusCode: 400 } });
    expect(tx.productSize.update).not.toHaveBeenCalled();
  });
});
