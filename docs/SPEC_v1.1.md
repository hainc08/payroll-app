# 📋 PRODUCT SPEC — Hệ thống Chấm công & Tính lương
**Version:** 1.1 — Đã cập nhật theo feedback  
**Ngày:** 12/05/2026  
**Đối tượng:** Nhà hàng / Dịch vụ (~50 nhân viên)

> **Thay đổi so với v1.0:**
> - Stack kỹ thuật: PostgreSQL → **MariaDB**, Hosting → **Matbao Flesk**
> - Bổ sung module **Mapping mã NV** (xử lý mã máy chấm công ≠ mã lương)
> - Ca làm việc: xác nhận chế độ **linh hoạt**, bổ sung logic tính OT phù hợp
> - Thuế TNCN: **tự động tính theo luật**, kế toán có thể điều chỉnh
> - Quy mô: cố định **~50 nhân viên**, tinh chỉnh performance target
> - Đóng các câu hỏi đã có đáp án, giữ lại câu hỏi còn mở

---

## 1. BỐI CẢNH & MỤC TIÊU

### 1.1 Vấn đề hiện tại
- File chấm công xuất từ máy (ZKTeco/Ronald Jack) theo dạng Excel:
  `Ngày | Thứ | Mã NV | Tên NV | Bộ phận | Chức vụ | Vào1 | Ra1 | Vào2 | Ra2 | Vào3 | Ra3 | Tổng giờ`
- Nhân viên làm ca **linh hoạt**, có thể có 2–3 lượt vào/ra trong một ngày
- **Mã NV trong máy chấm công** (dạng số: `00002`, `00015`) **không khớp** với mã lương (dạng chữ: `EC-NVTHUONG`) → hiện đang map tay
- Bảng lương tính thủ công trên Excel, dễ sai sót, tốn thời gian (~50 nhân viên)
- Không có quy trình phê duyệt chuẩn hoá, không có phiếu lương tự động

### 1.2 Mục tiêu
- Tự động hoá hoàn toàn luồng: **Import chấm công → Map mã NV → Tính lương → Phê duyệt → Xuất phiếu**
- Giảm 80% thời gian xử lý lương hàng tháng
- Hệ thống phân quyền rõ ràng theo vai trò

---

## 2. NGƯỜI DÙNG & PHÂN QUYỀN

### 2.1 Các role

| Role | Mô tả | Quyền chính |
|---|---|---|
| **Admin** | IT / quản trị hệ thống | Toàn quyền, quản lý user, cấu hình hệ thống |
| **Giám đốc** | Phê duyệt cuối cùng | Xem tất cả, phê duyệt lương, ký số |
| **Kế toán** | Xử lý lương chính | Import chấm công, tính lương, submit phê duyệt, xuất phiếu |
| **Quản lý** | Trưởng bộ phận / nhà hàng | Xem lương nhân viên bộ phận mình, xác nhận chấm công |
| **Nhân viên** | Người lao động | Xem phiếu lương cá nhân, tra cứu chấm công của mình |

### 2.2 Ma trận quyền chi tiết

