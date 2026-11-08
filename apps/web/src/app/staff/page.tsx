'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { apiFetch, apiGet, ApiRequestError } from '@/lib/api';
import { getAuthSnapshot, getAuthServerSnapshot, subscribeAuth } from '@/lib/auth';
import type { Order, OrderPage, OrderStatus, OrderSummary } from '@/lib/contracts/api.generated';
import OrderStatusBadge from '@/components/OrderStatusBadge';
import ManualPaymentReview from '@/components/payments/ManualPaymentReview';
import { formatVnd } from '@/lib/format';

const NEXT_STAFF_STATUS: Partial<
  Record<OrderStatus, { next: 'PREPARING' | 'READY' | 'COMPLETED'; label: string }>
> = {
  PAID: { next: 'PREPARING', label: 'Bắt đầu pha chế (PREPARING)' },
  PREPARING: { next: 'READY', label: 'Báo món sẵn sàng (READY)' },
  READY: { next: 'COMPLETED', label: 'Giao món & Hoàn tất (COMPLETED)' },
};

export default function StaffWorkbenchPage() {
  const user = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getAuthServerSnapshot);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Partial<Record<OrderStatus, number>>>({});
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState(null as string | null);
  const [refreshToken, setRefreshToken] = useState(0);

  const isAuthorized = user?.role === 'STAFF';

  useEffect(() => {
    let ignore = false;
    if (!isAuthorized) {
      return;
    }

    async function loadStaffOrders() {
      try {
        const res = await apiGet<OrderPage & { statusCounts: Partial<Record<OrderStatus, number>> }>(`/orders/staff?page=${page}&limit=20${statusFilter === 'ALL' ? '' : `&status=${statusFilter}`}`);
        if (!ignore) {
          setOrders(res.data);
          setStatusCounts(res.statusCounts);
          setPage(Math.min(res.meta.page, Math.max(1, res.meta.totalPages)));
          setTotalPages(res.meta.totalPages);
          setTotal(res.meta.total);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          if (err instanceof ApiRequestError) {
            setError(err.message || 'Không thể tải danh sách đơn hàng tại quầy.');
          } else {
            setError('Không thể kết nối tới máy chủ.');
          }
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    loadStaffOrders();
    return () => {
      ignore = true;
    };
  }, [isAuthorized, page, statusFilter, refreshToken]);

  async function handleAdvanceOrder(order: OrderSummary, nextStatus: 'PREPARING' | 'READY' | 'COMPLETED') {
    if (busyOrderId) return;
    setBusyOrderId(order.id);
    setError(null);
    try {
      const updated = await apiFetch<Order>(`/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ expectedVersion: order.version, status: nextStatus }),
      });
      setRefreshToken((value) => value + 1);
      setOrders((prev) =>
        prev.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                status: updated.status,
                version: updated.version,
                reservationStatus: updated.reservationStatus,
                updatedAt: updated.updatedAt,
              }
            : item,
        ),
      );
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message || 'Không thể cập nhật trạng thái đơn hàng.');
      } else {
        setError('Lỗi kết nối tới máy chủ.');
      }
    } finally {
      setBusyOrderId(null);
    }
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mx-auto max-w-lg rounded-2xl border border-[#e2d2b8] bg-[#efe5d4] p-10 text-center shadow-xs">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#cbe8d3] text-3xl">
            ☕
          </div>
          <p className="eyebrow mt-4">BrewLite Mộc Vị / Quầy Pha Chế</p>
          <h1 className="mt-2 text-2xl font-extrabold text-[#4a2e20]">Cần đăng nhập Nhân viên</h1>
          <p className="mt-2 text-sm text-[#7a6254]">
            Vui lòng đăng nhập bằng tài khoản Nhân viên (STAFF) được Admin cấp để vận hành quầy pha chế.
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

  if (!isAuthorized) {
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
          <h1 className="mt-2 text-2xl font-extrabold text-[#9b2c2c]">Chỉ dành cho Nhân viên (STAFF)</h1>
          <p className="mt-2 text-sm text-[#7a6254]">
            Màn hình điều phối đơn hàng và quầy pha chế chỉ được phân quyền cho vai trò <strong>STAFF</strong>. Tài khoản của bạn hiện có vai trò <strong>{user.role}</strong>.
          </p>
          <Link
            href={user.role === 'ADMIN' ? '/admin' : '/menu'}
            className="mt-6 inline-block rounded-full bg-[#6d4c3d] px-6 py-2.5 text-xs font-bold text-white transition hover:bg-[#563a2d]"
          >
            {user.role === 'ADMIN' ? 'Về Trang Quản Trị Nhân Viên →' : 'Về Thực Đơn Đặt Nước →'}
          </Link>
        </div>
      </main>
    );
  }

  const paidCount = statusCounts.PAID ?? 0;
  const preparingCount = statusCounts.PREPARING ?? 0;
  const readyCount = statusCounts.READY ?? 0;
  const completedCount = statusCounts.COMPLETED ?? 0;

  const filteredOrders =
    statusFilter === 'ALL' ? orders : orders.filter((o) => o.status === statusFilter);

  return (
    <div>
      <section className="border-b border-[#b5dcc0] bg-[#cbe8d3]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Cổng Nhân Viên Quầy Pha Chế · Quyền hạn: STAFF</p>
            <h1 className="mt-1.5 text-3xl font-extrabold tracking-tight text-[#4a2e20] sm:text-4xl">
              Điều Phối &amp; Pha Chế Đơn Hàng
            </h1>
            <p className="mt-1 text-sm text-[#5c4033]">
              Xác nhận thanh toán tại quầy, tiếp nhận đơn đã thanh toán (PAID) và cập nhật tiến độ pha chế (PREPARING → READY → COMPLETED).
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
              {loading ? 'Đang tải…' : '↻ Làm mới đơn hàng'}
            </button>
          </div>
        </div>
      </section>

      {/* Thẻ chỉ số công việc của Nhân viên pha chế (Staff KPIs) */}
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pt-8 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#e2d2b8] bg-white p-4 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-[#7a6254]">
            Chờ pha chế (PAID)
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-[#4a2e20]">{paidCount}</p>
        </div>
        <div className="rounded-2xl border border-[#e2d2b8] bg-[#fff8eb] p-4 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-[#9c6512]">
            Đang pha chế (PREPARING)
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-[#9c6512]">{preparingCount}</p>
        </div>
        <div className="rounded-2xl border border-[#b5dcc0] bg-[#eef7f0] p-4 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-[#2d6a4f]">
            Chờ khách nhận (READY)
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-[#2d6a4f]">{readyCount}</p>
        </div>
        <div className="rounded-2xl border border-[#e2d2b8] bg-[#efe5d4] p-4 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-[#6d4c3d]">
            Đã hoàn tất (COMPLETED)
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-[#6d4c3d]">{completedCount}</p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <ManualPaymentReview key={`${user.id}:${refreshToken}`} staff={true} />

        {/* Bộ lọc trạng thái đơn tại quầy */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#decbb4] pb-4">
          {(
            [
              { id: 'ALL', label: `Tất cả (${Object.values(statusCounts).reduce((sum, count) => sum + count, 0)})` },
              { id: 'PAID', label: `Chờ pha chế (${paidCount})` },
              { id: 'PREPARING', label: `Đang pha chế (${preparingCount})` },
              { id: 'READY', label: `Chờ khách nhận (${readyCount})` },
              { id: 'COMPLETED', label: `Đã hoàn tất (${completedCount})` },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { if (statusFilter !== tab.id) { setLoading(true); setPage(1); setStatusFilter(tab.id); } }}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                  active
                    ? 'bg-[#6d4c3d] text-white shadow-2xs'
                    : 'border border-[#decbb4] bg-white text-[#4a2e20] hover:bg-[#efe5d4]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-[#e5b8b8] bg-[#fbeaea] p-4 text-xs font-bold text-[#9b2c2c]"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-[#e2d2b8] bg-[#efe5d4]"
              />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-[#e2d2b8] bg-[#efe5d4] p-10 text-center">
            <p className="text-sm font-bold text-[#4a2e20]">
              Không có đơn hàng nào trong danh mục này.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const transition = NEXT_STAFF_STATUS[order.status];
              const isBusy = busyOrderId === order.id;
              return (
                <div
                  key={order.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e2d2b8] bg-white p-5 shadow-xs sm:flex-row sm:items-center"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-mono text-base font-extrabold text-[#4a2e20] hover:text-[#6d4c3d] hover:underline"
                      >
                        {order.code}
                      </Link>
                      <OrderStatusBadge status={order.status} />
                      <span className="text-sm font-extrabold text-[#6d4c3d]">
                        {formatVnd(order.total)}
                      </span>
                    </div>
                    <p className="text-xs text-[#7a6254]">
                      Đặt lúc: {new Date(order.createdAt).toLocaleString('vi-VN')} · Giữ kho:{' '}
                      <strong>{order.reservationStatus}</strong> · Phiên bản v{order.version}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {transition && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAdvanceOrder(order, transition.next)}
                        className="rounded-full bg-[#2d6a4f] px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#1b4332] disabled:opacity-50"
                      >
                        {isBusy ? 'Đang cập nhật…' : `→ ${transition.label}`}
                      </button>
                    )}
                    <Link
                      href={`/orders/${order.id}`}
                      className="rounded-full border border-[#decbb4] bg-[#faf6ec] px-4 py-2 text-xs font-bold text-[#4a2e20] transition hover:bg-[#efe5d4]"
                    >
                      Chi tiết món →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              type="button"
              onClick={() => { setLoading(true); setPage((p) => Math.max(1, p - 1)); }}
              disabled={page <= 1 || loading}
              className="rounded-full border-2 border-[#6d4c3d] bg-white px-5 py-1.5 text-xs font-bold text-[#4a2e20] disabled:opacity-40"
            >
              ← Trang trước
            </button>
            <span className="text-xs font-bold text-[#4a2e20]">
              Trang {page} / {totalPages} (Tổng {total} đơn)
            </span>
            <button
              type="button"
              onClick={() => { setLoading(true); setPage((p) => Math.min(totalPages, p + 1)); }}
              disabled={page >= totalPages || loading}
              className="rounded-full border-2 border-[#6d4c3d] bg-white px-5 py-1.5 text-xs font-bold text-[#4a2e20] disabled:opacity-40"
            >
              Trang sau →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
