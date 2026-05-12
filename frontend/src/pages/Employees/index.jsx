import { Alert, Skeleton } from 'antd';
import WireframeAppShell from '../shared/WireframeAppShell';
import styles from '../shared/Wireframe.module.css';
import useRemoteData from '../shared/useRemoteData';
import { cx, formatCurrency, getErrorText } from '../shared/utils';
import { getEmployeesScreenData } from '../../services/employeeService';

const defaultFetchEmployeesData = getEmployeesScreenData;

export default function EmployeesPage({
  data,
  fetchData = defaultFetchEmployeesData,
  loading,
  error,
  onImportExcel,
  onAddEmployee,
  onSearchChange,
  onDepartmentChange,
  onStatusChange,
  onSelectEmployee,
  onEditEmployee,
  onDeactivateEmployee,
  onTabChange,
}) {
  const { source, isLoading, error: remoteError } = useRemoteData({
    data,
    fetchData,
    loading,
    error,
  });
  const errorText = getErrorText(remoteError);

  const employees = source.employees || [];
  const selectedEmployee =
    source.selectedEmployee ||
    employees.find((item) => item.id === source.selectedEmployeeId) ||
    employees[0] ||
    null;

  const tabs = source.tabs || ['Hồ sơ', 'Thông tin lương', 'Lịch sử lương', 'Chấm công'];
  const activeTab = source.activeTab || tabs[0];

  const personalInfo = source.personalInfo || [];
  const salaryInfo = source.salaryInfo || [];
  const salaryEstimate = source.salaryEstimate || {};

  return (
    <WireframeAppShell
      activeNav="employees"
      companyName={source.companyName || 'Nhà hàng ABC'}
      user={source.user || { initials: 'KT', name: 'Kế toán', email: 'ketoan@abc.vn', avatarTone: 'blue' }}
      pageTitle="Quản lý nhân viên"
      pageSubtitle={`${source.totalEmployees ?? employees.length ?? 0} nhân viên đang hoạt động`}
      topActions={
        <>
          <button className={cx(styles, 'btn')} onClick={onImportExcel}>
            📤 Import Excel
          </button>
          <button className={cx(styles, 'btn', 'btn-blue')} onClick={onAddEmployee}>
            + Thêm nhân viên
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
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div className={styles['emp-layout']}>
            <div className={styles['emp-list']}>
              <div className={styles['emp-list-filters']}>
                <input
                  className={styles.input}
                  placeholder="Tìm tên, mã NV..."
                  defaultValue={source.search || ''}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    className={styles.select}
                    style={{ flex: 1 }}
                    defaultValue={source.departmentFilter || 'all'}
                    onChange={(event) => onDepartmentChange?.(event.target.value)}
                  >
                    <option value="all">Tất cả bộ phận</option>
                    {(source.departmentOptions || []).map((department) => (
                      <option key={department.value || department} value={department.value || department}>
                        {department.label || department}
                      </option>
                    ))}
                  </select>
                  <select
                    className={styles.select}
                    style={{ flex: 1 }}
                    defaultValue={source.statusFilter || 'active'}
                    onChange={(event) => onStatusChange?.(event.target.value)}
                  >
                    <option value="active">Đang làm việc</option>
                    <option value="inactive">Đã nghỉ</option>
                    <option value="all">Tất cả</option>
                  </select>
                </div>
              </div>

              <div className={styles['emp-list-scroll']}>
                {employees.map((employee) => (
                  <div
                    key={employee.id || employee.employee_id}
                    className={cx(
                      styles,
                      'emp-item',
                      selectedEmployee &&
                        (selectedEmployee.id || selectedEmployee.employee_id) ===
                          (employee.id || employee.employee_id)
                        ? 'active'
                        : ''
                    )}
                    onClick={() => onSelectEmployee?.(employee)}
                  >
                    <div
                      className={cx(
                        styles,
                        'avatar',
                        'av-md',
                        employee.avatarTone || 'av-blue'
                      )}
                    >
                      {employee.initials || 'NV'}
                    </div>
                    <div className={styles['ei-info']}>
                      <div className={styles['ei-name']}>{employee.name || employee.full_name || '--'}</div>
                      <div className={styles['ei-meta']}>
                        {employee.code || employee.employee_id || '--'} · {employee.department || '--'}
                      </div>
                    </div>
                    <div className={styles['ei-salary']}>
                      <div className={styles['ei-amt']}>{formatCurrency(employee.salary)}</div>
                      <div className={styles['ei-type']}>
                        {(employee.employmentType || employee.employment_type || '--')}{' '}
                        {(employee.standardHours || employee.standard_hours_per_day)
                          ? `· ${employee.standardHours || employee.standard_hours_per_day}h`
                          : ''}
                      </div>
                    </div>
                  </div>
                ))}
                {employees.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                    Chưa có dữ liệu nhân viên
                  </div>
                ) : null}
              </div>
            </div>

            <div className={styles['emp-detail']}>
              <div className={styles['emp-detail-header']}>
                <div className={styles['edh-left']}>
                  <div className={cx(styles, 'avatar', 'av-lg', selectedEmployee?.avatarTone || 'av-green')}>
                    {selectedEmployee?.initials || 'NV'}
                  </div>
                  <div>
                    <div className={styles['edh-name']}>{selectedEmployee?.name || selectedEmployee?.full_name || '--'}</div>
                    <div className={styles['edh-meta']}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                        {selectedEmployee?.code || selectedEmployee?.employee_id || '--'}
                      </span>
                      <span className={cx(styles, 'badge', 'badge-green')}>
                        {selectedEmployee?.statusLabel || 'Đang làm'}
                      </span>
                      <span className={cx(styles, 'badge', 'badge-blue')}>
                        {selectedEmployee?.employmentType || selectedEmployee?.employment_type || '--'}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className={cx(styles, 'btn')} onClick={() => onEditEmployee?.(selectedEmployee)}>
                    ✏️ Chỉnh sửa
                  </button>
                  <button
                    className={cx(styles, 'btn', 'btn-danger')}
                    onClick={() => onDeactivateEmployee?.(selectedEmployee)}
                  >
                    Vô hiệu hoá
                  </button>
                </div>
              </div>

              <div className={styles.tabs}>
                {tabs.map((tab) => (
                  <div
                    key={tab}
                    className={cx(styles, 'tab', activeTab === tab ? 'active' : '')}
                    onClick={() => onTabChange?.(tab)}
                  >
                    {tab}
                  </div>
                ))}
              </div>

              <div className={styles['tab-content']}>
                <div className={styles['detail-grid']}>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '.4px',
                        marginBottom: 10,
                      }}
                    >
                      Thông tin cá nhân
                    </div>
                    <div className={styles['detail-rows']}>
                      {personalInfo.map((row) => (
                        <div key={row.label} className={styles['detail-row']}>
                          <span className={styles['dr-label']}>{row.label}</span>
                          <span className={styles['dr-value']}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '.4px',
                        marginBottom: 10,
                      }}
                    >
                      Cấu trúc lương
                    </div>
                    <div className={styles['detail-rows']}>
                      {salaryInfo.map((row) => (
                        <div key={row.label} className={styles['detail-row']}>
                          <span className={styles['dr-label']}>{row.label}</span>
                          <span className={styles['dr-value']}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className={styles['salary-est-box']}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Ước tính tháng đủ công
                      </div>
                      <div className={styles['seb-row']}>
                        <span style={{ color: 'var(--text-secondary)' }}>Gross</span>
                        <span>{salaryEstimate.gross || '--'}</span>
                      </div>
                      <div className={styles['seb-row']}>
                        <span style={{ color: 'var(--text-secondary)' }}>BHXH + Thuế</span>
                        <span style={{ color: 'var(--red)' }}>{salaryEstimate.deduction || '--'}</span>
                      </div>
                      <div className={cx(styles, 'seb-row', 'seb-total')}>
                        <span style={{ color: 'var(--green)' }}>NET thực lĩnh</span>
                        <span style={{ color: 'var(--green)' }}>{salaryEstimate.net || '--'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </WireframeAppShell>
  );
}
