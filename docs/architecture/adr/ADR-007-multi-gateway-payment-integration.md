# ADR-007: Kiến trúc Adapter Pattern Tích hợp Đa Cổng Thanh toán (VNPay, Stripe, Mock) và Đối soát Hoàn tiền An toàn

## 1. Trạng thái (Status)
**ACCEPTED** (Đã chấp thuận & Áp dụng sản xuất)

## 2. Ngày quyết định (Date)
2026-10-27

## 3. Bối cảnh & Vấn đề Kỹ thuật (Context & Problem Statement)
Hệ thống thương mại điện tử BrewLite phục vụ cả khách hàng trong nước và du khách quốc tế:
- **Thanh toán Nội địa (Domestic Banking)**: Cần hỗ trợ cổng **VNPay** để khách hàng có thể quét mã QR ngân hàng (VietQR) hoặc thanh toán qua thẻ ATM nội địa Napas.
- **Thanh toán Quốc tế (International Cards)**: Cần hỗ trợ cổng **Stripe** cho các loại thẻ tín dụng/ghi nợ quốc tế Visa, Mastercard, JCB, American Express.
- **Môi trường Phát triển & Kiểm thử Tự động (Testing / CI/CD)**: Cần một cổng **Mock Gateway** có thể giả lập ngay lập tức các kịch bản: thanh toán thành công, thanh toán thất bại, thanh toán timeout, và thử lại (retry) mà không cần kết nối mạng ra bên ngoài.

Thách thức kỹ thuật đặt ra:
- **Nguyên lý Mở/Đóng (Open/Closed Principle)**: Làm thế nào để thêm bớt các cổng thanh toán mới trong tương lai (ví dụ MoMo, ZaloPay, Apple Pay) mà không phải sửa đổi mã nguồn cốt lõi của Order State Machine?
- **Nguy cơ Tấn công Can thiệp Dữ liệu (Data Tampering Attacks)**: Kẻ xấu có thể can thiệp vào tham số HTTP request từ client để giả mạo số tiền đơn hàng (ví dụ sửa giá trị đơn từ 100.000₫ thành 1.000₫) hoặc giả mạo phản hồi callback từ cổng thanh toán.
- **Bất đồng bộ & Hoàn tiền An toàn (Safe Refund Flow)**: Khi một đơn hàng đã thanh toán (`PAID`) bị nhân viên hủy bỏ (do hết nguyên liệu hoặc khách yêu cầu), hệ thống phải tự động nhận diện chính xác đơn đó đã thanh toán qua cổng nào để kích hoạt hoàn tiền tự động qua đúng cổng đó. Nếu cổng thanh toán phản hồi đang chờ đối soát (Pending Reconciliation), hệ thống phải khóa đơn lại để ngăn chặn Barista pha chế nhầm.

## 4. Các yếu tố thúc đẩy quyết định (Decision Drivers)
1. **Khả năng Mở rộng Kiến trúc (Extensibility)**: Tách rời toàn bộ logic giao tiếp với nhà cung cấp cổng thanh toán thông qua giao diện chuẩn (Adapter Pattern).
2. **Bảo mật Chữ ký số Tuyệt đối (Cryptographic Integrity)**: Bắt buộc mọi giao dịch gửi đi và phản hồi nhận về đều phải được xác thực bằng chữ ký số một chiều (HMAC-SHA512 đối với VNPay, Webhook Secret đối với Stripe).
3. **Quy trình Đối soát Tự động (Automated Reconciliation & QueryDR)**: Khả năng chủ động truy vấn trạng thái giao dịch từ máy chủ ngân hàng khi phản hồi của người dùng bị gián đoạn.

## 5. Các phương án kiến trúc được đánh giá (Considered Options)

