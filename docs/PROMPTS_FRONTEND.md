Đọc CLAUDE.md, docs/wireframes.md, và docs/SPEC_v1.1.md trước khi làm bất cứ việc gì.

Chúng ta bắt đầu Phase 1 Frontend. Backend API đã hoàn chỉnh ở http://localhost:3001.

Stack frontend:
- React 18 + Vite
- Ant Design 5
- React Router v6
- Axios (đã có baseURL + JWT interceptor)
- React Query (server state)
- Zustand (global state: user, permissions)

Quy tắc BẮT BUỘC khi code UI:
1. Mỗi màn hình trong wireframes.md là 1 file page riêng trong /frontend/src/pages/
2. Component tái dùng → /frontend/src/components/
3. Gọi API → /frontend/src/services/ (không fetch trực tiếp trong component)
4. Mọi action cần permission → kiểm tra qua hook usePermission(role[])
5. Loading state: dùng Skeleton của Ant Design, không để màn hình trắng
6. Error state: hiện Alert với message từ API, không console.log
7. Responsive: desktop first, sidebar collapse ở < 1024px
8. Màu sắc trạng thái theo quy ước wireframes.md:
   xanh lá = success, vàng = warning, đỏ = danger, xanh dương = info

Danh sách UI sẽ implement theo thứ tự:
UI-01: App Shell + Router + Auth Guard
UI-02: Trang đăng nhập
UI-03: Dashboard
UI-04: Quản lý nhân viên
UI-05: Mapping mã NV
UI-06: Import chấm công
UI-07: Bảng lương
UI-08: Phê duyệt
UI-09: Phiếu lương

Hôm nay bắt đầu UI-01.
Trước khi code, liệt kê các file sẽ tạo/sửa. Chờ tôi confirm.

UI-01: App Shell + Router + Auth Guard

Tạo các file sau (liệt kê xong chờ confirm):

frontend/src/
  main.jsx                        → ReactDOM.render + QueryClient + Router
  App.jsx                         → Routes config
  store/authStore.js              → Zustand: { user, token, login(), logout() }
  hooks/usePermission.js          → hook: hasRole(roles[]) → boolean
  services/api.js                 → axios instance, JWT interceptor, auto-refresh
  services/authService.js         → login(), logout(), getMe()
  layouts/AppLayout.jsx           → Sidebar + TopBar + <Outlet/>
  layouts/AuthLayout.jsx          → layout trang login (không có sidebar)
  components/Sidebar.jsx          → Nav menu theo wireframes.md App Shell
  components/TopBar.jsx           → breadcrumb + notification bell + user avatar
  components/PrivateRoute.jsx     → redirect /login nếu chưa auth
  components/RoleGuard.jsx        → hiện 403 page nếu không đủ role

Route structure:
  /login                → AuthLayout > LoginPage
  / (private)           → AppLayout > PrivateRoute
    /dashboard          → DashboardPage
    /employees          → EmployeeListPage
    /employees/:id      → EmployeeDetailPage
    /mapping            → MappingPage
    /attendance/import  → AttendanceImportPage
    /payroll/:period    → PayrollPage
    /payroll/:period/approve → ApprovePage
    /payslip/:id/:period → PayslipPage
    *                   → 404 Page

Sidebar menu items theo wireframes.md:
- Dashboard (tất cả role)
- Nhân viên (ADMIN, KETOAN, QUANLY, GIAMDOC)
- Mapping mã NV (ADMIN, KETOAN)
- Chấm công (ADMIN, KETOAN)
- Bảng lương (ADMIN, KETOAN, GIAMDOC, QUANLY)
- Phê duyệt + badge số đang chờ (ADMIN, KETOAN, GIAMDOC)
- Phiếu lương (tất cả)
- Cấu hình (ADMIN only)


Mock test UI-01:

1. Chạy npm run dev — không có lỗi console
2. Truy cập / khi chưa login → redirect /login ✓
3. Truy cập /dashboard sau khi login → hiện AppLayout ✓
4. Sidebar hiển thị đúng menu theo role:
   - Login NHANVIEN → không thấy menu Nhân viên, Mapping, Chấm công, Bảng lương
   - Login KETOAN → thấy tất cả trừ Cấu hình
   - Login ADMIN → thấy tất cả