| Chức năng | Admin | Giám đốc | Kế toán | Quản lý | Nhân viên |
|---|:---:|:---:|:---:|:---:|:---:|
| Quản lý user | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cấu hình hệ thống | ✅ | ❌ | ❌ | ❌ | ❌ |
| Quản lý mapping mã NV | ✅ | ❌ | ✅ | ❌ | ❌ |
| Import chấm công | ✅ | ❌ | ✅ | ❌ | ❌ |
| Xem chấm công toàn công ty | ✅ | ✅ | ✅ | ❌ | ❌ |
| Xem chấm công bộ phận | ✅ | ✅ | ✅ | ✅ (bộ phận mình) | ❌ |
| Xem chấm công cá nhân | ✅ | ✅ | ✅ | ✅ | ✅ (của mình) |
| Tạo / tính bảng lương | ✅ | ❌ | ✅ | ❌ | ❌ |
| Edit lương cá nhân | ✅ | ❌ | ✅ | ❌ | ❌ |
| Điều chỉnh thuế TNCN | ✅ | ❌ | ✅ | ❌ | ❌ |
| Submit phê duyệt | ✅ | ❌ | ✅ | ❌ | ❌ |
| Phê duyệt cấp 1 (Kế toán) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Phê duyệt cấp 2 (GĐ) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Xem bảng lương toàn bộ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Xem lương bộ phận | ✅ | ✅ | ✅ | ✅ (bộ phận mình) | ❌ |
| Xem phiếu lương cá nhân | ✅ | ✅ | ✅ | ✅ | ✅ (của mình) |
| Xuất Excel / PDF bảng lương | ✅ | ✅ | ✅ | ❌ | ❌ |
| Xuất phiếu lương | ✅ | ✅ | ✅ | ❌ | ✅ (của mình) |
| Quản lý nhân viên | ✅ | ❌ | ✅ | 👁️ xem | ❌ |

---

## 3. CÁC MODULE CHỨC NĂNG

---

### MODULE 0 — MAPPING MÃ NHÂN VIÊN ⭐ MỚI

**Vấn đề cốt lõi:**
Máy chấm công lưu mã dạng số (`00002`, `00015`, `00026`...) trong khi hệ thống lương dùng mã dạng chữ (`EC-NVTHUONG`, `EC-NINGAN`...). Hai hệ thống này cần được kết nối trước khi có thể tính lương tự động.

**Giải pháp: Bảng Mapping trung gian**

```
[Bảng employees]          [Bảng employee_id_mapping]     [Dữ liệu chấm công]
employee_id (EC-NVTHUONG) ←→ payroll_code / timeclock_code ←→ mã máy (00002)
```

**Cơ chế mapping:**

**Bước 1 — Import lần đầu (One-time setup):**
- Kế toán / Admin vào màn hình "Quản lý Mapping Mã NV"
- Upload file Excel mapping (nếu đã có) HOẶC map tay từng người
- Giao diện: 2 cột — bên trái danh sách mã máy chấm công, bên phải dropdown chọn nhân viên trong hệ thống
- Sau khi map, hệ thống lưu cặp `(timeclock_code → employee_id)`

**Bước 2 — Xử lý khi import chấm công:**
- Nếu mã máy đã có trong bảng mapping → tự động ghép vào đúng nhân viên
- Nếu mã máy **chưa có mapping** → highlight màu đỏ, yêu cầu kế toán map trước khi import
- Nếu mã máy không khớp bất kỳ nhân viên nào → flag "Mã không tồn tại trong hệ thống"

**Bước 3 — Duy trì mapping:**
- Khi thêm nhân viên mới → Admin/Kế toán nhập luôn mã máy chấm công tương ứng
- Khi đổi máy chấm công (mã có thể thay đổi) → cập nhật mapping mà không mất lịch sử

**Màn hình quản lý mapping:**

| Mã máy CC | Tên trên máy CC | Mã NV hệ thống | Tên NV hệ thống | Trạng thái |
|---|---|---|---|---|
| 00002 | Pham Thi Ngoc Bich | EC-PTNBICH | Phạm Thị Ngọc Bích | ✅ Đã map |
| 00015 | Nguyen The Thai | EC-NTHAI | Nguyễn Thế Thái | ✅ Đã map |
| 00999 | Unknown | — | — | ❌ Chưa map |

**Schema DB:**
```sql
CREATE TABLE employee_id_mapping (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  timeclock_code VARCHAR(20) NOT NULL UNIQUE,  -- mã máy: "00002"
  employee_id    VARCHAR(20) NOT NULL,          -- mã lương: "EC-NVTHUONG"
  mapped_by      INT,                           -- user_id người tạo mapping
  mapped_at      DATETIME DEFAULT NOW(),
  is_active      BOOLEAN DEFAULT TRUE,
  note           VARCHAR(255),
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);
```

---

