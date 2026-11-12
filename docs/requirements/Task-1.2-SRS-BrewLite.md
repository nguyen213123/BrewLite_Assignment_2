title: "Đặc tả yêu cầu phần mềm (SRS rút gọn) – BrewLite"
subtitle: "Assignment 2 – Task 1.2 – Yêu cầu chức năng và phi chức năng"

| **Dự án** | BrewLite – ứng dụng đặt cà phê không dùng tiền mặt |
| **Môn học** | Công nghệ Phần mềm – Trường Đại học Sài Gòn, Khoa CNTT |
| **Phiên bản** | 1.2 |
| **Ngày** | 12/11/2026 |


# 1. Yêu cầu chức năng (FR-01 đến FR-26)

Các yêu cầu chức năng được tổ chức theo đúng thứ tự các nhóm nghiệp vụ của đề bài: **Menu**, **Chi tiết sản phẩm**, **Giỏ hàng**, **Xác thực**, **Đặt đơn**, **Thanh toán**, **Lịch sử đơn**, **Quản lý trạng thái đơn**, cùng hai nhóm mở rộng **Khuyến mãi & Điểm thưởng** và **Quản trị & Thống kê**.

## 1.1 Menu

### FR-01 – Hiển thị menu đồ uống `Must`

Hệ thống hiển thị danh sách đồ uống khả dụng (`active = true`) gồm hình ảnh, tên, mô tả, giá gốc size S (`price`) và số ly còn bán được (`stock`, tính từ kho nguyên liệu `Ingredient`), lấy từ API `GET /api/products` (hỗ trợ phân trang `page`, `limit`).

- **AC-01.1** Given hệ thống có dữ liệu sản phẩm đang mở bán (`active = true`), When khách mở trang menu, Then danh sách hiển thị mỗi sản phẩm với hình, tên, giá định dạng VND (ví dụ `45.000 ₫`) và trạng thái còn hàng/hết hàng dựa trên `stock` suy ra từ `Ingredient.stock`.
- **AC-01.2** Given API đang xử lý, When trang tải dữ liệu, Then giao diện hiển thị trạng thái loading.
- **AC-01.3** Given không có sản phẩm nào khớp bộ lọc, When khách mở menu, Then giao diện hiển thị trạng thái rỗng kèm thông báo.
- **AC-01.4** Given API trả lỗi hoặc mất kết nối, When khách mở menu, Then giao diện hiển thị thông báo lỗi và nút thử lại.
- **Kiểm chứng:** I (API), U/E (giao diện).

### FR-02 – Lọc và tìm kiếm menu theo danh mục / từ khóa `Could`

Khách lọc danh sách theo nhóm đồ uống (`cat`: cà phê, trà & trà sữa, đá xay / đặc biệt) hoặc tìm kiếm theo tên/mô tả (`q`) trên giao diện trình duyệt (`menu-grid.tsx` / `filter.ts`) đối với tập sản phẩm tải từ `GET /api/products`.

- **AC-02.1** Given menu có nhiều nhóm đồ uống, When khách chọn một nhóm hoặc nhập từ khóa tìm kiếm không phân biệt hoa thường/dấu tiếng Việt, Then chỉ các sản phẩm khớp điều kiện được hiển thị.
- **AC-02.2** Given khách bỏ chọn nhóm hoặc xóa từ khóa, When quay lại "Tất cả", Then toàn bộ sản phẩm đã tải hiển thị lại.
- **Kiểm chứng:** U.

## 1.2 Chi tiết sản phẩm

### FR-03 – Xem chi tiết sản phẩm `Must`

Hệ thống cung cấp `GET /api/products/:id` và màn hình chi tiết sản phẩm (`/products/:id`) gồm hình, tên, mô tả, giá gốc (`price`), các lựa chọn size (`sizes`: `S`, `M`, `L` kèm `stock` từng size) và danh sách topping đang hoạt động (`toppings`: `id`, `name`, `price`, `stock`).

- **AC-03.1** Given sản phẩm đang mở bán (`active = true`), When mở chi tiết, Then hiển thị các size thực tế, giá tuyệt đối từ `ProductSize.price` và số lượng tối đa có thể đặt theo nguyên liệu.
- **AC-03.2** Given `id` không tồn tại hoặc sản phẩm có `active = false`, When gọi `GET /api/products/:id`, Then API trả mã `404 PRODUCT_NOT_FOUND` và giao diện hiển thị thông báo không tìm thấy.
- **AC-03.3** Given kho nguyên liệu (`Ingredient.stock`) không đủ đáp ứng định mức công thức của sản phẩm/topping khi báo giá hoặc tạo đơn, When gửi yêu cầu, Then hệ thống trả mã `409 OUT_OF_STOCK` (`"Không đủ nguyên liệu cho món đã chọn"`) và giữ nguyên giỏ hàng để khách điều chỉnh.
- **Kiểm chứng:** I, U.

### FR-04 – Chọn size và topping, tính giá theo tùy chọn `Must`

Khách chọn size (`S`, `M`, `L` – tối đa 1 size) và topping (0 hoặc nhiều topping, không trùng lặp); giá hiển thị cập nhật tức thời theo lựa chọn.

- **AC-04.1** Given khách chọn size, When thay đổi size, Then đơn giá lấy từ bản ghi `ProductSize.price` tương ứng, cộng tổng giá topping đã chọn.
- **AC-04.2** Given khách chọn một hoặc nhiều topping, When thay đổi lựa chọn, Then đơn giá cộng thêm đúng tổng giá của các topping đã chọn.
- **AC-04.3** Given khách xem màn hình chọn tùy chọn, When chọn cấu hình hợp lệ, Then hệ thống kiểm tra size, tính số lượng tối đa theo tồn kho (`maxQtyFor`) và chuẩn hóa danh sách `toppingIds` (loại bỏ trùng lặp, sắp xếp tăng dần để định danh dòng giỏ hàng).
- **AC-04.4** Công thức giá dòng (`priceLine` trong `order-pricing.ts` ở backend và `priceSelection` trong `pricing.ts` ở frontend): `unitPrice = sizePrice + sum(topping.price)`, `lineTotal = unitPrice × qty`, được kiểm chứng bằng unit test ở cả frontend và backend.
- **Kiểm chứng:** U.

## 1.3 Giỏ hàng

### FR-05 – Thêm sản phẩm vào giỏ `Must`

- **AC-05.1** Given sản phẩm còn hàng, When khách bấm "Thêm vào giỏ" (số lượng từ 1 đến `min(99, tồn kho)` mỗi dòng), Then sản phẩm xuất hiện trong giỏ với đúng `productId`, `size`, `toppings`, `qty` và badge tổng số ly trên thanh điều hướng tăng tương ứng.
- **AC-05.2** Given giỏ đã có cùng sản phẩm với cùng `size` và cùng tập `toppingIds` (sau khi sort), When khách thêm tiếp, Then số lượng của dòng đó được cộng dồn (tối đa 99 ly/dòng) thay vì tạo dòng mới.
- **AC-05.3** Given khách chưa đăng nhập, When thêm vào giỏ, Then thao tác vẫn thành công (giỏ hàng hoạt động ở client không yêu cầu đăng nhập).
- **Kiểm chứng:** U, E.

### FR-06 – Sửa, xóa dòng trong giỏ và tự tính tổng tiền `Must`

- **AC-06.1** Given giỏ có sản phẩm, When khách tăng hoặc giảm số lượng, Then thành tiền dòng và tổng tạm tính cập nhật ngay.
- **AC-06.2** Given số lượng của một dòng giảm về 0 hoặc khách bấm xóa dòng / xóa toàn bộ giỏ, When xác nhận, Then dòng tương ứng bị loại khỏi giỏ.
- **AC-06.3** Given giỏ trống, When khách mở giỏ hoặc trang `/checkout`, Then giao diện hiển thị trạng thái giỏ trống và nút quay lại menu; nút đặt đơn/thanh toán không khả dụng.
- **AC-06.4** Tổng tiền của giỏ bằng tổng các thành tiền dòng theo số nguyên VND; đồng thời tại bước checkout, client gọi `POST /api/orders/quote` để đối chiếu báo giá chính thức từ server (`subtotal`, `discount`, `total`).
- **Kiểm chứng:** U, E.

### FR-07 – Lưu trạng thái giỏ trên trình duyệt `Should`

- **AC-07.1** Giỏ được lưu bằng Zustand persist trong `localStorage` với khóa `brewlite-cart`, dùng chung cho trình duyệt; không có bảng giỏ hàng theo tài khoản trong schema.
- **AC-07.2** Sau khi xác nhận lại đơn thanh toán thành công qua API (`PAID` / `PREPARING` / `READY` / `COMPLETED`), giao diện loại đúng các dòng đã mua khỏi giỏ và giữ nguyên các món được thêm sau đó. Thanh toán lỗi hoặc chưa rõ kết quả không xóa giỏ.
- **Kiểm chứng:** U, E.

## 1.4 Xác thực

### FR-08 – Đăng ký tài khoản `Must`

API `POST /api/auth/register` nhận `email` (chuẩn hóa `trim().toLowerCase()`) và `password` (`8..72` byte UTF-8).

- **AC-08.1** Given email hợp lệ và chưa tồn tại, When gửi đăng ký với mật khẩu đạt tối thiểu 8 ký tự (tối đa 72 byte UTF-8), Then hệ thống tạo tài khoản, trả mã `201` kèm `accessToken` (JWT), `tokenType: "Bearer"`, `expiresIn: 3600` và thông tin `user` (`id`, `email`, `role`, `loyaltyPoints`) mà không trả về `passwordHash`.
- **AC-08.2** Given email đã tồn tại, When đăng ký lại, Then hệ thống trả mã `409 EMAIL_ALREADY_EXISTS` và thông báo email đã được sử dụng.
- **AC-08.3** Given email sai định dạng, mật khẩu ngắn hơn 8 ký tự, vượt 72 byte hoặc gửi kèm trường thừa (như `role`), When đăng ký, Then hệ thống trả mã `400 VALIDATION_ERROR` kèm chi tiết lỗi.
- **AC-08.4** Mật khẩu được lưu dưới dạng băm `bcrypt` (cost factor = `12`); không có mật khẩu thô trong cơ sở dữ liệu hay log.
- **AC-08.5** Tài khoản đăng ký công khai luôn có vai trò `CUSTOMER`; tài khoản nhân viên (`STAFF`) do `ADMIN` tạo qua API riêng và tài khoản `ADMIN` / nhân viên mẫu được khởi tạo bằng database seed (`seed.ts`), không tự đăng ký qua endpoint công khai được.
- **Kiểm chứng:** U, I.

