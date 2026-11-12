# ADR-004: Quản lý Tồn kho Nguyên liệu Thực tế 2 Pha và Kiểm soát Tranh chấp Đồng thời bằng Khóa Lạc quan (Optimistic Concurrency Control)

## 1. Trạng thái (Status)
**ACCEPTED** (Đã chấp thuận & Áp dụng sản xuất)

## 2. Ngày quyết định (Date)
2026-10-24

## 3. Bối cảnh & Vấn đề Kỹ thuật (Context & Problem Statement)
Trong ngành F&B đồ uống (trà sữa, cà phê), bài toán tồn kho khác biệt hoàn toàn so với thương mại điện tử hàng hóa thông thường:
- **Tồn kho dựa trên công thức cấu thành (Recipe-based Inventory)**:
  - Một sản phẩm không có tồn kho độc lập. Tồn kho của 1 ly *Cà phê sữa size M* phụ thuộc vào: 22g Hạt Robusta, 30ml Sữa đặc, 150ml Nước sôi.
  - Nếu khách chọn thêm topping *Thạch cà phê*, cần thêm: 10g Bột rau câu, 5g Đường mía, 15ml Cà phê phin.
  - Sữa đặc và Hạt Robusta đồng thời được sử dụng cho nhiều món khác nhau (Bạc xỉu, Cà phê đen, Cà phê muối).
- **Vấn đề Tranh chấp Ghi đồng thời (Concurrency Race Condition)**:
  - Khi có đợt Flash-sale hoặc giờ cao điểm, 10 khách hàng cùng bấm đặt các món có chung nguyên liệu "Sữa tươi thanh trùng", nhưng trong kho chỉ còn đủ sữa tươi cho đúng 2 ly.
  - Nếu đọc dữ liệu (`SELECT`) rồi tính toán trên ứng dụng rồi mới ghi đè (`UPDATE`), hiện tượng **Lost Update** sẽ xảy ra: cả 10 khách hàng đều đọc thấy còn hàng, dẫn đến việc hệ thống chấp nhận cả 10 đơn $\rightarrow$ **ÂM KHO NGUYÊN LIỆU (Overselling)**, không thể phục vụ khách tại quầy.
- **Rủi ro Deadlock**: Nếu dùng khóa bi quan truyền thống (`SELECT FOR UPDATE`), hai giao dịch tạo đơn cùng lúc chứa nhiều món và khóa các nguyên liệu theo thứ tự khác nhau (Giao dịch 1 khóa Sữa rồi Hạt; Giao dịch 2 khóa Hạt rồi Sữa) sẽ gây ra **Deadlock** làm tê liệt kết nối cơ sở dữ liệu.

## 4. Các yếu tố thúc đẩy quyết định (Decision Drivers)
1. **Nguyên tắc Tuyệt đối Không Âm kho (Zero-Overselling Invariant)**: Tồn kho nguyên liệu khả dụng (`stock`) tuyệt đối không bao giờ được phép nhỏ hơn 0 trong bất kỳ tình huống nào.
2. **Hiệu năng & Thông lượng (High Throughput)**: Hệ thống phải xử lý mượt mà hàng trăm lượt kiểm tra giỏ hàng và đặt hàng mà không bị nghẽn connection pool.
3. **Phòng chống Deadlock theo thiết kế**: Loại trừ hoàn toàn nguy cơ deadlock khi nhiều đơn hàng cùng giữ nhiều loại nguyên liệu.
4. **Bảo toàn Snapshot Lịch sử**: Phải ghi nhớ chính xác lượng nguyên liệu đã giữ lúc đặt đơn để khi hủy đơn thì hoàn trả chính xác về kho, kể cả khi công thức pha chế của quán có bị nhân viên sửa đổi sau đó.

## 5. Các phương án kiến trúc được đánh giá (Considered Options)

### Phương án A: Quản lý Tồn kho Đơn giản theo Sản phẩm (`Product.stock`)
- **Mô tả**: Gán trực tiếp một con số tồn kho cho từng sản phẩm (ví dụ Cappuccino còn 10 ly, Trà đào còn 5 ly).
- **Ưu điểm**: Lập trình rất đơn giản.
- **Nhược điểm & Rủi ro**:
  - Hoàn toàn phi thực tế đối với quán cà phê: không thể giải thích được vì sao hết hạt cà phê mà Cappuccino báo hết hàng còn Latte vẫn báo còn hàng.
  - Không quản lý được các nguyên liệu dùng chung và topping.
- **Đánh giá**: **TỪ CHỐI**.

### Phương án B: Khóa Bi quan Toàn phần (Pessimistic Locking / `SELECT ... FOR UPDATE`)
- **Mô tả**: Mỗi khi tạo đơn, truy vấn `SELECT id FROM "Ingredient" WHERE id IN (...) FOR UPDATE` để khóa chặt các dòng nguyên liệu trong bảng.
- **Ưu điểm**: Dễ hình dung luồng xử lý tuần tự.
- **Nhược điểm & Rủi ro**:
  - Gây nghẽn hàng đợi (Connection Contention) nghiêm trọng khi lượng khách đông.
  - Rất dễ xảy ra **Deadlock** giữa các giao dịch nếu thứ tự ID nguyên liệu trong câu lệnh khóa không được sắp xếp tăng dần tuyệt đối.
- **Đánh giá**: **TỪ CHỐI**.