### MODULE 1 — QUẢN LÝ NHÂN VIÊN

**Thông tin nhân viên:**
- Mã NV hệ thống lương (e.g. `EC-NVTHUONG`)
- Mã máy chấm công (e.g. `00002`) — liên kết với bảng mapping
- Họ tên đầy đủ
- Bộ phận / Phòng ban
- Chức vụ / Hình thức lao động (TNC = toàn thời gian, TH = thời vụ...)
- Số giờ chuẩn / ngày (8h hoặc 9h theo hợp đồng)
- Ngày vào làm, ngày nghỉ việc (nếu có)
- CCCD / Hộ chiếu
- Tài khoản ngân hàng
- Số người phụ thuộc (dùng để tính giảm trừ gia cảnh thuế TNCN)

**Thông tin lương:**
- Lương thoả thuận theo HĐ (lương gross)
- Ngày công chuẩn trong tháng (mặc định: 26 ngày, configurable)
- Phụ cấp trách nhiệm
- Trợ cấp điện thoại
- Trợ cấp xăng xe / đi lại
- Trợ cấp công việc
- Thưởng doanh thu (template mặc định, có thể ghi đè mỗi tháng)

**Chức năng:**
- Danh sách có filter theo bộ phận, trạng thái (đang làm / nghỉ việc)
- Thêm / sửa / vô hiệu hoá nhân viên
- Import danh sách nhân viên từ Excel (kèm mapping mã máy)
- Lịch sử thay đổi lương (audit log theo thời gian)

---

### MODULE 2 — IMPORT & QUẢN LÝ CHẤM CÔNG

**Cấu trúc file chấm công (đã phân tích từ file thực tế):**
```
Sheet name = Tên bộ phận (e.g. "NHÀ HÀNG")
Header row: Ngày | Thứ | Mã NV | Tên NV | [Bộ phận] | Chức vụ | Vào1 | Ra1 | Vào2 | Ra2 | Vào3 | Ra3 | Tổng giờ
Ngày: Excel serial number (46143 = 02/05/2026)
Giờ: HH:MM text (e.g. "08:24", "13:30")
```

**Luồng import:**
1. Kế toán chọn kỳ lương (tháng/năm) → Upload file Excel
2. Hệ thống parse từng sheet:
   - Convert ngày serial → ngày thực
   - Ghép mã máy NV → mã lương (qua bảng mapping)
   - Validate: thiếu giờ ra, bản ghi trùng, tổng giờ bất thường
3. Hiển thị **Preview & báo lỗi** (phân loại: lỗi cần xử lý / cảnh báo có thể bỏ qua)
4. Kế toán xử lý lỗi / xác nhận → Import vào DB

**Quy tắc tính giờ — Ca linh hoạt:**

Vì nhân viên làm ca linh hoạt (không có ca cố định sáng/tối), logic tính như sau:

```
Tổng giờ làm/ngày  = Σ(Ra_i - Vào_i) cho tất cả cặp i trong ngày
Giờ chuẩn/ngày     = Lấy từ hợp đồng NV (8h hoặc 9h)
Giờ OT/ngày        = max(0, Tổng giờ làm - Giờ chuẩn)
Ngày công          = 1 nếu Tổng giờ làm ≥ Giờ chuẩn × 0.5 (làm ít nhất nửa ngày)
                   = 0.5 nếu Giờ chuẩn × 0.25 ≤ Tổng < Giờ chuẩn × 0.5
                   = 0 nếu Tổng giờ < Giờ chuẩn × 0.25 hoặc thiếu giờ ra
```

> ⚙️ Các ngưỡng này đều **configurable** trong Module 7 (Cấu hình hệ thống)

**Xử lý trường hợp đặc biệt:**
- **Chỉ có giờ Vào, không có Ra** → Đánh dấu `⚠️ Cần xác nhận` — kế toán phải xử lý thủ công
- **Chỉ có 1 lần chấm duy nhất** → Tương tự, không tính công
- **Tổng giờ > 16h/ngày** → Cảnh báo bất thường (có thể do quên chấm ra hôm trước)
- **Ngày cuối tuần / lễ** → Gắn flag riêng để áp hệ số OT khác nhau