### FR-09 – Đăng nhập và cấp JWT `Must`

API `POST /api/auth/login` xác thực thông tin và trả JWT; API `GET /api/auth/me` trả thông tin phiên hiện tại.

- **AC-09.1** Given thông tin đúng và `active = true`, When đăng nhập, Then hệ thống trả `200 OK` gồm `accessToken` JWT (thuật toán `HS256`, `expiresIn: 3600` giây, `issuer: "brewlite-api"`, `audience: "brewlite-web"`) và thông tin `user`. Nếu tài khoản đã bị khóa (`active = false`), hệ thống trả `403 ACCOUNT_LOCKED`.
- **AC-09.2** Given sai email hoặc mật khẩu, When đăng nhập, Then hệ thống trả mã `401 INVALID_CREDENTIALS` với thông báo chung `"Email hoặc mật khẩu không đúng"` (không tiết lộ email có tồn tại hay không).
- **AC-09.3** Given token hết hạn hoặc sai chữ ký, When gọi API được bảo vệ, Then `JwtAuthGuard` trả mã `401 UNAUTHORIZED`; nếu token hợp lệ nhưng tài khoản trong DB vừa bị khóa (`active = false`), hệ thống trả ngay `403 ACCOUNT_LOCKED`.
- **AC-09.4** Khách có thể chủ động đăng nhập hoặc đăng ký từ thanh điều hướng bất cứ lúc nào, kể cả khi giỏ hàng còn trống; việc đăng nhập không phải là điều kiện để xem menu, xem chi tiết sản phẩm hay thêm vào giỏ.
- **Kiểm chứng:** U, I.

### FR-10 – Bảo vệ chức năng đặt đơn và phân tách dữ liệu người dùng `Must`

- **AC-10.1** Given khách chưa đăng nhập, When gọi `POST /api/orders/quote`, `POST /api/orders`, `POST /api/payments`, `GET /api/promotions`, `GET /api/orders/me` hoặc `GET /api/loyalty/me` không có JWT hợp lệ, Then API trả mã `401 UNAUTHORIZED`.
- **AC-10.2** Given khách chưa đăng nhập và giỏ có sản phẩm, When mở trang thanh toán (`/checkout`), Then giao diện hiển thị nút chuyển sang `/login` và giữ nguyên giỏ hàng trong `localStorage` để tiếp tục thanh toán sau khi đăng nhập.
- **AC-10.3** Given khách đã đăng nhập, When bấm chuyển sang bước thanh toán, Then giao diện đi thẳng tới màn hình báo giá, xác nhận đặt đơn và thanh toán.
- **AC-10.4** Given người dùng truy cập đơn của người khác qua API dành cho chủ đơn (`GET /api/orders/:id`, `POST /api/orders/:id/cancel`, `POST /api/payments`), Then trả `404 ORDER_NOT_FOUND`, tránh tiết lộ sự tồn tại của đơn.
- **Kiểm chứng:** I, E.

## 1.5 Đặt đơn

### FR-11 – Báo giá và tạo đơn hàng ở trạng thái PENDING `Must`

Hệ thống cung cấp `POST /api/orders/quote` để tính thử giá và `POST /api/orders` (kèm header bắt buộc `Idempotency-Key`) để tạo đơn hàng.

- **AC-11.1** Given khách hàng đã đăng nhập, dữ liệu giỏ hợp lệ (1–50 dòng, mỗi dòng `qty` từ 1 đến 99, tối đa 10 topping không trùng/dòng) và có `Idempotency-Key` dạng UUID hợp lệ, When gửi `POST /api/orders`, Then hệ thống tạo `Order` ở trạng thái `PENDING` (`reservationStatus = HELD`, `version = 0`) cùng các `OrderItem`, `OrderItemTopping`, `OrderIngredientHold` và `OrderEvent`, trả mã `201` gồm `id`, `code` (`BL-YYYYMMDD-XXXXXXXX`), `subtotal`, `discount`, `total` và danh sách `items`.
- **AC-11.2** Hệ thống chuẩn hóa dòng giỏ (`normalizeCartItems`) và tính lại toàn bộ đơn giá, giá size/topping, giảm giá khuyến mãi và tổng tiền ở phía server (`OrdersService` + `buildQuote`); không tin giá hoặc `userId` do client gửi lên. Nếu `order.total` chênh lệch với `quotedTotal`, giao diện cảnh báo và yêu cầu khách hàng xác nhận đồng ý mức giá mới hoặc hủy đơn trước khi thanh toán.
- **AC-11.3** Given giỏ trống, số lượng không hợp lệ, thiếu/sai định dạng `Idempotency-Key`, hoặc sản phẩm/topping không tồn tại hay ngừng bán (`active = false`), When tạo đơn, Then hệ thống trả mã `400 VALIDATION_ERROR` (dữ liệu/key) hoặc `404 PRODUCT_NOT_FOUND` (sản phẩm/topping không khả dụng) và không tạo đơn.
- **AC-11.4** Việc kiểm tra idempotency (`scope = CREATE_ORDER`), trừ giữ chỗ nguyên liệu, tăng lượt dùng mã khuyến mãi và lưu `Order` diễn ra nguyên tử trong một database transaction; nếu gửi lặp lại cùng `Idempotency-Key` và cùng payload canonical, server trả lại đơn đã tạo kèm header `Idempotency-Replayed: true`.
- **Kiểm chứng:** U, I.

### FR-12 – Kiểm soát tồn kho nguyên liệu theo công thức và xử lý hết hàng `Must`

- **AC-12.1** Given các nguyên liệu (`Ingredient`) trong công thức của sản phẩm (`ProductIngredient`, tính theo hệ số size `S = 100%`, `M = 125%`, `L = 150%` làm tròn lên từng ly cho `GRAM`/`ML` và giữ nguyên cho `PIECE`) và topping (`ToppingIngredient`, không nhân size) còn đủ tồn kho, When đơn được tạo, Then hệ thống tổng hợp nhu cầu theo từng `ingredientId`, trừ `Ingredient.stock`, tăng `Ingredient.version` và lưu bản ghi giữ kho `OrderIngredientHold` (`reservationStatus = HELD`) trong cùng transaction với việc tạo đơn.
- **AC-12.2** Given số lượng nguyên liệu yêu cầu vượt quá `Ingredient.stock` (hoặc món/topping chưa có công thức), When báo giá hoặc tạo đơn, Then hệ thống trả mã `409 OUT_OF_STOCK`, rollback toàn bộ transaction, không tạo đơn và không làm thay đổi `stock`.
- **AC-12.3** Given nhiều khách đặt đồng thời các đồ uống dùng chung nguyên liệu chỉ còn *n* đơn vị, When tổng nhu cầu vượt *n*, Then hệ thống sắp xếp nguyên liệu theo `ingredientId ASC` (chống deadlock) và cập nhật có điều kiện theo khóa lạc quan (`WHERE id = ? AND version = ? AND stock >= required`, thử lại tối đa 3 lần trước khi trả `409 STOCK_CONFLICT`), đảm bảo tổng lượng giữ kho không bao giờ vượt *n* và `Ingredient.stock` không bao giờ âm (`CHECK (stock >= 0)`).
- **AC-12.4** Vòng đời giữ kho (`reservationStatus`) được đồng bộ chặt chẽ với trạng thái đơn:
  - Khi đơn chuyển sang `PAID`: `reservationStatus` chuyển từ `HELD` sang `CONSUMED`.
  - Khi thanh toán thất bại (`PAYMENT_FAILED`) hoặc đơn bị hủy (`CANCELLED` từ `PENDING` hoặc `PAID`): hệ thống giải phóng nguyên liệu (`InventoryService.release`) dựa trên snapshot `OrderIngredientHold`, cộng trả lại `Ingredient.stock`, hoàn lại lượt dùng mã khuyến mãi (`usedCount - 1`) và chuyển `reservationStatus` sang `RELEASED`.
  - Khi khách thử thanh toán lại cho đơn `PAYMENT_FAILED`: hệ thống thực hiện `prepareRetry` để kiểm tra và giữ lại nguyên liệu (`RELEASED → HELD`) cùng mã khuyến mãi trước khi gọi cổng thanh toán.
- **Kiểm chứng:** U, I (test đồng thời tranh chấp tồn kho bắt buộc).

## 1.6 Thanh toán

### FR-13 – Thanh toán không tiền mặt (Mô phỏng Ví/Thẻ & VNPay/Stripe Sandbox) `Must`

API `POST /api/payments` nhận `orderId`, `method` (`WALLET` hoặc `CARD`), tùy chọn `mockOutcome` (`SUCCESS` / `FAIL`) và header bắt buộc `Idempotency-Key`. Hệ thống đồng thời cung cấp các endpoint tích hợp cổng thử nghiệm `/api/payments/vnpay/*` và `/api/payments/stripe/*`.

- **AC-13.1** Given đơn đủ điều kiện thanh toán, When thanh toán thành công, Then lưu `Payment.status = SUCCEEDED`, chuyển đơn sang `PAID`, `reservationStatus = CONSUMED`; không trừ kho thêm lần nữa và chưa cộng điểm thưởng.
- **AC-13.2** Giao diện thanh toán hiển thị rõ bảng tách giá (`subtotal`, `discount`, `total`), các phương thức không tiền mặt (Ví điện tử, Thẻ ngân hàng, cổng VNPay Sandbox / Stripe Test Mode) và không có lựa chọn tiền mặt.
- **AC-13.3** Given đơn không ở trạng thái `PENDING` hoặc `PAYMENT_FAILED` (ví dụ đã `PAID`, `PREPARING`, `READY`, `COMPLETED` hoặc `CANCELLED`), When gọi `POST /api/payments` với `Idempotency-Key` mới, Then hệ thống từ chối và trả mã `409 ORDER_NOT_PAYABLE`.
- **AC-13.4** Số tiền thanh toán (`amount`) luôn do server lấy trực tiếp từ `order.total` trong cơ sở dữ liệu, không lấy từ client.
- **Kiểm chứng:** U, I, E.

