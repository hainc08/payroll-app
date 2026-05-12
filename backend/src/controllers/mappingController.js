const pool = require('../config/db');
const { auditLog } = require('../middleware/auditLog');
const { validationResult } = require('express-validator');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: 'Dữ liệu không hợp lệ.',
      code: 'ERR_VALIDATION',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
    return true;
  }
  return false;
}


// ================================================================
// GET /api/mapping
// Query: ?filter=all|mapped|unmapped&search=...&page=1&limit=50
// ================================================================
async function listMappings(req, res) {
  try {
    const {
      filter = 'all',
      search = '',
      page   = 1,
      limit  = 50,
    } = req.query;

    const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const offset   = (pageNum - 1) * limitNum;

    const conditions = [];
    const params     = [];

    if (filter === 'mapped')   { conditions.push('m.employee_id IS NOT NULL'); }
    if (filter === 'unmapped') { conditions.push('m.employee_id IS NULL');     } // chưa dùng nhưng dự phòng

    if (search.trim()) {
      conditions.push('(m.timeclock_code LIKE ? OR m.timeclock_name LIKE ? OR m.employee_id LIKE ?)');
      const like = `%${search.trim()}%`;
      params.push(like, like, like);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM employee_id_mapping m ${where}`,
      params
    );

    const [rows] = await pool.execute(
      `SELECT m.id, m.timeclock_code, m.timeclock_name, m.employee_id,
              m.is_active, m.note, m.mapped_at,
              e.full_name   AS employee_name,
              e.department  AS employee_department,
              u.username    AS mapped_by_username
       FROM employee_id_mapping m
       LEFT JOIN employees e ON e.employee_id = m.employee_id
       LEFT JOIN users     u ON u.id = m.mapped_by
       ${where}
       ORDER BY m.timeclock_code ASC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    return res.json({
      success: true,
      data: {
        mappings: rows,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err) {
    console.error('[mappingController.listMappings]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', code: 'ERR_INTERNAL' });
  }
}


// ================================================================
// POST /api/mapping
// ================================================================
async function createMapping(req, res) {
  if (handleValidation(req, res)) return;

  try {
    const {
      timeclock_code,
      timeclock_name = null,
      employee_id,
      note = null,
    } = req.body;

    // Kiểm tra timeclock_code trùng
    const [[existCode]] = await pool.execute(
      'SELECT id FROM employee_id_mapping WHERE timeclock_code = ?',
      [timeclock_code]
    );
    if (existCode) {
      return res.status(409).json({
        success: false,
        message: `Mã chấm công "${timeclock_code}" đã được mapping.`,
        code: 'ERR_DUPLICATE',
      });
    }

    // Kiểm tra employee_id tồn tại
    const [[emp]] = await pool.execute(
      'SELECT employee_id FROM employees WHERE employee_id = ? AND is_active = TRUE',
      [employee_id]
    );
    if (!emp) {
      return res.status(404).json({
        success: false,
        message: `Mã nhân viên "${employee_id}" không tồn tại hoặc đã bị vô hiệu hoá.`,
        code: 'ERR_NOT_FOUND',
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO employee_id_mapping (timeclock_code, timeclock_name, employee_id, mapped_by, note)
       VALUES (?, ?, ?, ?, ?)`,
      [timeclock_code, timeclock_name, employee_id, req.user.id, note]
    );

    await auditLog({
      userId: req.user.id, action: 'CREATE_MAPPING',
      employeeId: employee_id, req,
      newValue: timeclock_code,
    });

    const [[created]] = await pool.execute(
      'SELECT * FROM employee_id_mapping WHERE id = ?', [result.insertId]
    );
    return res.status(201).json({ success: true, data: { mapping: created } });
  } catch (err) {
    console.error('[mappingController.createMapping]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', code: 'ERR_INTERNAL' });
  }
}


// ================================================================
// PUT /api/mapping/:id
// ================================================================
async function updateMapping(req, res) {
  if (handleValidation(req, res)) return;

  try {
    const { id } = req.params;

    const [[current]] = await pool.execute(
      'SELECT * FROM employee_id_mapping WHERE id = ?', [id]
    );
    if (!current) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mapping.', code: 'ERR_NOT_FOUND' });
    }

    const ALLOWED = ['timeclock_name', 'employee_id', 'is_active', 'note'];
    const updates = {};
    for (const field of ALLOWED) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Không có trường nào để cập nhật.', code: 'ERR_NO_CHANGES' });
    }

    // Nếu đổi employee_id, kiểm tra tồn tại
    if (updates.employee_id) {
      const [[emp]] = await pool.execute(
        'SELECT employee_id FROM employees WHERE employee_id = ? AND is_active = TRUE',
        [updates.employee_id]
      );
      if (!emp) {
        return res.status(404).json({
          success: false,
          message: `Mã nhân viên "${updates.employee_id}" không tồn tại.`,
          code: 'ERR_NOT_FOUND',
        });
      }
    }

    const setClauses = Object.keys(updates).map(f => `\`${f}\` = ?`).join(', ');
    await pool.execute(
      `UPDATE employee_id_mapping SET ${setClauses}, mapped_by = ? WHERE id = ?`,
      [...Object.values(updates), req.user.id, id]
    );

    await auditLog({
      userId:     req.user.id, action: 'UPDATE_MAPPING',
      employeeId: updates.employee_id || current.employee_id,
      oldValue:   current.employee_id,
      newValue:   updates.employee_id || current.employee_id,
      req,
    });

    const [[updated]] = await pool.execute(
      'SELECT * FROM employee_id_mapping WHERE id = ?', [id]
    );
    return res.json({ success: true, data: { mapping: updated } });
  } catch (err) {
    console.error('[mappingController.updateMapping]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', code: 'ERR_INTERNAL' });
  }
}


// ================================================================
// DELETE /api/mapping/:id   [ADMIN only]
// ================================================================
async function deleteMapping(req, res) {
  try {
    const { id } = req.params;

    const [[current]] = await pool.execute(
      'SELECT * FROM employee_id_mapping WHERE id = ?', [id]
    );
    if (!current) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy mapping.', code: 'ERR_NOT_FOUND' });
    }

    await pool.execute('DELETE FROM employee_id_mapping WHERE id = ?', [id]);

    await auditLog({
      userId:     req.user.id, action: 'DELETE_MAPPING',
      employeeId: current.employee_id,
      oldValue:   current.timeclock_code,
      req,
    });

    return res.json({ success: true, data: { message: `Đã xoá mapping mã chấm công ${current.timeclock_code}.` } });
  } catch (err) {
    console.error('[mappingController.deleteMapping]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ.', code: 'ERR_INTERNAL' });
  }
}


module.exports = { listMappings, createMapping, updateMapping, deleteMapping };