5. Badge "Phê duyệt" hiện số > 0 khi có bảng lương chờ duyệt
6. usePermission(['ADMIN','KETOAN']) với role NHANVIEN → false
7. RoleGuard bảo vệ route /mapping: NHANVIEN truy cập → 403 page
8. Logout → xoá token, redirect /login
9. Token hết hạn → interceptor redirect /login
10. Sidebar collapse khi viewport < 1024px

Báo pass/fail từng case. Fix hết trước khi làm UI-02.


UI-02: Login Page

File: frontend/src/pages/auth/LoginPage.jsx

Implement theo wireframes.md (trang Login):
- Logo + tên app căn giữa
- Form: Email + Password + nút "Đăng nhập"
- Validation: email format, password required
- Loading state: nút disable + spinner khi đang gọi API
- Error: Alert đỏ "Sai email hoặc mật khẩu" khi 401
- Sau login thành công → redirect về trang trước đó (hoặc /dashboard)
- Lưu token vào authStore + localStorage
- Không có link đăng ký (hệ thống nội bộ)

Dùng Ant Design: Form, Input, Button, Alert, Typography

Mock test UI-02:

1. Hiển thị đúng layout: logo, form, button
2. Submit form trống → validation error hiện dưới từng field
3. Email sai format → lỗi ngay khi blur
4. Login sai credentials → Alert đỏ, form không bị xoá
5. Login đúng ketoan@abc.vn → redirect /dashboard
6. Trong khi đang gọi API → button disabled, hiện spinner
7. Sau login → localStorage có token
8. Truy cập /login khi đã có token hợp lệ → redirect /dashboard



UI-03: Dashboard Page

File: frontend/src/pages/DashboardPage.jsx
Service: frontend/src/services/dashboardService.js

Implement theo wireframes.md màn hình 1:

4 KPI Cards (dùng Ant Design Statistic + Card):
- Tổng nhân viên: số + delta tháng này
- Quỹ lương NET kỳ hiện tại: số tiền format VND
- Trạng thái bảng lương: Badge màu theo trạng thái
- Số bản ghi chấm công lỗi: đỏ nếu > 0

2 panels dưới (grid 2 cột):
- "Hoạt động gần đây": Timeline Ant Design, 5 items gần nhất từ audit_log
- "Việc cần làm": danh sách action items với button

Logic "Việc cần làm" theo role:
  KETOAN:
    - Nếu có attendance warnings → "X bản ghi thiếu giờ ra" [button: Xử lý → /attendance/import]
    - Nếu bảng lương NHAP → "Tạo bảng lương tháng X" [button: Tạo]
    - Nếu bảng lương DA_CHOT → "Xuất phiếu lương" [button: Xuất]
  GIAMDOC:
    - Nếu bảng lương KETOAN_DUYET → "Bảng lương chờ duyệt" [button: Xem → /payroll/approve]

API cần: GET /api/dashboard/summary
Loading: Skeleton 4 cards trong khi fetch

Mock test UI-03:

1. Tất cả 4 KPI cards hiển thị số liệu thật từ API
2. Loading state: Skeleton hiển thị trước khi data về
3. Quỹ lương format đúng: "382.540.000 đ" không phải "382540000"
4. Badge trạng thái đúng màu: NHAP=xám, CHO_DUYET=vàng, DA_CHOT=xanh
5. Timeline "Hoạt động gần đây" hiển thị 5 items mới nhất
6. "Việc cần làm" đúng theo role đang login:
   - KETOAN thấy task liên quan import + bảng lương
   - GIAMDOC thấy task phê duyệt (nếu có)
   - NHANVIEN không thấy task admin
7. Button trong "Việc cần làm" navigate đúng route
8. KPI "Chấm công lỗi" = 0 → text xám bình thường, > 0 → đỏ + đậm




UI-04: Employee Management

Files:
  pages/employees/EmployeeListPage.jsx   → layout master-detail
  pages/employees/EmployeeDetail.jsx     → right panel tabs
  pages/employees/EmployeeForm.jsx       → modal thêm/sửa
  components/employees/SalaryHistory.jsx → tab lịch sử lương
  components/employees/AttendanceMini.jsx→ tab chấm công mini calendar
  services/employeeService.js

