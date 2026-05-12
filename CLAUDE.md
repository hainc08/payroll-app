# Payroll App — Context cho Claude Code

## Tech stack
- Frontend: React 18 + Vite + Ant Design 5
- Backend: Node.js 18 + Express 4
- Database: MariaDB 10.6
- Auth: JWT (jsonwebtoken)
- File parsing: SheetJS (xlsx)
- PDF: Puppeteer
- Hosting: Matbao Flesk VPS

## Cấu trúc thư mục
/frontend/src/pages/     → màn hình chính
/frontend/src/components/→ component tái dùng
/frontend/src/services/  → gọi API (axios)
/backend/src/routes/     → Express routes
/backend/src/controllers/→ business logic
/backend/src/models/     → DB queries (mysql2)
/backend/src/middleware/ → auth, rbac, audit
/docs/                   → spec, schema, wireframe

## Quy tắc code BẮT BUỘC
- Mọi API route đều cần middleware: authMiddleware + rbacMiddleware
- Mọi thay đổi dữ liệu lương → gọi auditLog(userId, action, oldVal, newVal)
- Dùng DECIMAL(15,2) cho tất cả cột tiền, KHÔNG dùng FLOAT
- Charset DB: utf8mb4_unicode_ci (tiếng Việt)
- Trả lỗi theo format: { success: false, message: "...", code: "ERR_CODE" }
- Trả thành công theo format: { success: true, data: {...} }

## Roles hệ thống
ADMIN | GIAMDOC | KETOAN | QUANLY | NHANVIEN

## Trạng thái bảng lương (payroll_status)
NHAP → CHO_DUYET → KETOAN_DUYET → GIAMDOC_DUYET → DA_CHOT

## Biến môi trường (xem .env.example)
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
JWT_SECRET, JWT_EXPIRES_IN
PORT, NODE_ENV

## Tài liệu tham khảo
- Spec đầy đủ: docs/SPEC_v1.1.md
- DB Schema: docs/schema.sql
- Màn hình: docs/wireframes.md

## Lưu ý đặc biệt
- File Excel chấm công: ngày lưu dạng Excel serial (46143 = date)
- Mã máy CC (00002) ≠ mã lương (EC-NVTHUONG) → xem bảng employee_id_mapping
- Thuế TNCN: tính tự động nhưng cho phép override (ghi log lý do)