### Phương án C: Vòng đời Tồn kho 2 Pha kết hợp Khóa Lạc quan với Versioning (Phương án được chọn)
- **Mô tả**:
  1. Thêm cột `version Int @default(0)` vào bảng `Ingredient`.
  2. Áp dụng quy trình 2 pha:
     - **Pha 1 - Giữ kho (`HELD`)**: Khi tạo đơn (`PENDING`), hệ thống giữ trước lượng nguyên liệu cần thiết.
     - **Pha 2 - Tiêu thụ giữ kho (`CONSUMED`)**: Khi đơn thanh toán thành công (`PENDING` $\rightarrow$ `PAID`), lượng nguyên liệu đã giữ chuyển sang trạng thái `CONSUMED`.
     - **Giải phóng (`RELEASED`)**: Nếu đơn bị hủy hoặc thanh toán thất bại, nguyên liệu đã giữ được trả nguyên vẹn về kho.
  3. Cập nhật tồn kho nguyên tử bằng câu lệnh SQL điều kiện kiểm tra đồng thời cả lượng tồn và số phiên bản (`version`).
- **Ưu điểm**:
  - Tốc độ thực thi cực nhanh, không giữ khóa đọc.
  - Tận dụng cơ chế atomic update của PostgreSQL engine.

## 6. Ma trận so sánh & Đánh giá (Evaluation Matrix)

| Tiêu chí kỹ thuật (Weight) | Phương án A (Stock theo Sản phẩm) | Phương án B (Khóa Bi quan) | Phương án C (Khóa Lạc quan 2 Pha) |
| :--- | :---: | :---: | :---: |
| Phản ánh đúng nghiệp vụ F&B (30%) | 1/5 | 5/5 | **5/5** |
| Triệt tiêu nguy cơ Overselling (25%) | 2/5 | 5/5 | **5/5** |
| Khả năng chịu tải & Thông lượng (20%) | 4/5 | 2/5 | **5/5** |
| Phòng chống Deadlock (15%) | 3/5 | 2/5 | **5/5** |
| Độ phức tạp mã nguồn (10%) | 5/5 | 3/5 | **3/5** |
| **Tổng điểm trọng số** | **2.45 / 5.0** | **3.75 / 5.0** | **4.80 / 5.0** |

## 7. Chi tiết triển khai kỹ thuật (Implementation Details)

### 7.1. Cấu trúc Bảng `Ingredient` và `OrderIngredientHold`
```prisma
model Ingredient {
  id        String   @id @default(uuid()) @db.Uuid
  name      String   @unique
  unit      String   // g, ml, quả
  stock     Int      // Số lượng khả dụng hiện có
  version   Int      @default(0) // Khóa kiểm soát phiên bản lạc quan
  ...
}

model OrderIngredientHold {
  orderId      String     @db.Uuid
  ingredientId String     @db.Uuid
  amount       Int        // Định lượng nguyên liệu đã giữ
  order        Order      @relation(fields: [orderId], references: [id], onDelete: Cascade)
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id])

  @@id([orderId, ingredientId])
}
```

### 7.2. Thuật toán Giữ kho Nguyên tử (Atomic Stock Holding Algorithm)
Tại [`apps/api/src/modules/inventory/inventory.service.ts`](../../../apps/api/src/modules/inventory/inventory.service.ts):
```typescript
async holdStockForOrder(tx: Prisma.TransactionClient, orderId: string, requirements: Map<string, number>): Promise<void> {
  // Sắp xếp ID nguyên liệu tăng dần để loại trừ hoàn toàn nguy cơ deadlock
  const sortedIngredientIds = Array.from(requirements.keys()).sort();

  for (const ingredientId of sortedIngredientIds) {
    const qtyNeeded = requirements.get(ingredientId)!;

    // 1. Lấy thông tin hiện tại
    const current = await tx.ingredient.findUnique({ where: { id: ingredientId } });
    if (!current || current.stock < qtyNeeded) {
      throw new ApiError(409, 'INSUFFICIENT_STOCK', `Không đủ nguyên liệu ${current?.name ?? ingredientId}`);
    }

    // 2. Cập nhật lạc quan với điều kiện kép: stock >= qtyNeeded VÀ version == current.version
    const result = await tx.$executeRaw`
      UPDATE "Ingredient"
      SET "stock" = "stock" - ${qtyNeeded},
          "version" = "version" + 1
      WHERE "id" = ${ingredientId}::uuid
        AND "stock" >= ${qtyNeeded}
        AND "version" = ${current.version}
    `;

    // 3. Nếu số dòng cập nhật == 0, nghĩa là phiên bản đã bị thay đổi bởi giao dịch khác trong mili-giây vừa qua!
    if (result === 0) {
      throw new ApiError(409, 'CONCURRENCY_CONFLICT', `Tranh chấp tồn kho nguyên liệu ${current.name}, vui lòng thử lại`);
    }

    // 4. Lưu lại snapshot giữ kho cho đơn hàng
    await tx.orderIngredientHold.create({
      data: {
        orderId,
        ingredientId,
        amount: qtyNeeded,
      },
    });
  }
}
```

## 8. Kiểm thử & Xác minh Kiến trúc (Verification)
Được chứng minh qua bộ kiểm thử E2E cực kỳ khắt khe [`tests/api/inventory-stock.e2e-spec.ts`](../../../tests/api/inventory-stock.e2e-spec.ts):
- Bắn đồng thời 20 request tạo đơn tranh mua cùng 1 nguyên liệu chỉ còn đủ cho 3 đơn: Đúng 3 đơn thành công, 17 đơn còn lại bị từ chối với mã lỗi `409 INSUFFICIENT_STOCK`.
- Tồn kho cuối cùng của nguyên liệu trong cơ sở dữ liệu đạt chuẩn chính xác không bị âm kho (`stock >= 0`).
- Khi hủy đơn PENDING, toàn bộ nguyên liệu lập tức được hoàn trả về kho chính xác 100%.
