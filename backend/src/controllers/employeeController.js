const pool = require('../config/db');
const { auditLog } = require('../middleware/auditLog');
const { validationResult } = require('express-validator');

// ── Helper: chuẩn hoá lỗi validation ─────────────────────────────
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: 'Dữ liệu không hợp lệ.',
      code: 'ERR_VALIDATION',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
    return true; // caller phải return
  }
  return false;
}

// ── Các cột lương cần ghi audit khi thay đổi ─────────────────────
const SALARY_FIELDS = [
  'base_salary', 'allowance_responsibility', 'allowance_phone',
  'allowance_transport', 'allowance_work', 'default_bonus_revenue',
];

// ── Các cột được phép update (whitelist) ──────────────────────────
const UPDATABLE_FIELDS = [
  'full_name', 'department', 'position', 'employment_type',
  'standard_hours_per_day', 'standard_work_days', 'join_date', 'resign_date',
  'id_number', 'bank_name', 'bank_account', 'dependents',
  ...SALARY_FIELDS,
];


// ================================================================
// GET /api/employees
// Query: ?dept=...&status=active|inactive|all&search=...&page=1&limit=50
// ================================================================
async function listEmployees(req, res) {
  try {
    const {
      dept   = '',
      status = 'active',
      search = '',
      page   = 1,
      limit  = 50,
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset   = (pageNum - 1) * limitNum;

    // QUANLY chỉ xem được bộ phận của mình
    const deptFilter = req.user.role === 'QUANLY' && req.user.department
      ? req.user.department
      : dept;

    const conditions = [];
    const params     = [];

    if (status === 'active')   { conditions.push('is_active = TRUE');  }
    if (status === 'inactive') { conditions.push('is_active = FALSE'); }

    if (deptFilter) {
      conditions.push('department = ?');
      params.push(deptFilter);
    }

    if (search.trim()) {
      conditions.push('(full_name LIKE ? OR employee_id LIKE ?)');
      const like = `%${search.trim()}%`;
      params.push(like, like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Đếm tổng cho pagination
    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM employees ${where}`,
      params
    );

    const [rows] = await pool.execute(
      `SELECT employee_id, full_name, department, position, employment_type,
              standard_hours_per_day, standard_work_days, join_date, resign_date,
              dependents, base_salary, allowance_responsibility, allowance_phone,
              allowance_transport, allowance_work, default_bonus_revenue,
              is_active, created_at, updated_at
       FROM employees
       ${where}
       ORDER BY full_name ASC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return res.json({
      success: true,
      data: {
        employees: rows,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err) {
    console.error('[employeeController.listEmployees]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', code: 'ERR_INTERNAL' });
  }
}


// ================================================================
// GET /api/employees/:id
// ================================================================
async function getEmployee(req, res) {
  try {
    const { id } = req.params;

    // QUANLY chỉ xem được bộ phận của mình
    let deptCheck = '';
    const extraParams = [id];
    if (req.user.role === 'QUANLY' && req.user.department) {
      deptCheck = 'AND department = ?';
      extraParams.push(req.user.department);
    }

    const [rows] = await pool.execute(
      `SELECT e.employee_id, e.full_name, e.department, e.position, e.employment_type,
              e.standard_hours_per_day, e.standard_work_days, e.join_date, e.resign_date,
              e.id_number, e.bank_name, e.bank_account, e.dependents,
              e.base_salary, e.allowance_responsibility, e.allowance_phone,
              e.allowance_transport, e.allowance_work, e.default_bonus_revenue,
              e.is_active, e.created_at, e.updated_at,
              m.timeclock_code, m.timeclock_name
       FROM employees e
       LEFT JOIN employee_id_mapping m ON m.employee_id = e.employee_id AND m.is_active = TRUE
       WHERE e.employee_id = ? ${deptCheck}
       LIMIT 1`,
      extraParams
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên.', code: 'ERR_NOT_FOUND' });
    }

    // Lấy lịch sử thay đổi lương từ payroll_audit_log
    const [history] = await pool.execute(
      `SELECT pal.field_name AS field_changed, pal.old_value, pal.new_value,
              pal.reason, pal.created_at AS changed_at,
              u.full_name AS changed_by
       FROM payroll_audit_log pal
       LEFT JOIN users u ON u.id = pal.user_id
       WHERE pal.employee_id = ?
         AND pal.field_name IN ('base_salary','allowance_responsibility','allowance_phone',
                                'allowance_transport','allowance_work','default_bonus_revenue')
       ORDER BY pal.created_at DESC
       LIMIT 50`,
      [id]
    );

    return res.json({ success: true, data: { employee: { ...rows[0], salary_history: history } } });
  } catch (err) {
    console.error('[employeeController.getEmployee]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', code: 'ERR_INTERNAL' });
  }
}


// ================================================================
// POST /api/employees
// ================================================================
async function createEmployee(req, res) {
  if (handleValidation(req, res)) return;

  try {
    const {
      employee_id, full_name, department, position,
      employment_type = 'TNC',
      standard_hours_per_day = 8.00,
      standard_work_days = 26,
      join_date,
      resign_date = null,
      id_number = null,
      bank_name = null,
      bank_account = null,
      dependents = 0,
      base_salary = 0,
      allowance_responsibility = 0,
      allowance_phone = 0,
      allowance_transport = 0,
      allowance_work = 0,
      default_bonus_revenue = 0,
    } = req.body;

    // Kiểm tra employee_id trùng
    const [[existing]] = await pool.execute(
      'SELECT employee_id FROM employees WHERE employee_id = ?',
      [employee_id]
    );
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Mã nhân viên "${employee_id}" đã tồn tại.`,
        code: 'ERR_DUPLICATE',
      });
    }

    await pool.execute(
      `INSERT INTO employees
         (employee_id, full_name, department, position, employment_type,
          standard_hours_per_day, standard_work_days, join_date, resign_date,
          id_number, bank_name, bank_account, dependents,
          base_salary, allowance_responsibility, allowance_phone,
          allowance_transport, allowance_work, default_bonus_revenue)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        employee_id, full_name, department, position, employment_type,
        standard_hours_per_day, standard_work_days, join_date, resign_date,
        id_number, bank_name, bank_account, dependents,
        base_salary, allowance_responsibility, allowance_phone,
        allowance_transport, allowance_work, default_bonus_revenue,
      ]
    );

    await auditLog({
      userId: req.user.id, action: 'CREATE_EMPLOYEE',
      employeeId: employee_id, req,
    });

    const [[created]] = await pool.execute(
      'SELECT * FROM employees WHERE employee_id = ?', [employee_id]
    );
    return res.status(201).json({ success: true, data: { employee: created } });
  } catch (err) {
    console.error('[employeeController.createEmployee]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', code: 'ERR_INTERNAL' });
  }
}


// ================================================================
// PUT /api/employees/:id
// Ghi audit_log cho từng cột lương bị thay đổi
// ================================================================
async function updateEmployee(req, res) {
  if (handleValidation(req, res)) return;

  try {
    const { id } = req.params;

    const [[current]] = await pool.execute(
      'SELECT * FROM employees WHERE employee_id = ?', [id]
    );
    if (!current) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên.', code: 'ERR_NOT_FOUND' });
    }

    // Lọc chỉ các field được phép và có trong body
    const updates = {};
    for (const field of UPDATABLE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Không có trường nào để cập nhật.', code: 'ERR_NO_CHANGES' });
    }

    const setClauses = Object.keys(updates).map(f => `\`${f}\` = ?`).join(', ');
    await pool.execute(
      `UPDATE employees SET ${setClauses} WHERE employee_id = ?`,
      [...Object.values(updates), id]
    );

    // Ghi audit cho các cột lương thay đổi
    const salaryChanges = SALARY_FIELDS.filter(
      f => Object.prototype.hasOwnProperty.call(updates, f) &&
           String(current[f]) !== String(updates[f])
    );

    await Promise.all(salaryChanges.map(field =>
      auditLog({
        userId:     req.user.id,
        action:     'UPDATE_SALARY',
        employeeId: id,
        fieldName:  field,
        oldValue:   current[field],
        newValue:   updates[field],
        reason:     req.body.reason || null,
        req,
      })
    ));

    // Audit non-salary changes cũng ghi (một lần tổng hợp)
    const nonSalaryChanges = Object.keys(updates).filter(f => !SALARY_FIELDS.includes(f));
    if (nonSalaryChanges.length > 0) {
      await auditLog({
        userId:     req.user.id,
        action:     'UPDATE_EMPLOYEE',
        employeeId: id,
        fieldName:  nonSalaryChanges.join(','),
        req,
      });
    }

    const [[updated]] = await pool.execute(
      'SELECT * FROM employees WHERE employee_id = ?', [id]
    );
    return res.json({ success: true, data: { employee: updated } });
  } catch (err) {
    console.error('[employeeController.updateEmployee]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', code: 'ERR_INTERNAL' });
  }
}


// ================================================================
// DELETE /api/employees/:id   → soft delete (is_active = false)
// ================================================================
async function deleteEmployee(req, res) {
  try {
    const { id } = req.params;

    const [[current]] = await pool.execute(
      'SELECT employee_id, full_name, is_active FROM employees WHERE employee_id = ?', [id]
    );
    if (!current) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy nhân viên.', code: 'ERR_NOT_FOUND' });
    }
    if (!current.is_active) {
      return res.status(409).json({ success: false, message: 'Nhân viên đã bị vô hiệu hoá.', code: 'ERR_ALREADY_INACTIVE' });
    }

    await pool.execute(
      'UPDATE employees SET is_active = FALSE, resign_date = COALESCE(resign_date, CURDATE()) WHERE employee_id = ?',
      [id]
    );

    await auditLog({
      userId: req.user.id, action: 'DEACTIVATE_EMPLOYEE',
      employeeId: id, req,
    });

    return res.json({ success: true, data: { message: `Nhân viên ${current.full_name} đã được vô hiệu hoá.` } });
  } catch (err) {
    console.error('[employeeController.deleteEmployee]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', code: 'ERR_INTERNAL' });
  }
}


module.exports = { listEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee };
