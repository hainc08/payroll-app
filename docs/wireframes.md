# Wireframes — Hệ thống Chấm công & Tính lương
**Version:** 1.0 | **Cập nhật:** 12/05/2026  
**Tổng số màn hình:** 7 màn hình chính + App Shell

---

## Quy ước chung

### Màu sắc trạng thái
| Màu | Ý nghĩa | Dùng cho |
|---|---|---|
| 🟢 Xanh lá | Hợp lệ / Thành công / Đã duyệt | Bản ghi OK, trạng thái chốt |
| 🟡 Vàng | Cảnh báo / Chờ xử lý / Override | Thiếu giờ ra, thuế sửa tay |
| 🔴 Đỏ | Lỗi / Chưa map / Cần xử lý | Mã NV chưa mapping, lỗi import |
| 🔵 Xanh dương | Thông tin / Đang chọn / Chờ duyệt | Item đang active, trạng thái chờ |

### Phân quyền xem màn hình
| Màn hình | ADMIN | GIAMDOC | KETOAN | QUANLY | NHANVIEN |
|---|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Quản lý nhân viên | ✅ | 👁 | ✅ | 👁 bộ phận | ❌ |
| Mapping mã NV | ✅ | ❌ | ✅ | ❌ | ❌ |
| Import chấm công | ✅ | ❌ | ✅ | ❌ | ❌ |
| Bảng lương | ✅ | ✅ | ✅ | 👁 bộ phận | ❌ |
| Phê duyệt | ✅ | ✅ | ✅ | ❌ | ❌ |
| Phiếu lương | ✅ | ✅ | ✅ | ❌ | ✅ (của mình) |

> 👁 = chỉ xem, không sửa

---

## APP SHELL — Layout tổng thể

### Mô tả
Khung chứa toàn bộ ứng dụng, gồm sidebar navigation và content area. Hiển thị trên mọi màn hình sau khi đăng nhập.

### Layout
```
┌─────────────────────────────────────────────────────┐
│  SIDEBAR (200px cố định)  │  CONTENT AREA (co giãn) │
│                           │                         │
│  ⏱ PayRoll VN             │  [Top bar]              │
│  Nhà hàng ABC             │  Tiêu đề · Breadcrumb   │
│  ─────────────────        │  [Action buttons]       │
│  📊 Dashboard  ←active    │                         │
│  👥 Nhân viên             │                         │
│  🕐 Chấm công             │  [Page content]         │
│  💰 Bảng lương            │                         │
│  ✅ Phê duyệt  [badge: 2] │                         │
│  📄 Phiếu lương           │                         │
│  📊 Báo cáo               │                         │
│  ⚙  Cấu hình             │                         │
│  ─────────────────        │                         │
│  [Avatar] Kế toán         │                         │
│           user@abc.vn     │                         │
└─────────────────────────────────────────────────────┘
```

### Chi tiết components
**Sidebar:**
- Logo + tên công ty (lấy từ system config)
- Nav item active: highlight xanh dương, border-left 2px
- Badge đỏ trên "Phê duyệt": số bảng lương đang chờ
- User card dưới cùng: avatar initials + tên role + email

**Top bar:**
- Breadcrumb: `Chấm công > Import`
- Tiêu đề trang + subtitle (tháng đang xử lý)
- Bell icon: notification count
- Action buttons: tùy từng trang

---

## MÀN HÌNH 1 — Dashboard

### URL: `/dashboard`
### Role: Tất cả (nội dung khác nhau theo role)

### Layout
```
┌─────────────────────────────────────────────────────┐
│  [KPI Card 1] [KPI Card 2] [KPI Card 3] [KPI Card 4]│
│  Tổng NV      Quỹ lương    Trạng thái   CC lỗi      │
├──────────────────────────┬──────────────────────────┤
│  Hoạt động gần đây       │  Việc cần làm            │
│  ─ Upload CC T5 10' trước│  ● 4 bản ghi thiếu Ra    │
│  ─ Sửa lương NV00162     │  ● Bảng lương chờ GĐ     │
│  ─ Kế toán chốt BL       │  ● Xuất phiếu (chờ duyệt)│
└──────────────────────────┴──────────────────────────┘
```

