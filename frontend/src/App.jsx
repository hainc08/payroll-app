import { Navigate, Route, Routes } from 'react-router-dom';
import { Alert } from 'antd';
import DashboardPage from './pages/Dashboard';
import LoginPage from './pages/Login';
import EmployeesPage from './pages/Employees';
import MappingPage from './pages/Mapping';
import AttendanceImportPage from './pages/Import';
import PayrollPage from './pages/Payroll';
import ApprovalPage from './pages/Approval';
import PayslipPage from './pages/Payslip';
import SettingsPage from './pages/Settings';

function PlaceholderNotice({ text }) {
  return (
    <div style={{ padding: 16 }}>
      <Alert type="info" showIcon message={text} />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <DashboardPage
            data={{
              periodStr: '2026-05',
              totalEmployees: 50,
              employeeDelta: 2,
              totalNet: 382540000,
              payrollDeltaPercent: -2.1,
              payrollStatus: 'KETOAN_DUYET',
              attendanceErrorCount: 4,
              activityFeed: [
                { action: 'SUBMIT', message: 'Import chấm công T5', createdAt: new Date().toISOString() },
                { action: 'UPDATE_PAYROLL', message: 'Sửa lương NV EC-CMHIEU', createdAt: new Date(Date.now() - 3600000).toISOString() },
              ],
            }}
            notificationCount={2}
          />
        }
      />
      <Route
        path="/employees"
        element={
          <EmployeesPage
            data={{
              totalEmployees: 50,
              employees: [
                {
                  id: 'EC-NVTHUONG',
                  employee_id: 'EC-NVTHUONG',
                  name: 'Nguyễn Văn Thương',
                  department: 'Nhà hàng',
                  salary: 20000000,
                  employmentType: 'TNC',
                  standardHours: 9,
                  initials: 'NVT',
                  avatarTone: 'av-green',
                },
              ],
              personalInfo: [
                { label: 'Bộ phận', value: 'Nhà hàng' },
                { label: 'Chức vụ', value: 'Quản lý' },
                { label: 'Ngày vào làm', value: '01/03/2022' },
              ],
              salaryInfo: [
                { label: 'Lương HĐ gross', value: '20.000.000 đ' },
                { label: 'Giờ chuẩn/ngày', value: '9 giờ' },
                { label: 'Ngày công chuẩn', value: '26 ngày' },
              ],
              salaryEstimate: {
                gross: '48.923.846 đ',
                deduction: '−1.933.376 đ',
                net: '46.990.470 đ',
              },
            }}
          />
        }
      />
      <Route
        path="/mapping"
        element={
          <MappingPage
            data={{
              rows: [
                {
                  id: 1,
                  timeclockCode: '00002',
                  timeclockName: 'Pham Thi Ngoc Bich',
                  mapped: true,
                  employee: {
                    initials: 'PB',
                    name: 'Phạm Thị Ngọc Bích',
                    code: 'EC-PTNBICH',
                    department: 'VP',
                    avatarTone: 'av-green',
                  },
                },
                {
                  id: 2,
                  timeclockCode: '00999',
                  timeclockName: 'Unknown',
                  mapped: false,
                },
              ],
            }}
          />
        }
      />
      <Route
        path="/attendance/import"
        element={
          <AttendanceImportPage
            data={{
              period: 'Tháng 5 / 2026',
              steps: [
                { key: 'upload', label: 'Upload file', status: 'done' },
                { key: 'parse', label: 'Parse & validate', status: 'done' },
                { key: 'review', label: 'Review & xác nhận', status: 'active' },
                { key: 'save', label: 'Lưu vào DB', status: 'pending' },
              ],
              warningText: '4 bản ghi cần xử lý: 3 thiếu giờ ra · 1 mã NV chưa mapping',
              stats: [
                { key: 'emp', value: 50, label: 'Nhân viên' },
                { key: 'record', value: 842, label: 'Bản ghi' },
                { key: 'valid', value: 838, label: 'Hợp lệ' },
                { key: 'warn', value: 3, label: 'Thiếu giờ Ra', tone: 'warn' },
                { key: 'err', value: 1, label: 'Chưa mapping', tone: 'err' },
              ],
              records: [
                {
                  id: 1,
                  timeclockCode: '00002',
                  employeeName: 'Pham Thi Ngoc Bich',
                  date: '02/05',
                  checkin1: '09:37',
                  checkout1: '21:28',
                  totalHours: '11.83h',
                  statusLabel: '✓ Hợp lệ',
                  badgeTone: 'green',
                },
              ],
            }}
          />
        }
      />
      <Route
        path="/payroll/:period"
        element={
          <PayrollPage
            data={{
              periodInfo: { month: 5, year: 2026, status: 'CHO_DUYET' },
              createdAt: '10/05/2026',
              rows: [
                {
                  id: 1,
                  code: 'EC-NVTHUONG',
                  name: 'Nguyễn Văn Thương',
                  department: 'NH',
                  workDays: 27.5,
                  overtimeHours: 0,
                  salaryByWorkDays: 21153846,
                  allowance: 10650000,
                  bonus: 17120000,
                  gross: 48923846,
                  socialInsurance: 1112213,
                  tax: 821163,
                  net: 46990470,
                  override: false,
                },
              ],
            }}
          />
        }
      />
      <Route
        path="/payroll/approve"
        element={
          <ApprovalPage
            data={{
              periodInfo: { month: 5, year: 2026 },
              summaryRows: [
                { label: 'Tổng nhân viên', value: '50' },
                { label: 'Tổng gross', value: '436.580.000 đ' },
                { label: 'BHXH + Thuế trừ', value: '−54.040.000 đ', tone: 'red' },
                { label: 'Quỹ lương NET', value: '382.540.000 đ', total: true, tone: 'green' },
              ],
              timeline: [
                { id: 1, title: 'Kế toán tạo bảng lương', meta: 'ketoan@abc.vn · 10/05 08:30', tone: 'done' },
                { id: 2, title: 'Kế toán trưởng đã duyệt', meta: 'ktruong@abc.vn · 11/05 09:15', tone: 'done' },
                { id: 3, title: 'Chờ Giám đốc duyệt', meta: 'Đang xem xét...', tone: 'pending' },
              ],
            }}
          />
        }
      />
      <Route
        path="/payslip/:employeeId/:period"
        element={
          <PayslipPage
            data={{
              periodLabel: 'Tháng 5 / 2026',
              employee: {
                initials: 'NVT',
                name: 'Nguyễn Văn Thương',
                code: 'EC-NVTHUONG',
                department: 'Nhà hàng',
                employmentType: 'TNC',
                workDays: 27.5,
                standardWorkDays: 26,
                avatarTone: 'av-green',
              },
              incomes: [
                { label: 'Lương theo công', amount: 21153846 },
                { label: 'PC trách nhiệm', amount: 10150000 },
                { label: 'PC điện thoại', amount: 500000 },
                { label: 'Thưởng DT', amount: 17120000 },
              ],
              deductions: [
                { label: 'BHXH (10.5%)', amount: 1112213 },
                { label: 'Thuế TNCN', amount: 821163 },
              ],
              amountInWords: 'Bằng chữ: Bốn mươi sáu triệu chín trăm chín mươi nghìn bốn trăm bảy mươi đồng',
              bankInfo: 'ACB ···4521',
              closedDate: '12/05/2026',
            }}
          />
        }
      />
      <Route
        path="/settings"
        element={
          <SettingsPage
            data={{
              groups: [
                {
                  key: 'ot',
                  title: '⏰ Ngày công & OT',
                  rows: [
                    { label: 'Ngày công chuẩn', value: '26 ngày' },
                    { label: 'OT ngày thường', value: '1.5x' },
                  ],
                },
                {
                  key: 'accounts',
                  title: '👤 Quản lý tài khoản',
                  rows: [
                    { label: 'admin@abc.vn', value: 'ADMIN', badge: 'red' },
                    { label: 'ketoan@abc.vn', value: 'KETOAN', badge: 'blue' },
                  ],
                },
              ],
            }}
          />
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<PlaceholderNotice text="Route không tồn tại." />} />
    </Routes>
  );
}

