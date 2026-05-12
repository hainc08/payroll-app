const pool = require('../config/db');
const { calculatePayrollDetail } = require('../utils/payrollEngine');
const { auditLog } = require('../middleware/auditLog');

/**
 * POST /api/payroll/generate
 * Body: { period_id } or { month, year }
 */
async function generatePayroll(req, res) {
  const conn = await pool.getConnection();
  try {
    let { period_id, month, year, period: periodStr } = req.body;
    let pid = period_id;

    if (!pid && periodStr) {
      const [y, m] = periodStr.split('-');
      month = m;
      year = y;
    }

    if (!pid && month && year) {
      const [[p]] = await conn.execute('SELECT id FROM payroll_periods WHERE month = ? AND year = ?', [month, year]);
      if (p) pid = p.id;
    }

    if (!pid) {
      return res.status(400).json({ success: false, message: 'Kỳ lương không tồn tại.', code: 'ERR_PERIOD_NOT_FOUND' });
    }

    // Lấy thông tin kỳ lương
    const [[periodRow]] = await conn.execute('SELECT * FROM payroll_periods WHERE id = ?', [pid]);
    if (!periodRow) {
      return res.status(404).json({ success: false, message: 'Kỳ lương không tồn tại.', code: 'ERR_PERIOD_NOT_FOUND' });
    }
    if (periodRow.status !== 'NHAP') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể tính lại lương khi trạng thái là Nháp.', code: 'ERR_INVALID_STATUS' });
    }
    const stdDays = periodRow.standard_work_days;

    await conn.beginTransaction();

    // 1. Xóa dữ liệu cũ của kỳ này
    await conn.execute('DELETE FROM payroll_details WHERE period_id = ?', [pid]);

    // 2. Lấy danh sách nhân viên
    const [employees] = await conn.execute('SELECT * FROM employees WHERE is_active = TRUE');

    // 3. Lấy toàn bộ attendance_summary của kỳ này
    const [attendance] = await conn.execute('SELECT * FROM attendance_summary WHERE period_id = ?', [pid]);
    const attMap = new Map();
    attendance.forEach(a => {
      if (!attMap.has(a.employee_id)) attMap.set(a.employee_id, []);
      attMap.get(a.employee_id).push(a);
    });

    const results = [];
    for (const emp of employees) {
      const empSummary = attMap.get(emp.employee_id) || [];
      const detail = calculatePayrollDetail(emp, empSummary, stdDays);
      
      await conn.execute(
        `INSERT INTO payroll_details 
           (period_id, employee_id, base_salary_snapshot, standard_hours_snapshot, standard_work_days_snapshot, dependents_snapshot,
            actual_work_days, overtime_hours, salary_by_work_days, overtime_pay, allowance_responsibility, allowance_phone,
            allowance_transport, allowance_work, bonus_revenue, total_income, social_insurance, advance_payment,
            tax_income, is_tax_override, other_deductions, total_deductions, net_salary, calculated_by, calculated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          pid, emp.employee_id, detail.base_salary_snapshot, detail.standard_hours_snapshot, detail.standard_work_days_snapshot, detail.dependents_snapshot,
          detail.actual_work_days, detail.overtime_hours, detail.salary_by_work_days, detail.overtime_pay, detail.allowance_responsibility, detail.allowance_phone,
          detail.allowance_transport, detail.allowance_work, detail.bonus_revenue, detail.total_income, detail.social_insurance, detail.advance_payment,
          detail.tax_income, detail.is_tax_override, detail.other_deductions, detail.total_deductions, detail.net_salary, req.user.id
        ]
      );
      results.push({ employee_id: emp.employee_id, net_salary: detail.net_salary });
    }

    // 4. Cập nhật trạng thái kỳ lương thành NHAP (Nháp)
    await conn.execute("UPDATE payroll_periods SET status = 'NHAP' WHERE id = ?", [pid]);

    await conn.commit();

    await auditLog({
      userId: req.user.id,
      action: 'GENERATE_PAYROLL',
      periodId: pid,
      req
    });

    return res.json({ success: true, message: `Đã tính lương xong cho ${employees.length} nhân viên.`, data: { count: employees.length } });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('[payrollController.generatePayroll]', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tính lương.', code: 'ERR_INTERNAL' });
  } finally {
    if (conn) conn.release();
  }
}

/**
 * GET /api/payroll/:period_id
 */
async function getPayroll(req, res) {
  try {
    let { period_id } = req.params;
    let pid = parseInt(period_id);

    // Nếu không phải số, thử tìm theo YYYY-MM
    if (isNaN(pid)) {
      const [year, month] = period_id.split('-');
      if (year && month) {
        const [[p]] = await pool.execute('SELECT id FROM payroll_periods WHERE month = ? AND year = ?', [parseInt(month), parseInt(year)]);
        if (p) pid = p.id;
      }
    }

    if (!pid || isNaN(pid)) {
      return res.status(404).json({ success: false, message: 'Kỳ lương không tồn tại.', code: 'ERR_NOT_FOUND' });
    }

    // 1. Lấy thông tin kỳ lương
    const [[period]] = await pool.execute('SELECT * FROM payroll_periods WHERE id = ?', [pid]);
    if (!period) {
      return res.status(404).json({ success: false, message: 'Kỳ lương không tồn tại.', code: 'ERR_NOT_FOUND' });
    }

    // 2. Lấy chi tiết lương
    const [details] = await pool.execute(
      `SELECT pd.*, e.full_name, e.department, e.position,
              e.employment_type, e.standard_hours_per_day
       FROM payroll_details pd
       JOIN employees e ON pd.employee_id = e.employee_id
       WHERE pd.period_id = ?
       ORDER BY e.full_name ASC`,
      [pid]
    );
    
    return res.json({ success: true, data: { details, period } });
  } catch (err) {
    console.error('[payrollController.getPayroll]', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống.', code: 'ERR_INTERNAL' });
  }
}

/**
 * PUT /api/payroll/:period_id/detail/:employee_id
 * Body: { bonus_revenue, advance_payment, tax_income, tax_override_reason, other_deductions }
 */
async function updatePayrollDetail(req, res) {
  const conn = await pool.getConnection();
  try {
    const { period_id, employee_id } = req.params;
    const { bonus_revenue, advance_payment, tax_income, tax_override_reason, other_deductions } = req.body;

    await conn.beginTransaction();

    // 0. Kiểm tra trạng thái kỳ lương
    const [[period]] = await conn.execute('SELECT status FROM payroll_periods WHERE id = ?', [period_id]);
    if (!period) return res.status(404).json({ success: false, message: 'Kỳ lương không tồn tại.' });
    if (period.status !== 'NHAP' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Bảng lương đã khóa hoặc đang chờ duyệt, không thể chỉnh sửa.', code: 'ERR_LOCKED' });
    }

    // 1. Lấy dữ liệu cũ
    const [[old]] = await conn.execute(
      'SELECT * FROM payroll_details WHERE period_id = ? AND employee_id = ?',
      [period_id, employee_id]
    );
    if (!old) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bản ghi lương.', code: 'ERR_NOT_FOUND' });
    }

    // Kiểm tra tax override
    let isTaxOverride = old.is_tax_override;
    if (tax_income !== undefined && parseFloat(tax_income) !== parseFloat(old.tax_income)) {
      if (!tax_override_reason) {
        return res.status(400).json({ success: false, message: 'Bắt buộc nhập lý do khi điều chỉnh thuế.', code: 'ERR_REASON_REQUIRED' });
      }
      isTaxOverride = true;
    }

    // 2. Tính toán lại Total Income, Total Deductions và Net Salary
    const newBonus    = bonus_revenue !== undefined ? parseFloat(bonus_revenue) : parseFloat(old.bonus_revenue);
    const newAdvance  = advance_payment !== undefined ? parseFloat(advance_payment) : parseFloat(old.advance_payment);
    const newTax      = tax_income !== undefined ? parseFloat(tax_income) : parseFloat(old.tax_income);
    const newOther    = other_deductions !== undefined ? parseFloat(other_deductions) : parseFloat(old.other_deductions);

    // total_income = Σ( salary_by_work_days...bonus_revenue)
    const totalIncome = parseFloat(old.salary_by_work_days) + 
                        parseFloat(old.overtime_pay) + 
                        parseFloat(old.allowance_responsibility) + 
                        parseFloat(old.allowance_phone) + 
                        parseFloat(old.allowance_transport) + 
                        parseFloat(old.allowance_work) + 
                        newBonus;

    const totalDeductions = parseFloat(old.social_insurance) + newAdvance + newTax + newOther;
    const netSalary = totalIncome - totalDeductions;

    // 3. Update
    await conn.execute(
      `UPDATE payroll_details SET
         bonus_revenue = ?, advance_payment = ?, tax_income = ?, 
         is_tax_override = ?, tax_override_reason = ?, other_deductions = ?,
         total_income = ?, total_deductions = ?, net_salary = ?,
         updated_at = NOW()
       WHERE id = ?`,
      [
        newBonus, newAdvance, newTax, 
        isTaxOverride, tax_override_reason || old.tax_override_reason, newOther,
        totalIncome, totalDeductions, netSalary,
        old.id
      ]
    );

    // 4. Log audit changes
    const changes = [];
    if (newBonus !== parseFloat(old.bonus_revenue)) changes.push({ field: 'bonus_revenue', old: old.bonus_revenue, new: newBonus });
    if (newAdvance !== parseFloat(old.advance_payment)) changes.push({ field: 'advance_payment', old: old.advance_payment, new: newAdvance });
    if (newTax !== parseFloat(old.tax_income)) changes.push({ field: 'tax_income', old: old.tax_income, new: newTax });
    if (newOther !== parseFloat(old.other_deductions)) changes.push({ field: 'other_deductions', old: old.other_deductions, new: newOther });

    for (const ch of changes) {
      await conn.execute(
        `INSERT INTO payroll_audit_log (user_id, period_id, employee_id, payroll_detail_id, action, field_name, old_value, new_value, reason)
         VALUES (?, ?, ?, ?, 'UPDATE_PAYROLL', ?, ?, ?, ?)`,
        [req.user.id, period_id, employee_id, old.id, ch.field, ch.old, ch.new, tax_override_reason || 'Manual update']
      );
    }

    await conn.commit();
    return res.json({ success: true, message: 'Đã cập nhật bảng lương.' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('[payrollController.updatePayrollDetail]', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống.', code: 'ERR_INTERNAL' });
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { generatePayroll, getPayroll, updatePayrollDetail };
