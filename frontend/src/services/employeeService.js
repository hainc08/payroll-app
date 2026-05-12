import api from './api';

export async function getEmployeesScreenData(params = {}) {
  const response = await api.get('/employees', {
    params: {
      limit: 50,
      status: 'active',
      ...params,
    },
  });

  const employees = response.data?.data?.employees || [];
  const pagination = response.data?.data?.pagination || {};

  return {
    employees: employees.map((item) => ({
      id: item.employee_id,
      employee_id: item.employee_id,
      name: item.full_name,
      full_name: item.full_name,
      code: item.employee_id,
      department: item.department,
      salary: item.base_salary,
      employmentType: item.employment_type,
      standardHours: item.standard_hours_per_day,
      initials: (item.full_name || 'NV')
        .split(' ')
        .map((word) => word[0] || '')
        .join('')
        .slice(0, 3)
        .toUpperCase(),
      avatarTone: item.employment_type === 'TH' ? 'av-yellow' : 'av-green',
    })),
    totalEmployees: pagination.total || employees.length,
  };
}

