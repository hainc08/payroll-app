export function cx(styles, ...names) {
  return names
    .filter(Boolean)
    .map((name) => styles[name] || name)
    .join(' ');
}

export function formatCurrency(value, fallback = '--') {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return new Intl.NumberFormat('vi-VN').format(Math.round(n));
}

export function getErrorText(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return error.message || 'Đã có lỗi xảy ra.';
}

