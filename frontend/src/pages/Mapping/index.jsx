import { Alert, Skeleton } from 'antd';
import WireframeAppShell from '../shared/WireframeAppShell';
import styles from '../shared/Wireframe.module.css';
import useRemoteData from '../shared/useRemoteData';
import { cx, getErrorText } from '../shared/utils';
import { getMappingScreenData } from '../../services/mappingService';

const defaultFetchMappingData = getMappingScreenData;

export default function MappingPage({
  data,
  fetchData = defaultFetchMappingData,
  loading,
  error,
  onImportExcel,
  onExport,
  onSearchChange,
  onFilterChange,
  onEditMapping,
  onAssignMapping,
}) {
  const { source, isLoading, error: remoteError } = useRemoteData({
    data,
    fetchData,
    loading,
    error,
  });
  const errorText = getErrorText(remoteError);

  const rows = source.rows || [];
  const mappedCount = source.mappedCount ?? rows.filter((row) => row.mapped).length;
  const unmappedCount = source.unmappedCount ?? rows.filter((row) => !row.mapped).length;

  return (
    <WireframeAppShell
      activeNav="mapping"
      companyName={source.companyName || 'Nhà hàng ABC'}
      user={source.user || { initials: 'KT', name: 'Kế toán', email: 'ketoan@abc.vn', avatarTone: 'blue' }}
      pageTitle="Mapping mã nhân viên"
      pageSubtitle="Liên kết mã máy chấm công ↔ mã lương"
      topActions={
        <>
          <span className={cx(styles, 'badge', 'badge-green')}>{mappedCount} đã map</span>
          <span className={cx(styles, 'badge', 'badge-red')}>{unmappedCount} chưa map</span>
          <button className={cx(styles, 'btn')} onClick={onImportExcel}>
            📤 Import Excel
          </button>
          <button className={cx(styles, 'btn', 'btn-blue')} onClick={onExport}>
            ⬇ Xuất DS
          </button>
        </>
      }
    >
      {errorText ? (
        <Alert
          type="error"
          showIcon
          message={errorText}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <>
          <div className={cx(styles, 'alert', 'alert-info')}>
            ℹ️{' '}
            <span>
              Chọn mã máy CC → gán NV hệ thống. Mapping chỉ cần làm <strong>1 lần</strong>.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              className={styles.input}
              placeholder="Tìm mã máy hoặc tên..."
              style={{ width: 240 }}
              defaultValue={source.search || ''}
              onChange={(event) => onSearchChange?.(event.target.value)}
            />
            <div
              style={{
                display: 'flex',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
              }}
            >
              {[
                { key: 'all', label: `Tất cả (${rows.length})`, tone: 'blue' },
                { key: 'mapped', label: `Đã map (${mappedCount})` },
                { key: 'unmapped', label: `Chưa map (${unmappedCount})`, tone: 'red' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => onFilterChange?.(tab.key)}
                  style={{
                    padding: '6px 14px',
                    fontSize: 12,
                    background:
                      source.filter === tab.key
                        ? tab.tone === 'blue'
                          ? 'var(--blue-bg)'
                          : 'transparent'
                        : 'transparent',
                    color:
                      tab.tone === 'red'
                        ? 'var(--red)'
                        : source.filter === tab.key
                        ? 'var(--blue)'
                        : 'var(--text-secondary)',
                    border: 'none',
                    borderLeft: tab.key === 'all' ? 'none' : '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles['mapping-table']}>
            <div className={styles['mt-header']}>Mã máy chấm công</div>
            <div className={styles['mt-center-h']} />
            <div className={styles['mt-header']}>Nhân viên hệ thống (mã lương)</div>

            {rows.map((row) => (
              <FragmentRow
                key={row.id || row.timeclockCode}
                row={row}
                onEditMapping={onEditMapping}
                onAssignMapping={onAssignMapping}
              />
            ))}

            {rows.length === 0 ? (
              <>
                <div style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>Không có dữ liệu</div>
                <div />
                <div style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>--</div>
              </>
            ) : null}
          </div>
        </>
      )}
    </WireframeAppShell>
  );
}

function FragmentRow({ row, onEditMapping, onAssignMapping }) {
  const isUnmapped = !row.mapped;

  return (
    <>
      <div className={cx(styles, 'mt-row-l', isUnmapped ? 'unmapped' : '')}>
        <div
          className={styles['mt-dot']}
          style={{ background: isUnmapped ? 'var(--red)' : 'var(--green)' }}
        />
        <div>
          <div className={styles['mt-code']} style={isUnmapped ? { color: 'var(--red)' } : undefined}>
            {row.timeclockCode || '--'}
          </div>
          <div className={styles['mt-sub']}>{row.timeclockName || '--'}</div>
        </div>
        {isUnmapped ? (
          <span className={cx(styles, 'badge', 'badge-red')} style={{ marginLeft: 'auto', fontSize: 10 }}>
            Chưa map
          </span>
        ) : null}
      </div>

      <div
        className={cx(styles, 'mt-row-c', isUnmapped ? 'unmapped' : '')}
        style={{ color: isUnmapped ? 'var(--red)' : 'var(--green)' }}
      >
        {isUnmapped ? '?' : '↔'}
      </div>

      <div
        className={cx(styles, 'mt-row-r', isUnmapped ? 'unmapped' : '')}
        style={isUnmapped ? { gap: 8 } : { justifyContent: 'space-between' }}
      >
        {isUnmapped ? (
          <>
            <select
              className={styles.select}
              style={{ flex: 1, borderColor: 'var(--red-border)' }}
              defaultValue=""
              onChange={(event) => onAssignMapping?.(row, event.target.value)}
            >
              <option value="">-- Chọn nhân viên để gán --</option>
              {(row.candidateOptions || []).map((option) => (
                <option key={option.value || option} value={option.value || option}>
                  {option.label || option}
                </option>
              ))}
            </select>
            <button className={cx(styles, 'btn', 'btn-danger')} style={{ fontSize: 12 }}>
              Gán
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className={cx(styles, 'avatar', 'av-sm', row.employee?.avatarTone || 'av-blue')}>
                {row.employee?.initials || 'NV'}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{row.employee?.name || '--'}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  {row.employee?.code || '--'} · {row.employee?.department || '--'}
                </div>
              </div>
            </div>
            <button
              className={cx(styles, 'btn')}
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => onEditMapping?.(row)}
            >
              ✏
            </button>
          </>
        )}
      </div>
    </>
  );
}