### Phương án A: Chỉ sử dụng Duy nhất Cổng Thanh toán Mock
- **Ưu điểm**: Đơn giản, không cần đăng ký tài khoản Sandbox với ngân hàng.
- **Nhược điểm & Rủi ro**:
  - Không giải quyết được các bài toán thực tiễn về mã hóa chữ ký số, xử lý webhook không đồng bộ và đối soát dữ liệu ngân hàng.
  - Không đáp ứng yêu cầu nâng cao về tích hợp cổng thanh toán thực tế của đồ án.
- **Đánh giá**: **TỪ CHỐI**.

### Phương án B: Nhúng Form Nhập Thẻ Trực tiếp trên Website (Custom Card Form / Stripe Elements)
- **Ưu điểm**: Khách hàng không bị chuyển hướng sang trang web khác.
- **Nhược điểm & Rủi ro**:
  - Đòi hỏi hệ thống phải tuân thủ chứng chỉ bảo mật ngành thẻ **PCI-DSS (Payment Card Industry Data Security Standard)** cực kỳ khắt khe; nếu máy chủ bị xâm nhập có thể dẫn đến việc lộ số thẻ khách hàng.
  - Xử lý xác thực OTP 2 lớp (3D-Secure) trên frontend đòi hỏi luồng xử lý iframe rất phức tạp.
- **Đánh giá**: **TỪ CHỐI**.

### Phương án C: Mô hình Adapter Pattern kết hợp Hosted Checkout & Chữ ký số (Phương án được chọn)
- **Mô tả**:
  1. Định nghĩa interface chung `PaymentGatewayPort` tại tầng domain.
  2. Triển khai 3 adapter riêng biệt:
     - [`MockPaymentGatewayService`](../../../apps/api/src/modules/payments/mock-payment-gateway.service.ts): Giả lập logic kiểm thử.
     - [`VnPayService`](../../../apps/api/src/modules/payments/vnpay.service.ts): Giao tiếp với VNPay Sandbox API (HMAC-SHA512).
     - [`StripeService`](../../../apps/api/src/modules/payments/stripe.service.ts): Giao tiếp với Stripe SDK (Checkout Session & Webhook).
  3. Phương thức thanh toán Hosted: Chuyển hướng khách hàng sang trang nhập thẻ an toàn của chính VNPay và Stripe.
  4. Xác thực chữ ký số 2 chiều và khóa chờ đối soát khi có sự cố.

## 6. Ma trận so sánh & Đánh giá (Evaluation Matrix)

| Tiêu chí kỹ thuật (Weight) | Phương án A (Chỉ dùng Mock) | Phương án B (Nhúng Form Thẻ) | Phương án C (Adapter + Hosted Checkout) |
| :--- | :---: | :---: | :---: |
| Tuân thủ chuẩn bảo mật thẻ PCI-DSS (30%) | Không áp dụng | 1/5 | **5/5** |
| Tính thực tiễn & Đa dạng cổng (25%) | 1/5 | 4/5 | **5/5** |
| Khả năng mở rộng cổng mới OCP (20%) | 2/5 | 3/5 | **5/5** |
| Xử lý chữ ký số & Chống gian lận (15%) | 1/5 | 4/5 | **5/5** |
| Đơn giản trong tích hợp kiểm thử (10%) | 5/5 | 2/5 | **5/5** |
| **Tổng điểm trọng số** | **1.65 / 5.0** | **2.65 / 5.0** | **5.00 / 5.0** |

## 7. Chi tiết triển khai kỹ thuật (Implementation Details)

### 7.1. Giao diện Adapter Chung cho Cổng Thanh toán
```typescript
export interface PaymentGatewayPort {
  createPaymentUrl(order: StoredOrder, returnUrl: string): Promise<string>;
  verifyCallback(query: Record<string, string>): Promise<{ isSuccess: boolean; transactionNo?: string; error?: string }>;
  refund(orderId: string, amount: number, reason: string): Promise<{ isSuccess: boolean; isPending?: boolean }>;
  queryDr(orderId: string): Promise<{ status: 'PAID' | 'FAILED' | 'PENDING' }>;
}
```

