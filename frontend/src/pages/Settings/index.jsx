import { Alert, Skeleton } from 'antd';
import WireframeAppShell from '../shared/WireframeAppShell';
import styles from '../shared/Wireframe.module.css';
import useRemoteData from '../shared/useRemoteData';
import { cx, getErrorText } from '../shared/utils';
import { getSettingsScreenData as defaultFetchSettingsData } from '../../services/settingsService';

export default function SettingsPage({
  data,
  fetchData = defaultFetchSettingsData,
  loading,
  error,
  onSave,
  onAction,
}) {
  const { source, isLoading, error: remoteError } = useRemoteData({
    data,
    fetchData,
    loading,
    error,
  });
  const errorText = getErrorText(remoteError);
  const groups = source.groups || [];

  return (
    <WireframeAppShell
      activeNav="settings"
      companyName={source.companyName || 'Nhà hàng ABC'}
      user={source.user || { initials: 'AD', name: 'Admin', email: 'admin@abc.vn', avatarTone: 'red' }}
      pageTitle="Cấu hình hệ thống"
      pageSubtitle={source.pageSubtitle || 'Admin only'}
      topActions={
        <button className={cx(styles, 'btn', 'btn-primary')} onClick={onSave}>
          💾 Lưu thay đổi
        </button>
      }
    >
      {errorText ? (
        <Alert type="error" showIcon message={errorText} style={{ marginBottom: 12 }} />
      ) : null}

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <div className={styles['settings-grid']}>
          {groups.map((group) => (
            <div key={group.key || group.title} className={styles['setting-card']}>
              <div className={styles['sc-title']}>{group.title}</div>
              {(group.rows || []).map((row) => (
                <div key={row.key || row.label} className={styles['sc-row']}>
                  <span className={styles['scr-label']}>{row.label}</span>
                  <span className={styles['scr-val']}>
                    {row.badge ? (
                      <span className={cx(styles, 'badge', `badge-${row.badge}`)}>{row.value}</span>
                    ) : row.button ? (
                      <button
                        className={cx(styles, 'btn', row.button.tone ? `btn-${row.button.tone}` : '')}
                        style={{ fontSize: 11, padding: '3px 8px' }}
                        onClick={() => onAction?.(row)}
                      >
                        {row.button.label}
                      </button>
                    ) : (
                      row.value
                    )}
                  </span>
                </div>
              ))}
            </div>
          ))}

          {groups.length === 0 ? (
            <div className={styles['setting-card']}>
              <div className={styles['sc-title']}>Chưa có dữ liệu cấu hình</div>
            </div>
          ) : null}
        </div>
      )}
    </WireframeAppShell>
  );
}
