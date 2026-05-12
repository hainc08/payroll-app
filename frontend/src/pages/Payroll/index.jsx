import { Alert, Skeleton } from 'antd';
import WireframeAppShell from '../shared/WireframeAppShell';
import styles from '../shared/Wireframe.module.css';
import useRemoteData from '../shared/useRemoteData';
import { cx, formatCurrency, getErrorText } from '../shared/utils';
import { getPayrollScreenData } from '../../services/payrollService';

const STATUS_META = {
  NHAP: { label: 'Nháp', tone: 'gray' },
  CHO_DUYET: { label: 'Chờ duyệt', tone: 'yellow' },
  KETOAN_DUYET: { label: 'Chờ GĐ duyệt', tone: 'yellow' },
  DA_CHOT: { label: 'Đã chốt', tone: 'green' },
};

export default function PayrollPage({
  data,
  fetchData,
  loading,
  error,
  period,
  onDepartmentChange,
  onSearchChange,
  onExportExcel,
  onSubmitApproval,
  onEditRow,
}) {
  const { source, isLoading, error: remoteError } = useRemoteData({
    data,
    fetchData: fetchData || (() => getPayrollScreenData(period)),
    loading,
    error,
  });
  const errorText = getErrorText(remoteError);

  const rows = source.rows || [];
  const periodInfo = source.periodInfo || {};
  const statusMeta = STATUS_META[periodInfo.status] || STATUS_META.NHAP;

  const totalGross =
    source.totalGross ??
    rows.reduce((sum, row) => sum + (Number(row.gross) || 0), 0);
  const totalSocialInsurance =
    source.totalSocialInsurance ??
    rows.reduce((sum, row) => sum + (Number(row.socialInsurance) || 0), 0);
  const totalTax = source.totalTax ?? rows.reduce((sum, row) => sum + (Number(row.tax) || 0), 0);
  const totalNet =
    source.totalNet ?? rows.reduce((sum, row) => sum + (Number(row.net) || 0), 0);

  const periodLabel =
    source.periodLabel ||
    (periodInfo.month && periodInfo.year ? `Tháng ${periodInfo.month}/${periodInfo.year}` : 'Kỳ lương');

  return (
    <WireframeAppShell
      activeNav="payroll"
      companyName={source.companyName || 'Nhà hàng ABC'}
      user={source.user || { initials: 'KT', name: 'Kế toán', email: 'ketoan@abc.vn', avatarTone: 'blue' }}
      pageTitle={
        <>
          Bảng lương {periodLabel}{' '}
          <span className={cx(styles, 'badge', `badge-${statusMeta.tone}`)}>
            {statusMeta.label}
          </span>
        </>
      }
      pageSubtitle={
        source.metaText ||
        `Tạo: ${source.createdAt || '--'} · ${source.totalEmployees ?? rows.length} nhân viên`
      }
      topActions={
        <>
          <button className={cx(styles, 'btn')} onClick={onExportExcel}>
            ⬇ Xuất Excel
          </button>
          <button className={cx(styles, 'btn', 'btn-primary')} onClick={onSubmitApproval}>
            ✓ Submit phê duyệt
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
          <div className={styles['payroll-toolbar']}>
            <select className={styles.select} onChange={(event) => onDepartmentChange?.(event.target.value)}>
              <option value="all">Tất cả bộ phận</option>
              {(source.departmentOptions || []).map((department) => (
                <option key={department.value || department} value={department.value || department}>
                  {department.label || department}
                </option>
              ))}
            </select>
            <input
              className={styles.input}
              placeholder="Tìm NV..."
              style={{ width: 180 }}
              defaultValue={source.search || ''}
              onChange={(event) => onSearchChange?.(event.target.value)}
            />
            <div className={styles['payroll-total']}>
              Tổng NET: <strong>{formatCurrency(totalNet)} đ</strong>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className={cx(styles, 'tbl', 'tbl-payroll')}>
                <thead>
                  <tr>
                    <th>Mã NV</th>
                    <th>Họ tên</th>
                    <th>BP</th>
                    <th style={{ textAlign: 'center' }}>Ngày CC</th>
                    <th style={{ textAlign: 'center' }}>OT(h)</th>
                    <th className={styles.num}>Tiền lương</th>
                    <th className={styles.num}>PC</th>
                    <th className={styles.num}>Thưởng</th>
                    <th className={styles.num}>Gross</th>
                    <th className={styles.num}>BHXH</th>
                    <th className={styles.num}>Thuế TNCN</th>
                    <th className={styles.num} style={{ color: 'var(--green)' }}>
                      NET
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id || row.code} className={row.override ? styles.override : ''}>
                      <td>
                        <code className={styles.mono} style={{ fontSize: 11, color: 'var(--blue)' }}>
                          {row.code}
                        </code>
                      </td>
                      <td style={{ fontWeight: 500 }}>{row.name}</td>
                      <td>{row.department || '--'}</td>
                      <td style={{ textAlign: 'center' }}>{row.workDays ?? '--'}</td>
                      <td style={{ textAlign: 'center', color: Number(row.overtimeHours) > 0 ? 'var(--yellow)' : undefined }}>
                        {row.overtimeHours ? `${row.overtimeHours}h` : '—'}
                      </td>
                      <td className={styles.num}>{formatCurrency(row.salaryByWorkDays)}</td>
                      <td className={styles.num}>{formatCurrency(row.allowance)}</td>
                      <td className={styles.num}>{row.bonus ? formatCurrency(row.bonus) : '—'}</td>
                      <td className={styles.num} style={{ fontWeight: 600 }}>
                        {formatCurrency(row.gross)}
                      </td>
                      <td className={styles.num} style={{ color: 'var(--red)' }}>
                        {Number(row.socialInsurance) > 0 ? `−${formatCurrency(row.socialInsurance)}` : '—'}
                      </td>
                      <td className={styles.num} style={{ color: row.override ? 'var(--yellow)' : 'var(--red)' }}>
                        {Number(row.tax) > 0 ? `${formatCurrency(row.tax)}${row.override ? ' ✏' : ''}` : '—'}
                      </td>
                      <td className={cx(styles, 'num', 'net-cell')}>{formatCurrency(row.net)}</td>
                      <td>
                        <button
                          className={cx(styles, 'btn')}
                          style={{ padding: '3px 8px', fontSize: 11 }}
                          onClick={() => onEditRow?.(row)}
                        >
                          ✏
                        </button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={13} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                        Chưa có dữ liệu lương
                      </td>
                    </tr>
                  ) : null}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--bg-overlay)', fontWeight: 600 }}>
                    <td colSpan={8} style={{ padding: '8px 12px' }}>
                      Tổng cộng ({rows.length} NV)
                    </td>
                    <td className={styles.num} style={{ padding: '8px 12px' }}>
                      {formatCurrency(totalGross)}
                    </td>
                    <td className={styles.num} style={{ padding: '8px 12px', color: 'var(--red)' }}>
                      −{formatCurrency(totalSocialInsurance)}
                    </td>
                    <td className={styles.num} style={{ padding: '8px 12px', color: 'var(--red)' }}>
                      −{formatCurrency(totalTax)}
                    </td>
                    <td className={styles.num} style={{ padding: '8px 12px', color: 'var(--green)', fontSize: 13 }}>
                      {formatCurrency(totalNet)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </WireframeAppShell>
  );
}
