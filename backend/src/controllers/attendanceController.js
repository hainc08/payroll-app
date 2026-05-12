const pool = require('../config/db');
const { parseAttendanceExcel } = require('../utils/excelParser');
const { auditLog } = require('../middleware/auditLog');

/**
 * POST /api/attendance/import
 * Multipart: file, period_id
 */
async function importPreview(req, res) {
  try {
    const { period_id } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Thiếu file chấm công.', code: 'ERR_MISSING_FILE' });
    }
    if (!period_id) {
      return res.status(400).json({ success: false, message: 'Thiếu kỳ lương (period_id).', code: 'ERR_MISSING_PERIOD' });
    }

    // Parse Excel
    const rawRecords = parseAttendanceExcel(req.file.buffer);

    // Lấy danh sách mapping hiện có
    const [mappings] = await pool.execute('SELECT timeclock_code, employee_id FROM employee_id_mapping WHERE is_active = TRUE');
    const mappingMap = new Map(mappings.map(m => [m.timeclock_code, m.employee_id]));

    // Lấy thông tin nhân viên (để hiển thị tên)
    const [employees] = await pool.execute('SELECT employee_id, full_name, department FROM employees WHERE is_active = TRUE');
    const empMap = new Map(employees.map(e => [e.employee_id, e]));

    const valid    = [];
    const warnings = [];
    const errors   = [];

    rawRecords.forEach(rec => {
      const empId = mappingMap.get(rec.timeclock_code);
      
      if (!empId) {
        errors.push({
          ...rec,
          error: `Mã máy "${rec.timeclock_code}" chưa được map với nhân viên nào.`,
          code: 'ERR_NOT_MAPPED'
        });
        return;
      }

      const empInfo = empMap.get(empId);
      if (!empInfo) {
        errors.push({
          ...rec,
          error: `Mã nhân viên "${empId}" không tồn tại hoặc đã nghỉ việc.`,
          code: 'ERR_EMP_NOT_FOUND'
        });
        return;
      }

      const enriched = {
        ...rec,
        employee_id: empId,
        full_name:   empInfo.full_name,
        department:  empInfo.department
      };

      if (rec.missing_out) {
        warnings.push({
          ...enriched,
          warning: 'Thiếu giờ Ra (Check-out). Sẽ không tính công cho ngày này.',
          code: 'WARN_MISSING_OUT'
        });
      } else if (rec.total_hours > 16) {
        warnings.push({
          ...enriched,
          warning: 'Số giờ làm bất thường (>16h). Cần kiểm tra lại.',
          code: 'WARN_ABNORMAL'
        });
      } else {
        valid.push(enriched);
      }
    });

    // Tạo batch record (ở trạng thái PREVIEW)
    const [batchResult] = await pool.execute(
      `INSERT INTO attendance_import_batches 
         (period_id, filename, total_records, valid_records, warn_records, error_records, status, imported_by)
       VALUES (?, ?, ?, ?, ?, ?, 'PREVIEW', ?)`,
      [
        period_id, 
        req.file.originalname, 
        rawRecords.length, 
        valid.length, 
        warnings.length, 
        errors.length, 
        req.user.id
      ]
    );

    return res.json({
      success: true,
      data: {
        batch_id: batchResult.insertId,
        valid,
        warnings,
        errors
      }
    });
  } catch (err) {
    console.error('[attendanceController.importPreview]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi parse file.', code: 'ERR_INTERNAL' });
  }
}

/**
 * POST /api/attendance/confirm
 * Body: { batch_id, period_id, records: [] }
 */