Layout: master-detail 2 cột theo wireframes.md màn hình 7
  Cột trái (340px cố định): danh sách + search/filter
  Cột phải (co giãn): chi tiết NV đang chọn

LEFT PANEL:
- Input search (debounce 300ms)
- Select: bộ phận
- Select: trạng thái (đang làm / đã nghỉ)
- List item: Avatar initials + tên + mã + lương + type badge
- Item đang chọn: highlight xanh + border-left

RIGHT PANEL — 4 tabs:
Tab "Hồ sơ":
  - Header: Avatar lớn + tên + mã + badges + button Sửa/Vô hiệu hoá
  - Grid 2 cột: thông tin cá nhân | cấu trúc lương
  - Box ước tính lương đủ công (tính realtime từ data)
  - Mã máy CC: hiện ✓ xanh nếu đã mapping, ✕ đỏ nếu chưa + link sang trang Mapping

Tab "Lịch sử lương": timeline các lần thay đổi lương từ audit_log

Tab "Chấm công": mini calendar 3 tháng, màu ô theo wireframes.md

FORM thêm/sửa (Modal, 3 sections/steps):
  Step 1: Thông tin cơ bản
  Step 2: Thông tin định danh + ngân hàng
  Step 3: Cấu trúc lương + phụ cấp
  Validate: lương > 0, mã NV unique, email format


  Mock test UI-04:

1. List hiển thị đủ 50 NV từ API
2. Search "Nguyễn" → filter realtime (debounce 300ms)
3. Filter bộ phận "Nhà hàng" → chỉ hiện NV nhà hàng
4. Click NV → right panel cập nhật đúng NV đó
5. Tab Hồ sơ: tất cả field hiện đúng data
6. Số tài khoản: mặc định ẩn "···4521", click Hiện → hiện full
7. Mã máy CC đã map → ✓ xanh; chưa map → ✕ đỏ + link Mapping
8. Box ước tính lương tính đúng: gross - BHXH - thuế = NET
9. Tab Lịch sử lương: hiện timeline đúng thứ tự mới nhất trước
10. Form thêm NV: submit thiếu field bắt buộc → validation error
11. Form sửa: data điền sẵn đúng NV đang chọn
12. Vô hiệu hoá NV → confirm dialog → NV chuyển sang tab "Đã nghỉ"
13. Role QUANLY: button Sửa/Vô hiệu hoá bị ẩn


UI-05: Employee ID Mapping

Files:
  pages/mapping/MappingPage.jsx
  services/mappingService.js

Layout: 2 cột đối chiếu theo wireframes.md màn hình 6

HEADER:
- Tổng count: [X đã map] badge xanh + [Y chưa map] badge đỏ
- Button: Import mapping Excel | Xuất danh sách

INFO BANNER: hướng dẫn mapping (dismissible)

FILTER BAR:
- Input search
- Tab filter: Tất cả | Đã map | Chưa map (count mỗi tab)

TABLE 2 cột:
  Cột trái: Mã máy CC + tên trên máy + dot màu (xanh=mapped, đỏ=unmapped)
  Giữa: icon ↔ (xanh) hoặc ? (đỏ)
  Cột phải:
    Nếu đã map: Avatar + tên + mã lương + button ✏ sửa
    Nếu chưa map: Select dropdown tìm NV + button "Gán"
    Select dropdown: search-able, hiện tên + mã + bộ phận

IMPORT EXCEL MAPPING:
  Upload modal → preview bảng mapping → confirm

AUDIT LOG (footer):
  5 thay đổi gần nhất: mã → mã, user, thời gian
  Button "Xem đầy đủ" → drawer

Lưu ý: sau khi Gán thành công → row chuyển từ đỏ sang xanh ngay (optimistic update)


Mock test UI-05:

