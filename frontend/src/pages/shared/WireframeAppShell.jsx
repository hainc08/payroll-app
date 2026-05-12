import styles from './Wireframe.module.css';
import useWireframeTokens from './useWireframeTokens';

const DEFAULT_NAV_ITEMS = [
  { key: 'dashboard', icon: '📊', label: 'Dashboard' },
  { key: 'employees', icon: '👥', label: 'Nhân viên' },
  { key: 'mapping', icon: '🔗', label: 'Mapping mã NV' },
  { key: 'attendance', icon: '🕐', label: 'Chấm công' },
  { key: 'payroll', icon: '💰', label: 'Bảng lương' },
  { key: 'approval', icon: '✅', label: 'Phê duyệt' },
  { key: 'payslip', icon: '📄', label: 'Phiếu lương' },
  { key: 'reports', icon: '📊', label: 'Báo cáo' },
  { key: 'settings', icon: '⚙', label: 'Cấu hình' },
];

function classNames(...names) {
  return names.filter(Boolean).join(' ');
}

function avatarToneClass(tone = 'blue') {
  if (tone === 'green') return styles['av-green'];
  if (tone === 'yellow') return styles['av-yellow'];
  if (tone === 'red') return styles['av-red'];
  return styles['av-blue'];
}

export default function WireframeAppShell({
  activeNav,
  navItems = DEFAULT_NAV_ITEMS,
  user = {},
  companyName = 'Nhà hàng ABC',
  pageTitle,
  pageSubtitle,
  topActions,
  children,
}) {
  const tokenVars = useWireframeTokens();

  return (
    <div className={styles['wireframe-root']} style={tokenVars}>
      <div className={styles['app-layout']}>
        <aside className={styles.sidebar}>
          <div className={styles['sidebar-logo']}>
            <div className={styles['s-title']}>⏱ PayRoll VN</div>
            <div className={styles['s-sub']}>{companyName}</div>
          </div>
          <nav className={styles['sidebar-nav']}>
            {navItems.map((item) => (
              <div
                key={item.key}
                className={classNames(
                  styles['nav-item'],
                  activeNav === item.key ? styles.active : ''
                )}
              >
                <span className={styles['nav-icon']}>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge ? <span className={styles['nav-badge']}>{item.badge}</span> : null}
              </div>
            ))}
          </nav>
          <div className={styles['sidebar-user']}>
            <div
              className={classNames(
                styles.avatar,
                styles['av-sm'],
                avatarToneClass(user.avatarTone)
              )}
            >
              {user.initials || 'US'}
            </div>
            <div>
              <div className={styles['u-name']}>{user.name || 'Người dùng'}</div>
              <div className={styles['u-role']}>{user.email || ''}</div>
            </div>
          </div>
        </aside>

        <div className={styles['content-area']}>
          <div className={styles.topbar}>
            <div className={styles['topbar-left']}>
              <div className={styles['t-title']}>{pageTitle}</div>
              <div className={styles['t-sub']}>{pageSubtitle}</div>
            </div>
            <div className={styles['topbar-right']}>{topActions}</div>
          </div>
          <div className={styles['page-body']}>{children}</div>
        </div>
      </div>
    </div>
  );
}

