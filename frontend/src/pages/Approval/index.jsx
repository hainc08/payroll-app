import { Alert, Skeleton } from 'antd';
import WireframeAppShell from '../shared/WireframeAppShell';
import styles from '../shared/Wireframe.module.css';
import useRemoteData from '../shared/useRemoteData';
import { cx, getErrorText } from '../shared/utils';
import { getApprovalScreenData } from '../../services/approvalService';

export default function ApprovalPage({
  data,
  fetchData,
  loading,
  error,
  period,
  onReject,
  onApprove,
}) {
  const { source, isLoading, error: remoteError } = useRemoteData({
    data,
    fetchData: fetchData || (() => getApprovalScreenData(period)),
    loading,
    error,
  });
  const errorText = getErrorText(remoteError);

  const summaryRows = source.summaryRows || [];
  const timeline = source.timeline || [];
  const periodLabel =
    source.periodLabel ||
    (source.periodInfo?.month && source.periodInfo?.year
      ? `Tháng ${source.periodInfo.month}/${source.periodInfo.year}`
      : 'Kỳ hiện tại');

  return (
    <WireframeAppShell
      activeNav="approval"
      companyName={source.companyName || 'Nhà hàng ABC'}
      user={source.user || { initials: 'GĐ', name: 'Giám đốc', email: 'giamdoc@abc.vn', avatarTone: 'red' }}
      pageTitle={`Phê duyệt lương — ${periodLabel}`}
      pageSubtitle={source.pageSubtitle || 'Giám đốc · Xem xét và quyết định'}
      topActions={
        <>
          <button className={cx(styles, 'btn', 'btn-danger')} onClick={onReject}>
            ✕ Từ chối
          </button>
          <button className={cx(styles, 'btn', 'btn-primary')} onClick={onApprove}>
            ✓ Duyệt & Chốt lương
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
        <div className={styles['approval-layout']}>
          <div>
            <div className={styles.card} style={{ marginBottom: 12 }}>
              <div className={styles['panel-title']}>Tóm tắt kỳ lương</div>
              <div className={styles['summary-rows']}>
                {summaryRows.map((row) => (
                  <div
                    key={row.label}
                    className={cx(styles, 'sum-row', row.total ? 'total' : '')}
                  >
                    <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                    <strong style={row.tone === 'red' ? { color: 'var(--red)' } : undefined}>
                      {row.value}
                    </strong>
                  </div>
                ))}
                {source.compareText ? (
                  <div className={styles['sum-row']}>
                    <span style={{ color: 'var(--text-secondary)' }}>So với tháng trước</span>
                    <strong style={{ color: source.compareTone === 'down' ? 'var(--red)' : 'var(--green)' }}>
                      {source.compareText}
                    </strong>
                  </div>
                ) : null}
              </div>
            </div>

            {source.overrideCount > 0 ? (
              <div className={cx(styles, 'alert', 'alert-warn')}>
                ⚠️ <span>{source.overrideCount} dòng thuế TNCN đã điều chỉnh thủ công</span>
              </div>
            ) : null}
          </div>

          <div className={styles.card}>
            <div className={styles['panel-title']}>Lịch sử phê duyệt</div>
            {timeline.map((item, index) => (
              <div key={item.id || index} className={styles['tl-node']}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                  <div className={cx(styles, 'tl-icon', item.tone || 'pending')}>
                    {item.tone === 'done' ? '✓' : item.tone === 'rejected' ? '✕' : '?'}
                  </div>
                  {index < timeline.length - 1 ? (
                    <div
                      style={{
                        width: 1,
                        flex: 1,
                        background: 'var(--border)',
                        margin: '4px 0',
                        minHeight: 16,
                      }}
                    />
                  ) : null}
                </div>
                <div className={styles['tl-body']}>
                  <div className={styles['tl-title']}>{item.title}</div>
                  <div className={styles['tl-meta']}>{item.meta}</div>
                </div>
              </div>
            ))}

            {timeline.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Chưa có lịch sử phê duyệt</div>
            ) : null}
          </div>
        </div>
      )}
    </WireframeAppShell>
  );
}