### KPI Cards (4 cards)
| Card | Hiển thị | Màu cảnh báo |
|---|---|---|
| Tổng nhân viên | Số NV + delta vs tháng trước | Xanh lá khi tăng |
| Quỹ lương NET | Tổng tiền + % so tháng trước | Đỏ khi tăng > 10% |
| Trạng thái lương | Badge trạng thái kỳ hiện tại | Vàng = chờ duyệt |
| Chấm công lỗi | Số bản ghi cần xác nhận | Đỏ khi > 0 |

### "Việc cần làm" — logic hiển thị
- Item đỏ: cần xử lý ngay (blocking)
- Item vàng: đang chờ người khác
- Item xám + disabled: chưa đến lượt (ví dụ: xuất phiếu khi chưa duyệt)

---

## MÀN HÌNH 2 — Import Chấm công

### URL: `/attendance/import`
### Role: ADMIN, KETOAN

### Stepper 4 bước
```
[✓ Upload file] ──── [✓ Parse & validate] ──── [● Review] ──── [ Lưu DB]
```
- Bước 1–2 tự động sau khi chọn file
- Bước 3: người dùng review và xử lý lỗi
- Bước 4: confirm → lưu

### Layout bước 3 (Review)
```
┌─────────────────────────────────────────────────────┐
│  [Tháng selector]              [Xác nhận import]    │
│  [Step indicator: ✓ ✓ ● ○]                         │
│  ⚠ 4 bản ghi cần xử lý: 3 thiếu Ra · 1 chưa map   │
├──────────────────────────────────────────────────────┤
│  [50] NV  [842] Bản ghi  [838] Hợp lệ [3]⚠ [1]✕   │
├──────────────────────────────────────────────────────┤
│  Filter: [Tất cả ▼] [Tìm kiếm...]                  │
│  ┌────────────────────────────────────────────────┐ │
│  │ Mã máy │ Tên NV  │ Ngày │ Vào1 │ Ra1 │ Status │ │
│  │ 00002  │ P.T.N.B │ 02/5 │ 9:37 │21:28│ ✓ OK   │ │
│  │ 00043  │ T.V.Don │ 02/5 │19:57 │  — │ ⚠ Thiếu│ │
│  │ 00999  │ Unknown │ 03/5 │ 8:00 │17:00│ ✕ Map  │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Xử lý bản ghi lỗi
- **Thiếu giờ Ra:** inline edit — click vào ô trống → input giờ → save
- **Chưa mapping:** redirect sang màn hình Mapping hoặc inline dropdown gán
- **Bất thường (>16h):** cảnh báo màu vàng, không block import

### Validation rules
```
Mã NV không trong bảng mapping         → ✕ BLOCK
Thiếu giờ Ra (chỉ có Vào)              → ⚠ WARN, tính 0 giờ
Tổng giờ > 16h/ngày                    → ⚠ WARN, cho qua
Tổng giờ < 0                           → ✕ BLOCK
Ngày ngoài khoảng kỳ lương đã chọn    → ⚠ WARN
```

---

## MÀN HÌNH 3 — Bảng lương

### URL: `/payroll/:period`
### Role: ADMIN, KETOAN (edit) | GIAMDOC, QUANLY (view)

### Layout
```
┌─────────────────────────────────────────────────────┐
│  Bảng lương T5/2026  [badge trạng thái]             │
│  Tạo: 10/05 · 50 NV         [Xuất Excel] [Submit]  │
├──────────────────────────────────────────────────────┤
│  [Bộ phận ▼] [Tìm NV...]    Tổng NET: 382.540.000đ │
├──────────────────────────────────────────────────────┤
│  Bảng 23 cột (scroll ngang)                         │
│  Mã NV │ Tên │ ... │ Gross │ BHXH │ Thuế │ NET  │✏ │
│  ──────┼─────┼─────┼───────┼──────┼──────┼──────┤──│
│  (row highlight vàng = có override thuế)            │
│  Footer: Tổng cộng 50 NV                           │
├──────────────────────────────────────────────────────┤
│  Chú thích: 🟡 Thuế đã sửa tay  ✏ = xem chi tiết  │
└──────────────────────────────────────────────────────┘
```

### 23 cột bảng lương (thứ tự)
```
1.  STT
2.  Mã NV
3.  Tên NV
4.  Bộ phận
5.  Hình thức LĐ (TNC/TH)
6.  Giờ/ngày chuẩn
7.  Lương thoả thuận HĐ
8.  Ngày công (từ CC)
9.  Tăng ca / OT (giờ)
10. Tiền lương theo công      [auto]
11. Lương thêm giờ (OT pay)  [auto]
12. Lương trách nhiệm         [DB]
13. Trợ cấp điện thoại        [DB]
14. Trợ cấp xăng xe/khác      [DB]
15. Trợ cấp công việc         [DB]
16. Thưởng doanh thu          [manual/tháng]
17. Tổng thu nhập             [auto = Σ 10-16]
18. BHXH 10.5%                [auto]
19. Tạm ứng                   [manual]
20. Thuế TNCN                 [auto + adjustable]
21. Các khoản giảm trừ khác   [manual]
22. Tổng giảm trừ             [auto = Σ 18-21]
23. Lương thực lĩnh (NET)     [auto = 17 - 22]
```

### Edit inline một dòng
- Click icon ✏ → mở side drawer hoặc expand row
- Các ô editable: cột 16 (thưởng), 19 (tạm ứng), 20 (thuế override), 21 (giảm trừ khác)
- Khi sửa cột 20: bắt buộc nhập lý do → ghi audit log
- Ô đã override highlight vàng + icon ✏ màu cam

### Trạng thái bảng lương & quyền sửa
| Trạng thái | KETOAN edit | GIAMDOC edit | Màu badge |
|---|:---:|:---:|---|
| NHAP | ✅ | ❌ | Xám |
| CHO_DUYET | ❌ | ❌ | Vàng |
| KETOAN_DUYET | ❌ | ❌ | Xanh nhạt |
| GIAMDOC_DUYET | ❌ | ❌ | Xanh lá |
| DA_CHOT | ❌ | ❌ | Xanh đậm 🔒 |

---

## MÀN HÌNH 4 — Phê duyệt

### URL: `/payroll/:period/approve`
### Role: KETOAN (submit), GIAMDOC (approve cuối)

### Layout — View của Giám đốc
```
┌─────────────────────────────────────────────────────┐
│  Phê duyệt — Tháng 5/2026        [Từ chối] [Duyệt] │
├──────────────────┬──────────────────────────────────┤
│  Tóm tắt kỳ lương│  Timeline phê duyệt             │
│  ─────────────── │  ─────────────────────────────── │
│  Tổng NV: 50     │  ✓ Kế toán tạo BL    10/05 8:30 │
│  Gross: 436.5tr  │  ✓ KT trưởng duyệt  11/05 9:15  │
│  BHXH+Thuế:-54tr │  ? Chờ GĐ duyệt     (đang xử lý)│
│  NET: 382.5tr    │                                  │
│  vs T4: ▼ 2.1%   │  ⚠ 1 dòng thuế sửa tay: CMHIEU │
└──────────────────┴──────────────────────────────────┘
```

### Dialog từ chối
- Textarea bắt buộc: "Lý do từ chối..."
- Bảng lương trả về trạng thái NHAP
- Kế toán nhận notification

### Dialog duyệt
- Confirm: "Xác nhận duyệt và chốt bảng lương tháng 5/2026?"
- Sau duyệt: status → DA_CHOT, khoá hoàn toàn
- Trigger: nhân viên có thể xem phiếu lương

---

## MÀN HÌNH 5 — Phiếu lương

### URL: `/payslip/:employeeId/:period`
### Role: Tất cả (nhân viên chỉ xem của mình)

### Layout phiếu (A4, 2 cột)
```
┌─────────────────────────────────────────────────────┐
│          PHIẾU LƯƠNG — THÁNG 5/2026                 │
│              Nhà hàng ABC                           │
├──────────────────────────────────────────────────────┤
│  [Avatar NVT]  Nguyễn Văn Thương                    │
│                EC-NVTHUONG · Nhà hàng · TNC         │
│                Ngày công: 27.5 / 26                 │
├──────────────────────┬──────────────────────────────┤
│  THU NHẬP            │  KHẤU TRỪ                   │
│  ──────────────────  │  ──────────────────────────  │
│  Lương theo công     │  BHXH (10.5%)               │
│  21.153.846          │  -1.112.213                  │
│  PC trách nhiệm      │  Thuế TNCN                  │
│  10.150.000          │  -821.163                    │
│  PC điện thoại       │  Tạm ứng                    │
│  500.000             │  —                           │
│  Thưởng DT           │                              │
│  17.120.000          │                              │
│  ──────────────────  │  ──────────────────────────  │
│  Tổng: 48.923.846    │  Tổng: -1.933.376            │
├──────────────────────┴──────────────────────────────┤
│  💰 LƯƠNG THỰC LĨNH:          46.990.470 đ         │
│  Bằng chữ: Bốn mươi sáu triệu chín trăm...        │
│  Chuyển khoản: ACB ···4521                         │
├──────────────────────────────────────────────────────┤
│  Chốt ngày: 12/05/2026    [Tải PDF]  [In]          │
│  Nhân viên ký xác nhận: ____________               │
└──────────────────────────────────────────────────────┘
```

### Xuất PDF
- Dùng Puppeteer render HTML → PDF
- Tên file: `PhieuLuong_ECNVTHUONG_T5_2026.pdf`
- Batch export: 1 file PDF nhiều trang (50 trang)

---

## MÀN HÌNH 6 — Mapping mã NV

### URL: `/settings/employee-mapping`
### Role: ADMIN, KETOAN

### Layout
```
┌─────────────────────────────────────────────────────┐
│  Mapping mã nhân viên    [49 đã map] [1 chưa map]  │
│                          [Import Excel] [Xuất DS]   │
├──────────────────────────────────────────────────────┤
│  ℹ Chọn mã máy CC → gán NV hệ thống. Làm 1 lần.   │
├──────────────────────────────────────────────────────┤
│  [Tìm...] [Tất cả(50) | Đã map(49) | Chưa map(1)]  │
├─────────────────────┬──┬──────────────────────────── │
│  MÃ MÁY CHẤM CÔNG  │↔ │  NHÂN VIÊN HỆ THỐNG        │
├─────────────────────┼──┼────────────────────────────┤
│  ● 00002            │↔ │  [Avatar] P.T.Ngọc Bích    │
│  Pham Thi Ngoc Bich │  │  EC-PTNBICH · Văn phòng  ✏│
├─────────────────────┼──┼────────────────────────────┤
│  ● 00015            │↔ │  [Avatar] Nguyễn Thế Thái  │
│  Nguyen The Thai    │  │  EC-NTHAI · Nhà hàng      ✏│
├─────────────────────┼──┼────────────────────────────┤
│🔴 00999 [Chưa map]  │? │  [-- Chọn NV để gán --▼] [Gán]│
│  Unknown            │  │                            │
├─────────────────────┼──┼────────────────────────────┤
│  · · · 46 tiếp · · ·   · · ·                       │
├──────────────────────────────────────────────────────┤
│  🕐 Lịch sử: 00043→EC-TVDON ketoan@abc · 08/05    │
└──────────────────────────────────────────────────────┘
```

### Import mapping từ Excel
- Format cột: `Mã máy CC` | `Mã lương`
- Preview trước khi lưu
- Conflict (mã đã map khác): hỏi xác nhận override

### Audit log mapping
Mỗi thay đổi ghi: `user_id | timeclock_code | old_employee_id | new_employee_id | timestamp`

---

## MÀN HÌNH 7 — Quản lý nhân viên

### URL: `/employees` và `/employees/:id`
### Role: ADMIN, KETOAN (full) | GIAMDOC, QUANLY (view only)

### Layout: List + Detail Panel (master-detail)
```
┌────────────────────────────────────────────────────────┐
│  Quản lý nhân viên (50)     [Import Excel] [+ Thêm]   │
├──────────────────┬─────────────────────────────────────┤
│  DANH SÁCH (340px)│  CHI TIẾT NHÂN VIÊN               │
│  ─────────────── │  ──────────────────────────────── │
│  [Tìm kiếm...]  │  [Avatar NVT] Nguyễn Văn Thương   │
│  [BP▼] [Trạng▼] │  EC-NVTHUONG  [Đang làm] [TNC]    │
│  ─────────────── │  [Chỉnh sửa]        [Vô hiệu hoá] │
│  ▶ NVT 20tr TNC  │  ─────────────────────────────── │
│    NTN 20tr TNC  │  [Hồ sơ][Lương][Lịch sử][CC]     │
│    CMH  9tr TH   │  ─────────────────────────────── │
│    PQP 10tr TNC  │  Tab: HỒ SƠ + LƯƠNG (2 cột)      │
│    QTT  9tr TNC  │                                   │
│    · · · 45 · ·  │                                   │
└──────────────────┴─────────────────────────────────────┘
```

### Tab "Hồ sơ" — thông tin cá nhân
```
Bộ phận          │ Nhà hàng
Chức vụ          │ Quản lý
Hình thức LĐ     │ Toàn thời gian (TNC)
Ngày vào làm     │ 01/03/2022
CCCD             │ 079 ··· 4521  [Hiện]
Ngân hàng        │ ACB
Số tài khoản     │ ··· 4521      [Hiện]
Người phụ thuộc  │ 2 người (giảm trừ 8.8tr/tháng)
Mã máy CC        │ 00002 ✓ (linked)
```

### Tab "Thông tin lương"
```
Lương HĐ (gross)     │ 20.000.000 đ
Giờ chuẩn/ngày       │ 9 giờ
Ngày công chuẩn      │ 26 ngày/tháng
────────────────────────────────────
PC trách nhiệm       │ 10.150.000 đ
Trợ cấp điện thoại   │ 500.000 đ
Trợ cấp xăng xe      │ —
Thưởng DT (default)  │ 17.120.000 đ
────────────────────────────────────
[Box] Ước tính tháng đủ công:
  Gross: 48.923.846
  BHXH + Thuế: -1.933.376
  NET: 46.990.470 đ