1. Hiển thị đúng count đã map / chưa map
2. Tab "Chưa map" → chỉ hiện row đỏ
3. Row đỏ (00999): dropdown tìm "Nguyen" → gợi ý NV
4. Chọn NV + Gán → row chuyển xanh ngay (không cần reload)
5. Row xanh: click ✏ → dropdown đổi NV khác
6. Import Excel 2 cột → preview đúng → confirm → mapping được lưu
7. Import NV không tồn tại trong hệ thống → hiện lỗi ở preview
8. Audit log footer hiện 5 thay đổi mới nhất
9. Role không phải ADMIN/KETOAN → redirect 403
10. Search "00002" → filter chỉ hiện row đó


UI-06: Attendance Import

Files:
  pages/attendance/AttendanceImportPage.jsx
  components/attendance/ImportStepper.jsx
  components/attendance/PreviewTable.jsx
  components/attendance/AttendanceSummary.jsx
  services/attendanceService.js

STEPPER 4 bước (Ant Design Steps):
  Bước 1 — Upload file:
    Dragger upload zone: kéo thả hoặc click chọn file
    Chỉ nhận .xlsx, .xls
    Selector: Tháng/Năm kỳ lương (default: tháng hiện tại)
    Sau khi chọn file → tự động chạy bước 2

  Bước 2 — Parse & validate (auto, hiện progress bar):
    Gọi POST /api/attendance/import
    Hiện spinner "Đang phân tích file..."
    Xong → tự động chuyển bước 3

  Bước 3 — Review (màn hình chính):
    Alert bar: "X bản ghi cần xử lý"
    5 stat cards: Tổng NV | Tổng bản ghi | Hợp lệ | Thiếu Ra | Chưa map
    Filter: Tất cả | Lỗi/Cảnh báo
    Bảng preview columns: Mã máy | Tên | Ngày | Vào1 | Ra1 | Vào2 | Ra2 | Tổng giờ | Status
    Row màu: trắng=ok, vàng=warning, đỏ=error
    Row "Thiếu Ra": click ô Ra → inline input nhập giờ thủ công
    Row "Chưa map": link "→ Trang Mapping" mở tab mới
    Button: "Xác nhận import" (disabled nếu còn error chưa xử lý)

  Bước 4 — Lưu DB:
    Gọi POST /api/attendance/confirm
    Hiện progress
    Thành công → "Import thành công! 842 bản ghi đã lưu" + link "Xem tổng hợp"

SAU IMPORT — màn hình tổng hợp:
  Bảng: NV | Ngày công | Tổng giờ | Giờ OT | Số ngày thiếu giờ
  Filter theo bộ phận


  Mock test UI-06:

1. Upload file sai format (.pdf) → thông báo lỗi, không xử lý
2. Upload file Excel thật → bước 2 chạy tự động
3. Bước 3 hiện đúng count: valid/warning/error
4. Row vàng (thiếu Ra): click ô Ra → input hiện ra, nhập giờ → save → row chuyển xanh
5. Row đỏ (chưa map): link mở trang Mapping tab mới
6. Button "Xác nhận import" disabled khi còn row đỏ chưa xử lý
7. Filter "Lỗi/Cảnh báo" → chỉ hiện row vàng + đỏ
8. Confirm import → bước 4 → success message
9. Import lại cùng period → confirm dialog "Sẽ ghi đè dữ liệu cũ"
10. Màn hình tổng hợp: bảng NV với ngày công đúng


UI-07: Payroll Table

Files:
  pages/payroll/PayrollPage.jsx
  components/payroll/PayrollTable.jsx      → bảng 23 cột
  components/payroll/EditPayrollDrawer.jsx → drawer chỉnh sửa 1 dòng
  components/payroll/TaxBreakdown.jsx      → popup chi tiết tính thuế
  services/payrollService.js

HEADER:
  Tiêu đề + Badge trạng thái (màu theo SPEC)
  Meta: ngày tạo + số NV
  Buttons theo trạng thái:
    NHAP: [Xuất Excel] [Submit phê duyệt]
    CHO_DUYET / KETOAN_DUYET: [Xuất Excel] (readonly)
    DA_CHOT: [Xuất Excel] [Xuất phiếu lương hàng loạt]

FILTER BAR:
  Select bộ phận | Search NV | Tổng NET hiển thị

