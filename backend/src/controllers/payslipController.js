const pool = require('../config/db');
const { generatePayslip, generateBatchPayslips } = require('../utils/pdfGenerator');

/**
 * GET /api/payslip/:employeeId/:period_id
 */
async function getPayslip(req, res) {
  try {
    const { employeeId, period_id } = req.params;

    // RBAC: Nhân viên chỉ xem của chính mình
    if (req.user.role === 'NHANVIEN' && req.user.employee_id !== employeeId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem phiếu lương của người khác.' });
    }

    // Kiểm tra trạng thái kỳ lương
    const [[period]] = await pool.execute('SELECT * FROM payroll_periods WHERE id = ?', [period_id]);
    if (!period) return res.status(404).json({ success: false, message: 'Kỳ lương không tồn tại.' });

    // Chỉ cho phép xem khi đã chốt (trừ Admin/Kế toán có thể xem nháp)
    if (period.status !== 'DA_CHOT' && !['ADMIN', 'KETOAN'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Phiếu lương chưa sẵn sàng (Kỳ lương chưa chốt).' });
    }

    // Lấy chi tiết lương
    const [[detail]] = await pool.execute(
      `SELECT pd.*, e.full_name, e.department, e.employment_type 
       FROM payroll_details pd
       JOIN employees e ON pd.employee_id = e.employee_id
       WHERE pd.period_id = ? AND pd.employee_id = ?`,
      [period_id, employeeId]
    );

    if (!detail) return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu lương.' });

    const pdfBuffer = await generatePayslip(detail, period);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=PhieuLuong_${employeeId}_T${period.month}_${period.year}.pdf`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[payslipController.getPayslip]', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tạo PDF.' });
  }
}

/**
 * GET /api/payslip/:period_id/batch
 */
async function getBatchPayslips(req, res) {
  try {
    const { period_id } = req.params;

    const [[period]] = await pool.execute('SELECT * FROM payroll_periods WHERE id = ?', [period_id]);
    if (!period) return res.status(404).json({ success: false, message: 'Kỳ lương không tồn tại.' });

    // Lấy toàn bộ chi tiết lương của kỳ
    const [details] = await pool.execute(
      `SELECT pd.*, e.full_name, e.department, e.employment_type 
       FROM payroll_details pd
       JOIN employees e ON pd.employee_id = e.employee_id
       WHERE pd.period_id = ?`,
      [period_id]
    );

    if (details.length === 0) return res.status(404).json({ success: false, message: 'Kỳ lương chưa có dữ liệu tính toán.' });

    const pdfBuffer = await generateBatchPayslips(details, period);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=BangLuong_TongHop_T${period.month}_${period.year}.pdf`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[payslipController.getBatchPayslips]', err);
    return res.status(500).json({ success: false, message: 'Lỗi hệ thống khi tạo PDF hàng loạt.' });
  }
}

module.exports = { getPayslip, getBatchPayslips };