### FR-14 – Thanh toán và tạo đơn idempotent `Must`

- **AC-14.1** Given một yêu cầu thanh toán (`POST /api/payments`) hoặc tạo đơn (`POST /api/orders`) đã xử lý hoàn tất với `Idempotency-Key` *K* của cùng người dùng và cùng `scope`, When client gửi lại cùng *K* và cùng nội dung (`requestHash` SHA-256 trùng khớp), Then hệ thống trả lại đúng mã trạng thái và response body đã lưu kèm header `Idempotency-Replayed: true`, không tạo thêm `Order`/`Payment` và không trừ kho hay trừ tiền lần hai.
- **AC-14.2** Given cùng `Idempotency-Key` *K* nhưng payload khác (`requestHash` khác), When gửi yêu cầu, Then hệ thống từ chối với mã `409 IDEMPOTENCY_KEY_REUSED`.
- **AC-14.3** Given hai yêu cầu cùng `Idempotency-Key` *K* đến đồng thời khi yêu cầu thứ nhất đang xử lý (`status = PROCESSING`), When yêu cầu thứ hai chờ quá thời gian lock hoặc phát hiện đang xử lý, Then chỉ một giao dịch được thực thi và yêu cầu trùng nhận kết quả replay hoặc mã `409 IDEMPOTENCY_IN_PROGRESS` (kèm header `Retry-After: 1`).
- **AC-14.4** Given thiếu header `Idempotency-Key`, giá trị rỗng hoặc không đúng định dạng UUID, When gọi `POST /api/orders` hoặc `POST /api/payments`, Then API trả mã `400 VALIDATION_ERROR`.
- **Kiểm chứng:** U, I (test gửi lặp và gửi đồng thời cùng key là bắt buộc).

### FR-15 – Xử lý thanh toán thất bại, thử lại và đối soát giao dịch trễ `Must`

- **AC-15.1** Given thanh toán thất bại (cổng mô phỏng trả `FAIL`, hoặc VNPay trả kết quả không thành công), When xử lý, Then hệ thống lưu `Payment` với `status = FAILED`, chuyển đơn từ `PENDING` sang `PAYMENT_FAILED` và hoàn trả nguyên liệu cùng lượt dùng khuyến mãi một lần (`reservationStatus = RELEASED`). Trạng thái đơn, `Payment` và idempotency record được ghi trong cùng một transaction. Giỏ hàng của khách được giữ nguyên và giao diện hiển thị thông báo thất bại.
- **AC-15.2** Given đơn đang `PAYMENT_FAILED`, When khách thanh toán lại với `Idempotency-Key` mới (có thể đổi phương thức), Then `prepareRetry` chuyển đơn `PAYMENT_FAILED → PENDING` và `reservationStatus RELEASED → HELD` trong cùng transaction với lần thanh toán mới: kiểm tra và giữ lại nguyên liệu, kiểm tra lại và giữ lại khuyến mãi, giữ nguyên giá đã chụp (không tính lại). Nếu không giữ lại được (hết nguyên liệu hoặc khuyến mãi không còn hợp lệ), toàn bộ transaction rollback: đơn vẫn `PAYMENT_FAILED/RELEASED` và không giữ tài nguyên nào. Nếu khách chọn hủy đơn (FR-20), đơn chuyển sang `CANCELLED` và không hoàn kho lần hai vì `reservationStatus` đã là `RELEASED`.
- **AC-15.3** Given cổng ngoài (VNPay/Stripe) báo thanh toán thành công đến muộn khi đơn đã `CANCELLED` hoặc đang `PAYMENT_FAILED`, hoặc đơn đã có một khoản thanh toán chính (`isDuplicate = false`) từ lần thanh toán khác, When hệ thống nhận callback/webhook hợp lệ (đúng chữ ký, đúng phiên, đúng số tiền), Then hệ thống không mở lại đơn và không trừ lại kho. Đơn đang `PAYMENT_FAILED` được chuyển sang `CANCELLED` (kho đã được trả trước đó). Hệ thống ghi `Payment` với `status = SUCCEEDED` (tiền đã nhận) và `isDuplicate = true` nếu là khoản trùng. Trong `IdempotencyRecord.response` đặt `requiresManualReview = true` và `refundStatus = MANUAL_REFUND_REQUIRED` (đến muộn sau khi hủy) hoặc `DUPLICATE_PAYMENT_MANUAL_REFUND_REQUIRED` (thanh toán trùng). Giao diện thông báo khách liên hệ cửa hàng để hoàn tiền thủ công. Nhân viên (`STAFF`) xem các giao dịch này qua `GET /api/payments/manual-review` (đơn hàng khác của `CUSTOMER` không hiển thị).
- **Kiểm chứng:** U, I, E. Nguồn: `payments.e2e-spec.ts`, `gateway-safety.integration-spec.ts`, `stripe.e2e-spec.ts`, `vnpay.e2e-spec.ts`, `vnpay.integration-spec.ts`, `order-transitions.integration-spec.ts`.

### FR-16 – Xác nhận đơn sau thanh toán `Must`

- **AC-16.1** Given thanh toán thành công, When hoàn tất, Then giao diện chuyển tới màn hình chi tiết/xác nhận đơn (`/orders/:id`) hiển thị mã đơn (`code`), trạng thái `PAID`, chi tiết các món, tổng tiền và tiến trình đơn hàng để khách theo dõi nhận đồ uống.
- **AC-16.2** Màn hình xác nhận/chi tiết đơn có điều hướng rõ ràng để quay lại menu hoặc xem danh sách đơn hàng (`/profile?tab=orders` / `/orders`).
- **Kiểm chứng:** E.

## 1.7 Lịch sử đơn

### FR-17 – Lịch sử đơn của khách hàng `Must`

API `GET /api/orders/me` hỗ trợ phân trang `page`, `limit` (1..50); nhân viên quầy xem hàng đợi toàn hệ thống qua `GET /api/orders/staff` (`page`, `limit`, lọc `status`).

- **AC-17.1** Given khách hàng có đơn, When mở lịch sử đơn hàng, Then danh sách hiển thị các đơn của chính người đó, sắp xếp mới nhất trước (`createdAt DESC`), gồm mã đơn (`code`), thời gian, tổng tiền và trạng thái. Khi tài khoản `STAFF` mở `/staff`, hệ thống gọi `GET /api/orders/staff` trả về toàn bộ đơn kèm bộ đếm theo trạng thái (`statusCounts`).
- **AC-17.2** Given khách hàng chưa có đơn nào, When mở lịch sử, Then giao diện hiển thị trạng thái rỗng kèm liên kết về menu.
- **AC-17.3** Danh sách trả về từ `GET /api/orders/me` tuyệt đối không chứa đơn của người dùng khác.
- **Kiểm chứng:** I, E.

### FR-18 – Xem chi tiết và theo dõi trạng thái đơn `Must`

API `GET /api/orders/:id` (chủ đơn) và `GET /api/orders/staff/:id` (`STAFF`).

- **AC-18.1** Chi tiết đơn trả về snapshot món (`productName`, `size`, `sizePrice`, `toppings`, `qty`, `unitPrice`, `lineTotal`), các khoản tiền (`subtotal`, `discount`, `total`) và trạng thái hiện tại.
- **AC-18.2** Khách có thể bấm làm mới để tải lại trạng thái đơn; polling tự động mỗi 5 giây là mục tiêu mở rộng chưa được triển khai trong phiên bản hiện tại.
- **Kiểm chứng:** I, E.

## 1.8 Quản lý trạng thái đơn

### FR-19 – Máy trạng thái đơn hàng `Must`

Các chuyển trạng thái hợp lệ được định nghĩa tập trung tại `ORDER_TRANSITIONS` (`apps/api/src/modules/orders/domain/order-state-machine.ts`):
- `PENDING → PAID | PAYMENT_FAILED | CANCELLED`
- `PAYMENT_FAILED → PENDING | CANCELLED`
- `PAID → PREPARING | CANCELLED`
- `PREPARING → READY`
- `READY → COMPLETED`
- `COMPLETED` và `CANCELLED` là hai trạng thái kết thúc (terminal states).

- **AC-19.1** Given đơn đang ở trạng thái *S*, When yêu cầu chuyển sang *T* không nằm trong tập chuyển hợp lệ, Then hệ thống từ chối với mã `409 INVALID_ORDER_TRANSITION` và trạng thái đơn không đổi.
- **AC-19.2** Given đơn đang ở trạng thái kết thúc (`COMPLETED` hoặc `CANCELLED`), When yêu cầu bất kỳ chuyển trạng thái nào, Then hệ thống từ chối với mã `409 INVALID_ORDER_TRANSITION`.
- **AC-19.3** Mọi chuyển trạng thái được kiểm tra qua hàm dùng chung (`canTransition` / `assertTransition`), có unit test bao phủ toàn bộ các cặp chuyển hợp lệ và không hợp lệ.
- **Kiểm chứng:** U.

### FR-20 – Hủy đơn `Should`

API `POST /api/orders/:id/cancel` (gửi `expectedVersion`) cho phép khách hàng là chủ đơn hủy đơn khi đơn chưa bước vào pha chế.