```

### Tab "Lịch sử lương"
```
01/03/2024 │ Tăng lương     │ 18tr → 20tr đ
01/01/2023 │ Điều chỉnh PC  │ PC 8tr → 10.15tr đ
15/06/2022 │ Hết thử việc   │ 16tr → 18tr đ
```

### Tab "Chấm công"
- Mini calendar grid 3 tháng gần nhất
- Màu ô: xanh = đủ công, vàng = thiếu, đỏ = vắng, xám = nghỉ lễ
- Click ô → xem chi tiết vào/ra ngày đó

### Form thêm/sửa nhân viên
Dạng modal hoặc full page, chia 3 section:
1. **Thông tin cơ bản:** Họ tên, bộ phận, chức vụ, hình thức LĐ, ngày vào
2. **Thông tin định danh:** CCCD, ngân hàng, số TK, người phụ thuộc, mã máy CC
3. **Thông tin lương:** Lương HĐ, giờ chuẩn, ngày chuẩn, từng loại phụ cấp

---

## Các màn hình phụ (Phase 2+)

### Cấu hình hệ thống — `/settings`
- Ngày công chuẩn theo tháng
- Danh sách ngày lễ (năm hiện tại)
- Hệ số OT: ngày thường (1.5x) / cuối tuần (2.0x) / lễ (3.0x)
- Biểu thuế TNCN 7 bậc (edit được)
- Mức BHXH (NV 10.5% / Công ty 21.5%)
- Upload logo công ty

### Báo cáo — `/reports`
- Tổng quỹ lương 12 tháng (line chart)
- Chi phí theo bộ phận (bar chart)
- Bảng BHXH hàng tháng (xuất Excel)

### Đăng nhập — `/login`
- Email + password
- JWT lưu trong httpOnly cookie hoặc localStorage
- Redirect về dashboard sau login
- Trang 403 nếu truy cập route không có quyền

---

## Ghi chú cho dev

### Responsive
- Desktop first (min-width: 1280px cho bảng lương 23 cột)
- Tablet (768px+): sidebar collapse thành icon
- Mobile: chỉ cần màn hình xem phiếu lương cho nhân viên

### Ant Design components mapping
| Màn hình | Components chính |
|---|---|
| App Shell | `Layout`, `Menu`, `Badge` |
| Dashboard | `Card`, `Statistic`, `Timeline` |
| Import CC | `Steps`, `Upload`, `Table`, `Alert` |
| Bảng lương | `Table` (editable), `Tag`, `Drawer` |
| Phê duyệt | `Descriptions`, `Timeline`, `Modal` |
| Phiếu lương | Custom HTML + Puppeteer PDF |
| Mapping | `Table`, `Select`, `Tag` |
| NV Detail | `Tabs`, `Descriptions`, `Form` |

### State management
- Global: React Context hoặc Zustand (user info, permissions)
- Server state: React Query (auto refetch, cache)
- Form state: Ant Design Form (built-in)