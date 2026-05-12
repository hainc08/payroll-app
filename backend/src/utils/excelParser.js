const XLSX = require('xlsx');

/**
 * Parse Excel serial date (e.g. 46143) to YYYY-MM-DD string.
 */
function excelDateToDateString(serial) {
  if (!serial) return null;
  // Excel base date is Dec 30, 1899 (due to 1900 leap year bug)
  const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
  return date.toISOString().split('T')[0];
}

/**
 * Parse time from string "HH:mm" or Excel fraction (0.5 -> 12:00).
 * Returns minutes from start of day.
 */
function parseTimeToMinutes(val) {
  if (val === undefined || val === null || val === '') return null;
  
  if (typeof val === 'number') {
    // 0.5 -> 12:00 -> 720 minutes
    return Math.round(val * 24 * 60);
  }
  
  if (typeof val === 'string') {
    const parts = val.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      return h * 60 + m;
    }
  }
  
  return null;
}

/**
 * Format minutes to HH:mm string.
 */
function minutesToTimeString(minutes) {
  if (minutes === null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Parse Attendance Excel File
 * Expected columns: Ngày, Thứ, Mã NV, Tên NV, ..., Vào1, Ra1, Vào2, Ra2, Vào3, Ra3, Tổng giờ
 */
function parseAttendanceExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const records = [];

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    // Chuyển sang array 2D để tìm dòng header
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
    
    // Tìm dòng chứa "Mã NV" hoặc "Ngày"
    const headerRowIndex = rows.findIndex(row => 
      Array.isArray(row) && row.some(cell => String(cell).trim() === 'Mã NV')
    );

    if (headerRowIndex === -1) return;

    const headers = rows[headerRowIndex].map(h => String(h || '').trim());
    const dataRows = rows.slice(headerRowIndex + 1);

    dataRows.forEach(row => {
      if (!row || row.length === 0) return;

      const getVal = (names) => {
        const idx = headers.findIndex(h => names.some(n => h.toLowerCase().startsWith(n.toLowerCase())));
        return idx !== -1 ? row[idx] : null;
      };

      const dateSerial    = getVal(['Ngày']);
      const timeclockCode = getVal(['Mã NV']);
      const timeclockName = getVal(['Tên nhân viên', 'Tên NV']);
      
      if (!dateSerial || !timeclockCode) return;

      const date = excelDateToDateString(dateSerial);
      
      const vao1 = parseTimeToMinutes(getVal(['Vào 1', 'Vao 1', 'Vào1']));
      const ra1  = parseTimeToMinutes(getVal(['Ra 1', 'Ra1']));
      const vao2 = parseTimeToMinutes(getVal(['Vào 2', 'Vao 2', 'Vào2']));
      const ra2  = parseTimeToMinutes(getVal(['Ra 2', 'Ra2']));
      const vao3 = parseTimeToMinutes(getVal(['Vào 3', 'Vao 3', 'Vào3']));
      const ra3  = parseTimeToMinutes(getVal(['Ra 3', 'Ra3']));

      const sessions = [];
      let dayTotalMinutes = 0;
      let missingOut = false;

      const pairs = [[vao1, ra1], [vao2, ra2], [vao3, ra3]];
      pairs.forEach(([v, r], i) => {
        if (v !== null || r !== null) {
          sessions.push({
            session: i + 1,
            check_in: minutesToTimeString(v),
            check_out: minutesToTimeString(r)
          });
          if (v !== null && r !== null) {
            const diff = r - v;
            if (diff > 0) dayTotalMinutes += diff;
          } else if (v !== null && r === null) {
            missingOut = true;
          }
        }
      });

      const totalHours = parseFloat((dayTotalMinutes / 60).toFixed(2));

      records.push({
        timeclock_code: String(timeclockCode).trim(),
        timeclock_name: timeclockName ? String(timeclockName).trim() : null,
        date,
        sessions,
        total_hours: totalHours,
        missing_out: missingOut,
        department_sheet: sheetName
      });
    });
  });

  return records;
}

module.exports = { parseAttendanceExcel };