- **AC-20.1** Given đơn đang ở `PENDING` hoặc `PAYMENT_FAILED` thuộc về khách hàng, When khách yêu cầu hủy, Then đơn chuyển sang `CANCELLED`; nếu đơn đang giữ nguyên liệu (`reservationStatus = HELD`), hệ thống hoàn trả nguyên liệu vào `Ingredient.stock`, giảm `usedCount` của mã khuyến mãi và chuyển `reservationStatus` sang `RELEASED`. Nếu đơn đã ở `CANCELLED` và gửi đúng `expectedVersion` hiện tại, trả `200` không phát sinh hiệu ứng lặp.
- **AC-20.2** Given đơn đã chuyển sang `PREPARING`, `READY` hoặc `COMPLETED`, When yêu cầu hủy, Then hệ thống từ chối với mã `409 INVALID_ORDER_TRANSITION` kèm thông báo không thể hủy.
- **AC-20.3** Given chủ đơn hủy khi `PAID` và chưa pha chế, Then chuyển `CANCELLED`, hoàn nguyên liệu theo snapshot giữ kho và hoàn lượt mã đúng một lần. Đơn bình thường chưa có `EARN` nên không tạo `REVERSE`; chỉ đảo điểm nếu đã tồn tại `EARN` trước đó. Đơn thanh toán qua VNPay/Stripe đi qua quy trình hoàn tiền cổng ngoài và đánh dấu `PENDING_RECONCILIATION` / `REFUNDED_LATE_MANUAL_REVIEW` nếu chưa xác định kết quả hoặc đã bước vào pha chế.
- **Kiểm chứng:** U, I.

### FR-21 – Nhân viên quầy (Staff) cập nhật trạng thái pha chế `Should`

API `PATCH /api/orders/:id/status` được bảo vệ bởi `@UseGuards(JwtAuthGuard, StaffGuard)`.

- **AC-21.1** Given tài khoản có vai trò `STAFF`, When gọi `PATCH /api/orders/:id/status` cho đơn `PAID`, Then đơn chỉ được phép chuyển tuần tự qua các bước pha chế `PAID → PREPARING → READY → COMPLETED` (`STAFF_STATUSES`). Nếu đơn đang có hoàn tiền VNPay chờ đối soát (`PENDING_RECONCILIATION`), hệ thống chặn chuyển sang pha chế bằng `409 REFUND_PENDING_RECONCILIATION`.
- **AC-21.2** Given tài khoản là `CUSTOMER` hoặc `ADMIN`, When gọi `PATCH /api/orders/:id/status` hoặc `GET /api/orders/staff`, Then API trả mã `403 FORBIDDEN`.
- **AC-21.3** Giao diện Quầy Pha Chế (`/staff`) hiển thị danh sách đơn phân trang, bộ đếm & tab lọc theo trạng thái (`PAID`, `PREPARING`, `READY`, `COMPLETED`), bảng đối soát giao dịch cần hoàn thủ công (`ManualPaymentReview`) và nút chuyển bước kế tiếp cùng nút làm mới dữ liệu.
- **Kiểm chứng:** I, E.

## 1.9 Khuyến mãi và điểm thưởng (Mở rộng `Should`)

### FR-22 – Áp mã khuyến mãi `Should`

Hệ thống cung cấp `GET /api/promotions` (danh sách mã đang hiệu lực), `POST /api/promotions/validate` (kiểm tra nhanh mã) và tích hợp tính giảm giá trong `POST /api/orders/quote` & `POST /api/orders`. Hỗ trợ đúng hai loại trong schema: `PERCENT` (phần trăm, có thể có `maxDiscount`) và `FIXED` (tiền cố định).

- **AC-22.1** Given mã khuyến mãi (`Promotion`, chuẩn hóa chữ hoa `trim().toUpperCase()`) có `active = true`, nằm trong khoảng `startsAt <= now < endsAt`, chưa vượt giới hạn lượt dùng (`usedCount < maxUses`) và `subtotal >= minSubtotal`, When khách áp mã, Then hệ thống tính chính xác số tiền giảm (`discount`), hiển thị rõ trên bảng giá và tăng `usedCount` một cách nguyên tử (`WHERE usedCount < maxUses`) khi tạo đơn.
- **AC-22.2** Given mã không tồn tại, đang tắt (`active = false`), hết hạn hoặc chưa đạt `minSubtotal`, When kiểm tra hoặc tạo đơn, Then hệ thống từ chối với `422 PROMOTION_INVALID`; nếu hết lượt dùng (`usedCount >= maxUses`), hệ thống từ chối với `409 PROMOTION_EXHAUSTED`.
- **AC-22.3** Số tiền giảm không bao giờ vượt quá `subtotal` (`discount = min(rawDiscount, subtotal)`), tổng tiền sau giảm (`total = subtotal - discount`) luôn không âm và được tính toán hoàn toàn ở server.
- **Kiểm chứng:** U, I.

### FR-23 – Cộng và hoàn điểm thưởng (Loyalty Ledger) `Should`

Hệ thống quản lý điểm thưởng qua bảng sổ cái `LoyaltyEntry` (`EARN` / `REVERSE` với ràng buộc duy nhất `@@unique([orderId, kind])`) và cung cấp API `GET /api/loyalty/me`, `GET /api/loyalty/me/entries`.

- **AC-23.1** Given đơn chuyển `READY → COMPLETED`, When transaction hoàn tất và không có thanh toán chính (`isDuplicate = false`) đã `REFUNDED`, Then tạo `EARN` với `floor(total / 10000)` và tăng `User.loyaltyPoints` trong cùng transaction. Đơn có 0 điểm vẫn có bút toán `EARN` để ghi nhận đã xử lý. `PAID` không cộng điểm.
- **AC-23.2** Đơn `PENDING`, `PAID`, `PAYMENT_FAILED` hoặc bị hủy trước hoàn tất không được cộng điểm. `REVERSE` chỉ được tạo khi đã có `EARN`, không đảo điểm chỉ vì đơn từng `PAID`. API đọc điểm (`balance` / `entries`) tự động đồng bộ bút toán còn thiếu (`syncCompletedOrders`) cho đơn `COMPLETED` đủ điều kiện.
- **AC-23.3** Nhờ khóa duy nhất `@@unique([orderId, kind])` trên `LoyaltyEntry`, việc cộng điểm (`EARN`) và đảo điểm (`REVERSE`) chỉ xảy ra tối đa một lần cho mỗi đơn, kể cả khi yêu cầu thanh toán hoặc hủy đơn bị gửi lặp.
- **Kiểm chứng:** U, I.

## 1.10 Quản trị và Thống kê (Mở rộng `Could`)

### FR-24 – Quản trị menu, nguyên liệu và mã khuyến mãi `Could`

- **AC-24.1** Given tài khoản Quản lý (`ADMIN`), When cập nhật tên/giá/trạng thái bán sản phẩm (`PATCH /api/auth/admin/products/:id` với `expectedVersion`, tự đồng bộ chênh lệch giá sang các `ProductSize` trong transaction), cập nhật giá/trạng thái topping (`PATCH /api/auth/admin/toppings/:id`), cập nhật tồn kho nguyên liệu (`PATCH /api/auth/admin/ingredients/:id` với `expectedVersion`) hoặc tạo/bật/tắt mã khuyến mãi (`POST`/`PATCH /api/auth/admin/promotions`), Then thay đổi được phản ánh ngay ở menu và bước đặt đơn của khách.
- **AC-24.2** Given tài khoản không phải `ADMIN`, When gọi các API `/api/auth/admin/*`, Then API trả mã `403 FORBIDDEN`.
- **Kiểm chứng:** I.

### FR-25 – Xem thống kê doanh thu, đơn hàng và giao dịch cần đối soát `Could`

API thống kê quản trị (`GET /api/auth/admin/overview`) và API đối soát thanh toán (`GET /api/payments/manual-review`, `GET /api/payments/vnpay/manual-review`).

- **AC-25.1** Given tài khoản `ADMIN`, When gọi `GET /api/auth/admin/overview`, Then hệ thống trả về tổng doanh thu thực thu (tổng `Payment.amount` của khoản thanh toán chính `SUCCEEDED` trên các đơn `PAID`/`PREPARING`/`READY`/`COMPLETED`), tổng số đơn hàng, phân bổ đơn theo trạng thái (`ordersByStatus`), số liệu nhân sự/khách hàng/sản phẩm/nguyên liệu sắp hết/khuyến mãi, danh sách khách hàng và 30 đơn gần nhất.
- **AC-25.2** Given các đơn hàng ở trạng thái `PENDING`, `PAYMENT_FAILED` hoặc `CANCELLED`, When tính toán doanh thu thực thu, Then các đơn này không được cộng vào `totalRevenue`.
- **AC-25.3** Given tài khoản `STAFF`, When gọi `GET /api/payments/manual-review`, Then xem được các giao dịch thẻ/VNPay/Stripe cần xử lý thủ công (`requiresManualReview = true`) trên toàn hệ thống; tài khoản khách hàng chỉ xem được giao dịch thuộc đơn của mình.
- **Kiểm chứng:** U, I.

### FR-26 – Quản lý tài khoản nhân viên và phân quyền `Could`

API quản lý tài khoản thuộc `/api/auth/staff` và `/api/auth/admin/users/:id/status`; chỉ `ADMIN` được quản lý `STAFF` và trạng thái khóa tài khoản trong phạm vi endpoint.

- **AC-26.1** `ADMIN` tạo `STAFF` qua `POST /api/auth/staff`, liệt kê qua `GET /api/auth/staff`; khóa/mở qua `PATCH /api/auth/staff/:id/status` hoặc `PATCH /api/auth/admin/users/:id/status` (khách hàng và nhân viên). Không có API đổi role tổng quát.
- **AC-26.2** Given tài khoản không phải `ADMIN`, When gọi các endpoint quản lý tài khoản trên, Then API trả mã `403 FORBIDDEN`.
- **AC-26.3** Seed tại `apps/api/src/seed/seed.ts` khởi tạo tài khoản vận hành theo cấu hình. Không nâng quyền email đã thuộc tài khoản khác. Cả hai API mở khóa phải từ chối hash mật khẩu mặc định cũ bằng `409 LEGACY_PASSWORD_RESET_REQUIRED` và giữ tài khoản khóa; mật khẩu riêng vẫn mở khóa bình thường.
- **Kiểm chứng:** U, I.

---

# 2. Yêu cầu phi chức năng (NFR-01 đến NFR-15)

Các yêu cầu phi chức năng được tổ chức theo đúng thứ tự các nhóm trong đề bài: **Hiệu năng**, **Bảo mật**, **Tính khả dụng** và **Khả năng triển khai** (kèm kiểm thử, bảo trì & ghi log).

