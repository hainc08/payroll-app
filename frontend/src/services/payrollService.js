import api from './api';

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getPayrollScreenData(period) {
  const periodId = period || currentPeriod();
  const response = await api.get(`/payroll/${periodId}`);
  const periodInfo = response.data?.data?.period || {};
  const details = response.data?.data?.details || [];

  return {
    periodInfo,
    rows: details.map((detail) => ({
      id: detail.id,
      code: detail.employee_id,
      name: detail.full_name,
      department: detail.department,
      workDays: detail.actual_work_days,
      overtimeHours: detail.overtime_hours,
      salaryByWorkDays: detail.salary_by_work_days,
      allowance:
        Number(detail.allowance_responsibility || 0) +
        Number(detail.allowance_phone || 0) +
        Number(detail.allowance_transport || 0) +
        Number(detail.allowance_work || 0),
      bonus: detail.bonus_revenue,
      gross: detail.total_income,
      socialInsurance: detail.social_insurance,
      tax: detail.tax_income,
      net: detail.net_salary,
      override: Boolean(detail.is_tax_override),
    })),
  };
}

