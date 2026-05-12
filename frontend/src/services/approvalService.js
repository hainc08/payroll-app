import api from './api';
import { getPayrollScreenData } from './payrollService';

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(Number(value || 0)));
}

export async function getApprovalScreenData(period) {
  const periodId = period || currentPeriod();
  const [payrollData, historyResponse] = await Promise.all([
    getPayrollScreenData(periodId),
    api.get(`/payroll/${periodId}/history`),
  ]);

  const rows = payrollData.rows || [];
  const history = historyResponse.data?.data || [];

  const totalGross = rows.reduce((sum, row) => sum + (Number(row.gross) || 0), 0);
  const totalDeductions = rows.reduce(
    (sum, row) => sum + (Number(row.socialInsurance) || 0) + (Number(row.tax) || 0),
    0
  );
  const totalNet = rows.reduce((sum, row) => sum + (Number(row.net) || 0), 0);

  return {
    periodInfo: payrollData.periodInfo,
    summaryRows: [
      { label: 'Tổng nhân viên', value: `${rows.length}` },
      { label: 'Tổng gross', value: `${formatMoney(totalGross)} đ` },
      { label: 'BHXH + Thuế trừ', value: `−${formatMoney(totalDeductions)} đ`, tone: 'red' },
      { label: 'Quỹ lương NET', value: `${formatMoney(totalNet)} đ`, tone: 'green', total: true },
    ],
    timeline: history.map((item) => ({
      id: item.id,
      title: item.note || item.action,
      meta: `${item.full_name || item.user_id} · ${new Date(item.created_at).toLocaleString('vi-VN')}`,
      tone: item.action?.includes('REJECT')
        ? 'rejected'
        : item.to_status === 'DA_CHOT'
        ? 'done'
        : 'pending',
    })),
    overrideCount: rows.filter((row) => row.override).length,
  };
}