## 2.1 Hiệu năng

### NFR-01 – Hiệu năng API `Must`

- **AC-NFR01.1** Với dữ liệu mẫu (17 sản phẩm, 5 topping, 20 nguyên liệu), thời gian phản hồi phân vị 95 (p95) của `GET /api/products`, `GET /api/products/:id` và `GET /api/orders/me` nhỏ hơn 500 ms.
- **AC-NFR01.2** `POST /api/orders/quote`, `POST /api/orders` và `POST /api/payments` có p95 nhỏ hơn 1.000 ms (đã gồm xử lý transaction và gọi cổng thanh toán mô phỏng).
- **Kiểm chứng:** M (đo bằng `tests/tools/benchmark-api.cjs`, lưu kết quả vào `docs/qa/final/latency.json`).

### NFR-02 – Hiệu năng giao diện `Should`

- **AC-NFR02.1** Trang menu đạt LCP không quá 2,5 giây trên mô phỏng mạng 4G và thiết bị di động trung bình (Lighthouse mobile — mục tiêu kiểm thử ngoài CI).
- **Kiểm chứng:** M.

## 2.2 Bảo mật

### NFR-03 – Bảo mật mật khẩu `Must`

- **AC-NFR03.1** Mật khẩu được băm bằng `bcrypt` (cost factor = `12`); không lưu và không ghi log mật khẩu thô hay `passwordHash` trong bất kỳ response nào.
- **Kiểm chứng:** U, M.

### NFR-04 – Xác thực và phân quyền `Must`

- **AC-NFR04.1** Mọi API ngoài `GET /api/products`, `GET /api/products/:id`, `GET /api/health`, `GET /api/health/ready`, `POST /api/auth/register`, `POST /api/auth/login` và các callback/webhook xác thực chữ ký riêng (`/api/payments/vnpay/verify`, `/api/payments/vnpay/ipn`, `/api/payments/stripe/verify`, `/api/payments/stripe/webhook`) đều yêu cầu JWT Bearer hợp lệ.
- **AC-NFR04.2** JWT có thời hạn xác định (`expiresInSeconds = 3600` trong `AUTH_POLICY`) và được ký bằng khóa bí mật lấy từ biến môi trường `JWT_SECRET` (tối thiểu 32 ký tự, kiểm tra ngay khi khởi động module).
- **AC-NFR04.3** Phân quyền theo vai trò (`CUSTOMER`, `STAFF`, `ADMIN`) và kiểm tra quyền sở hữu đơn hàng (`order.userId === currentUser.id`) được thực thi nghiêm ngặt ở tầng server (`JwtAuthGuard`, `StaffGuard`, `AdminGuard`), không phụ thuộc vào việc ẩn nút ở giao diện.
- **Kiểm chứng:** I.

### NFR-05 – Validate dữ liệu đầu vào `Must`

