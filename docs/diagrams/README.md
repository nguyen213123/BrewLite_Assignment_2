# Mô hình hóa BrewLite

Các sơ đồ dùng cùng [use-case UC-06](../requirements/use-case-checkout.md) và [SRS](../requirements/Task-1.2-SRS-BrewLite.md).

| Hạng mục | Tệp nguồn | Bản kết xuất |
| --- | --- | --- |
| Task 1.3 · Use-case checkout | [PlantUML](use-case-checkout.puml) | [SVG](use-case-checkout.svg) |
| Task 2.1 · Activity-01 | [PlantUML](activity-checkout.puml) | [SVG](activity-checkout.svg) |
| Task 2.2 · Sequence-01 | [PlantUML](sequence-checkout.puml) | [SVG](sequence-checkout.svg) |
| Task 2.3 · Class-01 | [PlantUML](class-domain.puml) | [SVG](class-domain.svg) |

Dùng PlantUML với `-charset UTF-8 -tsvg` để tạo lại SVG. Activity phân làn người dùng, giao diện và API/DB. Sequence cho thấy thứ tự gọi quote, tạo đơn và thanh toán, kiểm tra JWT, transaction giữ kho và nhánh replay. Class thể hiện các thực thể nghiệp vụ chính, multiplicity và enum. [Mô tả class diagram](Task-2.3-Class-Diagram-BrewLite.md) và [ERD](erd.md) bổ sung chi tiết dữ liệu.
