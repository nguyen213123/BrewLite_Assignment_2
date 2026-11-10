# ADR-006: Quản lý Điểm thưởng Khách hàng theo Mô hình Sổ cái Bất biến (Immutable Double-entry Ledger Pattern)

## 1. Trạng thái (Status)
**ACCEPTED** (Đã chấp thuận & Áp dụng sản xuất)

## 2. Ngày quyết định (Date)
2026-10-25

## 3. Bối cảnh & Vấn đề Kỹ thuật (Context & Problem Statement)
Chương trình chăm sóc khách hàng thân thiết (Loyalty Program) của BrewLite quy định:
- **Tỷ lệ quy đổi điểm**: Cứ mỗi 10.000 VNĐ giá trị thanh toán thực tế của đơn hàng, khách hàng sẽ được tích lũy 1 điểm thưởng (`10.000₫ = 1 point`, làm tròn xuống bằng hàm sàn toán học $\lfloor \text{total} / 10000 \rfloor$).
- **Thời điểm kích hoạt**: Điểm chỉ được cộng khi đơn hàng chuyển sang trạng thái hoàn tất thành công (`COMPLETED`).
- **Thu hồi điểm (Points Reversal)**: Nếu đơn hàng đã hoàn tất sau đó bị hủy hoặc hoàn tiền (`CANCELLED` / `REFUNDED`), toàn bộ số điểm đã cộng trước đó cho đơn hàng đó bắt buộc phải bị thu hồi hoàn toàn.

Thách thức kỹ thuật đặt ra:
- **Rủi ro Mất dấu Dấu vết Tài chính (Audit Trail Loss)**: Nếu chỉ đơn thuần cập nhật một con số `User.loyaltyPoints`, khi khách hàng khiếu nại tại sao điểm bị trừ hoặc muốn xem sao kê lịch sử tích điểm, hệ thống hoàn toàn không có bằng chứng để giải trình.
- **Rủi ro Cộng/Trừ lặp (Duplicate Earn / Reverse)**: Nếu nhân viên bấm nút hoàn tất đơn 2 lần, hoặc webhook gateway gửi thông báo refund nhiều lần, khách hàng có thể bị cộng gấp đôi điểm hoặc bị trừ điểm 2 lần.
- **Rủi ro Xung đột Đồng thời (Race Condition)**: Khi một đơn hàng vừa được bấm hoàn tất đồng thời một tiến trình hủy đơn đang diễn ra, nếu không có cơ chế khóa (locking), số dư điểm của khách sẽ bị sai lệch.
- **Vấn đề Đồng bộ Giao diện (Frontend Sync)**: Khi người dùng xem trang `/loyalty` thấy số điểm mới nhưng trên thanh Header vẫn lưu số điểm cũ từ lúc đăng nhập, việc cập nhật điểm vào bộ nhớ dùng chung rất dễ gây ra vòng lặp render vô hạn (Infinite Loop).

## 4. Các yếu tố thúc đẩy quyết định (Decision Drivers)
1. **Tính Bất biến & Khả năng Đối soát (Auditability & Immutability)**: Mọi biến động điểm số phải được ghi nhận dưới dạng các bản ghi nhật ký không thể sửa đổi hoặc xóa bỏ.
2. **Nguyên tắc Lũy đẳng Điểm thưởng (Loyalty Idempotency)**: Một đơn hàng chỉ được phép tích điểm tối đa 1 lần và chỉ được phép đảo điểm tối đa 1 lần duy nhất.
3. **Cơ chế Tự phục hồi (Self-healing Consistency)**: Tự động phát hiện và bù điểm cho các đơn hàng `COMPLETED` mà trước đó chưa được tích điểm do lỗi mạng hoặc gián đoạn dịch vụ.

## 5. Các phương án kiến trúc được đánh giá (Considered Options)

### Phương án A: Chỉ lưu trữ một trường số dư duy nhất (`User.loyaltyPoints`)
- **Mô tả**: Khi hoàn tất đơn chỉ chạy câu lệnh `UPDATE "User" SET "loyaltyPoints" = "loyaltyPoints" + 5`.
- **Ưu điểm**: Cực kỳ dễ lập trình, không tốn thêm bảng dữ liệu.
- **Nhược điểm & Rủi ro**:
  - Hoàn toàn không có lịch sử giao dịch; vi phạm nghiêm trọng nguyên tắc kế toán tài chính.
  - Khi đơn hàng bị hủy, không thể biết chính xác đơn này lúc trước đã được cộng bao nhiêu điểm để trừ lại (đặc biệt khi đơn có dùng mã giảm giá).
  - Không thể phát hiện và ngăn chặn việc cộng trùng điểm khi hàm tích điểm bị gọi nhiều lần.