- **AC-NFR05.1** Mọi DTO của API được validate bằng `ValidationPipe` toàn cục (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`); dữ liệu không hợp lệ hoặc chứa trường lạ trả mã `400 VALIDATION_ERROR`.
- **AC-NFR05.2** Truy vấn cơ sở dữ liệu dùng Prisma ORM và truy vấn tham số hóa (`$executeRaw` / `$queryRaw` tagged template), tuyệt đối không nối chuỗi SQL từ dữ liệu người dùng.
- **AC-NFR05.3** Giao diện validate các biểu mẫu trước khi gửi và hiển thị thông báo lỗi rõ ràng.
- **Kiểm chứng:** U, I.

### NFR-06 – Quản lý bí mật và cấu hình `Must`

- **AC-NFR06.1** Không có bí mật thật của production hardcode trong mã nguồn; repository có `.env.example` ở gốc, `apps/api/.env.example` và `apps/web/.env.example` hướng dẫn cấu hình môi trường.
- **AC-NFR06.2** Cấu hình khác nhau giữa local, Docker, CI và production được cung cấp hoàn toàn qua biến môi trường.
- **Kiểm chứng:** M (rà soát repository và log CI).

### NFR-07 – An toàn đường truyền và truy cập dữ liệu `Must`

- **AC-NFR07.1** API cấu hình CORS chỉ cho phép origin từ biến môi trường `FRONTEND_URL` (mặc định `http://localhost:3000`), tắt `credentials`, chỉ cho phép header `Authorization`, `Content-Type`, `Idempotency-Key` và expose `Idempotency-Replayed`, `Retry-After`.
- **AC-NFR07.2** Cơ sở dữ liệu trong Docker Compose được cô lập trong mạng nội bộ và kiểm tra sức khỏe (`pg_isready`) trước khi backend nhận tải.
- **AC-NFR07.3** Hỗ trợ HTTPS qua reverse proxy, middleware header bảo mật (`helmet`) và rate limit (`ThrottlerModule`) ở tầng triển khai production là cấu hình mục tiêu chưa bật sẵn trong mã nguồn backend hiện tại.
- **Kiểm chứng:** M, I.

## 2.3 Tính khả dụng (Usability, Xử lý mất mạng, Tương thích, Sẵn sàng & Toàn vẹn đồng thời)

### NFR-08 – Tính khả dụng của giao diện (Usability) `Must`

- **AC-NFR08.1** Giao diện thiết kế mobile-first, hiển thị và dùng được ở chiều rộng 360 px mà không bị tràn ngang.
- **AC-NFR08.2** Từ menu đến màn hình xác nhận thanh toán, khách hoàn thành đặt đơn trong tối đa 6 màn hình chính (menu, tùy chọn chi tiết, giỏ hàng, đăng nhập nếu cần, checkout/thanh toán, xác nhận/chi tiết đơn).
- **AC-NFR08.3** Mọi thao tác có phản hồi trạng thái (loading, thành công, lỗi), thông báo lỗi theo cấu trúc chuẩn `{ statusCode, code, message, details }` và không lộ stack trace nội bộ.
- **Kiểm chứng:** M, E.

### NFR-09 – Giao diện bền lỗi mạng (Resilience / PWA mục tiêu) `Should`

- **AC-NFR09.1** Khi mất mạng, timeout (5 giây trên `apiFetch`) hoặc API lỗi, giao diện hiển thị thông báo thân thiện, giữ nguyên trạng thái giỏ/checkout (`uncertain`) và cho phép xác minh hoặc thử lại thay vì làm trắng trang.
- **AC-NFR09.2** Cấu hình Web App Manifest (`/manifest.webmanifest`) và Service Worker để cài đặt PWA là mục tiêu mở rộng chưa tạo file manifest trong `apps/web`.
- **Kiểm chứng:** U, M.

### NFR-10 – Tương thích trình duyệt `Must`

- **AC-NFR10.1** Hoạt động đúng trên hai phiên bản mới nhất của Chrome, Edge, Firefox và Safari (di động và máy tính).
- **Kiểm chứng:** M.

### NFR-11 – Tính sẵn sàng và giám sát `Must`

- **AC-NFR11.1** API có endpoint liveness `GET /api/health` và readiness `GET /api/health/ready` (kiểm tra kết nối thực tế tới PostgreSQL bằng `SELECT 1`) trả mã `200` khi hệ thống sẵn sàng, hoặc `503` khi DB mất kết nối.
- **AC-NFR11.2** Mọi lỗi phát sinh trong API đều đi qua `ApiExceptionFilter`, trả về cấu trúc JSON thống nhất (`statusCode`, `code`, `message`, `details`) và ẩn thông tin driver DB/stack trace khỏi response khi lỗi `500 INTERNAL_ERROR`.
- **Kiểm chứng:** I, M.

### NFR-12 – Toàn vẹn dữ liệu và đồng thời `Must`

- **AC-NFR12.1** Tồn kho nguyên liệu (`Ingredient.stock`) có ràng buộc `CHECK (stock >= 0)` ở mức PostgreSQL và khóa lạc quan `version`, đảm bảo không bao giờ âm và không bán vượt số lượng trong mọi trường hợp đặt đồng thời (xem AC-12.3).
- **AC-NFR12.2** Một yêu cầu tạo đơn hoặc thanh toán gửi lặp lại cùng `Idempotency-Key` không bao giờ tạo hai `Order`/`Payment` hoặc chuyển trạng thái đơn hai lần (xem AC-14.1 đến AC-14.3).
- **AC-NFR12.3** Các thao tác ghi liên quan (tạo đơn, giữ/nhả kho nguyên liệu, tăng/hoàn lượt mã khuyến mãi, cập nhật trạng thái đơn, ghi nhận thanh toán, cộng/đảo điểm thưởng) luôn thực thi trong database transaction (`UnitOfWork` với `SET LOCAL lock_timeout = '3s'`, `timeout = 5000ms`, `ReadCommitted`).
- **Kiểm chứng:** U, I.

## 2.4 Khả năng triển khai (kèm Kiểm thử và Bảo trì)

### NFR-13 – Khả năng triển khai `Must`

- **AC-NFR13.1** Một người ngoài nhóm clone repository, làm theo README và chạy được toàn bộ hệ thống (`db`, `backend`, `frontend`) bằng `docker compose up --build -d`.
- **AC-NFR13.2** Migration (`prisma migrate deploy`) và seed (`npm run seed`) tái tạo được cơ sở dữ liệu đầy đủ (sản phẩm, topping, nguyên liệu, định mức công thức, khuyến mãi, tài khoản mẫu) từ trạng thái trống.
- **AC-NFR13.3** Pipeline CI/CD (`.github/workflows/ci.yml`) thực hiện kiểm tra tài liệu hợp đồng (`docs:check`), kiểm tra kiểu dữ liệu (`api:check`), `docs:schema`, `prisma:validate`, `prisma:deploy`, `lint`, `test` (`RUN_DB_TESTS="1"`), `build` và smoke test readiness API.
- **AC-NFR13.4** Có quy trình vận hành/rollback được mô tả trong `docs/deployment.md` và migration chạy an toàn thông qua `prisma migrate deploy`.
- **Kiểm chứng:** M, E.

### NFR-14 – Khả năng kiểm thử và bảo trì `Should`

- **AC-NFR14.1** Mã nguồn qua lint không lỗi (`--max-warnings 0`); có bộ kiểm thử tự động toàn diện cho cả backend (`tests/api/*.e2e-spec.ts`, `tests/api/*.integration-spec.ts`) và frontend (`apps/web/src/**/*.test.ts`), bao phủ các module `Auth`, `Products`, `Inventory`, `Orders`, `Payments`, `Promotions`, `Loyalty`, `Admin`.
- **AC-NFR14.2** Backend chia module rõ ràng theo domain (`AuthModule`, `ProductsModule`, `InventoryModule`, `OrdersModule`, `OrderHistoryModule`, `PaymentsModule`, `PromotionsModule`, `LoyaltyModule`, `IdempotencyModule`, `PrismaModule`, `DatabaseModule`) và sinh hợp đồng kiểu dữ liệu dùng chung từ `docs/api/openapi.yaml` sang `api.generated.ts` ở cả backend và frontend (`npm run api:types`).
- **Kiểm chứng:** I, M (CI).

### NFR-15 – Ghi log lỗi và bảo mật log `Should`

- **AC-NFR15.1** `ApiExceptionFilter` chỉ ghi log lỗi 500 bằng thông điệp đã lọc bỏ dữ liệu nhạy cảm (`Unhandled request exception; investigate server-side with sanitized context`), tuyệt đối không ghi mật khẩu, token JWT, khóa bí mật hay dữ liệu thẻ.
- **AC-NFR15.2** Mở rộng `CorrelationIdMiddleware` (`X-Correlation-Id`) và `LoggingInterceptor` cho từng request là mục tiêu cải tiến bổ sung chưa có trong mã nguồn hiện tại.
- **Kiểm chứng:** M.

---

# 3. Mức ưu tiên theo MoSCoW (Must, Should, Could, Won't)

## 3.1 Ý nghĩa các mức ưu tiên MoSCoW trong dự án BrewLite

| Mức ưu tiên | Ý nghĩa áp dụng trong dự án |
|---|---|
| **Must** | Yêu cầu bắt buộc phải hoàn thành 100% để luồng đặt và thanh toán đơn hàng không tiền mặt chạy end-to-end, đảm bảo an toàn dữ liệu và đạt điều kiện nghiệm thu. |
| **Should** | Yêu cầu quan trọng nâng cao trải nghiệm và vận hành thực tế (lưu giỏ hàng, hủy đơn hoàn kho/điểm, quầy Barista `/staff`, khuyến mãi, tích điểm, kiểm thử & bảo trì). |
| **Could** | Yêu cầu mở rộng mong muốn khi còn dư thời gian (lọc/tìm kiếm nâng cao, quản trị danh mục/kho/khuyến mãi, thống kê doanh thu, quản lý nhân viên). |
| **Won't** | Yêu cầu nằm ngoài phạm vi phiên bản hiện tại, được ghi nhận rõ ràng để không làm lệch trọng tâm bài tập lớn. |

## 3.2 Bảng phân loại MoSCoW cho Yêu cầu chức năng (FR-01 đến FR-26)

| Mã | Tên yêu cầu chức năng | Nhóm yêu cầu | Ưu tiên MoSCoW |
|---|---|---|---|
| FR-01 | Hiển thị menu đồ uống | Menu | **Must** |
| FR-02 | Lọc và tìm kiếm menu theo danh mục / từ khóa | Menu | **Could** |
| FR-03 | Xem chi tiết sản phẩm | Chi tiết sản phẩm | **Must** |
| FR-04 | Chọn size và topping, tính giá theo tùy chọn | Chi tiết sản phẩm | **Must** |
| FR-05 | Thêm sản phẩm vào giỏ | Giỏ hàng | **Must** |
| FR-06 | Sửa, xóa dòng trong giỏ và tự tính tổng tiền | Giỏ hàng | **Must** |
| FR-07 | Lưu trạng thái giỏ trên trình duyệt | Giỏ hàng | **Should** |
| FR-08 | Đăng ký tài khoản | Xác thực | **Must** |
| FR-09 | Đăng nhập và cấp JWT | Xác thực | **Must** |
| FR-10 | Bảo vệ chức năng đặt đơn và phân tách dữ liệu người dùng | Xác thực | **Must** |
| FR-11 | Báo giá và tạo đơn hàng ở trạng thái PENDING | Đặt đơn | **Must** |
| FR-12 | Kiểm soát tồn kho nguyên liệu theo công thức và xử lý hết hàng | Đặt đơn | **Must** |
| FR-13 | Thanh toán không tiền mặt (Mô phỏng Ví/Thẻ & VNPay/Stripe Sandbox) | Thanh toán | **Must** |
| FR-14 | Thanh toán và tạo đơn idempotent | Thanh toán | **Must** |
| FR-15 | Xử lý thanh toán thất bại, thử lại và đối soát giao dịch trễ | Thanh toán | **Must** |
| FR-16 | Xác nhận đơn sau thanh toán | Thanh toán | **Must** |
| FR-17 | Lịch sử đơn của khách hàng | Lịch sử đơn | **Must** |
| FR-18 | Xem chi tiết và theo dõi trạng thái đơn | Lịch sử đơn | **Must** |
| FR-19 | Máy trạng thái đơn hàng | Quản lý trạng thái đơn | **Must** |
| FR-20 | Hủy đơn (kèm hoàn kho nguyên liệu & đảo điểm thưởng) | Quản lý trạng thái đơn | **Should** |
| FR-21 | Nhân viên quầy (`STAFF`) cập nhật trạng thái pha chế | Quản lý trạng thái đơn | **Should** |
| FR-22 | Áp mã khuyến mãi (`PERCENT`, `FIXED`) | Khuyến mãi và điểm thưởng | **Should** |
| FR-23 | Cộng và hoàn điểm thưởng (`LoyaltyEntry` `EARN`/`REVERSE`) | Khuyến mãi và điểm thưởng | **Should** |
| FR-24 | Quản trị menu, nguyên liệu và mã khuyến mãi | Quản trị và Thống kê | **Could** |
| FR-25 | Xem thống kê doanh thu, đơn hàng và giao dịch cần đối soát | Quản trị và Thống kê | **Could** |
| FR-26 | Quản lý tài khoản nhân viên và phân quyền | Quản trị và Thống kê | **Could** |

## 3.3 Bảng phân loại MoSCoW cho Yêu cầu phi chức năng (NFR-01 đến NFR-15)

| Mã | Tên yêu cầu phi chức năng | Nhóm yêu cầu | Ưu tiên MoSCoW |
|---|---|---|---|
| NFR-01 | Hiệu năng API | Hiệu năng | **Must** |
| NFR-02 | Hiệu năng giao diện | Hiệu năng | **Should** |
| NFR-03 | Bảo mật mật khẩu | Bảo mật | **Must** |
| NFR-04 | Xác thực và phân quyền | Bảo mật | **Must** |
| NFR-05 | Validate dữ liệu đầu vào | Bảo mật | **Must** |
| NFR-06 | Quản lý bí mật và cấu hình | Bảo mật | **Must** |
| NFR-07 | An toàn đường truyền và truy cập dữ liệu | Bảo mật | **Must** |
| NFR-08 | Tính khả dụng của giao diện (Usability) | Tính khả dụng | **Must** |
| NFR-09 | Giao diện bền lỗi mạng (PWA mục tiêu) | Tính khả dụng | **Should** |
| NFR-10 | Tương thích trình duyệt | Tính khả dụng | **Must** |
| NFR-11 | Tính sẵn sàng và giám sát | Tính khả dụng | **Must** |
| NFR-12 | Toàn vẹn dữ liệu và đồng thời | Tính khả dụng | **Must** |
| NFR-13 | Khả năng triển khai | Khả năng triển khai | **Must** |
| NFR-14 | Khả năng kiểm thử và bảo trì | Khả năng triển khai | **Should** |
| NFR-15 | Ghi log lỗi và bảo mật log | Khả năng triển khai | **Should** |

## 3.4 Danh mục yêu cầu ngoài phạm vi thực hiện – Won't (WONT-01 đến WONT-09)

| Mã | Nội dung ngoài phạm vi (Won't) | Lý do |
|---|---|---|
| WONT-01 | Thanh toán bằng tiền thật (Production Merchant Gateway) | Chỉ dùng cổng mô phỏng nội bộ và môi trường Sandbox/Test Mode (VNPay Sandbox, Stripe Test Mode) trong phạm vi bài tập lớn. |
| WONT-02 | Tự động hoàn tiền tiền thật qua ngân hàng khi mọi trường hợp hủy/lỗi trễ xảy ra | Các giao dịch trễ/trùng gắn cờ `requiresManualReview` để xử lý thủ công ngoài hệ thống. |
| WONT-03 | Thanh toán bằng tiền mặt (COD / trả tiền mặt tại quầy) | Trái với mục tiêu sản phẩm "ứng dụng đặt cà phê không dùng tiền mặt". |
| WONT-04 | Đặt đơn không cần đăng nhập (Guest Checkout) | Cần định danh tài khoản (`userId`) để kiểm soát `IdempotencyRecord`, lưu lịch sử đơn và sổ cái điểm thưởng. |
| WONT-05 | Giao hàng tận nơi, định vị bản đồ và theo dõi shipper | Ngoài phạm vi sản phẩm (khách nhận đồ uống trực tiếp tại quầy). |
| WONT-06 | Đa chi nhánh, điều chuyển kho liên chi nhánh và quản lý lô/hạn sử dụng | Hệ thống quản lý tồn kho theo công thức nguyên liệu (`Ingredient`) cho một cửa hàng duy nhất. |
| WONT-07 | Thông báo đẩy (Web Push / WebSocket) theo thời gian thực | Dùng thao tác làm mới thủ công trên UI để giữ kiến trúc đơn giản, ổn định. |
| WONT-08 | Đánh giá, bình luận và chấm sao sản phẩm | Không thuộc luồng đặt đơn cốt lõi. |
| WONT-09 | Đa ngôn ngữ, đa tiền tệ | Chỉ hỗ trợ tiếng Việt và đơn vị tiền tệ VND. |

## 3.5 Thống kê tổng hợp theo MoSCoW

| Mức MoSCoW | Yêu cầu chức năng (FR) | Yêu cầu phi chức năng (NFR) | Tổng số |
|---|---|---|---|
| **Must** | 17 (`FR-01, 03, 04, 05, 06, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19`) | 11 (`NFR-01, 03, 04, 05, 06, 07, 08, 10, 11, 12, 13`) | **28** |
| **Should** | 5 (`FR-07, 20, 21, 22, 23`) | 4 (`NFR-02, 09, 14, 15`) | **9** |
| **Could** | 4 (`FR-02, 24, 25, 26`) | 0 | **4** |
| **Won't** | 9 (`WONT-01` đến `WONT-09`) | 0 | **9** |

---

# 4. Tiêu chí chấp nhận có thể kiểm chứng cho từng yêu cầu

Bên cạnh các phát biểu chi tiết theo mẫu *Given – When – Then* đã trình bày trực tiếp dưới từng yêu cầu ở **Mục 1** và **Mục 2**, bảng dưới đây tổng hợp mã tiêu chí chấp nhận, điều kiện kiểm chứng cốt lõi, loại kiểm thử (**U/I/E/M**) và test liên quan trong codebase (tên API test được tính từ `tests/api/`); test liên quan không đồng nghĩa mọi AC đã được nghiệm thu:

| Yêu cầu | Mã tiêu chí chấp nhận | Điều kiện kiểm chứng cốt lõi (Verifiable Criteria) | Loại test | File test / Công cụ kiểm chứng trong codebase |
|---|---|---|---|---|
| **FR-01** | `AC-01.1` .. `AC-01.4` | `GET /api/products` trả `200 OK` gồm danh sách món `active = true` kèm `stock`; UI hiển thị giá VND, trạng thái loading, rỗng và lỗi. | I, U, E | `catalog.integration-spec.ts` |
| **FR-02** | `AC-02.1` .. `AC-02.2` | Lọc theo nhóm đồ uống (`cat`) và tìm kiếm không phân biệt dấu/hoa thường (`q`) ở frontend; bỏ lọc trả lại toàn bộ danh sách. | U | `apps/web/src/features/products/filter.test.ts` |
| **FR-03** | `AC-03.1` .. `AC-03.3` | `GET /api/products/:id` trả `200` gồm `sizes` và `toppings` `active = true`; trả `404 PRODUCT_NOT_FOUND` khi không tồn tại/ngừng bán; báo `409 OUT_OF_STOCK` khi thiếu nguyên liệu. | I, U | `inventory-stock.e2e-spec.ts` |
| **FR-04** | `AC-04.1` .. `AC-04.4` | Giá = `ProductSize.price` + tổng topping; thành tiền = đơn giá × số lượng. | U | `catalog-pricing.e2e-spec.ts`, `apps/web/src/features/products/pricing.test.ts` |
| **FR-05** | `AC-05.1` .. `AC-05.3` | Thêm vào giỏ không cần đăng nhập; gộp dòng nếu trùng `(productId, size, sortedToppingIds)` (tối đa 99 ly/dòng); cập nhật badge số lượng. | U, E | `apps/web/src/lib/cart/cart-store.test.ts` |
| **FR-06** | `AC-06.1` .. `AC-06.4` | Tăng/giảm số lượng, xóa dòng khi về 0, khóa nút đặt hàng khi giỏ trống, đối chiếu báo giá qua `POST /api/orders/quote`. | U, I, E | `apps/web/src/components/checkout/Checkout.test.ts` |
| **FR-07** | `AC-07.1` .. `AC-07.2` | Lưu giỏ trình duyệt khóa `brewlite-cart`; chỉ loại dòng đã mua sau khi xác nhận đơn `PAID` trở lên. | U, E | `apps/web/src/lib/cart/cart-store.test.ts`, `vnpay-return.test.ts` |
| **FR-08** | `AC-08.1` .. `AC-08.5` | `POST /api/auth/register` tạo tài khoản `CUSTOMER` (`201`), băm `bcrypt` (cost 12), không lộ `passwordHash`, trùng email trả `409 EMAIL_ALREADY_EXISTS`, dữ liệu sai trả `400`. | U, I | `auth.e2e-spec.ts` |
| **FR-09** | `AC-09.1` .. `AC-09.4` | `POST /api/auth/login` trả JWT hợp lệ (`200`), sai thông tin trả `401 INVALID_CREDENTIALS`, khóa tài khoản trả ngay `403 ACCOUNT_LOCKED`; `GET /api/auth/me` xác thực token và đọc trạng thái DB. | U, I | `auth.e2e-spec.ts`, `auth.integration-spec.ts` |
| **FR-10** | `AC-10.1` .. `AC-10.4` | Gọi API được bảo vệ không có JWT trả `401`; chưa đăng nhập tại `/checkout` dẫn sang `/login` và giữ nguyên giỏ; truy cập đơn người khác trả `404 ORDER_NOT_FOUND`. | I, E | `order-history.e2e-spec.ts`, `apps/web/src/lib/checkout/session.test.ts` |
| **FR-11** | `AC-11.1` .. `AC-11.4` | `POST /api/orders` tính lại giá ở server, tạo `Order` `PENDING` (`reservationStatus = HELD`) trong 1 transaction; cảnh báo nếu giá lệch so với `quotedTotal`. | U, I, E | `orders-create.integration-spec.ts` |
| **FR-12** | `AC-12.1` .. `AC-12.4` | Quy đổi định mức `ProductIngredient` (S=100%, M=125%, L=150%) + `ToppingIngredient`, trừ `Ingredient.stock` với khóa lạc quan `version`, chống oversell đồng thời, hoàn kho khi `PAYMENT_FAILED`/`CANCELLED`. | U, I | `two-customers.integration-spec.ts`, `inventory.integration-spec.ts` |
| **FR-13** | `AC-13.1` .. `AC-13.4` | `POST /api/payments` (và VNPay/Stripe Sandbox) lấy `amount = order.total` từ server, thành công lưu `Payment` (`SUCCEEDED`) và chuyển đơn sang `PAID` (`CONSUMED`); sai trạng thái trả `409 ORDER_NOT_PAYABLE`. | U, I, E | `payments.e2e-spec.ts` |
| **FR-14** | `AC-14.1` .. `AC-14.4` | Thiếu/sai UUID ở `Idempotency-Key` trả `400 VALIDATION_ERROR`; gửi lặp cùng key + cùng `requestHash` trả kết quả cũ kèm `Idempotency-Replayed: true`; khác payload trả `409 IDEMPOTENCY_KEY_REUSED`. | U, I | `idempotency.e2e-spec.ts` |
| **FR-15** | `AC-15.1` .. `AC-15.3` | Thanh toán lỗi lưu `Payment(FAILED)`, chuyển đơn sang `PAYMENT_FAILED` và nhả kho (`RELEASED`); thử lại gọi `prepareRetry` giữ lại kho/mã; giao dịch trễ/trùng gắn cờ `requiresManualReview = true` (`refundStatus`). | U, I, E | `payments.e2e-spec.ts`, `gateway-safety.integration-spec.ts`, `stripe.e2e-spec.ts`, `vnpay.e2e-spec.ts`, `vnpay.integration-spec.ts`, `order-transitions.integration-spec.ts` |
| **FR-16** | `AC-16.1` .. `AC-16.2` | Sau khi thanh toán thành công, màn hình `/orders/:id` hiển thị mã đơn `code`, trạng thái `PAID`, tổng tiền và nút điều hướng về menu/hồ sơ. | E | `apps/web/src/components/checkout/Checkout.test.ts` |
| **FR-17** | `AC-17.1` .. `AC-17.3` | `GET /api/orders/me` trả danh sách đơn của chính khách hàng theo `createdAt DESC` (`page`, `limit`); `STAFF` xem hàng đợi toàn hệ thống và lọc `status` qua `GET /api/orders/staff`. | I, E | `order-history.e2e-spec.ts` |
| **FR-18** | `AC-18.1` .. `AC-18.2` | Chi tiết snapshot và trạng thái qua `GET /api/orders/:id` hoặc `/orders/staff/:id`; người dùng làm mới thủ công. | I, E | `order-history.e2e-spec.ts` |
| **FR-19** | `AC-19.1` .. `AC-19.3` | Hàm `assertTransition` kiểm soát mọi chuyển trạng thái theo `ORDER_TRANSITIONS`; chuyển sai hoặc chuyển từ trạng thái kết thúc trả `409 INVALID_ORDER_TRANSITION`. | U, I | `order-state.e2e-spec.ts` |
| **FR-20** | `AC-20.1` .. `AC-20.3` | Chủ đơn hủy trước pha chế; hoàn kho/mã một lần; `REVERSE` chỉ khi đã có `EARN`. | U, I | `order-transitions.integration-spec.ts` |
| **FR-21** | `AC-21.1` .. `AC-21.3` | `PATCH /api/orders/:id/status` chỉ cho phép `STAFF` chuyển `PAID → PREPARING → READY → COMPLETED`; `CUSTOMER` / `ADMIN` gọi trả `403 FORBIDDEN`. | I, E | `order-transitions.e2e-spec.ts`, `admin-staff-regression.e2e-spec.ts` |
| **FR-22** | `AC-22.1` .. `AC-22.3` | Chỉ `FIXED`/`PERCENT`; điều kiện `minSubtotal`; lỗi `422 PROMOTION_INVALID` hoặc `409 PROMOTION_EXHAUSTED`; tăng/hoàn lượt nguyên tử. | U, I | `promotion-rules.e2e-spec.ts` |
| **FR-23** | `AC-23.1` .. `AC-23.3` | `EARN` khi `COMPLETED` đủ điều kiện; `PAID` chưa có điểm; `REVERSE` cần `EARN` trước đó. | U, I | `loyalty.e2e-spec.ts` |
| **FR-24..26** | `AC-24.1` .. `AC-26.3` | `ADMIN` quản trị sản phẩm/topping/tồn kho/khuyến mãi/tài khoản qua `/api/auth/staff` và `/api/auth/admin/*`; xem tổng quan ở `/api/auth/admin/overview`; `STAFF` xem đối soát ở `/api/payments/manual-review`. | U, I | `staff-activation.integration-spec.ts`, `admin-validation.e2e-spec.ts`, `admin-overview.test.ts` |
| **NFR-01..02** | `AC-NFR01.1` .. `AC-NFR02.1` | API đọc p95 < 500 ms, API ghi/thanh toán p95 < 1.000 ms; giao diện menu đạt LCP ≤ 2,5 giây (mục tiêu). | M | `tests/tools/benchmark-api.cjs`, `docs/qa/final/latency.json` |
| **NFR-03..07** | `AC-NFR03.1` .. `AC-NFR07.3` | `bcrypt` cost 12, `JwtAuthGuard` + `StaffGuard`/`AdminGuard`, `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`), Prisma tham số hóa, `.env.example`, CORS theo `FRONTEND_URL`. | U, I, M | `admin-validation.e2e-spec.ts`, `auth.e2e-spec.ts` |
| **NFR-08..12** | `AC-NFR08.1` .. `AC-NFR12.3` | Responsive 360 px, tối đa 6 màn hình đặt đơn, xử lý lỗi mạng an toàn, `GET /api/health` & `/api/health/ready`, `ApiExceptionFilter`, `CHECK (stock >= 0)`, `UnitOfWork` transaction. | U, I, E, M | `health.e2e-spec.ts`, `two-customers.integration-spec.ts`, `unit-of-work.integration-spec.ts` |
| **NFR-13..15** | `AC-NFR13.1` .. `AC-NFR15.2` | `docker compose up --build -d` chạy trọn vẹn 3 service (`db`, `backend`, `frontend`); CI kiểm tra `docs:check`, `api:check`, `lint`, `test`, `build`; sanitize log lỗi 500. | I, E, M | `docker-compose.yml`, `.github/workflows/ci.yml` |

---

# 5. Sơ đồ Use-case tổng quát của toàn hệ thống

## 5.1 Các tác nhân (Actors)

| Actor | Mô tả trách nhiệm | Vai trò hệ thống |
|---|---|---|
| **Khách hàng (Customer)** | Xem menu, lọc danh mục, xem chi tiết sản phẩm & chọn size/topping, quản lý giỏ hàng, đăng ký, đăng nhập; báo giá, đặt và thanh toán đơn hàng, áp mã khuyến mãi, tích điểm thưởng, xem lịch sử & theo dõi đơn, hủy đơn. | `CUSTOMER` (Tác nhân chính – `Must`) |
| **Nhân viên quầy (Staff)** | Đăng nhập, xem hàng đợi pha chế trên `/staff`, cập nhật trạng thái đơn đã thanh toán (`PAID → PREPARING → READY → COMPLETED`), tra cứu danh sách giao dịch cần đối soát hoàn tiền (`GET /api/payments/manual-review`). | `STAFF` (Tác nhân phụ – `Should`) |
| **Quản lý cửa hàng (Admin)** | Đăng nhập, quản trị sản phẩm/topping/tồn kho nguyên liệu & mã khuyến mãi (`UC-12`), xem thống kê doanh thu, đơn hàng & tài khoản khách hàng (`UC-13`), quản lý tài khoản nhân viên & phân quyền khóa/mở khóa tức thì (`UC-14`). | `ADMIN` (Mở rộng – `Could`) |
| **Cổng thanh toán (Mô phỏng / VNPay / Stripe Sandbox)** | Hệ thống ngoài (cổng mô phỏng nội bộ `WALLET`/`CARD` hoặc cổng thử nghiệm **VNPay Sandbox** / **Stripe Test Mode**) xử lý và xác nhận kết quả giao dịch không tiền mặt. | `«hệ thống ngoài»` |

## 5.2 Sơ đồ Use-case tổng quát

![Sơ đồ use-case tổng quát của BrewLite](./usecase-brewlite.svg)

> Sơ đồ hiện có: [usecase-brewlite.svg](./usecase-brewlite.svg). SVG là nguồn có thể chỉnh sửa trực tiếp; chưa có bản PlantUML hoặc PNG. Bảng truy vết và mục 5.4 quy định thời điểm phát sinh nghiệp vụ.

## 5.3 Danh sách Use-case và truy vết sang Yêu cầu chức năng & API

| Mã Use-case | Tên Use-case | Actor chính | Quan hệ / Ghi chú | Yêu cầu liên quan | API chính trong codebase |
|---|---|---|---|---|---|
| **UC-01** | Xem menu và lọc danh mục | Khách hàng | Độc lập | FR-01, FR-02 | `GET /api/products` |
| **UC-02** | Xem chi tiết và chọn size/topping | Khách hàng | Độc lập | FR-03, FR-04 | `GET /api/products/:id` |
| **UC-03** | Quản lý giỏ hàng | Khách hàng | Độc lập (Client + Quote) | FR-05, FR-06, FR-07 | `localStorage` (`brewlite-cart`) + `POST /api/orders/quote` |
| **UC-04** | Đăng ký tài khoản | Khách hàng | Độc lập | FR-08 | `POST /api/auth/register` |
| **UC-05** | Đăng nhập (JWT) | Khách hàng, Nhân viên (`STAFF`), Quản lý (`ADMIN`) | Độc lập, đồng thời `«extend»` UC-06 khi khách chưa đăng nhập | FR-09, FR-10 | `POST /api/auth/login`, `GET /api/auth/me` |
| **UC-06** | **Đặt và thanh toán đơn hàng** *(Use-case trọng tâm – Task 1.3)* | Khách hàng | `«include»` UC-06.1, UC-06.2, UC-06.3; được `«extend»` bởi UC-05, UC-07; UC-08 diễn ra sau khi hoàn tất pha chế | FR-10 đến FR-16, FR-19 | `POST /api/orders/quote`, `POST /api/orders`, `POST /api/payments` |
| **UC-07** | Áp mã khuyến mãi | Khách hàng | `«extend»` UC-06 | FR-22 | `GET /api/promotions`, `POST /api/promotions/validate` |
| **UC-08** | Tích / hoàn điểm thưởng | Khách hàng | Được kích hoạt khi UC-11 hoàn tất đơn `COMPLETED`; đảo điểm chỉ khi đã có `EARN` | FR-23 | `GET /api/loyalty/me`, `GET /api/loyalty/me/entries` |
| **UC-09** | Xem lịch sử và theo dõi đơn | Khách hàng | Độc lập | FR-17, FR-18 | `GET /api/orders/me`, `GET /api/orders/:id` |
| **UC-10** | Hủy đơn & hoàn kho/điểm | Khách hàng (chủ đơn) | Độc lập | FR-20 | `POST /api/orders/:id/cancel` |
| **UC-11** | Xem hàng đợi và cập nhật trạng thái pha chế | Nhân viên (`STAFF`) | Độc lập | FR-19, FR-21 | `GET /api/orders/staff`, `PATCH /api/orders/:id/status` |
| **UC-12** | Quản trị sản phẩm, kho nguyên liệu và mã khuyến mãi | Quản lý (`ADMIN`) | Mở rộng (`Could`) | FR-24 | `/api/auth/admin/catalog`, `/products/:id`, `/toppings/:id`, `/ingredients/:id`, `/promotions` |
| **UC-13** | Xem thống kê doanh thu, đơn hàng & đối soát thanh toán | Quản lý (`ADMIN`) / Nhân viên (`STAFF`) | Mở rộng (`Could`) | FR-25 | `GET /api/auth/admin/overview` (`ADMIN`), `GET /api/payments/manual-review` (`STAFF`) |
| **UC-14** | Quản lý tài khoản nhân viên và phân quyền | Quản lý (`ADMIN`) | Mở rộng (`Could`) | FR-26 | `/api/auth/staff`, `/api/auth/admin/users/:id/status`, `apps/api/src/seed/seed.ts` |

## 5.4 Luồng UC-06

1. Điều kiện trước: JWT hợp lệ, giỏ có món. UC-06.1 báo giá bằng `POST /api/orders/quote`: đọc giá theo size và topping, kiểm tra mã/kho; chưa giữ nguyên liệu.
2. UC-06.2 tạo đơn bằng `POST /api/orders` và `Idempotency-Key`: transaction lưu snapshot giá, giữ lượt mã, trừ kho nguyên liệu và lưu `OrderIngredientHold`. Thành công: `PENDING`/`HELD`; thiếu nguyên liệu: `409 OUT_OF_STOCK` và rollback toàn bộ.
3. UC-06.3 thanh toán với `Idempotency-Key` riêng: thành công → `PAID`/`CONSUMED`, không trừ kho lần hai, không `EARN`. Thất bại → `PAYMENT_FAILED`/`RELEASED` và hoàn kho/mã đúng một lần.
4. Thử lại phải qua `prepareRetry`: `PAYMENT_FAILED → PENDING`, giữ lại kho/mã bằng transaction theo công thức hiện tại, giữ nguyên snapshot giá. Không có cạnh `PAYMENT_FAILED → PAID` trực tiếp.
5. UC-11 tiếp tục `PAID → PREPARING → READY → COMPLETED`. Chỉ tại `COMPLETED` mới phát sinh `EARN` theo FR-23; đây không phải bước cộng điểm bên trong UC-06.3.

Kho nguyên liệu: `Product`/`Topping` không có cột `stock`. Định mức sản phẩm được nhân hệ số size, làm tròn lên từng ly cho `GRAM`/`ML`; `PIECE` giữ nguyên. Topping không nhân hệ số size. Tổng hợp nguyên liệu dùng chung trước cập nhật; nhả kho theo snapshot, không tính lại công thức. `PENDING` chưa có cơ chế tự hết hạn giữ kho.

Giá sản phẩm, size, topping và trường tiền voucher giới hạn `0..2.000.000.000` VND theo validation tương ứng; `PERCENT.value` giới hạn `1..100`. Khi đổi giá gốc, bất kỳ giá size sau dịch chuyển vượt giới hạn đều trả `400 VALIDATION_ERROR` và rollback toàn bộ. Không dùng giới hạn tiền cho `stock`, số lượt hoặc `version`.
s