**Màn hình quản lý chấm công:**
- Bảng grid: hàng = nhân viên, cột = ngày trong tháng
- Màu sắc: xanh lá = đủ công, vàng = thiếu giờ, đỏ = cần xác nhận, xám = nghỉ
- Click vào ô → xem chi tiết vào/ra từng ca trong ngày đó
- Kế toán chỉnh sửa thủ công → bắt buộc nhập lý do (ghi vào audit log)

---

### MODULE 3 — BẢNG LƯƠNG

**Cấu trúc bảng lương (khớp với file mẫu):**

| # | Cột | Nguồn | Ghi chú |
|---|---|---|---|
| 1 | STT | Auto | |
| 2 | Mã NV | DB | Mã lương (EC-...) |
| 3 | Tên NV | DB | |
| 4 | Bộ phận | DB | |
| 5 | Hình thức lao động | DB | TNC / TH |
| 6 | Giờ/ngày chuẩn | DB | 8 hoặc 9 |
| 7 | Lương thoả thuận HĐ | DB | Gross theo hợp đồng |
| 8 | Ngày công | Chấm công | Tính từ module 2 |
| 9 | Tăng ca (giờ OT) | Chấm công | Tính từ module 2 |
| 10 | Tiền lương theo công | Auto | HĐ ÷ Ngày chuẩn × Ngày thực |
| 11 | Lương thêm giờ | Auto | (HĐ ÷ Ngày chuẩn ÷ Giờ/ngày) × OT × hệ số |
| 12 | Lương trách nhiệm | DB | Phụ cấp cố định |
| 13 | Trợ cấp điện thoại | DB | |
| 14 | Trợ cấp xăng xe/khác | DB | |
| 15 | Trợ cấp công việc | DB | |
| 16 | Thưởng doanh thu | Manual | Nhập tay mỗi tháng |
| 17 | Tổng thu nhập | Auto | Σ cột 10→16 |
| 18 | BHXH 10.5% | Auto | Lương HĐ × 10.5% |
| 19 | Tạm ứng | Manual | Nhập tay |
| 20 | Thuế TNCN | Auto + Adjustable | Tự tính, kế toán có thể override |
| 21 | Các khoản giảm trừ khác | Manual | |
| 22 | Tổng giảm trừ | Auto | Σ cột 18→21 |
| 23 | **Lương thực lĩnh** | **Auto** | **Cột 17 − Cột 22** |

**Công thức chi tiết:**
```
Tiền lương theo công  = Lương_HĐ ÷ Ngày_chuẩn × Ngày_công_thực
Lương thêm giờ        = (Lương_HĐ ÷ Ngày_chuẩn ÷ Giờ_chuẩn) × Giờ_OT × Hệ_số_OT
                        Hệ số OT: ngày thường = 1.5x, cuối tuần = 2.0x, ngày lễ = 3.0x
Tổng thu nhập         = Σ(Tiền lương + OT + Phụ cấp + Thưởng)
BHXH NV (10.5%)       = Lương_HĐ × 10.5%  [NV đóng: BHXH 8% + BHYT 1.5% + BHTN 1%]
Thuế TNCN             = Xem mục 3.1 bên dưới
Lương thực lĩnh       = Tổng_thu_nhập − BHXH − Tạm_ứng − Thuế_TNCN − Giảm_trừ_khác
```

**3.1 — Tính thuế TNCN tự động (theo luật hiện hành)**

Áp dụng Thông tư 111/2013/TT-BTC và các sửa đổi:

```
Thu nhập tính thuế = Tổng thu nhập − BHXH − Giảm trừ gia cảnh − Giảm trừ người phụ thuộc

Giảm trừ gia cảnh bản thân: 11.000.000 đ/tháng
Giảm trừ người phụ thuộc:    4.400.000 đ/người/tháng (lấy từ hồ sơ NV)

Biểu thuế luỹ tiến từng phần:
  Bậc 1: Thu nhập tính thuế ≤  5.000.000    → Thuế = 5%
  Bậc 2: 5.000.001  –  10.000.000           → Thuế = 10%
  Bậc 3: 10.000.001 –  18.000.000           → Thuế = 15%
  Bậc 4: 18.000.001 –  32.000.000           → Thuế = 20%
  Bậc 5: 32.000.001 –  52.000.000           → Thuế = 25%
  Bậc 6: 52.000.001 –  80.000.000           → Thuế = 30%
  Bậc 7: > 80.000.000                        → Thuế = 35%
```

**Quy trình tính thuế trong app:**
1. Hệ thống tự tính và điền vào ô "Thuế TNCN"
2. Kế toán có thể **click vào ô để xem chi tiết tính toán** (breakdown từng bước)
3. Kế toán có thể **override thủ công** nếu có trường hợp đặc biệt (ghi log lý do)
4. Khi bảng lương vào trạng thái phê duyệt, các ô đã override sẽ được highlight để GĐ dễ nhận biết

---

### MODULE 4 — QUY TRÌNH PHÊ DUYỆT

**Luồng phê duyệt 2 cấp:**

```
[Kế toán tạo & chỉnh sửa bảng lương]
          ↓
[Submit → Trạng thái: "Chờ Kế toán trưởng duyệt"]
          ↓
[Kế toán trưởng xem xét]
    ↙ Duyệt          ↘ Từ chối (bắt buộc ghi lý do)
[Chờ GĐ duyệt]       [Trả về Nháp → Kế toán sửa lại]
    ↓
[Giám đốc xem tổng quỹ lương, các khoản bất thường]
    ↙ Duyệt          ↘ Từ chối (bắt buộc ghi lý do)
[Đã chốt — Khoá]     [Trả về Kế toán]
    ↓
[Nhân viên xem phiếu / Xuất PDF / Chuyển khoản]
```

**Tính năng phê duyệt:**
- Notification trong app khi có bảng lương cần duyệt
- GĐ xem được: tổng quỹ lương, so sánh với tháng trước, danh sách override thủ công
- Lịch sử đầy đủ: ai duyệt / từ chối, lúc mấy giờ, ghi chú gì
- Không cho chỉnh sửa khi đã ở trạng thái "Chờ GĐ duyệt" trở lên (trừ Admin)

---

### MODULE 5 — PHIẾU LƯƠNG

**Nội dung phiếu:**
- Header: Logo công ty, tên công ty, kỳ lương (Tháng MM/YYYY)
- Thông tin NV: Mã, tên, bộ phận, chức vụ, hình thức lao động
- Bảng thu nhập: lương cơ bản, từng loại phụ cấp, OT, thưởng
- Bảng khấu trừ: BHXH, thuế TNCN (kèm chú thích nếu bị override), tạm ứng, khác
- **Lương thực lĩnh** — in đậm, kèm số tiền bằng chữ
- Thông tin ngân hàng nhận lương
- Footer: Chữ ký xác nhận của nhân viên (dùng khi in ra)

**Xuất phiếu:**
- PDF từng nhân viên (tải về hoặc xem online)
- PDF toàn bộ batch (1 file, 50 trang)
- Nhân viên tự xem phiếu online sau khi GĐ chốt
- Gửi email (Phase 2)

---

### MODULE 6 — BÁO CÁO & THỐNG KÊ

- Tổng quỹ lương theo tháng / năm (biểu đồ xu hướng)
- Chi phí lương theo bộ phận
- So sánh tháng này vs tháng trước (% thay đổi)
- Báo cáo chấm công: tổng ngày công, tổng giờ OT theo bộ phận
- Danh sách nhân viên chưa chấm công đủ
- Báo cáo BHXH hàng tháng
- Xuất Excel tổng hợp theo đúng mẫu bảng lương gốc