TABLE (Ant Design Table, sticky header + sticky cột đầu):
  23 cột theo đúng thứ tự wireframes.md
  Cột tiền: align right, format "12.396.137"
  Cột OT: vàng nếu > 0
  Row có tax override: background vàng nhạt
  Ô thuế override: icon ✏ cam, tooltip "Đã điều chỉnh thủ công"
  Click icon ✏ cuối row → mở EditPayrollDrawer
  Footer row: Tổng cộng

EDIT DRAWER (Ant Design Drawer, width 480px):
  Header: tên NV + badge trạng thái
  Readonly fields: ngày công, giờ OT, lương earned, BHXH (màu xám)
  Editable fields:
    - Thưởng doanh thu (số tiền)
    - Tạm ứng (số tiền)
    - Thuế TNCN: input + button "Xem chi tiết tính toán"
      Nếu sửa thuế → textarea "Lý do điều chỉnh" (bắt buộc)
    - Giảm trừ khác (số tiền + ghi chú)
  Real-time: NET thực lĩnh cập nhật ngay khi thay đổi
  Button: Lưu | Huỷ

TAX BREAKDOWN POPUP:
  Hiện step-by-step:
    Thu nhập gross: X
    Trừ BHXH: -Y
    Trừ giảm trừ bản thân: -11.000.000
    Trừ giảm trừ phụ thuộc (2 người): -8.800.000
    Thu nhập tính thuế: Z
    Bậc 1 (5%): ...
    Bậc 2 (10%): ...
    Tổng thuế: T



    Mock test UI-07:

1. Bảng hiển thị đủ 23 cột, không vỡ layout
2. Scroll ngang bảng: cột Mã NV + Tên cố định (sticky left)
3. Format tiền: "46.990.470" có dấu chấm phân cách
4. Row Cao Minh Hiếu (có tax override): background vàng nhạt
5. Click ✏ mở EditDrawer đúng NV
6. Drawer: sửa Thưởng → NET cập nhật realtime ngay
7. Sửa Thuế TNCN không nhập lý do → không cho Lưu
8. Sửa Thuế TNCN có lý do → Lưu → row vàng + icon cam
9. Click "Xem chi tiết tính toán" → popup hiện đúng breakdown 7 bậc
10. Trạng thái DA_CHOT: icon ✏ bị ẩn, tất cả readonly
11. Submit phê duyệt → confirm dialog → status chuyển CHO_DUYET
12. Xuất Excel → file download đúng 23 cột
13. Role GIAMDOC: thấy bảng nhưng không thấy button Submit, không có icon ✏



UI-08: Approval Page

Files:
  pages/approval/ApprovePage.jsx
  components/approval/ApprovalSummary.jsx
  components/approval/ApprovalTimeline.jsx
  components/approval/RejectModal.jsx
  services/approvalService.js

LAYOUT 2 cột (theo wireframes.md màn hình 4):
  Cột trái: Tóm tắt kỳ lương
  Cột phải: Timeline phê duyệt

TÓM TẮT (dành cho GĐ xem nhanh):
  Tổng NV | Gross | BHXH+Thuế | NET
  So sánh vs tháng trước: % + số tiền tuyệt đối
  List NV có override thuế (nếu có) → link xem chi tiết

TIMELINE:
  Ant Design Timeline component
  Mỗi node: icon (✓/✕/?) + tên action + user + timestamp + ghi chú
  Node hiện tại: animate pulse

BUTTONS (hiển thị theo role + trạng thái):
  KETOAN thấy bảng CHO_DUYET:
    [Rút lại] → về NHAP
  GIAMDOC thấy bảng KETOAN_DUYET:
    [Từ chối] [Duyệt & Chốt]

REJECT MODAL:
  Textarea "Lý do từ chối" (bắt buộc, min 10 ký tự)
  Button Xác nhận từ chối

SAU KHI DUYỆT (DA_CHOT):
  Banner xanh "Đã chốt lương tháng X/XXXX"
  Button: [Xuất phiếu lương hàng loạt] [Về Dashboard]
  Timeline hiện đầy đủ 3 bước đã xanh

  Mock test UI-08:

