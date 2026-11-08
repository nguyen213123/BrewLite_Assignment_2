import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { MAX_ADMIN_INTEGER } from './dto/auth.dto';
import type {
  AdminCreatePromotionDto,
  AdminUpdateIngredientDto,
  AdminUpdateProductDto,
  AdminUpdatePromotionDto,
  AdminUpdateToppingDto,
} from './dto/auth.dto';

const PAID_ORDER_STATUSES = ['PAID', 'PREPARING', 'READY', 'COMPLETED'] as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [users, orders, products, ingredients, promotions] = await Promise.all([
      this.prisma.user.findMany({
        orderBy: [{ createdAt: 'desc' }],
        select: {
          id: true,
          email: true,
          role: true,
          active: true,
          loyaltyPoints: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      this.prisma.order.findMany({
        orderBy: [{ createdAt: 'desc' }],
        take: 30,
        include: {
          user: { select: { email: true } },
        },
      }),
      this.prisma.product.findMany({
        select: { id: true, active: true },
      }),
      this.prisma.ingredient.findMany({
        select: { id: true, stock: true, packageSize: true },
      }),
      this.prisma.promotion.findMany({
        select: { id: true, active: true },
      }),
    ]);

    const allOrdersAgg = await this.prisma.order.findMany({
      select: { status: true, payments: {
        where: { status: 'SUCCEEDED', isDuplicate: false },
        select: { amount: true },
      } },
    });

    let totalRevenue = 0;
    const ordersByStatus: Record<string, number> = {
      PENDING: 0,
      PAID: 0,
      PREPARING: 0,
      READY: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      PAYMENT_FAILED: 0,
    };

    for (const o of allOrdersAgg) {
      ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
      if ((PAID_ORDER_STATUSES as readonly string[]).includes(o.status)) {
        totalRevenue += o.payments.reduce((sum, payment) => sum + payment.amount, 0);
      }
    }

    const staffUsers = users.filter((u) => u.role === 'STAFF');
    const customerUsers = users.filter((u) => u.role === 'CUSTOMER');
    const lowStockCount = ingredients.filter((i) => i.stock < i.packageSize * 2).length;

    return {
      stats: {
        totalRevenue,
        totalOrders: allOrdersAgg.length,
        ordersByStatus,
        totalStaff: staffUsers.length,
        activeStaff: staffUsers.filter((s) => s.active).length,
        lockedStaff: staffUsers.filter((s) => !s.active).length,
        totalCustomers: customerUsers.length,
        activeCustomers: customerUsers.filter((c) => c.active).length,
        totalProducts: products.length,
        activeProducts: products.filter((p) => p.active).length,
        totalIngredients: ingredients.length,
        lowStockIngredients: lowStockCount,
        totalPromotions: promotions.length,
        activePromotions: promotions.filter((p) => p.active).length,
      },
      customers: customerUsers.map((c) => ({
        id: c.id,
        email: c.email,
        role: c.role,
        active: c.active,
        loyaltyPoints: c.loyaltyPoints,
        orderCount: c._count.orders,
        createdAt: c.createdAt.toISOString(),
      })),
      recentOrders: orders.map((o) => ({
        id: o.id,
        code: o.code,
        customerEmail: o.user.email,
        status: o.status,
        reservationStatus: o.reservationStatus,
        subtotal: o.subtotal,
        discount: o.discount,
        total: o.total,
        createdAt: o.createdAt.toISOString(),
      })),
    };
  }

  async setUserStatus(id: string, active: boolean) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role === 'ADMIN') {
      throw new ApiError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản người dùng');
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { active },
    });
    return {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      active: updated.active,
      loyaltyPoints: updated.loyaltyPoints,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async listCatalog() {
    const [products, toppings] = await Promise.all([
      this.prisma.product.findMany({
        orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
        include: {
          sizes: true,
          ingredients: {
            include: { ingredient: { select: { name: true, unit: true } } },
          },
        },
      }),
      this.prisma.topping.findMany({
        orderBy: [{ name: 'asc' }],
      }),
    ]);

    return {
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        imageUrl: p.imageUrl,
        active: p.active,
        version: p.version,
        sizes: p.sizes.map((s) => ({ size: s.size, price: s.price })),
        recipeSummary: p.ingredients.map((ri) => `${ri.ingredient.name} (${ri.amount} ${ri.ingredient.unit})`),
      })),
      toppings: toppings.map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price,
        active: t.active,
      })),
    };
  }

  async updateProduct(id: string, input: AdminUpdateProductDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id } });
      if (!existing) throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm');
      const changed = await tx.product.updateMany({
        where: { id, version: input.expectedVersion },
        data: {
          ...(input.active !== undefined ? { active: input.active } : {}),
          ...(input.price !== undefined ? { price: input.price } : {}),
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          version: { increment: 1 },
        },
      });
      if (changed.count !== 1) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Sản phẩm đã thay đổi. Vui lòng làm mới rồi thử lại.');
      }
      if (input.price !== undefined) {
        const diff = input.price - existing.price;
        if (diff !== 0) {
          const sizes = await tx.productSize.findMany({ where: { productId: id } });
          for (const size of sizes) {
            const nextPrice = Math.max(0, size.price + diff);
            if (nextPrice > MAX_ADMIN_INTEGER) {
              throw new ApiError(400, 'VALIDATION_ERROR', 'Giá sau điều chỉnh vượt giới hạn cho phép của một size');
            }
            await tx.productSize.update({
              where: { id: size.id },
              data: { price: nextPrice },
            });
          }
        }
      }
      return tx.product.findUniqueOrThrow({
        where: { id },
        select: { id: true, name: true, price: true, active: true, version: true,
          sizes: { select: { size: true, price: true } } },
      });
    });
  }

  async updateTopping(id: string, input: AdminUpdateToppingDto) {
    const existing = await this.prisma.topping.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, 'TOPPING_NOT_FOUND', 'Không tìm thấy topping');
    }

    const updated = await this.prisma.topping.update({
      where: { id },
      data: {
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      price: updated.price,
      active: updated.active,
    };
  }

  async listIngredients() {
    const ingredients = await this.prisma.ingredient.findMany({
      orderBy: [{ name: 'asc' }],
      include: {
        _count: {
          select: { products: true, toppings: true },
        },
      },
    });

    return {
      data: ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        stock: i.stock,
        packageSize: i.packageSize,
        packageLabel: i.packageLabel,
        version: i.version,
        usedInProducts: i._count.products,
        usedInToppings: i._count.toppings,
        lowStock: i.stock < i.packageSize * 2,
      })),
    };
  }

  async updateIngredientStock(id: string, input: AdminUpdateIngredientDto) {
    const existing = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, 'INGREDIENT_NOT_FOUND', 'Không tìm thấy nguyên liệu');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.ingredient.updateMany({
        where: { id, version: input.expectedVersion },
        data: { stock: input.stock, version: { increment: 1 } },
      });
      if (changed.count !== 1) {
        throw new ApiError(409, 'VERSION_CONFLICT', 'Tồn kho đã thay đổi. Vui lòng làm mới rồi thử lại.');
      }
      return tx.ingredient.findUniqueOrThrow({ where: { id } });
    });

    return {
      id: updated.id,
      name: updated.name,
      unit: updated.unit,
      stock: updated.stock,
      packageSize: updated.packageSize,
      packageLabel: updated.packageLabel,
      version: updated.version,
      lowStock: updated.stock < updated.packageSize * 2,
    };
  }

  async listPromotions() {
    const promotions = await this.prisma.promotion.findMany({
      orderBy: [{ startsAt: 'desc' }, { code: 'asc' }],
    });

    return {
      data: promotions.map((p) => ({
        id: p.id,
        code: p.code,
        type: p.type,
        value: p.value,
        minSubtotal: p.minSubtotal,
        maxDiscount: p.maxDiscount,
        maxUses: p.maxUses,
        usedCount: p.usedCount,
        startsAt: p.startsAt.toISOString(),
        endsAt: p.endsAt.toISOString(),
        active: p.active,
        version: p.version,
      })),
    };
  }

  async createPromotion(input: AdminCreatePromotionDto) {
    if (input.type === 'PERCENT' && (input.value < 1 || input.value > 100)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Phần trăm giảm giá phải từ 1% đến 100%');
    }
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (endsAt <= startsAt) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Thời gian kết thúc phải sau thời gian bắt đầu');
    }

    try {
      const created = await this.prisma.promotion.create({
        data: {
          code: input.code,
          type: input.type,
          value: input.value,
          minSubtotal: input.minSubtotal,
          maxDiscount: input.maxDiscount ?? null,
          maxUses: input.maxUses ?? null,
          startsAt,
          endsAt,
          active: true,
        },
      });
      return {
        id: created.id,
        code: created.code,
        type: created.type,
        value: created.value,
        minSubtotal: created.minSubtotal,
        maxDiscount: created.maxDiscount,
        maxUses: created.maxUses,
        usedCount: created.usedCount,
        startsAt: created.startsAt.toISOString(),
        endsAt: created.endsAt.toISOString(),
        active: created.active,
        version: created.version,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiError(409, 'PROMOTION_ALREADY_EXISTS', 'Mã khuyến mãi này đã tồn tại');
      }
      throw error;
    }
  }

  async updatePromotion(id: string, input: AdminUpdatePromotionDto) {
    const existing = await this.prisma.promotion.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError(404, 'PROMOTION_NOT_FOUND', 'Không tìm thấy mã khuyến mãi');
    }

    const updated = await this.prisma.promotion.update({
      where: { id },
      data: {
        active: input.active,
        version: { increment: 1 },
      },
    });

    return {
      id: updated.id,
      code: updated.code,
      active: updated.active,
      version: updated.version,
    };
  }
}
