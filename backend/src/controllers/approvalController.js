const pool = require('../config/db');

/**
 * POST /api/payroll/:period_id/submit
 * Role: KETOAN, ADMIN
 */
async function submitPayroll(req, res) {
  const conn = await pool.getConnection();
  try {
    const { period_id } = req.params;

    // 1. Kiểm tra trạng thái kỳ lương
    const [[period]] = await conn.execute('SELECT status FROM payroll_periods WHERE id = ?', [period_id]);
    if (!period) return res.status(404).json({ success: false, message: 'Kỳ lương không tồn tại.' });
    if (period.status !== 'NHAP') {
      return res.status(400).json({ success: false, message: 'Chỉ có thể submit bảng lương ở trạng thái Nháp.' });
    }

    // 2. Validate: không còn attendance warnings chưa xử lý
    const [[warnCount]] = await conn.execute(
      "SELECT COUNT(*) as c FROM attendance_records WHERE period_id = ? AND status IN ('MISSING_CHECKOUT', 'ABNORMAL')",
      [period_id]
    );
    if (warnCount.c > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Còn ${warnCount.c} bản ghi chấm công lỗi/thiếu giờ chưa xử lý. Vui lòng xác nhận trước khi submit.`,
        code: 'ERR_ATTENDANCE_WARNINGS'
      });
    }

    await conn.beginTransaction();

    // 3. Update status
    await conn.execute(
      "UPDATE payroll_periods SET status = 'CHO_DUYET', submitted_at = NOW() WHERE id = ?",
      [period_id]
    );

    // 4. History
    await conn.execute(
      "INSERT INTO approval_history (period_id, user_id, action, from_status, to_status, note) VALUES (?, ?, 'SUBMIT', 'NHAP', 'CHO_DUYET', ?)",
      [period_id, req.user.id, 'Kế toán submit bảng lương']
    );

    await conn.commit();
    return res.json({ success: true, message: 'Đã gửi bảng lương chờ phê duyệt.' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('[approvalController.submitPayroll]', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
  } finally {
    if (conn) conn.release();
  }
}

/**
 * POST /api/payroll/:period_id/approve
 * Role: KETOAN (cap 1), GIAMDOC (cap 2)
 */
async function approvePayroll(req, res) {
  const conn = await pool.getConnection();
  try {
    const { period_id } = req.params;
    const role = req.user.role;

    const [[period]] = await conn.execute('SELECT status FROM payroll_periods WHERE id = ?', [period_id]);
    if (!period) return res.status(404).json({ success: false, message: 'Kỳ lương không tồn tại.' });

    let newStatus = '';
    let oldStatus = period.status;
    let action = '';

    if (role === 'KETOAN' || role === 'ADMIN') {
      if (oldStatus !== 'CHO_DUYET') {
        return res.status(400).json({ success: false, message: 'Bảng lương chưa ở trạng thái chờ Kế toán duyệt.' });
      }
      newStatus = 'KETOAN_DUYET';
      action = 'KETOAN_APPROVE';
    } else if (role === 'GIAMDOC') {
      if (oldStatus !== 'KETOAN_DUYET') {
        return res.status(400).json({ success: false, message: 'Bảng lương phải được Kế toán duyệt trước khi Giám đốc phê duyệt.' });
      }
      newStatus = 'DA_CHOT'; 
      action = 'GIAMDOC_APPROVE';
    } else {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền phê duyệt bảng lương.' });
    }

    await conn.beginTransaction();

    let updateSql = "UPDATE payroll_periods SET status = ?, updated_at = NOW()";
    const params = [newStatus];
    if (newStatus === 'KETOAN_DUYET') updateSql += ", ketoan_approved_at = NOW()";
    if (newStatus === 'DA_CHOT') updateSql += ", giamdoc_approved_at = NOW(), locked_at = NOW()";
    
    updateSql += " WHERE id = ?";
    params.push(period_id);

    await conn.execute(updateSql, params);

    await conn.execute(
      "INSERT INTO approval_history (period_id, user_id, action, from_status, to_status, note) VALUES (?, ?, ?, ?, ?, ?)",
      [period_id, req.user.id, action, oldStatus, newStatus, `${role} phê duyệt`]
    );

    await conn.commit();
    return res.json({ success: true, message: `Phê duyệt thành công. Trạng thái mới: ${newStatus}` });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('[approvalController.approvePayroll]', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
  } finally {
    if (conn) conn.release();
  }
}

/**
 * POST /api/payroll/:period_id/reject
 * Body: { reason }
 */
async function rejectPayroll(req, res) {
  const conn = await pool.getConnection();
  try {
    const { period_id } = req.params;
    const { reason } = req.body;
    const role = req.user.role;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập lý do từ chối.' });
    }

    const [[period]] = await conn.execute('SELECT status FROM payroll_periods WHERE id = ?', [period_id]);
    if (!period) return res.status(404).json({ success: false, message: 'Kỳ lương không tồn tại.' });

    if (period.status === 'NHAP' || period.status === 'DA_CHOT') {
      return res.status(400).json({ success: false, message: 'Không thể từ chối ở trạng thái này.' });
    }

    let action = (role === 'GIAMDOC') ? 'GIAMDOC_REJECT' : 'KETOAN_REJECT';

    await conn.beginTransaction();

    await conn.execute(
      "UPDATE payroll_periods SET status = 'NHAP', updated_at = NOW() WHERE id = ?",
      [period_id]
    );

    await conn.execute(
      "INSERT INTO approval_history (period_id, user_id, action, from_status, to_status, note) VALUES (?, ?, ?, ?, 'NHAP', ?)",
      [period_id, req.user.id, action, period.status, reason]
    );

    await conn.commit();
    return res.json({ success: true, message: 'Đã từ chối bảng lương. Trạng thái đã chuyển về Nháp.' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('[approvalController.rejectPayroll]', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
  } finally {
    if (conn) conn.release();
  }
}

/**
 * GET /api/payroll/:period_id/history
 */
async function getApprovalHistory(req, res) {
  try {
    const { period_id } = req.params;
    const [history] = await pool.execute(
      `SELECT ah.*, u.full_name, u.role 
       FROM approval_history ah
       JOIN users u ON ah.user_id = u.id
       WHERE ah.period_id = ?
       ORDER BY ah.created_at DESC`,
      [period_id]
    );
    return res.json({ success: true, data: history });
  } catch (err) {
    console.error('[approvalController.getApprovalHistory]', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống.' });
  }
}

module.exports = { submitPayroll, approvePayroll, rejectPayroll, getApprovalHistory };