1. Login KETOAN: thấy tóm tắt + timeline, không thấy button Duyệt
2. Login GIAMDOC khi KETOAN_DUYET: thấy button Từ chối + Duyệt
3. Tóm tắt: số liệu NET đúng với bảng lương
4. So sánh tháng trước: % đúng chiều (▲▼) và màu (đỏ/xanh)
5. Có override thuế → hiện danh sách NV bị override
6. Click Từ chối → modal mở
7. Từ chối không nhập lý do → không submit được
8. Từ chối có lý do → status về NHAP → redirect về bảng lương
9. Duyệt & Chốt → confirm dialog → DA_CHOT
10. Sau DA_CHOT: timeline 3 node xanh hết, hiện button Xuất phiếu
11. GIAMDOC approve khi bảng đang CHO_DUYET (chưa qua KETOAN) → lỗi

UI-09: Payslip Page

Files:
  pages/payslip/PayslipPage.jsx
  components/payslip/PayslipView.jsx   → view online
  components/payslip/PayslipPDF.jsx    → template cho Puppeteer
  services/payslipService.js

VIEW ONLINE (theo wireframes.md màn hình 5):
  Header: logo công ty + "PHIẾU LƯƠNG" + tháng
  NV info: Avatar + tên + mã + bộ phận + ngày công
  Bảng Thu nhập (trái) | Bảng Khấu trừ (phải)
  Box NET: nền xanh, số tiền lớn + số bằng chữ
  Footer: ngày chốt + ngân hàng + button Tải PDF + In

QUYỀN XEM:
  NHANVIEN: chỉ xem /payslip/me/:period (redirect nếu sai id)
  KETOAN/ADMIN/GIAMDOC: xem bất kỳ NV
  Tất cả: chỉ xem khi status DA_CHOT

TRANG DANH SÁCH PHIẾU (cho KETOAN):
  /payslip/:period → list 50 NV + button tải từng người + tải tất cả (batch)

IN PHIẾU:
  Button "In": window.print() với CSS @media print ẩn sidebar
  Button "Tải PDF": gọi GET /api/payslip/:id/:period → download file



Mock test UI-09:

1. Xem phiếu khi DA_CHOT → hiện đúng layout
2. Xem phiếu khi chưa DA_CHOT → thông báo "Lương chưa được chốt"
3. NHANVIEN truy cập /payslip/EC-NVTHUONG/2026-05 (không phải mình) → 403
4. NHANVIEN truy cập phiếu của mình → hiện đúng
5. Số tiền format đúng: "46.990.470 đ"
6. Số bằng chữ đúng: "Bốn mươi sáu triệu..."
7. Button Tải PDF → file download đúng tên PhieuLuong_..._T5_2026.pdf
8. Nội dung PDF khớp với view online
9. Button In → CSS print ẩn sidebar, chỉ in phiếu
10. KETOAN vào /payslip/2026-05 → danh sách 50 NV + batch download


INTEGRATION TEST — Full System End-to-End

Chạy kịch bản test đầy đủ theo từng role. 
Báo pass/fail + screenshot (hoặc mô tả) từng bước.
Fix hết trước khi báo done.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KỊCH BẢN A — Luồng chính (Happy Path)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ADMIN]
A1. Login admin@abc.vn → Dashboard hiện đúng stats
A2. Vào Nhân viên → Thêm NV mới: "Trần Văn Test", EC-TVTEST, lương 8tr, nhà hàng
A3. Vào Mapping → Gán mã máy 00888 → EC-TVTEST → thành công

[KETOAN]
A4. Login ketoan@abc.vn → Dashboard hiện task "Import chấm công"
A5. Vào Import chấm công → Upload file Excel thật → Bước 3 hiện preview
A6. Xử lý row thiếu Ra (nhập giờ thủ công) → row chuyển xanh
A7. Xác nhận import → Bước 4 "Import thành công"
A8. Vào Bảng lương → Generate tháng 5/2026 → hiện 50 NV
A9. Sửa Thưởng NV EC-NVTHUONG = 17.120.000 → NET cập nhật đúng
A10. Sửa Thuế NV EC-CMHIEU, nhập lý do "Điều chỉnh theo quyết định" → row vàng
A11. Submit phê duyệt → status CHO_DUYET

