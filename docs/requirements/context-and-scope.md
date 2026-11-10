# Bối cảnh và phạm vi BrewLite

BrewLite giúp khách chọn đồ uống, tùy chỉnh và thanh toán từ điện thoại trước khi đến quầy. Cửa hàng cần nhận đơn có giá nhất quán, tránh nhận vượt tồn nguyên liệu và theo dõi trạng thái pha chế. Hệ thống ghi lại kết quả thanh toán để khách và nhân viên có thể kiểm tra khi yêu cầu bị gửi lại hoặc mạng gián đoạn.

| Stakeholder | Mục tiêu và kỳ vọng |
| --- | --- |
| Khách hàng | Xem menu trên điện thoại, thấy giá trước khi xác nhận, thanh toán, theo dõi đơn của mình và xử lý lỗi rõ ràng. |
| Nhân viên quầy | Xem hàng đợi đơn được phép xử lý, chuyển trạng thái pha chế và nhận biết giao dịch cần đối soát. |
| Quản lý cửa hàng | Giới hạn quyền theo vai trò, quản lý tài khoản nhân viên và giữ dữ liệu tồn kho, giá và thanh toán nhất quán. |
| Giảng viên hoặc người nghiệm thu | Clone và chạy theo README, xem bằng chứng kiểm thử và truy vết, mở HTTPS production và trình diễn luồng hoàn chỉnh. |
| Nhóm phát triển | Có hợp đồng API, lịch sử PR, môi trường tái lập và quy trình triển khai có thể rollback. |
| Đơn vị thanh toán | Nhận số tiền do backend xác định, đối chiếu giao dịch, xử lý callback gửi lại theo quy tắc cổng thử nghiệm. |

| Phạm vi | Nội dung |
| --- | --- |
| MVP | Menu và chi tiết món, size/topping, giỏ, đăng ký và đăng nhập JWT, báo giá và giữ nguyên liệu, thanh toán Ví/Thẻ mô phỏng, xác nhận/lịch sử đơn, trạng thái pha chế, xử lý lỗi. |
| Mở rộng | Khuyến mãi, loyalty ledger, tài khoản nhân viên và dashboard quản trị theo ưu tiên trong SRS, đối soát Stripe Test Mode và VNPay Sandbox. |
| Ngoài phạm vi | Thu tiền thật, giao hàng/định vị, nhiều chi nhánh, quản lý nhà cung cấp, đồng bộ đặt đơn offline và hạ tầng thanh toán tự xây. |

| Loại | Nội dung |
| --- | --- |
| Giả định | Một cửa hàng, giá nguyên VND, khách có mạng khi tạo hoặc thanh toán đơn. Giá và tồn tại checkout được tính lại trên backend. |
| Ràng buộc | Next.js mobile-first, NestJS, PostgreSQL, Docker; JWT và cổng sandbox dùng biến môi trường; dữ liệu production nằm trong mạng nội bộ. |
| Rủi ro ban đầu | Tranh tồn kho được kiểm soát bằng transaction và version. Gửi lặp thanh toán dùng idempotency key. Khác giá quote/tạo đơn cần khách xác nhận lại. Mất callback cần kiểm tra trạng thái hoặc đối soát. Triển khai lỗi cần giữ ảnh bản trước và kiểm tra tương thích migration trước khi phát hành. |

Đối chiếu [SRS](Task-1.2-SRS-BrewLite.md), [use-case checkout](use-case-checkout.md).

## Kỳ vọng nghiệm thu theo stakeholder

- Khách hàng kiểm tra mã đơn, số tiền và trạng thái sau thanh toán. Nhân viên quầy đối chiếu cấu hình món và kiểm tra quyền cập nhật trạng thái.
- Quản lý và đơn vị thanh toán đối chiếu giao dịch trễ hoặc trùng qua mã đơn. Nhóm phát triển bàn giao cách chạy, tái lập dữ liệu và rollback cho người nghiệm thu.
- Repo đã chứa baseline BrewLite được nhập trước Task 1–3. Nhóm ghi rõ phần kế thừa và phần thay đổi trong các PR triển khai. Phạm vi tái sử dụng trong bài nộp cần giảng viên xác nhận.
