const pool = require('../config/db');

/**
 * Ghi log mọi thay đổi dữ liệu lương vào bảng payroll_audit_log.
 *
 * Dùng trực tiếp trong controller (sau khi thao tác thành công):
 *   await auditLog({ userId, action, periodId, employeeId, fieldName, oldValue, newValue, reason, req })
 *
 * @param {object} params
 * @param {number}      params.userId      - ID user thực hiện (bắt buộc)
 * @param {string}      params.action      - Tên hành động, VD: 'UPDATE_SALARY', 'OVERRIDE_TAX'
 * @param {number}      [params.periodId]  - ID kỳ lương liên quan
 * @param {string}      [params.employeeId]- Mã nhân viên liên quan
 * @param {number}      [params.payrollDetailId]
 * @param {string}      [params.fieldName] - Tên trường bị thay đổi
 * @param {*}           [params.oldValue]  - Giá trị cũ (sẽ stringify)
 * @param {*}           [params.newValue]  - Giá trị mới (sẽ stringify)
 * @param {string}      [params.reason]    - Lý do thay đổi
 * @param {object}      [params.req]       - Express request (lấy IP)
 * @param {object}      [params.conn]      - Tuỳ chọn: dùng connection đang mở (để audit trong transaction)
 */
async function auditLog({
  userId,
  action,
  periodId     = null,
  employeeId   = null,
  payrollDetailId = null,
  fieldName    = null,
  oldValue     = null,
  newValue     = null,
  reason       = null,
  req          = null,
  conn         = null,
}) {
  if (!userId || !action) {
    // Không throw — audit thất bại không được làm hỏng flow chính
    console.error('[auditLog] Thiếu userId hoặc action. Bỏ qua.');
    return;
  }

  const ipAddress = req
    ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null)
    : null;

  const db = conn || pool;

  try {
    await db.execute(
      `INSERT INTO payroll_audit_log
         (user_id, period_id, employee_id, payroll_detail_id,
          action, field_name, old_value, new_value, reason, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        periodId,
        employeeId,
        payrollDetailId,
        action,
        fieldName,
        oldValue  !== null ? String(oldValue)  : null,
        newValue  !== null ? String(newValue)  : null,
        reason,
        ipAddress,
      ]
    );
  } catch (err) {
    // Lỗi audit không được ảnh hưởng response chính
    console.error('[auditLog] Ghi audit log thất bại:', err.message);
  }
}

/**
 * Express middleware (tùy chọn): auto-audit theo config trên route.
 * Dùng khi muốn audit toàn bộ route mà không viết trong từng controller.
 *
 * Ví dụ: router.post('/', verifyJWT, autoAudit('CREATE_PERIOD'), controller)
 */
function autoAudit(action) {
  return async (req, res, next) => {
    // Lưu json() gốc để chặn sau khi gọi xong
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      if (body?.success !== false && req.user) {
        await auditLog({
          userId:     req.user.id,
          action,
          periodId:   req.body?.period_id   || req.params?.periodId || null,
          employeeId: req.body?.employee_id || req.params?.employeeId || null,
          req,
        });
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { auditLog, autoAudit };
