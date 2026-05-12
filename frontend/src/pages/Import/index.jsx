import { Alert, Skeleton } from 'antd';
import WireframeAppShell from '../shared/WireframeAppShell';
import styles from '../shared/Wireframe.module.css';
import useRemoteData from '../shared/useRemoteData';
import { cx, getErrorText } from '../shared/utils';
import { getAttendanceImportScreenData as defaultFetchImportData } from '../../services/attendanceService';

export default function AttendanceImportPage({
  data,
  fetchData = defaultFetchImportData,
  loading,
  error,
  onChangePeriod,
  onConfirmImport,
  onSearchChange,
  onFilterChange,
}) {
  const { source, isLoading, error: remoteError } = useRemoteData({
    data,
    fetchData,
    loading,
    error,
  });
  const errorText = getErrorText(remoteError);

  const steps = source.steps || [];
  const records = source.records || [];
  const stats = source.stats || [];

  return (
    <WireframeAppShell
      activeNav="attendance"
      companyName={source.companyName || 'Nhà hàng ABC'}
      user={source.user || { initials: 'KT', name: 'Kế toán', email: 'ketoan@abc.vn', avatarTone: 'blue' }}
      pageTitle="Import Chấm công"
      pageSubtitle="Chấm công → Import file Excel"
      topActions={
        <>
          <select
            className={styles.select}
            defaultValue={source.period || ''}
            onChange={(event) => onChangePeriod?.(event.target.value)}
          >
            {(source.periodOptions || [source.period || 'Tháng hiện tại']).map((period) => (
              <option key={period.value || period} value={period.value || period}>
                {period.label || period}
              </option>
            ))}
          </select>
          <button className={cx(styles, 'btn', 'btn-primary')} onClick={onConfirmImport}>
            ✓ Xác nhận import
          </button>
        </>
      }
    >
      {errorText ? (
        <Alert type="error" showIcon message={errorText} style={{ marginBottom: 12 }} />
      ) : null}

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
        <>
          <div className={styles.stepper}>
            {steps.map((step, index) => (
              <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div
                  className={cx(
                    styles,
                    'step-item',
                    step.status === 'done' ? 'done' : '',
                    step.status === 'active' ? 'active' : ''
                  )}
                >
                  <div className={styles['step-circle']}>
                    {step.status === 'done' ? '✓' : index + 1}
                  </div>
                  {step.label}
                </div>
                {index < steps.length - 1 ? (
                  <div className={cx(styles, 'step-line', step.status === 'done' ? 'done' : '')} />
                ) : null}
              </div>
            ))}
          </div>

          {source.warningText ? (
            <div className={cx(styles, 'alert', 'alert-warn')}>
              ⚠️ <span>{source.warningText}</span>
            </div>
          ) : null}

          <div className={styles['stat-bar']}>
            {stats.map((stat) => (
              <div
                key={stat.key || stat.label}
                className={cx(styles, 'stat-cell', stat.tone === 'warn' ? 'warn' : '', stat.tone === 'err' ? 'err' : '')}
              >
                <div className={styles['sc-num']}>{stat.value}</div>
                <div className={styles['sc-label']}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              className={styles.input}
              placeholder="Tìm nhân viên..."
              style={{ width: 220 }}
              defaultValue={source.search || ''}
              onChange={(event) => onSearchChange?.(event.target.value)}
            />
            <select
              className={styles.select}
              defaultValue={source.filter || 'all'}
              onChange={(event) => onFilterChange?.(event.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="warn_err">Lỗi / Cảnh báo</option>
            </select>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>Mã máy CC</th>
                  <th>Tên NV</th>
                  <th>Ngày</th>
                  <th>Vào 1</th>
                  <th>Ra 1</th>
                  <th>Vào 2</th>
                  <th>Ra 2</th>
                  <th>Tổng giờ</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr
                    key={record.id || `${record.timeclockCode}-${record.date}`}
                    className={
                      record.statusTone === 'warn'
                        ? styles['row-warn']
                        : record.statusTone === 'err'
                        ? styles['row-err']
                        : ''
                    }
                  >
                    <td>
                      <span className={styles.mono} style={{ fontSize: 12, color: record.statusTone === 'err' ? 'var(--red)' : undefined }}>
                        {record.timeclockCode}
                      </span>
                    </td>
                    <td>{record.employeeName}</td>
                    <td>{record.date}</td>
                    <td>{record.checkin1 || '—'}</td>
                    <td style={record.statusTone === 'warn' ? { color: 'var(--red)' } : undefined}>{record.checkout1 || '—'}</td>
                    <td>{record.checkin2 || '—'}</td>
                    <td>{record.checkout2 || '—'}</td>
                    <td className={styles.num}>{record.totalHours || '0h'}</td>
                    <td>
                      <span className={cx(styles, 'badge', `badge-${record.badgeTone || 'gray'}`)}>
                        {record.statusLabel || '--'}
                      </span>
                    </td>
                  </tr>
                ))}
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                      Chưa có dữ liệu preview
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </WireframeAppShell>
  );
}
