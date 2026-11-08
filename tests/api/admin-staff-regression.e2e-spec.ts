import { AdminService } from '../../apps/api/src/modules/auth/admin.service';
import { OrderReaderService } from '../../apps/api/src/modules/orders/order-reader.service';
import { PrismaService } from '../../apps/api/src/prisma/prisma.service';
import { validate } from 'class-validator';
import { AdminUpdateIngredientDto, AdminUpdateProductDto } from '../../apps/api/src/modules/auth/dto/auth.dto';

describe('Admin and staff regressions', () => {
  function fixture() {
    let state = {
      product: { id: 'p', name: 'Coffee', price: 20000, active: true, version: 2 },
      sizes: [{ id: 's', size: 'S', price: 20000 }, { id: 'm', size: 'M', price: 25000 }],
      ingredient: { id: 'i', name: 'Milk', stock: 80, version: 3, packageSize: 100, packageLabel: 'box', unit: 'ML' },
    };
    let failSize = false;
    const tx = {
      product: {
        findUnique: async () => ({ ...state.product }),
        updateMany: async ({ where, data }: { where: { version: number }; data: { price?: number; version: unknown } }) => {
          if (where.version !== state.product.version) return { count: 0 };
          if (data.price !== undefined) state.product.price = data.price;
          state.product.version++;
          return { count: 1 };
        },
        findUniqueOrThrow: async () => ({ ...state.product, sizes: state.sizes }),
      },
      productSize: {
        findMany: async () => structuredClone(state.sizes),
        update: async ({ where, data }: { where: { id: string }; data: { price: number } }) => {
          if (failSize && where.id === 'm') throw new Error('size write failed');
          state.sizes.find((s) => s.id === where.id)!.price = data.price;
        },
      },
      ingredient: {
        findUnique: async () => ({ ...state.ingredient }),
        updateMany: async ({ where, data }: { where: { version: number }; data: { stock: number } }) => {
          if (where.version !== state.ingredient.version) return { count: 0 };
          state.ingredient.stock = data.stock;
          state.ingredient.version++;
          return { count: 1 };
        },
        findUniqueOrThrow: async () => ({ ...state.ingredient }),
      },
    };
    const prisma = {
      ingredient: tx.ingredient,
      $transaction: async (work: (client: typeof tx) => Promise<unknown>) => {
        const before = structuredClone(state);
        try { return await work(tx); }
        catch (error) { state = before; throw error; }
      },
    };
    return {
      service: new AdminService(prisma as unknown as PrismaService),
      state: () => state,
      failSize: () => { failSize = true; },
    };
  }

  it('allows the exact money cap when all sizes fit and rolls back a larger-size overflow', async () => {
    const valid = fixture();
    for (const size of valid.state().sizes) size.price = 20000;
    const saved = await valid.service.updateProduct('p', { expectedVersion: 2, price: 2000000000 });
    expect(saved.price).toBe(2000000000);
    expect(saved.sizes.map(size => size.price)).toEqual([2000000000, 2000000000]);
    const overflow = fixture();
    const before = structuredClone(overflow.state());
    await expect(overflow.service.updateProduct('p', { expectedVersion: 2, price: 2000000000 }))
      .rejects.toMatchObject({ response: { statusCode: 400, code: 'VALIDATION_ERROR' } });
    expect(overflow.state()).toEqual(before);
  });

  it('rejects an old stock snapshot after a checkout changes inventory', async () => {
    const f = fixture();
    await expect(f.service.updateIngredientStock('i', { stock: 200, expectedVersion: 2 }))
      .rejects.toMatchObject({ response: { code: 'VERSION_CONFLICT' } });
    expect(f.state().ingredient.stock).toBe(80);
    expect(f.state().ingredient.version).toBe(3);
  });

  it('updates size prices and rejects a second admin using an old version', async () => {
    const f = fixture();
    const result = await f.service.updateProduct('p', { price: 30000, expectedVersion: 2 });
    expect(result.sizes.map((size) => size.price)).toEqual([30000, 35000]);
    await expect(f.service.updateProduct('p', { price: 40000, expectedVersion: 2 }))
      .rejects.toMatchObject({ response: { code: 'VERSION_CONFLICT' } });
    expect(f.state().product.price).toBe(30000);
  });

  it('rolls back the base price and all sizes when one size update fails', async () => {
    const f = fixture();
    f.failSize();
    await expect(f.service.updateProduct('p', { price: 30000, expectedVersion: 2 })).rejects.toThrow('size write failed');
    expect(f.state().product.price).toBe(20000);
    expect(f.state().product.version).toBe(2);
    expect(f.state().sizes.map((size) => size.price)).toEqual([20000, 25000]);
  });

  it('requires a version on admin stock and product requests', async () => {
    for (const dto of [Object.assign(new AdminUpdateIngredientDto(), { stock: 10 }), Object.assign(new AdminUpdateProductDto(), { price: 10 })]) {
      expect((await validate(dto)).some((error) => error.property === 'expectedVersion')).toBe(true);
    }
  });

  it('filters before pagination and returns counts across all pages', async () => {
    const order = {
      count: jest.fn().mockResolvedValue(25),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([{ status: 'PAID', _count: { _all: 25 } }, { status: 'COMPLETED', _count: { _all: 80 } }]),
    };
    const reader = new OrderReaderService({ order } as unknown as PrismaService);
    const page = await reader.listAllForStaff({ page: 2, limit: 20, status: 'PAID' });
    expect(order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PAID' }, skip: 20, take: 20 }));
    expect(order.count).toHaveBeenCalledWith({ where: { status: 'PAID' } });
    expect(page.meta.totalPages).toBe(2);
    expect(page.statusCounts).toEqual({ PAID: 25, COMPLETED: 80 });
  });
});
