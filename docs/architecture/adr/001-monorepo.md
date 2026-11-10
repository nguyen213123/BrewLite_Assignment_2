# ADR 001 · Monorepo với backend phân mô-đun

**Trạng thái** Đã áp dụng.

BrewLite có hai ứng dụng phát hành độc lập nhưng thay đổi tính năng thường đụng cả web, API và test. Nhóm lưu Next.js, NestJS, Prisma, OpenAPI và tài liệu trong cùng repository. Kiểu TypeScript sinh từ OpenAPI được kiểm tra trong CI.

Cách này giữ các thay đổi hợp đồng và người gọi trong cùng PR. Backend dùng module/domain để giữ ranh giới trách nhiệm và truy cập cùng transaction. Hai ứng dụng vẫn có lockfile và Dockerfile riêng. CI cần build cả hai khi hợp đồng thay đổi và API phải giữ tương thích khi web, API triển khai lệch thời điểm.