---

### MODULE 7 — CẤU HÌNH HỆ THỐNG (Admin)

- Ngày công chuẩn theo tháng (mặc định 26)
- Danh sách ngày lễ trong năm (áp hệ số OT 3x)
- Hệ số OT: ngày thường (1.5x) / cuối tuần (2.0x) / ngày lễ (3.0x)
- Ngưỡng tính ngày công (mặc định ≥ 50% giờ chuẩn = 1 ngày công)
- Mức BHXH hiện hành (NV: 10.5% / Công ty: 21.5%)
- Biểu thuế TNCN (có thể cập nhật khi luật thay đổi)
- Template phiếu lương (logo, màu sắc)
- Quản lý user, phân role

---

## 4. YÊU CẦU KỸ THUẬT

### 4.1 Stack kỹ thuật

| Layer | Lựa chọn | Ghi chú |
|---|---|---|
| Frontend | React + Vite | Component-based, dễ mở rộng |
| UI Library | Ant Design | Table phức tạp, Form, workflow phù hợp nghiệp vụ |
| Backend | Node.js (Express) hoặc Python (FastAPI) | Cả hai đều tốt, tuỳ team dev |
| **Database** | **MariaDB** | ✅ Đã xác nhận — tương thích MySQL hoàn toàn |
| Auth | JWT + Role-based middleware | |
| File parsing | SheetJS (xlsx) | Parse Excel chấm công phía frontend |
| PDF export | Puppeteer hoặc pdfmake | Puppeteer render đẹp hơn, pdfmake nhẹ hơn |
| **Hosting** | **Matbao Flesk** | ✅ Đã xác nhận |

### 4.2 Lưu ý kỹ thuật cho MariaDB

```sql
-- Các kiểu dữ liệu quan trọng
salary          DECIMAL(15,2)   -- không dùng FLOAT cho tiền tệ
work_date       DATE            -- lưu ngày thuần (đã convert từ Excel serial)
checkin_time    TIME            -- lưu giờ vào/ra
hours_worked    DECIMAL(5,2)    -- tổng giờ làm (e.g. 11.83)
tax_amount      DECIMAL(15,2)   -- thuế TNCN
is_tax_override BOOLEAN         -- kế toán có override thuế không
override_reason TEXT            -- lý do override (bắt buộc nếu is_tax_override = TRUE)

-- Collation cho tiếng Việt
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
```

### 4.3 Lưu ý về Matbao Flesk

- Kiểm tra phiên bản MariaDB được hỗ trợ (thường ≥ 10.4)
- Cấu hình SSL/TLS cho kết nối DB
- Cần cấu hình reverse proxy (Nginx) để route traffic
- Backup: bật tính năng backup tự động của Flesk nếu có, hoặc tự setup cronjob `mysqldump`
- Giới hạn upload file: kiểm tra max_upload_size (file Excel chấm công ~1–5MB)

### 4.4 Yêu cầu phi chức năng

- Responsive: tối ưu cho desktop, dùng được trên tablet
- Bảo mật: HTTPS bắt buộc, mã hoá trường nhạy cảm (số CCCD, tài khoản ngân hàng)
- Audit log: ghi lại **mọi thay đổi** dữ liệu lương (user_id, timestamp, old_value, new_value, reason)
- Performance: bảng lương 50 nhân viên load < 1 giây
- Backup DB: tối thiểu 1 lần/ngày, giữ 30 ngày

---

## 5. THIẾT KẾ DB (Sơ lược)

```
employees              — Hồ sơ nhân viên + thông tin lương cơ bản
employee_id_mapping    — Map mã máy chấm công ↔ mã lương (MODULE 0)
attendance_records     — Dữ liệu chấm công thô (từng lượt vào/ra)
attendance_summary     — Tổng hợp ngày công / giờ OT mỗi ngày
payroll_periods        — Kỳ lương (tháng/năm, trạng thái phê duyệt)
payroll_details        — Chi tiết lương từng NV trong kỳ
payroll_audit_log      — Lịch sử mọi thay đổi trên bảng lương
approval_history       — Lịch sử phê duyệt (ai, khi nào, quyết định gì)
system_config          — Cấu hình hệ thống (hệ số OT, ngày lễ, biểu thuế)
users                  — Tài khoản đăng nhập + role
```

