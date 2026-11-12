# ADR-003: Xác thực Không trạng thái bằng JWT, Mã hóa Bcrypt và Phân quyền RBAC (Customer, Staff & Admin)

## 1. Trạng thái (Status)
**ACCEPTED** (Đã chấp thuận & Áp dụng sản xuất)

## 2. Ngày quyết định (Date)
2026-10-23

## 3. Bối cảnh & Vấn đề Kỹ thuật (Context & Problem Statement)
Hệ thống BrewLite phục vụ ba nhóm tác nhân có đặc quyền và trách nhiệm hoàn toàn khác nhau:
1. **Khách hàng (`CUSTOMER`)**:
   - Đăng ký tài khoản, đăng nhập, quản lý thông tin cá nhân.
   - Chỉ được phép xem lịch sử đơn hàng và chi tiết đơn hàng của **chính mình**. Tuyệt đối không được xem dữ liệu đơn hàng của khách hàng khác.
   - Tích lũy và theo dõi lịch sử điểm thưởng của riêng mình.
2. **Nhân viên quán / Barista (`STAFF`)**:
   - Truy cập danh sách các đơn hàng cần chuẩn bị của quán.
   - Chuyển đổi trạng thái đơn hàng theo quy trình pha chế (`PAID` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED`).
   - Có thẩm quyền hủy đơn hàng và kích hoạt hoàn tiền khi khách yêu cầu hủy tại quầy hoặc hết nguyên liệu bất khả kháng.
3. **Quản trị viên hệ thống (`ADMIN`)**:
   - Quản trị toàn bộ danh mục sản phẩm, cấu hình công thức nguyên liệu kho, danh mục mã khuyến mại và đối soát các giao dịch tài chính toàn hệ thống.
   - Có thẩm quyền cao nhất, truy cập các dashboard và endpoint quản trị hệ thống (`apps/web/src/app/admin/`, `apps/api/src/modules/auth/admin.controller.ts`).

Thách thức bảo mật đặt ra:
- **Ngăn chặn rò rỉ dữ liệu chéo (Multi-tenant Data Isolation)**: Nếu khách hàng cố ý thay đổi `orderId` trên thanh URL trình duyệt sang ID của người khác, hệ thống phải xử lý an toàn như thế nào?
- **Bảo vệ mật khẩu người dùng**: Cơ chế mã hóa một chiều phải đủ mạnh để chống lại các cuộc tấn công tra từ điển (Dictionary Attack) và vét cạn (Brute-force).
- **Kiến trúc Không trạng thái (Stateless)**: Máy chủ API không lưu session trong RAM để có thể dễ dàng scale ngang trong môi trường container.
- **Fail-fast Security**: Tuyệt đối không cho phép máy chủ khởi động nếu cấu hình khóa bí mật JWT bị thiếu hoặc quá yếu.

## 4. Các yếu tố thúc đẩy quyết định (Decision Drivers)
1. **Bảo mật theo thiết kế (Security by Design)**: Tuân thủ các nguyên tắc vàng của OWASP Top 10 về Broken Authentication và Broken Object Level Authorization (BOLA).
2. **Hiệu năng & Khả năng mở rộng (Stateless Scalability)**: Xác thực request dựa trên chữ ký số độc lập, không phát sinh chi phí đọc/ghi session store tập trung (như Redis).
3. **Phân quyền tường minh (Declarative RBAC)**: Quản lý quyền truy cập qua NestJS Guards và Custom Decorators một cách rõ ràng, dễ bảo trì.

## 5. Các phương án kiến trúc được đánh giá (Considered Options)

### Phương án A: Stateful Session (Cookie Session + Redis / Database Session Table)
- **Ưu điểm**: Có thể thu hồi phiên đăng nhập của người dùng ngay lập tức từ phía máy chủ (Instant Revocation).
- **Nhược điểm & Rủi ro**:
  - Đòi hỏi phải dựng thêm hạ tầng Redis container riêng biệt, làm tăng độ phức tạp khi chấm điểm bài tập.
  - Vướng phải các rào cản về chính sách SameSite, Secure Cookie, và CORS Cookie credentials giữa hai cổng mạng khác nhau (`http://localhost:3000` và `http://localhost:3001`) trong môi trường phát triển cục bộ.
  - Mỗi request gửi đến đều phải truy vấn Redis để lấy thông tin phiên làm giảm thông lượng của API.
- **Đánh giá**: **TỪ CHỐI**.

### Phương án B: Dịch vụ Nhận thực bên ngoài (Firebase Auth / Auth0 / Clerk)
- **Ưu điểm**: Được cung cấp sẵn giao diện đăng nhập và các tính năng Social Login.
- **Nhược điểm & Rủi ro**:
  - Phụ thuộc hoàn toàn vào kết nối internet ra ngoài, không thể chạy kiểm thử tự động trong môi trường sandbox nội bộ không có mạng.
  - Không đáp ứng yêu cầu tự xây dựng bộ khung bảo mật của bài tập lớn ngành Công nghệ Phần mềm.
- **Đánh giá**: **TỪ CHỐI**.

### Phương án C: Stateless JWT kết hợp Bcrypt Salt 12 & Database Role Refresh (Phương án được chọn)
- **Ưu điểm**:
  - Gọn nhẹ, chuẩn RESTful, truyền qua Header `Authorization: Bearer <token>`.
  - Phía Client lưu trong `sessionStorage`, tự động hủy phiên khi đóng tab giúp bảo vệ người dùng trên máy tính công cộng.
  - Ký bằng thuật toán đối xứng `HS256`, thời hạn sống ngắn (1 giờ).
  - Tích hợp cơ chế kiểm tra lại trạng thái người dùng trong cơ sở dữ liệu (`verifyAccessToken`) để cập nhật kịp thời vai trò nếu người dùng vừa được cấp quyền STAFF hoặc bị khóa tài khoản.

## 6. Ma trận so sánh & Đánh giá (Evaluation Matrix)

| Tiêu chí kỹ thuật (Weight) | Phương án A (Stateful Session) | Phương án B (Dịch vụ bên thứ ba) | Phương án C (Stateless JWT + Bcrypt) |
| :--- | :---: | :---: | :---: |
| Phù hợp môi trường kiểm thử Offline (30%) | 3/5 | 1/5 | **5/5** |
| Hiệu năng & Không trạng thái (25%) | 3/5 | 4/5 | **5/5** |
| Mức độ an toàn bảo vệ mật khẩu (20%) | 4/5 | 5/5 | **5/5** |
| Đơn giản trong cấu hình CORS (15%) | 2/5 | 3/5 | **5/5** |
| Kiểm soát mã nguồn tự xây dựng (10%) | 4/5 | 1/5 | **5/5** |
| **Tổng điểm trọng số** | **3.05 / 5.0** | **2.65 / 5.0** | **5.00 / 5.0** |

## 7. Chi tiết triển khai kỹ thuật (Implementation Details)

### 7.1. Chính sách An toàn Khóa Bí mật (Fail-Fast Policy)
Tại [`apps/api/src/modules/auth/auth-policy.ts`](../../../apps/api/src/modules/auth/auth-policy.ts):
```typescript
export const AUTH_POLICY = Object.freeze({
  algorithm: 'HS256',
  issuer: 'brewlite-api',
  audience: 'brewlite-web',
  expiresInSeconds: 3600, // 1 giờ
  minSecretLength: 32,    // Khóa bí mật bắt buộc tối thiểu 32 ký tự
  bcryptCost: 12,         // 12 vòng băm muối (Bcrypt Work Factor)
});
```

Khi ứng dụng khởi động, [`AuthService.onModuleInit()`](../../../apps/api/src/modules/auth/auth.service.ts) chủ động kiểm tra khóa:
```typescript
onModuleInit() {
  const envSecret = process.env.JWT_SECRET;
  if (!envSecret || envSecret.length < AUTH_POLICY.minSecretLength) {
    throw new Error(
      `JWT_SECRET must be configured with at least ${AUTH_POLICY.minSecretLength} characters`,
    );
  }
  this.secret = envSecret;
}
```

### 7.2. Bảo vệ Mật khẩu Người dùng & Chống rà quét tài khoản
- **Đăng ký**: Băm mật khẩu bằng `await bcrypt.hash(password, 12)`.
- **Đăng nhập an toàn**: So sánh bằng `await bcrypt.compare(password, user.passwordHash)`. Nếu sai tài khoản hoặc sai mật khẩu, hệ thống LUÔN ném ra thông báo chung:
  ```json
  {
    "statusCode": 401,
    "code": "INVALID_CREDENTIALS",
    "message": "Email hoặc mật khẩu không đúng"
  }
  ```
  Thông điệp đồng nhất này ngăn chặn kẻ tấn công rà quét xem một email nào đó đã được đăng ký trong hệ thống hay chưa (User Enumeration Defense).

### 7.3. Bảo vệ Cách ly Dữ liệu Đơn hàng (Multi-tenant Data Isolation)
Tại [`apps/api/src/modules/orders/order-reader.service.ts`](../../../apps/api/src/modules/orders/order-reader.service.ts):
```typescript
async findMine(userId: string, orderId: string): Promise<Api.Order> {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { toppings: true } } },
  });

  // Nếu đơn hàng không tồn tại HOẶC không thuộc về userId hiện tại:
  // Trả về 404 thay vì 403 để không để lộ sự tồn tại của ID đơn hàng đó!
  if (!order || order.userId !== userId) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
  }
  return mapOrder(order);
}
```

## 8. Kiểm thử & Xác minh Kiến trúc (Verification)
Được chứng minh qua bộ kiểm thử E2E độc lập [`tests/api/auth.e2e-spec.ts`](../../../tests/api/auth.e2e-spec.ts):
- Đăng ký trùng email nhận về đúng mã `409 Conflict`.
- Đăng nhập sai mật khẩu nhận về `401 INVALID_CREDENTIALS`.
- Sử dụng token giả mạo chữ ký hoặc sửa payload bị `JwtAuthGuard` chặn ngay lập tức với `401 Unauthorized`.
- Server từ chối khởi động khi `JWT_SECRET` bị thiếu hoặc dưới 32 ký tự.