- **Đánh giá**: **TỪ CHỐI**.

### Phương án B: Event Sourcing Thuần túy (Không lưu trường `loyaltyPoints`)
- **Mô tả**: Chỉ lưu bảng nhật ký `LoyaltyEntry`. Mỗi khi cần hiển thị số điểm của người dùng, server chạy câu lệnh `SELECT SUM(points) FROM "LoyaltyEntry" WHERE "userId" = :id`.
- **Ưu điểm**: Tính nhất quán tuyệt đối 100%.
- **Nhược điểm & Rủi ro**:
  - Gây suy giảm hiệu năng nghiêm trọng: Mỗi lượt khách tải trang chủ hoặc menu đều phải tính toán lại toàn bộ lịch sử điểm của khách hàng, gây lãng phí tài nguyên CPU của database khi số lượng giao dịch lên tới hàng trăm ngàn dòng.
- **Đánh giá**: **TỪ CHỐI**.

### Phương án C: Mô hình Sổ cái Bất biến kết hợp Cache Số dư Nguyên tử (Phương án được chọn)
- **Mô tả**:
  1. Mọi biến động điểm số đều được lưu trữ vĩnh viễn trong bảng `LoyaltyEntry` với 2 loại nghiệp vụ: `kind = 'EARN'` (điểm dương) và `kind = 'REVERSE'` (điểm âm đối ứng).
  2. Bổ sung ràng buộc duy nhất kết hợp ở tầng cơ sở dữ liệu: `@@unique([orderId, kind])`.
  3. Cập nhật số dư `User.loyaltyPoints` song song bằng toán tử nguyên tử `increment` / `decrement` trong cùng một transaction của Unit of Work.
- **Ưu điểm**:
  - Đạt tốc độ đọc số dư cực nhanh $O(1)$ phục vụ cho thanh Header và trang cá nhân.
  - Vẫn duy trì 100% khả năng đối soát lịch sử chi tiết cho từng đơn hàng.

## 6. Ma trận so sánh & Đánh giá (Evaluation Matrix)

| Tiêu chí kỹ thuật (Weight) | Phương án A (Chỉ lưu trường số dư) | Phương án B (Event Sourcing thuần) | Phương án C (Sổ cái Bất biến + Cache Số dư) |
| :--- | :---: | :---: | :---: |
| Khả năng đối soát & Minh bạch (35%) | 1/5 | 5/5 | **5/5** |
| Hiệu năng đọc số dư Header (25%) | 5/5 | 2/5 | **5/5** |
| Chống cộng/trừ lặp Idempotency (20%) | 1/5 | 4/5 | **5/5** |
| Khả năng tự phục hồi bù điểm (10%) | 1/5 | 4/5 | **5/5** |
| Độ phức tạp mã nguồn (10%) | 5/5 | 2/5 | **4/5** |
| **Tổng điểm trọng số** | **2.20 / 5.0** | **3.65 / 5.0** | **4.90 / 5.0** |

## 7. Chi tiết triển khai kỹ thuật (Implementation Details)