---

## 6. LỘ TRÌNH PHÁT TRIỂN

### Phase 1 — MVP (4–5 tuần)
Thay thế hoàn toàn Excel:
- ✅ Quản lý nhân viên + Mapping mã NV
- ✅ Import & xử lý file chấm công (đúng format thực tế)
- ✅ Tính lương tự động đầy đủ 23 cột
- ✅ Tính thuế TNCN tự động + cho phép override
- ✅ Edit lương thủ công (có audit log)
- ✅ Bảng lương dạng bảng (như ảnh mẫu)
- ✅ Xuất Excel / PDF bảng lương
- ✅ Phiếu lương PDF cơ bản
- ✅ 3 role: Admin, Kế toán, Giám đốc
- ✅ Deploy trên Matbao Flesk + MariaDB

### Phase 2 — Hoàn thiện (3–4 tuần)
- ✅ Quy trình phê duyệt đầy đủ 2 cấp
- ✅ Notification trong app khi có việc cần duyệt
- ✅ Role Quản lý và Nhân viên
- ✅ Nhân viên xem phiếu lương online
- ✅ Báo cáo thống kê cơ bản
- ✅ Cấu hình ngày lễ, hệ số OT nâng cao

### Phase 3 — Nâng cao (4–5 tuần)
- ✅ Quản lý phép năm / đơn xin nghỉ
- ✅ Gửi phiếu lương qua email hàng loạt
- ✅ Xuất file chuyển khoản ngân hàng (Vietcombank / BIDV)
- ✅ Dashboard báo cáo với biểu đồ
- ✅ Cảnh báo tự động khi lương thay đổi > 20%
- ✅ Mobile-friendly cho nhân viên

---

## 7. RỦI RO & BIỆN PHÁP XỬ LÝ

| Rủi ro | Mức độ | Biện pháp |
|---|---|---|
| Mã NV không khớp khi import | 🔴 Cao | Module Mapping (MODULE 0) — setup một lần, dùng mãi |
| Nhân viên thiếu giờ ra | 🟡 Trung bình | Flag "Cần xác nhận", block tính lương cho bản ghi đó |
| File chấm công đổi format khi nâng cấp máy | 🟡 Trung bình | Parser cấu hình được, không hardcode tên cột |
| Thuế TNCN tính sai (người phụ thuộc chưa cập nhật) | 🟡 Trung bình | Hiển thị rõ input dùng để tính, kế toán kiểm tra |
| Mất dữ liệu trên Matbao Flesk | 🟡 Trung bình | Backup daily tự động + export Excel định kỳ |
| Đồng thời nhiều user sửa bảng lương | 🟢 Thấp | Lock record khi đang edit, cảnh báo conflict |

---

## 8. CÂU HỎI CÒN MỞ

Các điểm dưới đây cần xác nhận trước khi bắt đầu Phase 2:

1. **Email phiếu lương**: Có muốn tự động gửi email cho NV sau khi GĐ chốt không? (Cần cấu hình SMTP / email service)

2. **Ngân hàng chuyển khoản**: Công ty đang dùng ngân hàng nào để trả lương? (Mỗi ngân hàng có format file chuyển khoản khác nhau)

3. **Tên công ty & logo**: Để cấu hình template phiếu lương ngay từ Phase 1

4. **Giảm trừ gia cảnh**: Nhân viên hiện có đăng ký người phụ thuộc không? Dữ liệu này đang lưu ở đâu?

---

*v1.1 — Cập nhật 12/05/2026 theo feedback. Các mục ✅ đã được xác nhận, các mục còn lại cần review tiếp.*