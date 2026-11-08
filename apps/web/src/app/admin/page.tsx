'use client';

import { Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiGet, apiPatch, apiPost, ApiRequestError } from '@/lib/api';
import { getAuthSnapshot, getAuthServerSnapshot, subscribeAuth } from '@/lib/auth';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import type { OrderStatus } from '@/lib/contracts/api.generated';
import { formatVnd } from '@/lib/format';
import { MAX_ADMIN_MONEY, MAX_ADMIN_QUANTITY, parseAdminMoney, parseAdminQuantity } from '@/lib/admin-input';

type AdminTab = 'staff' | 'overview' | 'catalog' | 'inventory' | 'promotions';

type StaffAccount = {
  id: string;
  email: string;
  role: 'STAFF';
  active: boolean;
  createdAt: string;
};

type CustomerAccount = {
  id: string;
  email: string;
  role: 'CUSTOMER';
  active: boolean;
  loyaltyPoints: number;
  orderCount: number;
  createdAt: string;
};

type AdminOverviewResponse = {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    ordersByStatus: Record<string, number>;
    totalStaff: number;
    activeStaff: number;
    lockedStaff: number;
    totalCustomers: number;
    activeCustomers: number;
    totalProducts: number;
    activeProducts: number;
    totalIngredients: number;
    lowStockIngredients: number;
    totalPromotions: number;
    activePromotions: number;
  };
  customers: CustomerAccount[];
  recentOrders: Array<{
    id: string;
    code: string;
    customerEmail: string;
    status: OrderStatus;
    reservationStatus: string;
    subtotal: number;
    discount: number;
    total: number;
    createdAt: string;
  }>;
};

type AdminProductItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  active: boolean;
  version: number;
  sizes: Array<{ size: string; price: number }>;
  recipeSummary: string[];
};

type AdminToppingItem = {
  id: string;
  name: string;
  price: number;
  active: boolean;
  version: number;
};

type AdminIngredientItem = {
  id: string;
  name: string;
  unit: 'GRAM' | 'ML' | 'PIECE';
  stock: number;
  packageSize: number;
  packageLabel: string;
  version: number;
  usedInProducts: number;
  usedInToppings: number;
  lowStock: boolean;
  updatedAt: string;
};

type AdminPromotionItem = {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  minSubtotal: number;
  maxDiscount: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string;
  endsAt: string;
  active: boolean;
  version: number;
};

type StaffStatusFilter = 'ALL' | 'ACTIVE' | 'LOCKED';

function AdminPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: AdminTab =
    tabParam === 'overview' ||
    tabParam === 'catalog' ||
    tabParam === 'inventory' ||
    tabParam === 'promotions'
      ? tabParam
      : 'staff';

  const user = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthServerSnapshot);

  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [products, setProducts] = useState<AdminProductItem[]>([]);
  const [toppings, setToppings] = useState<AdminToppingItem[]>([]);
  const [ingredients, setIngredients] = useState<AdminIngredientItem[]>([]);
  const [promotions, setPromotions] = useState<AdminPromotionItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Staff creation form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Product / Ingredient inline edit state
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  // New promotion form state
  const [promoCode, setPromoCode] = useState('');
  const [promoType, setPromoType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [promoValue, setPromoValue] = useState('10');
  const [promoMinSubtotal, setPromoMinSubtotal] = useState('50000');
  const [promoMaxDiscount, setPromoMaxDiscount] = useState('30000');
  const [promoMaxUses, setPromoMaxUses] = useState('100');
  const [promoBusy, setPromoBusy] = useState(false);
  const [promotionNow, setPromotionNow] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setPromotionNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let ignore = false;
    if (!user || user.role !== 'ADMIN') {
      return;
    }

    async function loadAdminData() {
      try {
        const [staffRes, overviewRes, catalogRes, ingRes, promoRes] = await Promise.all([
          apiGet<{ data: StaffAccount[] }>('/auth/staff'),
          apiGet<AdminOverviewResponse>('/auth/admin/overview'),
          apiGet<{ products: AdminProductItem[]; toppings: AdminToppingItem[] }>(
            '/auth/admin/catalog',
          ),
          apiGet<{ data: AdminIngredientItem[] }>('/auth/admin/ingredients'),
          apiGet<{ data: AdminPromotionItem[] }>('/auth/admin/promotions'),
        ]);
        if (!ignore) {
          setStaffList(staffRes.data);
          setOverview(overviewRes);
          setProducts(catalogRes.products);
          setToppings(catalogRes.toppings);
          setIngredients(ingRes.data);
          setPromotions(promoRes.data);
          setPromotionNow(Date.now());
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof ApiRequestError) {
            setError(err.message || 'Không thể tải dữ liệu quản trị hệ thống.');
          } else {
            setError('Không thể kết nối tới máy chủ.');
          }
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadAdminData();
    return () => {
      ignore = true;
    };
  }, [user, refreshToken]);

  function selectTab(tab: AdminTab) {
    setActionBanner(null);
    router.push(`/admin?tab=${tab}`);
  }

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setCreateError('Vui lòng nhập email nhân viên.');
      return;
    }
    if (password.length < 8) {
      setCreateError('Mật khẩu khởi tạo phải có tối thiểu 8 ký tự (gồm chữ hoa, chữ thường và số).');
      return;
    }

    setCreateBusy(true);
    try {
      const created = await apiPost<StaffAccount>('/auth/staff', {
        email: trimmedEmail,
        password,
      });
      setStaffList((prev) => [created, ...prev]);
      setEmail('');
      setPassword('');
      setCreateSuccess(`Đã cấp tài khoản nhân viên ${created.email} thành công.`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (err.code === 'EMAIL_ALREADY_EXISTS') {
          setCreateError('Email này đã được sử dụng trong hệ thống.');
        } else {
          setCreateError(err.message || 'Không thể tạo tài khoản nhân viên.');
        }
      } else {
        setCreateError('Lỗi kết nối tới máy chủ.');
      }
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleToggleStaffStatus(staff: StaffAccount) {
    if (togglingId) return;
    setTogglingId(staff.id);
    setError(null);
    try {
      const updated = await apiPatch<StaffAccount>(`/auth/staff/${staff.id}/status`, {
        active: !staff.active,
      });
      setStaffList((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setActionBanner(
        `Đã ${updated.active ? 'mở khóa' : 'khóa tức thì'} tài khoản nhân viên ${updated.email}.`,
      );
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message || 'Không thể cập nhật trạng thái tài khoản nhân viên.');
      } else {
        setError('Lỗi kết nối tới máy chủ.');
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function handleToggleCustomerStatus(customer: CustomerAccount) {
    if (togglingId) return;
    setTogglingId(customer.id);
    setError(null);
    try {
      const updated = await apiPatch<{ id: string; active: boolean }>(
        `/auth/admin/users/${customer.id}/status`,
        { active: !customer.active },
      );
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              customers: prev.customers.map((c) =>
                c.id === updated.id ? { ...c, active: updated.active } : c,
              ),
            }
          : prev,
      );
      setActionBanner(
        `Đã ${updated.active ? 'mở khóa' : 'khóa'} tài khoản khách hàng ${customer.email}.`,
      );
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message || 'Không thể cập nhật trạng thái khách hàng.');
      } else {
        setError('Lỗi kết nối tới máy chủ.');
      }
    } finally {
      setTogglingId(null);
    }
  }

  async function handleToggleProductActive(product: AdminProductItem) {
    if (busyItemId) return;
    setBusyItemId(product.id);
    setError(null);
    try {
      const updated = await apiPatch<Pick<AdminProductItem, 'id' | 'active' | 'price' | 'version' | 'sizes'>>(
        `/auth/admin/products/${product.id}`,
        { active: !product.active, expectedVersion: product.version },
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, active: updated.active, price: updated.price, version: updated.version, sizes: updated.sizes } : p)),
      );
      setActionBanner(
        `Đã ${updated.active ? 'mở bán lại' : 'tạm ngưng bán'} món "${product.name}".`,
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Không thể cập nhật sản phẩm.');
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleSaveProductPrice(product: AdminProductItem) {
    if (busyItemId) return;
    const raw = priceDrafts[product.id];
    if (raw === undefined) return;
    const maxPrice = MAX_ADMIN_MONEY - Math.max(0, ...product.sizes.map((size) => size.price - product.price));
    const parsed = parseAdminMoney(raw, maxPrice);
    if (parsed === null) {
      setError(`Giá bán phải là số nguyên từ 0 đến ${formatVnd(maxPrice)}.`);
      return;
    }
    setBusyItemId(product.id);
    setError(null);
    try {
      const updated = await apiPatch<Pick<AdminProductItem, 'id' | 'active' | 'price' | 'version' | 'sizes'>>(
        `/auth/admin/products/${product.id}`,
        { price: parsed, expectedVersion: product.version },
      );
      setProducts((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, price: updated.price, active: updated.active, version: updated.version, sizes: updated.sizes } : p)),
      );
      setActionBanner(`Đã cập nhật giá món "${product.name}" thành ${formatVnd(updated.price)}.`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Không thể cập nhật giá sản phẩm.');
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleToggleToppingActive(topping: AdminToppingItem) {
    if (busyItemId) return;
    setBusyItemId(topping.id);
    setError(null);
    try {
      const updated = await apiPatch<{ id: string; active: boolean; price: number; version: number }>(
        `/auth/admin/toppings/${topping.id}`,
        { active: !topping.active },
      );
      setToppings((prev) =>
        prev.map((t) => (t.id === updated.id ? { ...t, active: updated.active, version: updated.version } : t)),
      );
      setActionBanner(
        `Đã ${updated.active ? 'mở bán' : 'tạm ngưng'} topping "${topping.name}".`,
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Không thể cập nhật topping.');
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleUpdateIngredientStock(ing: AdminIngredientItem, newStock: string | number) {
    if (busyItemId) return;
    const parsedStock = parseAdminQuantity(newStock);
    if (parsedStock === null) {
      setError(`Tồn kho phải là số nguyên từ 0 đến ${MAX_ADMIN_QUANTITY.toLocaleString('vi-VN')}.`);
      return;
    }
    setBusyItemId(ing.id);
    setError(null);
    try {
      const updated = await apiPatch<{
        id: string;
        stock: number;
        version: number;
        lowStock: boolean;
        updatedAt: string;
      }>(`/auth/admin/ingredients/${ing.id}`, { stock: parsedStock, expectedVersion: ing.version });
      setIngredients((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                stock: updated.stock,
                version: updated.version,
                lowStock: updated.lowStock,
                updatedAt: updated.updatedAt,
              }
            : item,
        ),
      );
      setStockDrafts((prev) => ({ ...prev, [ing.id]: String(updated.stock) }));
      setActionBanner(
        `Đã cập nhật tồn kho "${ing.name}" lên ${updated.stock.toLocaleString('vi-VN')} ${ing.unit}.`,
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Không thể cập nhật tồn kho.');
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleCreatePromotion(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = promoCode.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      setError('Mã khuyến mãi phải dài 3–32 ký tự, chỉ gồm chữ A–Z, số, _ và -.');
      return;
    }
    const value = parseAdminMoney(promoValue, promoType === 'PERCENT' ? 100 : MAX_ADMIN_MONEY);
    const minSubtotal = parseAdminMoney(promoMinSubtotal);
    const maxDiscount = promoType === 'PERCENT' && promoMaxDiscount.trim() !== '' ? parseAdminMoney(promoMaxDiscount) : undefined;
    const maxUses = promoMaxUses.trim() !== '' ? parseAdminQuantity(promoMaxUses) : undefined;
    if (value === null || value < 1 || minSubtotal === null || maxDiscount === null || maxUses === null || maxUses === 0) {
      setError('Kiểm tra giá trị voucher: tiền từ 0 đến 2 tỷ đồng, phần trăm từ 1 đến 100 và số lượt phải là số nguyên dương.');
      return;
    }
    setPromoBusy(true);
    try {
      const now = new Date();
      const ends = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 60);
      const created = await apiPost<AdminPromotionItem>('/auth/admin/promotions', {
        code,
        type: promoType,
        value,
        minSubtotal,
        ...(maxDiscount !== undefined ? { maxDiscount } : {}),
        ...(maxUses !== undefined ? { maxUses } : {}),
        startsAt: now.toISOString(),
        endsAt: ends.toISOString(),
      });
      setPromotions((prev) => [created, ...prev]);
      setPromoCode('');
      setActionBanner(`Đã tạo mã khuyến mãi ${created.code} thành công.`);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Không thể tạo mã khuyến mãi.');
    } finally {
      setPromoBusy(false);
    }
  }

  async function handleTogglePromotion(promo: AdminPromotionItem) {
    if (busyItemId) return;
    setBusyItemId(promo.id);
    setError(null);
    try {
      const updated = await apiPatch<{ id: string; active: boolean; version: number }>(
        `/auth/admin/promotions/${promo.id}`,
        { active: !promo.active },
      );
      setPromotions((prev) =>
        prev.map((p) => (p.id === updated.id ? { ...p, active: updated.active, version: updated.version } : p)),
      );
      setActionBanner(
        `Đã ${updated.active ? 'kích hoạt' : 'vô hiệu hóa'} mã khuyến mãi ${promo.code}.`,
      );
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Không thể cập nhật khuyến mãi.');
    } finally {
      setBusyItemId(null);
    }
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mx-auto max-w-lg rounded-2xl border border-[#e2d2b8] bg-[#efe5d4] p-10 text-center shadow-xs">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#cbe8d3] text-3xl">
            🛡️
          </div>
          <p className="eyebrow mt-4">BrewLite Mộc Vị / Quản trị hệ thống</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#4a2e20]">Cần đăng nhập Admin</h1>
          <p className="mt-2 text-sm text-[#7a6254]">
            Vui lòng đăng nhập bằng tài khoản Quản trị viên (ADMIN) để truy cập Trung tâm Quản trị Hệ thống.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-full bg-[#6d4c3d] px-7 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#563a2d]"
          >
            Đăng nhập ngay
          </Link>
        </div>
      </main>
    );
  }

  if (user.role !== 'ADMIN') {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div
          role="alert"
          className="mx-auto max-w-lg rounded-2xl border border-[#e5b8b8] bg-[#fbeaea] p-10 text-center shadow-xs"
        >
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-white text-3xl">
            🚫
          </div>
          <p className="eyebrow mt-4 text-[#9b2c2c]">403 FORBIDDEN</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#9b2c2c]">Không có quyền truy cập</h1>
          <p className="mt-2 text-sm text-[#7a6254]">
            Trung tâm quản trị chỉ dành cho Quản trị viên (<strong>ADMIN</strong>). Tài khoản hiện tại của bạn có vai trò <strong>{user.role}</strong>.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {user.role === 'STAFF' ? (
              <Link
                href="/staff"
                className="rounded-full bg-[#6d4c3d] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#563a2d]"
              >
                Về Quầy Pha Chế →
              </Link>
            ) : (
              <Link
                href="/menu"
                className="rounded-full bg-[#6d4c3d] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#563a2d]"
              >
                Về Thực Đơn →
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  const activeStaffCount = staffList.filter((s) => s.active).length;
  const lockedStaffCount = staffList.length - activeStaffCount;
  const lowStockCount = ingredients.filter((i) => i.lowStock).length;
  // These lists are updated immediately after successful edits; the initial overview snapshot is stale.
  const activeProductCount = products.filter((product) => product.active).length;
  const activePromotionCount = promotions.filter((promotion) => promotion.active).length;

  const filteredStaff = staffList.filter((staff) => {
    if (statusFilter === 'ACTIVE' && !staff.active) return false;
    if (statusFilter === 'LOCKED' && staff.active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return staff.email.toLowerCase().includes(q) || staff.id.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      {/* Banner Trung tâm Quản trị Hệ thống */}
      <section className="border-b border-[#b5dcc0] bg-[#cbe8d3]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Trung Tâm Quản Trị Hệ Thống · Quyền hạn: ADMIN</p>
            <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-[#4a2e20] sm:text-4xl">
              Quản Trị Toàn Diện BrewLite
            </h1>
            <p className="mt-1 text-sm text-[#5c4033]">
              Quản lý tài khoản Nhân viên &amp; Khách hàng, Sản phẩm &amp; Thực đơn, Kho nguyên liệu, Mã khuyến mãi và Doanh thu toàn cửa hàng.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setRefreshToken((t) => t + 1);
              }}
              disabled={loading}
              className="rounded-full border-2 border-[#6d4c3d] bg-white px-5 py-2 text-xs font-bold text-[#4a2e20] transition hover:bg-[#6d4c3d] hover:text-white disabled:opacity-50"
            >
              {loading ? 'Đang đồng bộ…' : '↻ Đồng bộ dữ liệu'}
            </button>
          </div>
        </div>

        {/* Thanh Tab chuyển đổi 5 phân hệ quản trị của Admin */}
        <div className="mx-auto flex max-w-6xl flex-wrap gap-2 px-6 pb-4">
          {(
            [
              { id: 'staff', label: `👥 Nhân Sự & Tài Khoản (${staffList.length} Staff)` },
              { id: 'overview', label: `📊 Tổng Quan & Đơn Hàng (${overview?.stats.totalOrders ?? 0})` },
              { id: 'catalog', label: `🧋 Sản Phẩm & Menu (${products.length} món)` },
              {
                id: 'inventory',
                label: `📦 Kho Nguyên Liệu (${ingredients.length}${lowStockCount > 0 ? ` · ⚠️ ${lowStockCount}` : ''})`,
              },
              { id: 'promotions', label: `🎟️ Mã Khuyến Mãi (${promotions.length})` },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`rounded-full px-4 py-2 text-xs font-extrabold transition ${
                  active
                    ? 'bg-[#6d4c3d] text-white shadow-xs'
                    : 'border border-[#9ec5ab] bg-white/85 text-[#4a2e20] hover:bg-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Thông báo chung */}
      <div className="mx-auto max-w-6xl px-6 pt-6">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-[#e5b8b8] bg-[#fbeaea] p-4 text-xs font-bold text-[#9b2c2c]"
          >
            {error}
          </div>
        )}
        {actionBanner && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between rounded-xl border border-[#b5dcc0] bg-[#eef7f0] p-3.5 text-xs font-bold text-[#2d6a4f]"
          >
            <span>✓ {actionBanner}</span>
            <button
              type="button"
              onClick={() => setActionBanner(null)}
              className="text-xs font-extrabold text-[#2d6a4f] underline"
            >
              Đóng
            </button>
          </div>
        )}
      </div>

      {/* ================= TAB 1: QUẢN LÝ NHÂN SỰ & TÀI KHOẢN ================= */}
      {activeTab === 'staff' && (
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-4 pb-12">
          <section className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#e2d2b8] bg-white p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[#7a6254]">
                Tổng Nhân Viên (STAFF)
              </p>
              <p className="mt-2 text-3xl font-extrabold text-[#4a2e20]">{staffList.length}</p>
              <p className="mt-1 text-xs text-[#7a6254]">Do Admin cấp phát</p>
            </div>
            <div className="rounded-2xl border border-[#b5dcc0] bg-[#eef7f0] p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2d6a4f]">
                STAFF Đang Hoạt Động
              </p>
              <p className="mt-2 text-3xl font-extrabold text-[#2d6a4f]">{activeStaffCount}</p>
              <p className="mt-1 text-xs text-[#2d6a4f]">Được phép vận hành quầy</p>
            </div>
            <div className="rounded-2xl border border-[#e5b8b8] bg-[#fbeaea] p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9b2c2c]">
                STAFF Đang Bị Khóa
              </p>
              <p className="mt-2 text-3xl font-extrabold text-[#9b2c2c]">{lockedStaffCount}</p>
              <p className="mt-1 text-xs text-[#9b2c2c]">Thu hồi quyền API tức thì</p>
            </div>
            <div className="rounded-2xl border border-[#e2d2b8] bg-[#efe5d4] p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[#6d4c3d]">
                Tài Khoản Khách Hàng
              </p>
              <p className="mt-2 text-3xl font-extrabold text-[#4a2e20]">
                {overview?.customers.length ?? 0}
              </p>
              <p className="mt-1 text-xs text-[#7a6254]">Khách hàng thành viên</p>
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
            {/* Cột trái: Form cấp tài khoản STAFF */}
            <section className="self-start rounded-2xl border border-[#e2d2b8] bg-[#efe5d4] p-4 shadow-xs">
              <div className="rounded-xl bg-white p-6">
                <h2 className="text-lg font-extrabold text-[#4a2e20]">
                  + Cấp tài khoản Nhân viên (STAFF)
                </h2>
                <p className="mt-1 text-xs text-[#7a6254]">
                  Nhân viên không thể tự đăng ký hoặc nâng quyền. Admin cấp tài khoản tại đây và bàn giao cho nhân viên.
                </p>

                {createError && (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-[#e5b8b8] bg-[#fbeaea] p-3 text-xs font-bold text-[#9b2c2c]"
                  >
                    {createError}
                  </div>
                )}

                {createSuccess && (
                  <div
                    role="status"
                    className="mt-4 rounded-xl border border-[#b5dcc0] bg-[#eef7f0] p-3 text-xs font-bold text-[#2d6a4f]"
                  >
                    ✓ {createSuccess}
                  </div>
                )}

                <form onSubmit={handleCreateStaff} className="mt-4 space-y-4" noValidate>
                  <div>
                    <label htmlFor="staff-email" className="block text-xs font-bold text-[#4a2e20]">
                      Email nhân viên
                    </label>
                    <input
                      id="staff-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="barista01@brewlite.local"
                      required
                      disabled={createBusy}
                      className="mt-1 block w-full rounded-xl border border-[#decbb4] bg-[#faf6ec] px-3.5 py-2.5 text-sm text-[#4a2e20] outline-none transition focus:border-[#6d4c3d] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="staff-password"
                      className="block text-xs font-bold text-[#4a2e20]"
                    >
                      Mật khẩu khởi tạo
                    </label>
                    <input
                      id="staff-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ví dụ: Staff123!"
                      required
                      disabled={createBusy}
                      className="mt-1 block w-full rounded-xl border border-[#decbb4] bg-[#faf6ec] px-3.5 py-2.5 text-sm text-[#4a2e20] outline-none transition focus:border-[#6d4c3d] focus:bg-white"
                    />
                    <p className="mt-1 text-[11px] text-[#7a6254]">
                      Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và chữ số.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={createBusy}
                    className="w-full rounded-full bg-[#6d4c3d] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#563a2d] disabled:opacity-60"
                  >
                    {createBusy ? 'Đang tạo tài khoản…' : 'Cấp tài khoản STAFF'}
                  </button>
                </form>
              </div>
            </section>

            {/* Cột phải: Danh sách nhân viên & khách hàng */}
            <section className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-2xl border border-[#e2d2b8] bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        { id: 'ALL', label: `Tất cả STAFF (${staffList.length})` },
                        { id: 'ACTIVE', label: `Đang hoạt động (${activeStaffCount})` },
                        { id: 'LOCKED', label: `Đã khóa (${lockedStaffCount})` },
                      ] as const
                    ).map((tab) => {
                      const active = statusFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setStatusFilter(tab.id)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                            active
                              ? 'bg-[#6d4c3d] text-white'
                              : 'border border-[#decbb4] bg-[#faf6ec] text-[#4a2e20] hover:bg-[#efe5d4]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo email nhân viên…"
                    className="rounded-full border border-[#decbb4] bg-[#faf6ec] px-4 py-1.5 text-xs text-[#4a2e20] outline-none transition focus:border-[#6d4c3d] focus:bg-white sm:w-60"
                  />
                </div>

                {filteredStaff.map((staff) => {
                  const isBusy = togglingId === staff.id;
                  return (
                    <div
                      key={staff.id}
                      className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e2d2b8] bg-white p-5 shadow-xs sm:flex-row sm:items-center"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-base font-extrabold text-[#4a2e20]">
                            {staff.email}
                          </span>
                          <span className="rounded bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-[#4a2e20]">
                            {staff.role}
                          </span>
                          {staff.active ? (
                            <span className="rounded-full bg-[#cbe8d3] px-2.5 py-0.5 text-xs font-bold text-[#2d6a4f]">
                              ● Đang hoạt động
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#fbeaea] px-2.5 py-0.5 text-xs font-bold text-[#9b2c2c]">
                              🔒 Đã khóa tức thì
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#7a6254]">
                          ID: <span className="font-mono">{staff.id}</span> · Ngày cấp:{' '}
                          {new Date(staff.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleStaffStatus(staff)}
                          className={`rounded-full px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${
                            staff.active
                              ? 'border border-[#e5b8b8] bg-[#fbeaea] text-[#9b2c2c] hover:bg-[#f5d5d5]'
                              : 'bg-[#2d6a4f] text-white hover:bg-[#1b4332]'
                          }`}
                        >
                          {isBusy
                            ? 'Đang xử lý…'
                            : staff.active
                              ? '🔒 Khóa tài khoản'
                              : '🔓 Mở khóa tài khoản'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Danh sách khách hàng thành viên */}
              {overview && overview.customers.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h3 className="text-lg font-extrabold text-[#4a2e20]">
                    Tài Khoản Khách Hàng Thành Viên ({overview.customers.length})
                  </h3>
                  {overview.customers.map((customer) => {
                    const isBusy = togglingId === customer.id;
                    return (
                      <div
                        key={customer.id}
                        className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e2d2b8] bg-white p-4 shadow-xs sm:flex-row sm:items-center"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold text-[#4a2e20]">
                              {customer.email}
                            </span>
                            <span className="rounded bg-[#efe5d4] px-2 py-0.5 text-[10px] font-bold text-[#6d4c3d]">
                              CUSTOMER
                            </span>
                            <span className="rounded-full bg-[#cbe8d3] px-2 py-0.5 text-[10px] font-bold text-[#2d6a4f]">
                              ★ {customer.loyaltyPoints} điểm · {customer.orderCount} đơn
                            </span>
                            {!customer.active && (
                              <span className="rounded-full bg-[#fbeaea] px-2 py-0.5 text-[10px] font-bold text-[#9b2c2c]">
                                🔒 Đã khóa
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#7a6254]">
                            Tham gia: {new Date(customer.createdAt).toLocaleString('vi-VN')}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleCustomerStatus(customer)}
                          className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                            customer.active
                              ? 'border border-[#e5b8b8] bg-[#fbeaea] text-[#9b2c2c] hover:bg-[#f5d5d5]'
                              : 'bg-[#2d6a4f] text-white hover:bg-[#1b4332]'
                          }`}
                        >
                          {customer.active ? '🔒 Khóa khách hàng' : '🔓 Mở khóa'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ================= TAB 2: TỔNG QUAN DOANH THU & ĐƠN HÀNG ================= */}
      {activeTab === 'overview' && overview && (
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-4 pb-12">
          <section className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#b5dcc0] bg-[#eef7f0] p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[#2d6a4f]">
                Doanh Thu Thực Thu
              </p>
              <p className="mt-2 text-2xl font-extrabold text-[#2d6a4f]">
                {formatVnd(overview.stats.totalRevenue)}
              </p>
              <p className="mt-1 text-xs text-[#2d6a4f]">Thanh toán chính thành công, chưa hoàn tiền</p>
            </div>
            <div className="rounded-2xl border border-[#e2d2b8] bg-white p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[#7a6254]">
                Tổng Số Đơn Hàng
              </p>
              <p className="mt-2 text-2xl font-extrabold text-[#4a2e20]">
                {overview.stats.totalOrders}
              </p>
              <p className="mt-1 text-xs text-[#7a6254]">
                Hoàn tất: {overview.stats.ordersByStatus.COMPLETED ?? 0} · Đang xử lý:{' '}
                {(overview.stats.ordersByStatus.PAID ?? 0) +
                  (overview.stats.ordersByStatus.PREPARING ?? 0) +
                  (overview.stats.ordersByStatus.READY ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-[#e2d2b8] bg-white p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[#7a6254]">
                Thực Đơn Đang Mở Bán
              </p>
              <p className="mt-2 text-2xl font-extrabold text-[#4a2e20]">
                {activeProductCount} / {products.length} món
              </p>
              <p className="mt-1 text-xs text-[#7a6254]">
                Khuyến mãi đang bật: {activePromotionCount}/{promotions.length}
              </p>
            </div>
            <div className="rounded-2xl border border-[#e2d2b8] bg-[#fff8eb] p-5 shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[#9c6512]">
                Tình Trạng Kho Nguyên Liệu
              </p>
              <p className="mt-2 text-2xl font-extrabold text-[#9c6512]">
                {lowStockCount} cảnh báo
              </p>
              <p className="mt-1 text-xs text-[#7a6254]">
                Trên tổng số {ingredients.length} nguyên liệu
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-[#4a2e20]">
              Danh Sách Đơn Hàng Toàn Hệ Thống ({overview.recentOrders.length} đơn gần nhất)
            </h2>
            {overview.recentOrders.length === 0 ? (
              <div className="rounded-2xl border border-[#e2d2b8] bg-[#efe5d4] p-10 text-center text-sm font-bold text-[#4a2e20]">
                Chưa có đơn hàng nào phát sinh trên hệ thống.
              </div>
            ) : (
              <div className="space-y-3">
                {overview.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e2d2b8] bg-white p-5 shadow-xs sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-base font-extrabold text-[#4a2e20]">
                          {order.code}
                        </span>
                        <OrderStatusBadge status={order.status} />
                        <span className="rounded bg-[#efe5d4] px-2 py-0.5 text-xs font-bold text-[#6d4c3d]">
                          Khách: {order.customerEmail}
                        </span>
                      </div>
                      <p className="text-xs text-[#7a6254]">
                        Đặt lúc: {new Date(order.createdAt).toLocaleString('vi-VN')} · Giữ kho:{' '}
                        <strong>{order.reservationStatus}</strong> · Tạm tính:{' '}
                        {formatVnd(order.subtotal)} · Giảm giá: {formatVnd(order.discount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-[#2d6a4f]">
                        {formatVnd(order.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ================= TAB 3: QUẢN LÝ SẢN PHẨM & THỰC ĐƠN ================= */}
      {activeTab === 'catalog' && (
        <div className="mx-auto max-w-6xl space-y-8 px-6 py-4 pb-12">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-[#4a2e20]">
                  Danh Mục Sản Phẩm Đồ Uống ({products.length} món)
                </h2>
                <p className="text-xs text-[#7a6254]">
                  Điều chỉnh giá bán cơ bản (tự động đồng bộ chênh lệch cho size S/M/L) hoặc tạm ngưng/mở bán món ngay lập tức.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {products.map((product) => {
                const isBusy = busyItemId === product.id;
                const draftPrice = priceDrafts[product.id] ?? String(product.price);
                return (
                  <div
                    key={product.id}
                    className={`flex flex-col justify-between gap-4 rounded-2xl border p-5 shadow-xs ${
                      product.active
                        ? 'border-[#e2d2b8] bg-white'
                        : 'border-[#e5b8b8] bg-[#fbeaea]/40 opacity-85'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-base font-extrabold text-[#4a2e20]">
                            {product.name}
                          </span>
                          <p className="mt-0.5 text-xs text-[#7a6254]">{product.description}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            product.active
                              ? 'bg-[#cbe8d3] text-[#2d6a4f]'
                              : 'bg-[#fbeaea] text-[#9b2c2c]'
                          }`}
                        >
                          {product.active ? '● Đang mở bán' : '⏸ Tạm ngưng'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 text-[11px] text-[#6d4c3d]">
                        {product.sizes.map((s) => (
                          <span
                            key={s.size}
                            className="rounded bg-[#efe5d4] px-2 py-0.5 font-bold"
                          >
                            Size {s.size}: {formatVnd(s.price)}
                          </span>
                        ))}
                      </div>

                      <p className="text-[11px] text-[#7a6254]">
                        <strong>Công thức:</strong> {product.recipeSummary.join(' · ')}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#efe5d4] pt-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          max={MAX_ADMIN_MONEY - Math.max(0, ...product.sizes.map((size) => size.price - product.price))}
                          value={draftPrice}
                          onChange={(e) =>
                            setPriceDrafts((prev) => ({ ...prev, [product.id]: e.target.value }))
                          }
                          className="w-28 rounded-xl border border-[#decbb4] bg-[#faf6ec] px-3 py-1.5 text-xs font-bold text-[#4a2e20]"
                        />
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleSaveProductPrice(product)}
                          className="rounded-full bg-[#6d4c3d] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#563a2d] disabled:opacity-50"
                        >
                          Lưu giá
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleToggleProductActive(product)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                          product.active
                            ? 'border border-[#e5b8b8] bg-[#fbeaea] text-[#9b2c2c] hover:bg-[#f5d5d5]'
                            : 'bg-[#2d6a4f] text-white hover:bg-[#1b4332]'
                        }`}
                      >
                        {product.active ? '⏸ Tạm ngưng bán' : '▶ Mở bán lại'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quản lý Topping */}
          <section className="space-y-4 pt-4">
            <h2 className="text-xl font-extrabold text-[#4a2e20]">
              Danh Mục Topping Đi Kèm ({toppings.length} loại)
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {toppings.map((topping) => {
                const isBusy = busyItemId === topping.id;
                return (
                  <div
                    key={topping.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#e2d2b8] bg-white p-4 shadow-xs"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-[#4a2e20]">{topping.name}</p>
                      <p className="text-xs font-bold text-[#6d4c3d]">{formatVnd(topping.price)}</p>
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleToggleToppingActive(topping)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        topping.active
                          ? 'bg-[#cbe8d3] text-[#2d6a4f]'
                          : 'bg-[#fbeaea] text-[#9b2c2c]'
                      }`}
                    >
                      {topping.active ? '● Đang bán (Tắt)' : '⏸ Đã tắt (Bật)'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ================= TAB 4: QUẢN LÝ KHO NGUYÊN LIỆU ================= */}
      {activeTab === 'inventory' && (
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-4 pb-12">
          <div>
            <h2 className="text-xl font-extrabold text-[#4a2e20]">
              Quản Lý Tồn Kho Nguyên Liệu Pha Chế ({ingredients.length} nguyên liệu)
            </h2>
            <p className="text-xs text-[#7a6254]">
              Theo dõi định mức nguyên liệu thời gian thực và nhập thêm hàng theo quy cách đóng gói hoặc điều chỉnh số lượng kiểm kê.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {ingredients.map((ing) => {
              const isBusy = busyItemId === ing.id;
              const draftStock = stockDrafts[ing.id] ?? String(ing.stock);
              return (
                <div
                  key={ing.id}
                  className={`flex flex-col justify-between gap-4 rounded-2xl border p-5 shadow-xs ${
                    ing.lowStock
                      ? 'border-amber-300 bg-[#fff8eb]'
                      : 'border-[#e2d2b8] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-[#4a2e20]">{ing.name}</span>
                        {ing.lowStock && (
                          <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-extrabold text-[#9c6512]">
                            ⚠️ Sắp hết kho
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#7a6254]">
                        Quy cách: 1 {ing.packageLabel} ={' '}
                        <strong>
                          {ing.packageSize.toLocaleString('vi-VN')} {ing.unit}
                        </strong>{' '}
                        · Dùng trong {ing.usedInProducts} món &amp; {ing.usedInToppings} topping
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-[#2d6a4f]">
                        {ing.stock.toLocaleString('vi-VN')} {ing.unit}
                      </span>
                      <p className="text-[11px] text-[#7a6254]">
                        ≈ {(ing.stock / ing.packageSize).toFixed(1)} {ing.packageLabel}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#efe5d4] pt-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleUpdateIngredientStock(ing, ing.stock + ing.packageSize)
                        }
                        className="rounded-full bg-[#cbe8d3] px-3 py-1.5 text-xs font-extrabold text-[#2d6a4f] transition hover:bg-[#b5dcc0] disabled:opacity-50"
                      >
                        + 1 {ing.packageLabel} (+{ing.packageSize} {ing.unit})
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleUpdateIngredientStock(ing, ing.stock + ing.packageSize * 5)
                        }
                        className="rounded-full bg-[#2d6a4f] px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-[#1b4332] disabled:opacity-50"
                      >
                        + 5 {ing.packageLabel}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={MAX_ADMIN_QUANTITY}
                        value={draftStock}
                        onChange={(e) =>
                          setStockDrafts((prev) => ({ ...prev, [ing.id]: e.target.value }))
                        }
                        className="w-24 rounded-xl border border-[#decbb4] bg-[#faf6ec] px-2.5 py-1.5 text-xs font-bold text-[#4a2e20]"
                      />
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleUpdateIngredientStock(ing, draftStock)}
                        className="rounded-full border border-[#6d4c3d] bg-white px-3 py-1.5 text-xs font-bold text-[#4a2e20] transition hover:bg-[#6d4c3d] hover:text-white disabled:opacity-50"
                      >
                        Cập nhật
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 5: QUẢN LÝ MÃ KHUYẾN MÃI ================= */}
      {activeTab === 'promotions' && (
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-4 pb-12 lg:grid-cols-[380px_1fr]">
          {/* Cột trái: Tạo mã khuyến mãi mới */}
          <section className="self-start rounded-2xl border border-[#e2d2b8] bg-[#efe5d4] p-4 shadow-xs">
            <div className="rounded-xl bg-white p-6">
              <h2 className="text-lg font-extrabold text-[#4a2e20]">+ Tạo Mã Khuyến Mãi Mới</h2>
              <p className="mt-1 text-xs text-[#7a6254]">
                Thiết lập voucher giảm theo phần trăm (%) hoặc số tiền cố định (VNĐ) cho khách hàng.
              </p>

              <form onSubmit={handleCreatePromotion} className="mt-4 space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#4a2e20]">
                    Mã voucher (In hoa)
                  </label>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Ví dụ: SUMMER25"
                    required
                    className="mt-1 block w-full rounded-xl border border-[#decbb4] bg-[#faf6ec] px-3.5 py-2 text-sm font-mono font-bold text-[#4a2e20]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#4a2e20]">Loại giảm giá</label>
                    <select
                      value={promoType}
                      onChange={(e) => setPromoType(e.target.value as 'PERCENT' | 'FIXED')}
                      className="mt-1 block w-full rounded-xl border border-[#decbb4] bg-[#faf6ec] px-3 py-2 text-xs font-bold text-[#4a2e20]"
                    >
                      <option value="PERCENT">Phần trăm (%)</option>
                      <option value="FIXED">Số tiền (VNĐ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4a2e20]">
                      Giá trị ({promoType === 'PERCENT' ? '%' : 'VNĐ'})
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={promoType === 'PERCENT' ? 100 : MAX_ADMIN_MONEY}
                      value={promoValue}
                      onChange={(e) => setPromoValue(e.target.value)}
                      required
                      className="mt-1 block w-full rounded-xl border border-[#decbb4] bg-[#faf6ec] px-3 py-2 text-xs font-bold text-[#4a2e20]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#4a2e20]">
                      Đơn tối thiểu (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={5000}
                      max={MAX_ADMIN_MONEY}
                      value={promoMinSubtotal}
                      onChange={(e) => setPromoMinSubtotal(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-[#decbb4] bg-[#faf6ec] px-3 py-2 text-xs font-bold text-[#4a2e20]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#4a2e20]">
                      Số lượt dùng tối đa
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={MAX_ADMIN_QUANTITY}
                      value={promoMaxUses}
                      onChange={(e) => setPromoMaxUses(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-[#decbb4] bg-[#faf6ec] px-3 py-2 text-xs font-bold text-[#4a2e20]"
                    />
                  </div>
                </div>

                {promoType === 'PERCENT' && (
                  <div>
                    <label className="block text-xs font-bold text-[#4a2e20]">
                      Giảm tối đa (VNĐ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      max={MAX_ADMIN_MONEY}
                      value={promoMaxDiscount}
                      onChange={(e) => setPromoMaxDiscount(e.target.value)}
                      className="mt-1 block w-full rounded-xl border border-[#decbb4] bg-[#faf6ec] px-3 py-2 text-xs font-bold text-[#4a2e20]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={promoBusy}
                  className="w-full rounded-full bg-[#6d4c3d] py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#563a2d] disabled:opacity-50"
                >
                  {promoBusy ? 'Đang tạo mã…' : 'Phát hành Mã Khuyến Mãi'}
                </button>
              </form>
            </div>
          </section>

          {/* Cột phải: Danh sách mã khuyến mãi */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-[#4a2e20]">
              Danh Sách Mã Khuyến Mãi ({promotions.length})
            </h2>
            <div className="space-y-3">
              {promotions.map((promo) => {
                const isBusy = busyItemId === promo.id;
                const isEffective = promo.active && promotionNow >= new Date(promo.startsAt).getTime()
                  && promotionNow < new Date(promo.endsAt).getTime()
                  && (promo.maxUses === null || promo.usedCount < promo.maxUses);
                return (
                  <div
                    key={promo.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e2d2b8] bg-white p-5 shadow-xs sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="rounded-lg bg-[#efe5d4] px-3 py-1 font-mono text-base font-extrabold text-[#4a2e20]">
                          {promo.code}
                        </span>
                        <span className="text-sm font-extrabold text-[#2d6a4f]">
                          {promo.type === 'PERCENT'
                            ? `Giảm ${promo.value}%${promo.maxDiscount !== null ? ` (tối đa ${formatVnd(promo.maxDiscount)})` : ''}`
                            : `Giảm trực tiếp ${formatVnd(promo.value)}`}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isEffective
                              ? 'bg-[#cbe8d3] text-[#2d6a4f]'
                              : 'bg-[#fbeaea] text-[#9b2c2c]'
                          }`}
                        >
                          {!promo.active ? '⏸ Đã tắt'
                            : promotionNow < new Date(promo.startsAt).getTime() ? '◷ Chưa bắt đầu'
                            : promotionNow >= new Date(promo.endsAt).getTime() ? '⌛ Đã hết hạn'
                            : promo.maxUses !== null && promo.usedCount >= promo.maxUses ? 'Đã hết lượt dùng'
                            : '● Đang hiệu lực'}
                        </span>
                      </div>
                      <p className="text-xs text-[#7a6254]">
                        Đơn tối thiểu: <strong>{formatVnd(promo.minSubtotal)}</strong> · Đã dùng:{' '}
                        <strong>
                          {promo.usedCount} / {promo.maxUses ?? '∞'}
                        </strong>{' '}
                        · Hạn dùng: {new Date(promo.endsAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleTogglePromotion(promo)}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${
                        promo.active
                          ? 'border border-[#e5b8b8] bg-[#fbeaea] text-[#9b2c2c] hover:bg-[#f5d5d5]'
                          : 'bg-[#2d6a4f] text-white hover:bg-[#1b4332]'
                      }`}
                    >
                      {promo.active ? '⏸ Tắt khuyến mãi' : '▶ Bật khuyến mãi'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function AdminStaffPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-6 py-12 text-center text-sm font-bold text-[#7a6254]">
          Đang tải Trung tâm Quản trị Hệ thống…
        </div>
      }
    >
      <AdminPortalContent />
    </Suspense>
  );
}