async function confirmImport(req, res) {
  const conn = await pool.getConnection();
  try {
    const { batch_id, period_id, records } = req.body;

    if (!period_id || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Dữ liệu không hợp lệ.', code: 'ERR_INVALID_DATA' });
    }

    await conn.beginTransaction();

    // 1. Lấy cấu hình OT và ngày lễ
    const [holidaysRows] = await conn.execute('SELECT holiday_date, ot_coefficient FROM holidays');
    const holidayMap = new Map(holidaysRows.map(h => [h.holiday_date.toISOString().split('T')[0], parseFloat(h.ot_coefficient)]));

    // 2. Lấy hours_per_day của từng NV
    const [empSettings] = await conn.execute('SELECT employee_id, standard_hours_per_day FROM employees');
    const stdHoursMap = new Map(empSettings.map(e => [e.employee_id, parseFloat(e.standard_hours_per_day)]));

    // 3. Xử lý từng bản ghi
    for (const rec of records) {
      const { employee_id, date, sessions, total_hours, missing_out } = rec;
      const stdHours = stdHoursMap.get(employee_id) || 8.0;

      // Tính công (work_days)
      let workDays = 0;
      if (!missing_out) {
        if (total_hours >= stdHours * 0.5) workDays = 1.0;
        else if (total_hours >= stdHours * 0.25) workDays = 0.5;
      }

      // Xác định ngày lễ/cuối tuần
      const d = new Date(date);
      const isWeekend = (d.getDay() === 0 || d.getDay() === 6); // Sun=0, Sat=6
      const holidayCoeff = holidayMap.get(date);
      const isHoliday = !!holidayCoeff;

      // Hệ số OT
      let otCoeff = 1.5;
      if (isHoliday) otCoeff = holidayCoeff || 3.0;
      else if (isWeekend) otCoeff = 2.0;

      const otHours = Math.max(0, total_hours - stdHours);

      // Lưu attendance_records (Raw)
      // Dùng INSERT ... ON DUPLICATE KEY UPDATE để idempotent
      await conn.execute(
        `INSERT INTO attendance_records 
           (employee_id, period_id, batch_id, work_date, 
            checkin1, checkout1, checkin2, checkout2, checkin3, checkout3, 
            total_hours, is_holiday, is_weekend, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           batch_id = VALUES(batch_id),
           checkin1 = VALUES(checkin1), checkout1 = VALUES(checkout1),
           checkin2 = VALUES(checkin2), checkout2 = VALUES(checkout2),
           checkin3 = VALUES(checkin3), checkout3 = VALUES(checkout3),
           total_hours = VALUES(total_hours),
           status = VALUES(status)`,
        [
          employee_id, period_id, batch_id, date,
          sessions[0]?.check_in || null, sessions[0]?.check_out || null,
          sessions[1]?.check_in || null, sessions[1]?.check_out || null,
          sessions[2]?.check_in || null, sessions[2]?.check_out || null,
          total_hours, isHoliday, isWeekend, missing_out ? 'MISSING_CHECKOUT' : 'OK'
        ]
      );

      // Lưu attendance_summary (Tính toán)
      await conn.execute(
        `INSERT INTO attendance_summary
           (employee_id, period_id, work_date, actual_hours, overtime_hours, work_day_count, is_holiday, is_weekend, ot_coefficient)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           actual_hours = VALUES(actual_hours),
           overtime_hours = VALUES(overtime_hours),
           work_day_count = VALUES(work_day_count),
           ot_coefficient = VALUES(ot_coefficient)`,
        [
          employee_id, period_id, date, total_hours, otHours, workDays, isHoliday, isWeekend, otCoeff
        ]
      );
    }

    // 4. Cập nhật batch status
    if (batch_id) {
      await conn.execute(
        "UPDATE attendance_import_batches SET status = 'IMPORTED', imported_at = NOW() WHERE id = ?",
        [batch_id]
      );
    }

    await conn.commit();

    await auditLog({
      userId: req.user.id,
      action: 'IMPORT_ATTENDANCE',
      periodId: period_id,
      req
    });

    return res.json({ success: true, message: `Đã import thành công ${records.length} bản ghi.` });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('[attendanceController.confirmImport]', err);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi lưu dữ liệu.', code: 'ERR_INTERNAL' });
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { importPreview, confirmImport };
