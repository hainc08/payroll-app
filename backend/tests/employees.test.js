/**
 * Smoke Test — Sprint 1.3: Employee & Mapping API
 * Chạy: node tests/employees.test.js
 *
 * Covers:
 *  E1  GET /employees               (list, pagination)
 *  E2  GET /employees/:id           (found)
 *  E3  GET /employees/:id           (not found → 404)
 *  E4  POST /employees              (create mới)
 *  E5  POST /employees              (duplicate → 409)
 *  E6  POST /employees              (validation error → 422)
 *  E7  PUT  /employees/:id          (update + audit salary)
 *  E8  DELETE /employees/:id        (soft delete)
 *  E9  DELETE /employees/:id        (KETOAN cố xoá → 403)
 *  M1  GET /mapping                 (list)
 *  M2  POST /mapping                (create)
 *  M3  PUT  /mapping/:id            (update)
 *  M4  DELETE /mapping/:id          (KETOAN cố xoá → 403)
 *  M5  DELETE /mapping/:id          (ADMIN xoá thành công)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const request = require('supertest');
const app     = require('../src/app');
const pool    = require('../src/config/db');

const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const YELLOW= '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';

let passed = 0; let failed = 0;
const failures = [];

function assert(name, condition, detail = '') {
  if (condition) {
    passed++;
    process.stdout.write(`  ${GREEN}✓${RESET} ${name}${detail ? '  (' + detail + ')' : ''}\n`);
  } else {
    failed++;
    failures.push(`${name}${detail ? ': ' + detail : ''}`);
    process.stdout.write(`  ${RED}✗ FAIL${RESET} ${name}${detail ? '  (' + detail + ')' : ''}\n`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────
async function login(email, password) {
  const r = await request(app).post('/api/auth/login').send({ email, password });
  return r.body.data?.token;
}

function auth(token) { return { Authorization: `Bearer ${token}` }; }

// ── Test runner ───────────────────────────────────────────────────
async function run() {
  console.log(`\n${BOLD}═══ Sprint 1.3 Smoke Test: Employee & Mapping API ═══${RESET}\n`);

  const adminToken  = await login('admin@nhahanggabc.vn', 'Admin@123');
  const ketoanToken = await login('ketoan@nhahanggabc.vn', 'Admin@123');

  if (!adminToken || !ketoanToken) {
    console.error(`${RED}Login thất bại — dừng test.${RESET}`);
    process.exit(1);
  }

  // Clean up test data from previous runs
  await pool.execute("DELETE FROM employee_id_mapping WHERE timeclock_code = 'TC-TEST-99'").catch(() => {});
  await pool.execute("DELETE FROM employees WHERE employee_id = 'EC-TEST99'").catch(() => {});

  // ──────────────────────────────────────────────────────────────
  console.log(`\n${YELLOW}Employees${RESET}`);
  // ──────────────────────────────────────────────────────────────

  // E1: List employees
  {
    const r = await request(app).get('/api/employees').set(auth(adminToken));
    assert('E1 GET /employees → 200',          r.status === 200,            `got ${r.status}`);
    assert('E1 Có array employees',             Array.isArray(r.body.data?.employees));
    assert('E1 Có pagination',                  typeof r.body.data?.pagination?.total === 'number');
    assert('E1 Seed data có 5 NV',              r.body.data?.employees?.length >= 5);
  }

  // E2: Get employee by id (exists)
  {
    const r = await request(app).get('/api/employees/EC-NVTHUONG').set(auth(adminToken));
    assert('E2 GET /employees/EC-NVTHUONG → 200',  r.status === 200,         `got ${r.status}`);
    assert('E2 Trả đúng employee_id',              r.body.data?.employee?.employee_id === 'EC-NVTHUONG');
    assert('E2 Không trả password_hash',           !r.body.data?.employee?.password_hash);
  }

  // E3: Get employee by id (not found)
  {
    const r = await request(app).get('/api/employees/EC-KHONGTONTAI').set(auth(adminToken));
    assert('E3 GET /employees/EC-KHONGTONTAI → 404', r.status === 404,       `got ${r.status}`);
    assert('E3 code = ERR_NOT_FOUND',                 r.body.code === 'ERR_NOT_FOUND');
  }

  // E4: Create employee
  {
    const payload = {
      employee_id: 'EC-TEST99',
      full_name: 'Nhân Viên Kiểm Thử',
      department: 'Văn phòng',
      position: 'Thực tập sinh',
      employment_type: 'TH',
      join_date: '2026-01-01',
      base_salary: 5000000,
    };
    const r = await request(app).post('/api/employees').set(auth(ketoanToken)).send(payload);
    assert('E4 POST /employees → 201',        r.status === 201,              `got ${r.status}`);
    assert('E4 employee_id đúng',             r.body.data?.employee?.employee_id === 'EC-TEST99');
    assert('E4 base_salary đúng',             parseFloat(r.body.data?.employee?.base_salary) === 5000000);
  }

  // E5: Duplicate create
  {
    const payload = { employee_id: 'EC-TEST99', full_name: 'X', department: 'Y', position: 'Z', join_date: '2026-01-01' };
    const r = await request(app).post('/api/employees').set(auth(adminToken)).send(payload);
    assert('E5 Duplicate POST → 409',          r.status === 409,             `got ${r.status}`);
    assert('E5 code = ERR_DUPLICATE',          r.body.code === 'ERR_DUPLICATE');
  }

  // E6: Validation error (thiếu required field)
  {
    const r = await request(app).post('/api/employees').set(auth(adminToken))
      .send({ employee_id: 'INVALID-FORMAT', department: 'X', position: 'Y' }); // thiếu full_name, join_date
    assert('E6 Validation error → 422',        r.status === 422,             `got ${r.status}`);
    assert('E6 code = ERR_VALIDATION',         r.body.code === 'ERR_VALIDATION');
    assert('E6 Có errors array',               Array.isArray(r.body.errors));
  }

  // E7: Update employee (đổi salary → phải ghi audit)
  {
    const r = await request(app).put('/api/employees/EC-TEST99').set(auth(adminToken))
      .send({ base_salary: 6000000, reason: 'Tăng lương thử test' });
    assert('E7 PUT /employees/EC-TEST99 → 200',  r.status === 200,           `got ${r.status}`);
    assert('E7 base_salary đã cập nhật',          parseFloat(r.body.data?.employee?.base_salary) === 6000000);

    // Verify audit log was written
    const [[log]] = await pool.execute(
      "SELECT * FROM payroll_audit_log WHERE action='UPDATE_SALARY' AND employee_id='EC-TEST99' ORDER BY created_at DESC LIMIT 1"
    );
    assert('E7 Audit log ghi được',    !!log,                                log ? `field=${log.field_name}` : 'no log found');
    assert('E7 Audit ghi đúng field',  log?.field_name === 'base_salary');
    assert('E7 Audit ghi đúng old',    log?.old_value === '5000000.00');
    assert('E7 Audit ghi đúng new',    log?.new_value === '6000000');
  }

  // E8: Soft delete (ADMIN)
  {
    const r = await request(app).delete('/api/employees/EC-TEST99').set(auth(adminToken));
    assert('E8 DELETE /employees/EC-TEST99 → 200',  r.status === 200,        `got ${r.status}`);

    const [[emp]] = await pool.execute('SELECT is_active FROM employees WHERE employee_id = ?', ['EC-TEST99']);
    assert('E8 is_active = false (soft delete)',  emp?.is_active === 0 || emp?.is_active === false);
  }

  // E9: KETOAN cố xoá → 403
  {
    const r = await request(app).delete('/api/employees/EC-NVTHUONG').set(auth(ketoanToken));
    assert('E9 KETOAN DELETE → 403',   r.status === 403,                     `got ${r.status}`);
    assert('E9 code = ERR_FORBIDDEN',  r.body.code === 'ERR_FORBIDDEN');
  }

  // ──────────────────────────────────────────────────────────────
  console.log(`\n${YELLOW}Mapping${RESET}`);
  // ──────────────────────────────────────────────────────────────

  // M1: List mappings
  {
    const r = await request(app).get('/api/mapping').set(auth(adminToken));
    assert('M1 GET /mapping → 200',              r.status === 200,           `got ${r.status}`);
    assert('M1 Có array mappings',               Array.isArray(r.body.data?.mappings));
    assert('M1 Seed data có ≥3 mappings',        r.body.data?.mappings?.length >= 3);
    assert('M1 Có field employee_name (JOIN)',    r.body.data?.mappings?.[0]?.employee_name !== undefined);
  }

  // M2: Create mapping
  let createdMappingId;
  {
    // Reactivate EC-TEST99 để có thể map (hoặc dùng NV khác chưa bị map)
    const r = await request(app).post('/api/mapping').set(auth(adminToken))
      .send({ timeclock_code: 'TC-TEST-99', employee_id: 'EC-NVTHUONG', note: 'Test mapping' });
    // EC-NVTHUONG đang active
    assert('M2 POST /mapping → 201',             r.status === 201,           `got ${r.status}`);
    createdMappingId = r.body.data?.mapping?.id;
    assert('M2 Có id mới',                       typeof createdMappingId === 'number');
  }

  // M3: Update mapping
  {
    const r = await request(app).put(`/api/mapping/${createdMappingId}`).set(auth(ketoanToken))
      .send({ note: 'Note cập nhật', is_active: false });
    assert('M3 PUT /mapping/:id → 200',          r.status === 200,           `got ${r.status}`);
    assert('M3 note đã cập nhật',                r.body.data?.mapping?.note === 'Note cập nhật');
  }

  // M4: KETOAN cố xoá → 403
  {
    const r = await request(app).delete(`/api/mapping/${createdMappingId}`).set(auth(ketoanToken));
    assert('M4 KETOAN DELETE /mapping → 403',    r.status === 403,           `got ${r.status}`);
    assert('M4 code = ERR_FORBIDDEN',            r.body.code === 'ERR_FORBIDDEN');
  }

  // M5: ADMIN xoá thành công
  {
    const r = await request(app).delete(`/api/mapping/${createdMappingId}`).set(auth(adminToken));
    assert('M5 ADMIN DELETE /mapping → 200',     r.status === 200,           `got ${r.status}`);

    const [[deleted]] = await pool.execute('SELECT * FROM employee_id_mapping WHERE id = ?', [createdMappingId]);
    assert('M5 Row đã bị xoá khỏi DB',          !deleted);
  }

  // ──────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${BOLD}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}KẾT QUẢ: ${GREEN}${passed} PASS${RESET}${BOLD} / ${RED}${failed} FAIL${RESET}${BOLD} / ${total} total${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════════════════${RESET}`);
  if (failures.length) {
    console.log(`\n${RED}Failures:${RESET}`);
    failures.forEach(f => console.log(`  - ${f}`));
  }

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => { console.error('Unhandled:', err); process.exit(1); });