### 7.1. Lược đồ Bảng Sổ cái Điểm thưởng
Tại [`apps/api/prisma/schema.prisma`](../../..//api/prisma/schema.prisma):
```prisma
model LoyaltyEntry {
  id        String          @id @default(uuid()) @db.Uuid
  userId    String          @db.Uuid
  orderId   String          @db.Uuid
  kind      LoyaltyKind     // EARN hoặc REVERSE
  points    Int             // Số điểm biến động (+ cho EARN, - cho REVERSE)
  createdAt DateTime        @default(now())

  user      User            @relation(fields: [userId], references: [id])
  order     Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)

  // Ràng buộc duy nhất cốt lõi: 1 đơn hàng chỉ có tối đa 1 lần EARN và 1 lần REVERSE
  @@unique([orderId, kind])
  @@index([userId, createdAt(sort: Desc), id(sort: Desc)])
}
```

### 7.2. Thuật toán Tích điểm & Thu hồi Điểm Sổ cái
Tại [`apps/api/src/modules/loyalty/loyalty.service.ts`](../../..//api/src/modules/loyalty/loyalty.service.ts):
```typescript
// 1. TÍCH ĐIỂM KHI HOÀN TẤT ĐƠN HÀNG
async earn(tx: Prisma.TransactionClient, order: StoredOrder): Promise<number> {
  const points = Math.floor(order.total / 10000);

  // Chống cộng lặp: Nếu đã tồn tại bản ghi EARN cho đơn hàng này thì bỏ qua
  const existing = await tx.loyaltyEntry.findUnique({
    where: { orderId_kind: { orderId: order.id, kind: 'EARN' } }
  });
  if (existing) return existing.points;

  // Ghi sổ cái bản ghi EARN
  await tx.loyaltyEntry.create({
    data: { userId: order.userId, orderId: order.id, kind: 'EARN', points }
  });

  // Tăng số dư người dùng nguyên tử
  if (points > 0) {
    await tx.user.update({
      where: { id: order.userId },
      data: { loyaltyPoints: { increment: points } }
    });
  }
  return points;
}

// 2. THU HỒI ĐIỂM KHI ĐƠN BỊ HỦY / HOÀN TIỀN
async reverse(tx: Prisma.TransactionClient, order: StoredOrder): Promise<void> {
  // Chống trừ lặp: Nếu đã đảo điểm rồi thì không trừ nữa
  const existingReverse = await tx.loyaltyEntry.findUnique({
    where: { orderId_kind: { orderId: order.id, kind: 'REVERSE' } }
  });
  if (existingReverse) return;

  // Tìm lại bản ghi EARN gốc để lấy chính xác số điểm đã cộng lúc trước
  const earnEntry = await tx.loyaltyEntry.findUnique({
    where: { orderId_kind: { orderId: order.id, kind: 'EARN' } }
  });
  if (!earnEntry) return;

  const pointsToReverse = Math.abs(earnEntry.points);

  // Ghi sổ cái bản ghi REVERSE với số điểm âm
  await tx.loyaltyEntry.create({
    data: { userId: order.userId, orderId: order.id, kind: 'REVERSE', points: -pointsToReverse }
  });

  // Giảm số dư người dùng nguyên tử
  if (pointsToReverse > 0) {
    await tx.user.update({
      where: { id: order.userId },
      data: { loyaltyPoints: { decrement: pointsToReverse } }
    });
  }
}
```

### 7.3. Đồng bộ Điểm số lên Header và Triệt tiêu Vòng lặp Re-render
Tại [`apps/web/src/lib/auth.ts`](../../..//web/src/lib/auth.ts):
```typescript
export function updateUserPoints(points: number): void {
  const current = getUser();
  if (!current) return;
  // ĐIỀU KIỆN CHẶN QUYẾT ĐỊNH: Nếu điểm không thay đổi, thoát ngay lập tức để tránh vòng lặp re-render vô tận!
  if (current.loyaltyPoints === points) return;

  const updated: User = { ...current, loyaltyPoints: points };
  memoryUser = updated;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(USER_KEY, JSON.stringify(updated));
    // Phát sự kiện broadcast cho Header đang lắng nghe qua useSyncExternalStore
    window.dispatchEvent(new Event('brewlite-auth-change'));
  }
}
```

## 8. Kiểm thử & Xác minh Kiến trúc (Verification)
Được chứng minh qua bộ kiểm thử tự động [`apps/api/test/loyalty.e2e-spec.ts`](../../..//api/test/loyalty.e2e-spec.ts):
- Gọi hàm `earn` 5 lần liên tiếp cho cùng 1 đơn hàng: Số điểm của người dùng chỉ tăng đúng 1 lần duy nhất, bảng `LoyaltyEntry` chỉ có đúng 1 dòng `EARN`.
- Hủy đơn hàng đã tích điểm: Hệ thống tạo bản ghi `REVERSE` và trừ lại đúng số điểm gốc, không làm âm điểm khách hàng.
- Kiểm thử phân trang danh sách lịch sử điểm có cùng `createdAt`: Phân trang ổn định tuyệt đối nhờ tiêu chí sắp xếp phụ `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`.
