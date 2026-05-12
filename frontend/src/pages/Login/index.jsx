import { Alert } from 'antd';
import { useMemo, useState } from 'react';
import styles from '../shared/Wireframe.module.css';
import useWireframeTokens from '../shared/useWireframeTokens';
import { cx, getErrorText } from '../shared/utils';

export default function LoginPage({
  email = '',
  password = '',
  loading = false,
  error,
  note = 'Hệ thống nội bộ — Liên hệ Admin để được cấp tài khoản',
  onSubmit,
  onEmailChange,
  onPasswordChange,
}) {
  const tokenVars = useWireframeTokens();
  const [internalEmail, setInternalEmail] = useState(email);
  const [internalPassword, setInternalPassword] = useState(password);

  const controlledEmail = onEmailChange ? email : internalEmail;
  const controlledPassword = onPasswordChange ? password : internalPassword;

  const errorText = getErrorText(error);

  const canSubmit = useMemo(
    () => Boolean(controlledEmail?.trim() && controlledPassword),
    [controlledEmail, controlledPassword]
  );

  return (
    <div className={styles['wireframe-root']} style={tokenVars}>
      <div className={styles['login-wrap']}>
        <div className={styles['login-box']}>
          <div className={styles['login-logo']}>
            <div className={styles['ll-icon']}>⏱</div>
            <div className={styles['ll-title']}>PayRoll VN</div>
            <div className={styles['ll-sub']}>Hệ thống chấm công & tính lương</div>
          </div>

          {errorText ? (
            <Alert
              type="error"
              showIcon
              message={errorText}
              style={{ marginBottom: 12 }}
            />
          ) : null}

          <form
            className={styles['login-form']}
            onSubmit={(event) => {
              event.preventDefault();
              if (!canSubmit || loading) return;
              onSubmit?.({
                email: controlledEmail,
                password: controlledPassword,
              });
            }}
          >
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                className={styles.input}
                type="email"
                value={controlledEmail}
                onChange={(event) => {
                  if (onEmailChange) onEmailChange(event.target.value);
                  else setInternalEmail(event.target.value);
                }}
                placeholder="ketoan@abc.vn"
                autoComplete="username"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Mật khẩu</label>
              <input
                className={styles.input}
                type="password"
                value={controlledPassword}
                onChange={(event) => {
                  if (onPasswordChange) onPasswordChange(event.target.value);
                  else setInternalPassword(event.target.value);
                }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className={cx(styles, 'btn', 'btn-primary')}
              style={{
                justifyContent: 'center',
                padding: '9px',
                opacity: loading || !canSubmit ? 0.65 : 1,
                cursor: loading || !canSubmit ? 'not-allowed' : 'pointer',
              }}
              disabled={loading || !canSubmit}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
              {note}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

