import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Skeleton, theme } from 'antd';
import styles from './Dashboard.module.css';

const STATUS_META = {
  NHAP: { label: 'Nháp', tone: 'gray' },
  CHO_DUYET: { label: 'Chờ duyệt', tone: 'yellow' },
  KETOAN_DUYET: { label: 'Chờ GĐ duyệt', tone: 'yellow' },
  GIAMDOC_DUYET: { label: 'GĐ đã duyệt', tone: 'green' },
  DA_CHOT: { label: 'Đã chốt', tone: 'green' },
  UNKNOWN: { label: 'Chưa tạo', tone: 'gray' },
};

const ACTION_META = {
  SUBMIT: { icon: '📥', color: 'blue' },
  KETOAN_APPROVE: { icon: '✅', color: 'green' },
  GIAMDOC_APPROVE: { icon: '✅', color: 'green' },
  KETOAN_REJECT: { icon: '❌', color: 'red' },
  GIAMDOC_REJECT: { icon: '❌', color: 'red' },
  UPDATE_PAYROLL: { icon: '✏️', color: 'yellow' },
  GENERATE_PAYROLL: { icon: '💰', color: 'blue' },
  DEFAULT: { icon: '•', color: 'muted' },
};

const numberFormatter = new Intl.NumberFormat('vi-VN');

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCompactMoneyVn(value) {
  const amount = toNumber(value);
  if (amount === null) return '--';

  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1).replace('.', ',')} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace('.', ',')} tr`;
  }
  return numberFormatter.format(Math.round(amount));
}

function formatPeriodLabel(period, periodStr) {
  if (period?.month && period?.year) {
    return `Tháng ${period.month} / ${period.year}`;
  }

  if (typeof periodStr === 'string' && periodStr.includes('-')) {
    const [year, month] = periodStr.split('-');
    if (year && month) return `Tháng ${Number(month)} / ${year}`;
  }

  const now = new Date();
  return `Tháng ${now.getMonth() + 1} / ${now.getFullYear()}`;
}

function formatRelativeTime(dateLike) {
  if (!dateLike) return '';

  const time = new Date(dateLike);
  if (Number.isNaN(time.getTime())) return String(dateLike);

  const diffMs = Date.now() - time.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;

  const diffDay = Math.round(diffHour / 24);
  if (diffDay === 1) return 'hôm qua';
  return `${diffDay} ngày trước`;
}

function buildActivityFeed(rawFeed) {
  if (!Array.isArray(rawFeed) || rawFeed.length === 0) return [];

  return rawFeed.map((item, index) => {
    if (typeof item === 'string') {
      return {
        key: `activity-${index}`,
        text: item,
        timeText: '',
        color: 'muted',
      };
    }

    const actionKey = item.action || item.type || 'DEFAULT';
    const action = ACTION_META[actionKey] || ACTION_META.DEFAULT;
    const actor = item.full_name ? `${item.full_name}: ` : '';
    const mainText = item.note || item.message || item.title || item.action || 'Cập nhật dữ liệu';

    return {
      key: item.id || `activity-${index}`,
      text: `${action.icon} ${actor}${mainText}`,
      timeText: item.timeText || formatRelativeTime(item.created_at || item.createdAt),
      color: action.color,
    };
  });
}

function buildTodoItems(source, role, attendanceErrorCount, periodLabel) {
  if (Array.isArray(source.todoItems) && source.todoItems.length > 0) {
    return source.todoItems.map((item, index) => ({
      key: item.id || `todo-${index}`,
      text: item.text || '',
      tone: item.tone || 'muted',
      actionText: item.actionText || item.buttonText || null,
      href: item.href || null,
      disabled: Boolean(item.disabled),
    }));
  }

  const items = [];
  const status = source.payrollStatus || source.period?.status || null;
  const roleKey = String(role || '').toUpperCase();
  const isFinanceRole = roleKey === 'KETOAN' || roleKey === 'ADMIN';

  if (isFinanceRole && attendanceErrorCount > 0) {
    items.push({
      key: 'todo-attendance',
      text: `● ${attendanceErrorCount} bản ghi thiếu giờ ra`,
      tone: 'red',
      actionText: 'Xử lý',
      href: '/attendance/import',
      disabled: false,
    });
  }

  if (isFinanceRole && status === 'NHAP') {
    items.push({
      key: 'todo-generate',
      text: `● Tạo bảng lương ${periodLabel.toLowerCase()}`,
      tone: 'yellow',
      actionText: 'Tạo',
      href: '/payroll',
      disabled: false,
    });
  }

  if (roleKey === 'GIAMDOC' && status === 'KETOAN_DUYET') {
    items.push({
      key: 'todo-approve',
      text: '● Bảng lương chờ duyệt',
      tone: 'yellow',
      actionText: 'Xem',
      href: '/payroll/approve',
      disabled: false,
    });
  }

  if (status !== 'DA_CHOT') {
    items.push({
      key: 'todo-payslip-wait',
      text: '● Xuất phiếu lương sau duyệt',
      tone: 'muted',
      actionText: 'Chờ duyệt',
      href: null,
      disabled: true,
    });
  } else {
    items.push({
      key: 'todo-payslip-export',
      text: '● Xuất phiếu lương',
      tone: 'blue',
      actionText: 'Xuất',
      href: '/payslip',
      disabled: false,
    });
  }

  return items;
}

function toneColor(tone, token) {
  switch (tone) {
    case 'red':
      return token.colorError;
    case 'yellow':
      return token.colorWarning;
    case 'green':
      return token.colorSuccess;
    case 'blue':
      return token.colorInfo;
    default:
      return token.colorTextSecondary;
  }
}

function statusPillStyle(statusKey, token) {
  const tone = (STATUS_META[statusKey] || STATUS_META.UNKNOWN).tone;

  if (tone === 'yellow') {
    return {
      color: token.colorWarning,
      background: token.colorWarningBg,
      border: `1px solid ${token.colorWarningBorder}`,
    };
  }

  if (tone === 'green') {
    return {
      color: token.colorSuccess,
      background: token.colorSuccessBg,
      border: `1px solid ${token.colorSuccessBorder}`,
    };
  }

  return {
    color: token.colorTextSecondary,
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorder}`,
  };
}

function getErrorMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return error.message || 'Không thể tải dữ liệu Dashboard.';
}

async function defaultFetchDashboardData() {
  const response = await fetch('/api/dashboard/summary', {
    credentials: 'include',
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Không thể tải dữ liệu Dashboard.');
  }

  return payload.data || payload;
}

function DashboardSkeleton() {
  return (
    <>
      <div className={styles.skeletonGrid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`skeleton-kpi-${index}`} className={styles.skeletonCard}>
            <Skeleton
              active
              title={{ width: '55%' }}
              paragraph={{ rows: 1, width: ['70%'] }}
            />
          </div>
        ))}
      </div>
      <div className={styles.skeletonBottom}>
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={`skeleton-panel-${index}`} className={styles.skeletonPanel}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        ))}
      </div>
    </>
  );
}

export default function Dashboard({
  data,
  fetchDashboardData = defaultFetchDashboardData,
  loading,
  error,
  role,
  notificationCount = 0,
  onNavigate,
  onCreatePayroll,
}) {
  const { token } = theme.useToken();
  const [internalData, setInternalData] = useState(null);
  const [internalLoading, setInternalLoading] = useState(data === undefined);
  const [internalError, setInternalError] = useState(null);

  useEffect(() => {
    if (data !== undefined || typeof fetchDashboardData !== 'function') return undefined;

    let cancelled = false;

    const load = async () => {
      setInternalLoading(true);
      setInternalError(null);
      try {
        const next = await fetchDashboardData();
        if (!cancelled) setInternalData(next);
      } catch (err) {
        if (!cancelled) setInternalError(err);
      } finally {
        if (!cancelled) setInternalLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [data, fetchDashboardData]);

  const source = data !== undefined ? data : internalData || {};
  const isLoading = loading !== undefined ? loading : data === undefined && internalLoading;
  const errorMessage = getErrorMessage(error || (data === undefined ? internalError : null));

  const cssVars = useMemo(
    () => ({
      '--dash-bg-surface': token.colorBgContainer,
      '--dash-border': token.colorBorder,
      '--dash-border-light': token.colorBorderSecondary || token.colorBorder,
      '--dash-text-primary': token.colorText,
      '--dash-text-secondary': token.colorTextSecondary,
      '--dash-green': token.colorSuccess,
      '--dash-red': token.colorError,
    }),
    [token]
  );

  const periodLabel = formatPeriodLabel(source.period, source.periodStr);
  const payrollStatus = source.payrollStatus || source.period?.status || 'UNKNOWN';
  const payrollStatusMeta = STATUS_META[payrollStatus] || STATUS_META.UNKNOWN;

  const totalEmployees = toNumber(source.totalEmployees);
  const employeeDelta = toNumber(source.employeeDelta);
  const totalNet = toNumber(source.totalNet);
  const payrollDeltaPercent = toNumber(source.payrollDeltaPercent);
  const attendanceErrorCount = toNumber(
    source.attendanceErrorCount ?? source.attendanceWarningsCount ?? source.attendanceWarnings
  );

  const employeeDeltaText =
    employeeDelta === null
      ? 'không có thay đổi'
      : employeeDelta > 0
      ? `↑ ${employeeDelta} mới tháng này`
      : employeeDelta < 0
      ? `↓ ${Math.abs(employeeDelta)} giảm tháng này`
      : 'không đổi so tháng trước';

  const payrollDeltaText =
    payrollDeltaPercent === null
      ? 'chưa có dữ liệu so sánh'
      : payrollDeltaPercent > 0
      ? `↑ ${payrollDeltaPercent.toFixed(1)}% vs tháng trước`
      : payrollDeltaPercent < 0
      ? `↓ ${Math.abs(payrollDeltaPercent).toFixed(1)}% vs tháng trước`
      : 'không đổi so tháng trước';

  const activityFeed = buildActivityFeed(source.activityFeed);
  const todoItems = buildTodoItems(source, role, attendanceErrorCount || 0, periodLabel);

  const handleNavigate = (href) => {
    if (!href) return;
    if (typeof onNavigate === 'function') {
      onNavigate(href);
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.assign(href);
    }
  };

  const createPayrollButtonStyle = {
    background: token.colorInfoBg,
    borderColor: token.colorInfoBorder,
    color: token.colorInfo,
  };

  return (
    <section className={styles.dashboardPage} style={cssVars}>
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.pageTitle}>Dashboard</div>
          <div className={styles.pageSub}>{periodLabel}</div>
        </div>
        <div className={styles.pageActions}>
          <Button size="small">{`🔔 ${notificationCount}`}</Button>
          <Button
            size="small"
            style={createPayrollButtonStyle}
            onClick={() => {
              if (typeof onCreatePayroll === 'function') {
                onCreatePayroll();
                return;
              }
              handleNavigate('/payroll');
            }}
          >
            + Tạo bảng lương
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <Alert
          type="error"
          showIcon
          message={errorMessage}
          style={{ marginBottom: 4 }}
        />
      ) : null}

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className={styles.kpiGrid}>
            <div className={styles.kpiCard}>
              <div className={styles.kcLabel}>Tổng nhân viên</div>
              <div className={styles.kcValue}>{totalEmployees === null ? '--' : numberFormatter.format(totalEmployees)}</div>
              <div
                className={[
                  styles.kcDelta,
                  employeeDelta > 0
                    ? styles.kcDeltaUp
                    : employeeDelta < 0
                    ? styles.kcDeltaDown
                    : styles.kcDeltaMuted,
                ].join(' ')}
              >
                {employeeDeltaText}
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kcLabel}>Quỹ lương NET</div>
              <div className={[styles.kcValue, styles.kcValueSmall].join(' ')}>{formatCompactMoneyVn(totalNet)}</div>
              <div
                className={[
                  styles.kcDelta,
                  payrollDeltaPercent > 0
                    ? styles.kcDeltaUp
                    : payrollDeltaPercent < 0
                    ? styles.kcDeltaDown
                    : styles.kcDeltaMuted,
                ].join(' ')}
              >
                {payrollDeltaText}
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kcLabel}>Trạng thái lương</div>
              <div className={[styles.kcValue, styles.kcValueSmall].join(' ')}>
                <span
                  style={{
                    ...statusPillStyle(payrollStatus, token),
                    borderRadius: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {payrollStatusMeta.label}
                </span>
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kcLabel}>Chấm công lỗi</div>
              <div
                className={styles.kcValue}
                style={{
                  color: attendanceErrorCount > 0 ? token.colorError : token.colorText,
                }}
              >
                {attendanceErrorCount === null ? '--' : numberFormatter.format(attendanceErrorCount)}
              </div>
              <div className={[styles.kcDelta, styles.kcDeltaMuted].join(' ')}>
                cần xác nhận
              </div>
            </div>
          </div>

          <div className={styles.dashGrid}>
            <div className={styles.panelCard}>
              <div className={styles.panelTitle}>Hoạt động gần đây</div>
              {activityFeed.length === 0 ? (
                <div className={styles.tlEmpty}>Chưa có hoạt động</div>
              ) : (
                activityFeed.map((activity) => (
                  <div key={activity.key} className={styles.timelineItem}>
                    <div
                      className={styles.tlDot}
                      style={{
                        background: toneColor(activity.color, token),
                      }}
                    />
                    <div className={styles.tlText}>
                      {activity.text}{' '}
                      {activity.timeText ? <span className={styles.tlTime}>— {activity.timeText}</span> : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className={styles.panelCard}>
              <div className={styles.panelTitle}>Việc cần làm</div>
              {todoItems.length === 0 ? (
                <div className={styles.todoEmpty}>Không có việc cần xử lý</div>
              ) : (
                todoItems.map((item) => (
                  <div key={item.key} className={styles.todoItem}>
                    <div className={styles.todoText}>
                      <span
                        className={styles.todoDot}
                        style={{
                          background: toneColor(item.tone, token),
                        }}
                      />
                      <span
                        style={{
                          color: toneColor(item.tone, token),
                        }}
                      >
                        {item.text}
                      </span>
                    </div>
                    {item.actionText ? (
                      <Button
                        size="small"
                        disabled={item.disabled}
                        onClick={() => handleNavigate(item.href)}
                      >
                        {item.actionText}
                      </Button>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

