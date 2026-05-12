import api from './api';

export async function getMappingScreenData(params = {}) {
  const response = await api.get('/mapping', {
    params: {
      limit: 50,
      ...params,
    },
  });

  const mappings = response.data?.data?.mappings || [];
  const rows = mappings.map((item) => ({
    id: item.id,
    timeclockCode: item.timeclock_code,
    timeclockName: item.timeclock_name || 'Unknown',
    mapped: Boolean(item.employee_id),
    employee: item.employee_id
      ? {
          initials: (item.employee_name || 'NV')
            .split(' ')
            .map((word) => word[0] || '')
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          name: item.employee_name,
          code: item.employee_id,
          department: item.employee_department,
          avatarTone: 'av-blue',
        }
      : null,
  }));

  return {
    rows,
    mappedCount: rows.filter((row) => row.mapped).length,
    unmappedCount: rows.filter((row) => !row.mapped).length,
  };
}

