# ADR-002: Lựa chọn Cơ sở dữ liệu Quan hệ PostgreSQL 17 và Prisma ORM 7 với Mô hình Unit of Work

## 1. Trạng thái (Status)
**ACCEPTED** (Đã chấp thuận & Áp dụng sản xuất)

## 2. Ngày quyết định (Date)
2026-10-22

## 3. Bối cảnh & Vấn đề Kỹ thuật (Context & Problem Statement)
Hệ sinh thái dữ liệu của chuỗi bán lẻ đồ uống BrewLite sở hữu các mối quan hệ đa tầng với ràng buộc phức tạp:
- **Định lượng công thức sản phẩm**: Một sản phẩm (`Product`) có nhiều kích thước (`ProductSize`). Sản phẩm được cấu thành từ danh mục nhiều nguyên liệu (`ProductIngredient`) theo định lượng gram/ml. Mỗi loại topping (`Topping`) lại chứa các nguyên liệu tương ứng (`ToppingIngredient`).
- **Snapshot đơn hàng bất biến (Immutable Order Snapshot)**: Một đơn hàng (`Order`) bao gồm nhiều dòng (`OrderItem`), mỗi dòng chứa danh sách các topping đã chọn (`OrderItemTopping`). Khi giá hoặc công thức trong catalog thay đổi sau này, toàn bộ giá bán, tên món, snapshot nguyên liệu (`OrderIngredientHold`) của đơn hàng lịch sử trong quá khứ tuyệt đối không được phép thay đổi.
- **Ràng buộc toàn vẹn tài chính & giao dịch (Financial Transactions)**: Các thao tác như Trừ tồn kho nguyên liệu, Tạo đơn hàng, Cập nhật trạng thái thanh toán, và Ghi sổ cái điểm thưởng bắt buộc phải diễn ra trong một giao dịch cơ sở dữ liệu duy nhất tuân thủ nghiêm ngặt chuẩn **ACID** (Atomicity, Consistency, Isolation, Durability). Nếu một bước thất bại, toàn bộ giao dịch phải tự động rollback hoàn toàn.

## 4. Các yếu tố thúc đẩy quyết định (Decision Drivers)
1. **Toàn vẹn quan hệ (Relational Integrity)**: Cần khóa ngoại (Foreign Keys), ràng buộc kiểm tra (`CHECK`), ràng buộc duy nhất (`UNIQUE`), và chỉ mục (`INDEX`) để bảo vệ dữ liệu ở tầng thấp nhất.
2. **Type-Safe ORM**: Hạn chế tối đa các lỗi chính tả trong câu lệnh SQL (Runtime Query Errors) thông qua TypeScript type generation.
3. **Quản lý Migration theo phiên bản (Declarative Migrations)**: Toàn bộ cấu trúc cơ sở dữ liệu phải được lưu trữ dưới dạng code (`schema.prisma`), có lịch sử di chuyển schema (`migrations/`) để đồng bộ nhất quán giữa 6 máy tính của nhóm phát triển.
4. **Hỗ trợ Khóa bi quan & Transaction phân tán**: Khả năng chạy transaction nguyên tử với khóa dòng (`FOR UPDATE`) khi giải quyết bài toán bù điểm thưởng và hoàn tiền.

## 5. Các phương án kiến trúc được đánh giá (Considered Options)

### Phương án A: NoSQL Document Database (MongoDB + Mongoose)
- **Mô tả**: Lưu trữ mỗi đơn hàng thành một tài liệu JSON lớn chứa nhúng toàn bộ thông tin món và topping.
- **Ưu điểm**: Linh hoạt, không cần định nghĩa bảng quan hệ lúc ban đầu.
- **Nhược điểm & Rủi ro**:
  - Không có khóa ngoại cứng; việc trừ tồn kho nguyên liệu đồng thời trên bảng `ingredients` khi nhiều đơn hàng cùng phát sinh rất dễ dẫn đến tình trạng sai lệch hoặc âm kho (Inconsistent State).
  - Không hỗ trợ tốt mô hình sổ cái kép (Double-entry Ledger) đòi hỏi đối chiếu chặt chẽ giữa `User.loyaltyPoints` và bảng `LoyaltyEntry`.
  - Transaction trên MongoDB Replica Set đòi hỏi cấu hình hạ tầng phức tạp hơn nhiều so với RDBMS đơn lẻ.
- **Đánh giá**: **TỪ CHỐI**.

