/**
 * Dashboard Service — aggregates data từ các endpoint hiện có.
 * Backend chưa có /api/dashboard/summary nên client tự tổng hợp.
 */
import api from './api';

function currentPeriodStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Lấy toàn bộ dữ liệu cần cho Dashboard trong 1 lần gọi (parallel).
 * @returns {Promise<DashboardSummary>}
 */
export async function getDashboardSummary() {
  const periodStr = currentPeriodStr();

  const [empResult, payrollResult] = await Promise.allSettled([
    api.get('/employees', { params: { limit: 1, status: 'active' } }),
    api.get(`/payroll/${periodStr}`),
  ]);

  const empData     = empResult.status === 'fulfilled'     ? empResult.value.data     : null;
  const payrollData = payrollResult.status === 'fulfilled' ? payrollResult.value.data : null;

  const totalEmployees = empData?.data?.pagination?.total ?? null;
  const period         = payrollData?.data?.period  ?? null;
  const details        = payrollData?.data?.details ?? [];

  // Tính tổng từ details
  const totalNet   = details.reduce((s, d) => s + (parseFloat(d.net_salary)    || 0), 0);
  const totalGross = details.reduce((s, d) => s + (parseFloat(d.total_income)  || 0), 0);
  const overrideCount = details.filter(d => d.is_tax_override).length;

  // Lịch sử phê duyệt làm activity feed
  let activityFeed = [];
  if (period?.id) {
    try {
      const histRes = await api.get(`/payroll/${period.id}/history`);
      activityFeed = (histRes.data.data ?? []).slice(0, 5);
    } catch {
      // không bắt buộc
    }
  }

  return {
    periodStr,
    totalEmployees,
    period,
    totalNet,
    totalGross,
    overrideCount,
    activityFeed,
    employeeCount: details.length,
  };
}