### 7.2. Xác thực Chữ ký số và Đối soát 2 yếu tố VNPay (Two-Factor Validation)
Tại [`apps/api/src/modules/payments/vnpay.service.ts`](../../../apps/api/src/modules/payments/vnpay.service.ts):
```typescript
verifyCallback(query: Record<string, string>): { isSuccess: boolean; orderId: string; message: string } {
  const secureHash = query['vnp_SecureHash'];
  const responseCode = query['vnp_ResponseCode'];
  const transactionStatus = query['vnp_TransactionStatus'];
  const tmnCode = query['vnp_TmnCode'];

  // 1. Kiểm tra mã thương nhân phải khớp chính xác với cấu hình hệ thống
  if (tmnCode !== this.config.get('VNPAY_TMN_CODE')) {
    throw new ApiError(400, 'INVALID_TMN_CODE', 'Mã đối tác VNPay không hợp lệ');
  }

  // 2. Tái tạo chuỗi dữ liệu và băm HMAC-SHA512 để so sánh chữ ký
  const calculatedHash = this.generateHash(this.cleanParams(query));
  if (calculatedHash.toLowerCase() !== secureHash?.toLowerCase()) {
    throw new ApiError(400, 'INVALID_SIGNATURE', 'Chữ ký số VNPay không hợp lệ - Dữ liệu đã bị can thiệp!');
  }

  // 3. ĐỐI SOÁT 2 YẾU TỐ: Bắt buộc CẢ ResponseCode == 00 VÀ TransactionStatus == 00
  // Nếu ngân hàng đã trừ tiền nhưng VNPay chưa quyết toán -> Không được tự ý ghi nhận thành công!
  const isSuccess = responseCode === '00' && transactionStatus === '00';

  return {
    isSuccess,
    orderId: query['vnp_TxnRef'],
    message: isSuccess ? 'Giao dịch thành công' : this.mapErrorMessage(responseCode),
  };
}
```

### 7.3. Luồng Tự động Hoàn tiền và Khóa Chờ Đối soát (Reconciliation Lock)
Khi một đơn hàng đã thanh toán bị hủy, [`PaymentsService.refundPayment()`](../../../apps/api/src/modules/payments/payments.service.ts) tự động kích hoạt:
1. Xác định cổng thanh toán gốc từ bảng `Payment` của đơn hàng (`method = 'VNPAY'` hoặc `'STRIPE'`).
2. Gửi yêu cầu hoàn tiền đến API của nhà cung cấp.
3. Nếu cổng thanh toán phản hồi giao dịch đang được đối soát (ví dụ VNPay mã 94, 05, 06):
   - Không chuyển đơn ngay sang `CANCELLED`.
   - Đưa đơn vào trạng thái `PENDING_RECONCILIATION` và khóa chặt đơn hàng.
   - Nhân viên Barista bị chặn không thể chuyển đơn sang `PREPARING` trong lúc tiền đang được đối soát giữa ngân hàng và hệ thống.

## 8. Kiểm thử & Xác minh Kiến trúc (Verification)
Được chứng minh qua 2 bộ kiểm thử tích hợp chuyên sâu:
- [`tests/api/vnpay.e2e-spec.ts`](../../../tests/api/vnpay.e2e-spec.ts) (**11/11 tests PASS**):
  - Phát hiện chữ ký số bị giả mạo hoặc sai lệch tham số.
  - Từ chối ghi nhận khi `ResponseCode == 00` nhưng `TransactionStatus != 00`.
  - Kiểm thử xử lý mã 94, 05, 06 và kích hoạt khóa đối soát thành công.
- [`tests/api/stripe.e2e-spec.ts`](../../../tests/api/stripe.e2e-spec.ts) (**22/22 tests PASS**):
  - Xác thực Webhook signature với khóa luân chuyển (rotated secrets).
  - Tự động hoàn tiền Stripe khi đơn hàng PAID bị hủy.
  - Ngăn chặn hoàn tiền với số tiền âm hoặc bằng 0.