### Phương án B: PostgreSQL 17 kết hợp TypeORM / Sequelize
- **Mô tả**: Sử dụng ORM truyền thống dựa trên các class entity và decorator.
- **Ưu điểm**: Rất quen thuộc trong cộng đồng NestJS truyền thống.
- **Nhược điểm & Rủi ro**:
  - Cơ chế suy luận kiểu dữ liệu (Type Inference) của TypeORM còn nhiều hạn chế, dev vẫn phải khai báo thủ công kiểu trả về của câu query.
  - Rất dễ phát sinh lỗi N+1 query khi nạp quan hệ lồng nhau (`Order -> OrderItem -> OrderItemTopping`).
  - Hệ thống migration của TypeORM thường xuyên bị lệch (drift) giữa mã code entity và schema database thực tế.
- **Đánh giá**: **TỪ CHỐI**.

### Phương án C: PostgreSQL 17 kết hợp Prisma ORM 7 (Phương án được chọn)
- **Mô tả**: Định nghĩa schema tại `schema.prisma`. Prisma CLI tự động sinh ra Prisma Client với kiểu dữ liệu TypeScript chính xác 100% đến từng trường nullable.
- **Ưu điểm**:
  - Tính năng `prisma migrate deploy` và `prisma migrate dev` tự động sinh SQL migration minh bạch, cam kết trực tiếp vào Git.
  - Hỗ trợ cú pháp truy vấn lồng nhau cực kỳ an toàn: `include: { items: { include: { toppings: true } } }`.
  - Tích hợp sẵn công cụ quản trị giao diện web trực quan **Prisma Studio** (`npm run db:studio`).
  - Hỗ trợ `$transaction` tương thích hoàn hảo với mô hình Unit of Work.

## 6. Ma trận so sánh & Đánh giá (Evaluation Matrix)

| Tiêu chí kỹ thuật (Weight) | Phương án A (MongoDB) | Phương án B (TypeORM) | Phương án C (PostgreSQL + Prisma 7) |
| :--- | :---: | :---: | :---: |
| Đảm bảo tính toàn vẹn ACID (30%) | 2/5 | 4/5 | **5/5** |
| Độ an toàn kiểu dữ liệu Type-Safe (25%) | 2/5 | 3/5 | **5/5** |
| Quản lý Migration minh bạch (20%) | 1/5 | 3/5 | **5/5** |
| Phòng chống lỗi N+1 query (15%) | 3/5 | 2/5 | **4/5** |
| Trải nghiệm công cụ quản trị (10%) | 4/5 | 3/5 | **5/5** |
| **Tổng điểm trọng số** | **2.25 / 5.0** | **3.20 / 5.0** | **4.85 / 5.0** |

## 7. Chi tiết triển khai kỹ thuật (Implementation Details)

### 7.1. Cấu trúc Lược đồ Cơ sở dữ liệu Cốt lõi
Tại [`apps/api/prisma/schema.prisma`](../../../apps/api/prisma/schema.prisma):
```prisma
model Order {
  id                String            @id @default(uuid()) @db.Uuid
  code              String            @unique
  userId            String            @db.Uuid
  user              User              @relation(fields: [userId], references: [id])
  status            OrderStatus       @default(PENDING)
  reservationStatus ReservationStatus @default(HELD)
  subtotal          Int
  discount          Int               @default(0)
  total             Int
  promotionCode     String?
  version           Int               @default(0)
  items             OrderItem[]
  payments          Payment[]
  holds             OrderIngredientHold[]
  loyaltyEntries    LoyaltyEntry[]
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  @@index([userId, createdAt(sort: Desc)])
}
```

### 7.2. Triển khai Mẫu thiết kế Unit of Work
Để đảm bảo tất cả các tác vụ trong một ca sử dụng (Use Case) hoặc là thành công trọn vẹn hoặc bị hủy bỏ hoàn toàn, hệ thống triển khai [`UnitOfWork`](../../../apps/api/src/common/database/unit-of-work.ts):
```typescript
@Injectable()
export class UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async withTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return work(tx);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 10000, // 10 giây timeout chống treo lock
    });
  }
}
```

## 8. Hệ quả & Rủi ro (Consequences & Mitigations)
- **Hệ quả tích cực**:
  - Không còn hiện tượng sai lệch dữ liệu tài chính hoặc lỏng lẻo khóa ngoại.
  - Việc truy vấn danh mục món và đơn hàng được tối ưu hóa thông qua các chỉ mục quan hệ kết hợp `@@index([userId, createdAt(sort: Desc)])`.
- **Rủi ro & Biện pháp giảm thiểu**:
  - *Rủi ro*: Prisma sinh mã client vào `src/generated/prisma`, nếu ai quên chạy `prisma generate` sau khi pull git sẽ bị lỗi type.
  - *Biện pháp*: Đã cấu hình lệnh `npm run setup` và `npm run build` tự động kích hoạt `prisma generate` trước khi biên dịch mã nguồn.
