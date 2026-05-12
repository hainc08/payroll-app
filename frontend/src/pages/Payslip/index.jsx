import { Alert, Skeleton } from 'antd';
import WireframeAppShell from '../shared/WireframeAppShell';
import styles from '../shared/Wireframe.module.css';
import useRemoteData from '../shared/useRemoteData';
import { cx, formatCurrency, getErrorText } from '../shared/utils';
import { getPayslipScreenData as defaultFetchPayslipData } from '../../services/payslipService';

export default function PayslipPage({
  data,
  fetchData = defaultFetchPayslipData,
  loading,
  error,
  onPrint,
  onDownloadPdf,
}) {
  const { source, isLoading, error: remoteError } = useRemoteData({
    data,
    fetchData,
    loading,
    error,
  });
  const errorText = getErrorText(remoteError);

  const incomes = source.incomes || [];
  const deductions = source.deductions || [];
  const totalIncome =
    source.totalIncome ?? incomes.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalDeduction =
    source.totalDeduction ?? deductions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const netAmount = source.netAmount ?? totalIncome - totalDeduction;

  return (
    <WireframeAppShell
      activeNav="payslip"
      companyName={source.companyName || 'Nhà hàng ABC'}
      user={source.user || { initials: 'NV', name: 'Nhân viên', email: 'nhanvien@abc.vn', avatarTone: 'green' }}
      pageTitle="Phiếu lương"
      pageSubtitle={source.periodLabel || 'Tháng hiện tại'}
      topActions={
        <>
          <button className={cx(styles, 'btn')} onClick={onPrint}>
            🖨 In phiếu
          </button>
          <button className={cx(styles, 'btn', 'btn-blue')} onClick={onDownloadPdf}>
            ⬇ Tải PDF
          </button>
        </>
      }
    >
      {errorText ? (
        <Alert type="error" showIcon message={errorText} style={{ marginBottom: 12 }} />
      ) : null}

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 9 }} />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className={styles['payslip-wrap']}>
            <div className={styles['ps-header']}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>⏱</div>
              <div className={styles['psh-title']}>PHIẾU LƯƠNG</div>
              <div className={styles['psh-sub']}>
                {source.companyName || 'Nhà hàng ABC'} · {source.periodLabel || 'Tháng hiện tại'}
              </div>
            </div>

            <div className={styles['ps-body']}>
              <div className={styles['ps-emp']}>
                <div className={cx(styles, 'avatar', 'av-lg', source.employee?.avatarTone || 'av-green')}>
                  {source.employee?.initials || 'NV'}
                </div>
                <div>
                  <div className={styles['pe-name']}>{source.employee?.name || '--'}</div>
                  <div className={styles['pe-meta']}>
                    {source.employee?.code || '--'} · {source.employee?.department || '--'} ·{' '}
                    {source.employee?.employmentType || '--'}
                  </div>
                </div>
                <div className={styles['pe-stat']}>
                  <div className={styles['ps-days']}>
                    {source.employee?.workDays || '--'}{' '}
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      / {source.employee?.standardWorkDays || '--'}
                    </span>
                  </div>
                  <div className={styles['ps-days-label']}>Ngày công</div>
                </div>
              </div>

              <div className={styles['ps-table-wrap']}>
                <div>
                  <div className={styles['ps-tbl-title']}>Thu nhập</div>
                  {incomes.map((item) => (
                    <div key={item.label} className={styles['ps-row']}>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className={cx(styles, 'ps-row', 'total-row')}>
                    <span>Tổng thu nhập</span>
                    <span>{formatCurrency(totalIncome)}</span>
                  </div>
                </div>

                <div>
                  <div className={styles['ps-tbl-title']}>Khấu trừ</div>
                  {deductions.map((item) => (
                    <div key={item.label} className={styles['ps-row']}>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      <span className={styles.deduct}>−{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                  <div className={cx(styles, 'ps-row', 'total-row')}>
                    <span>Tổng khấu trừ</span>
                    <span className={styles.deduct}>−{formatCurrency(totalDeduction)}</span>
                  </div>
                </div>
              </div>

              <div className={styles['ps-net']}>
                <span className={styles['psn-label']}>LƯƠNG THỰC LĨNH</span>
                <span className={styles['psn-amount']}>{formatCurrency(netAmount)} đ</span>
              </div>

              <div className={styles['ps-words']}>{source.amountInWords || '--'}</div>

              <div className={styles['ps-footer']}>
                <div className={styles['pf-bank']}>
                  Chuyển khoản: {source.bankInfo || '--'}
                  <br />
                  Chốt ngày: {source.closedDate || '--'}
                </div>
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-secondary)' }}>
                  Nhân viên ký xác nhận:
                  <br />
                  <span
                    style={{
                      display: 'inline-block',
                      width: 120,
                      borderBottom: '1px solid var(--border)',
                      marginTop: 20,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </WireframeAppShell>
  );
}