[KETOAN TRƯỞNG — hoặc KETOAN approve cấp 1]
A12. Login ktruong@abc.vn → Phê duyệt → Duyệt cấp 1 → KETOAN_DUYET
A13. Timeline hiện 2 node xanh

[GIAMDOC]
A14. Login giamdoc@abc.vn → Dashboard hiện task "Bảng lương chờ duyệt"
A15. Vào Phê duyệt → xem tóm tắt: NET đúng, thấy cảnh báo override thuế EC-CMHIEU
A16. Duyệt & Chốt → DA_CHOT → banner xanh
A17. Timeline 3 node xanh hết

[KETOAN]
A18. Login lại → Vào Phiếu lương → tải PDF batch 50 NV → file download
A19. Xem online phiếu EC-NVTHUONG → đúng số liệu

[NHANVIEN]
A20. Login nhanvien@abc.vn → Sidebar chỉ hiện Dashboard + Phiếu lương
A21. Vào Phiếu lương của mình → hiện đúng NET
A22. Tải PDF → download thành công
A23. Truy cập /payroll/2026-05 → 403

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KỊCH BẢN B — Luồng từ chối (Rejection Path)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

B1. KETOAN submit bảng lương → CHO_DUYET
B2. GIAMDOC vào Phê duyệt → Từ chối, nhập lý do "Sai thưởng doanh thu"
B3. Status về NHAP, KETOAN nhận notification
B4. KETOAN sửa thưởng → Submit lại → CHO_DUYET
B5. Timeline hiện: Tạo → Submit → Từ chối (lý do) → Submit lại

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KỊCH BẢN C — Bảo mật & Phân quyền
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

C1. NHANVIEN truy cập /employees → 403 page
C2. NHANVIEN truy cập /mapping → 403 page
C3. NHANVIEN truy cập /payslip/EC-NVTHUONG/2026-05 (NV khác) → 403
C4. QUANLY truy cập /payroll/2026-05 → chỉ xem, không thấy button sửa
C5. Gọi API PUT /api/payroll/detail với role NHANVIEN → 403
C6. Bảng lương DA_CHOT: KETOAN cố sửa → 403
C7. Token hết hạn → mọi API call → redirect /login
C8. Xoá token localStorage → reload → redirect /login

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KỊCH BẢN D — Edge Cases
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

D1. Import file Excel sai format (không phải file chấm công) → lỗi rõ ràng
D2. Import file có mã NV chưa map → blocked, hiện đúng row đỏ
D3. Generate bảng lương khi chưa import chấm công → thông báo "Chưa có dữ liệu"
D4. Sửa thuế không nhập lý do → form không submit
D5. Từ chối không nhập lý do → modal không đóng
D6. GIAMDOC approve bỏ qua bước KETOAN → API trả lỗi, UI hiện thông báo
D7. Số tiền âm trong form → validation error
D8. Thêm NV trùng mã EC → lỗi "Mã NV đã tồn tại"
D9. Mapping 1 mã máy cho 2 NV khác nhau → lỗi unique constraint
D10. Import cùng period 2 lần → confirm dialog "Ghi đè?" → overwrite đúng

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KỊCH BẢN E — Performance & UX
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

E1. Bảng lương 50 NV load < 2 giây
E2. Search NV: debounce 300ms, không spam API
E3. Mọi action async đều có loading state (spinner/skeleton)
E4. Mọi lỗi API đều hiện thông báo rõ ràng (không trang trắng)
E5. Sidebar collapse ở viewport 768px → menu hiện icon only
E6. Phiếu lương: in ra đúng layout, không bị cắt
E7. PDF batch 50 NV: có progress bar, không timeout
E8. Format tiền VND nhất quán toàn app: "12.396.137 đ"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KẾT QUẢ MONG ĐỢI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Kịch bản A: 23/23 bước pass
Kịch bản B: 5/5 bước pass
Kịch bản C: 8/8 bước pass
Kịch bản D: 10/10 bước pass
Kịch bản E: 8/8 bước pass

Tổng: 54/54 test cases pass → ✅ READY FOR DEPLOY