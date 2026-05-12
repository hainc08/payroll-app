/**
 * Auth Test Suite — Sprint 1.2
 * Dùng: supertest (HTTP assertion) + jsonwebtoken (tạo token hết hạn)
 * Chạy: npm test  hoặc  node tests/auth.test.js
 *
 * Test cases:
 *  TC1 — POST /login đúng credentials → 200 + JWT + user info
 *  TC2 — POST /login sai password     → 401 ERR_INVALID_CREDENTIALS
 *  TC3 — GET  /me với JWT hợp lệ      → 200 + user info
 *  TC4 — GET  /me không có JWT        → 401 ERR_UNAUTHORIZED
 *  TC5 — RBAC: role NHANVIEN gọi route chỉ cho KETOAN → 403 ERR_FORBIDDEN
 *  TC6 — JWT hết hạn                  → 401 ERR_TOKEN_EXPIRED
 */

// ── Env phải load trước mọi require dùng process.env ─────────────
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const request  = require('supertest');
const jwt      = require('jsonwebtoken');
const express  = require('express');
const app      = require('../src/app');
const { verifyJWT }   = require('../src/middleware/auth');
const { checkRole }   = require('../src/middleware/rbac');

// ── Màu ANSI để output dễ đọc ────────────────────────────────────
const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

let passed = 0;
let failed = 0;
const results = [];

function assert(name, condition, detail = '') {
  if (condition) {
    passed++;
    results.push({ name, status: 'PASS', detail });
    console.log(`  ${GREEN}✓ PASS${RESET} ${name}${detail ? ' — ' + detail : ''}`);
  } else {
    failed++;
    results.push({ name, status: 'FAIL', detail });
    console.log(`  ${RED}✗ FAIL${RESET} ${name}${detail ? ' — ' + detail : ''}`);
  }
}

// ── TC5: mini-app dùng rbac (tách khỏi main app) ─────────────────
function buildRbacTestApp() {
  const mini = express();
  mini.use(express.json());
  mini.get(
    '/protected',
    verifyJWT,
    checkRole(['KETOAN', 'ADMIN']),  // NHANVIEN bị chặn
    (_, res) => res.json({ success: true, data: { ok: true } })
  );
  return mini;
}

// ── Tạo JWT hợp lệ cho NHANVIEN (dùng cho TC5) ───────────────────
function makeToken(payload, expiresIn = '8h') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

// ── Chạy tất cả test cases ────────────────────────────────────────
async function runTests() {
  console.log(`\n${BOLD}═══ Auth Test Suite — Sprint 1.2 ═══${RESET}\n`);

  // ================================================================
  // TC1: POST /login đúng credentials → 200 + JWT + user info
  // ================================================================
  console.log(`${YELLOW}TC1${RESET} POST /login đúng credentials`);
  try {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@nhahanggabc.vn', password: 'Admin@123' });

    assert('Status 200',                res.status === 200,            `got ${res.status}`);
    assert('success: true',             res.body.success === true);
    assert('Có field token',            typeof res.body.data?.token === 'string');
    assert('Token không rỗng',          res.body.data?.token?.length > 20);
    assert('user.role = ADMIN',         res.body.data?.user?.role === 'ADMIN');
    assert('user.username = admin',     res.body.data?.user?.username === 'admin');
    assert('Không trả password_hash',   !res.body.data?.user?.password_hash);

    // Lưu token cho TC3
    global._validToken = res.body.data.token;
  } catch (err) {
    assert('TC1 không throw', false, err.message);
  }

  // ================================================================
  // TC2: POST /login sai password → 401
  // ================================================================
  console.log(`\n${YELLOW}TC2${RESET} POST /login sai password`);
  try {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@nhahanggabc.vn', password: 'SaiMatKhau999!' });

    assert('Status 401',                    res.status === 401,            `got ${res.status}`);
    assert('success: false',                res.body.success === false);
    assert('code = ERR_INVALID_CREDENTIALS', res.body.code === 'ERR_INVALID_CREDENTIALS');
    assert('Không trả token',               !res.body.data?.token);
  } catch (err) {
    assert('TC2 không throw', false, err.message);
  }

  // ================================================================
  // TC3: GET /me với JWT hợp lệ → 200 + user info
  // ================================================================
  console.log(`\n${YELLOW}TC3${RESET} GET /me với JWT hợp lệ`);
  try {
    const token = global._validToken;
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert('Status 200',              res.status === 200,          `got ${res.status}`);
    assert('success: true',           res.body.success === true);
    assert('Có user.id',              typeof res.body.data?.user?.id === 'number');
    assert('Có user.role',            typeof res.body.data?.user?.role === 'string');
    assert('Không trả password_hash', !res.body.data?.user?.password_hash);
  } catch (err) {
    assert('TC3 không throw', false, err.message);
  }

  // ================================================================
  // TC4: GET /me không có JWT → 401
  // ================================================================
  console.log(`\n${YELLOW}TC4${RESET} GET /me không có JWT`);
  try {
    const res = await request(app)
      .get('/api/auth/me');

    assert('Status 401',              res.status === 401,    `got ${res.status}`);
    assert('success: false',          res.body.success === false);
    assert('code = ERR_UNAUTHORIZED', res.body.code === 'ERR_UNAUTHORIZED');
  } catch (err) {
    assert('TC4 không throw', false, err.message);
  }

  // ================================================================
  // TC5: RBAC — role NHANVIEN gọi route chỉ cho KETOAN → 403
  // ================================================================
  console.log(`\n${YELLOW}TC5${RESET} RBAC: NHANVIEN gọi route chỉ cho KETOAN/ADMIN`);
  try {
    const nhanvienToken = makeToken({
      id: 99, username: 'test_nv', email: 'nv@test.com',
      role: 'NHANVIEN', employee_id: 'EC-TEST',
    });

    const mini = buildRbacTestApp();

    // NHANVIEN → bị từ chối
    const res403 = await request(mini)
      .get('/protected')
      .set('Authorization', `Bearer ${nhanvienToken}`);

    assert('Status 403',             res403.status === 403,      `got ${res403.status}`);
    assert('code = ERR_FORBIDDEN',   res403.body.code === 'ERR_FORBIDDEN');

    // KETOAN → được phép
    const ketoanToken = makeToken({
      id: 2, username: 'ketoan', email: 'ketoan@nhahanggabc.vn',
      role: 'KETOAN', employee_id: null,
    });
    const res200 = await request(mini)
      .get('/protected')
      .set('Authorization', `Bearer ${ketoanToken}`);

    assert('KETOAN được phép (200)', res200.status === 200, `got ${res200.status}`);
  } catch (err) {
    assert('TC5 không throw', false, err.message);
  }

  // ================================================================
  // TC6: JWT hết hạn → 401 ERR_TOKEN_EXPIRED
  // ================================================================
  console.log(`\n${YELLOW}TC6${RESET} JWT hết hạn`);
  try {
    // Tạo token đã hết hạn (expiresIn = 1ms → đã expired ngay)
    const expiredToken = jwt.sign(
      { id: 1, username: 'admin', email: 'admin@nhahanggabc.vn', role: 'ADMIN', employee_id: null },
      process.env.JWT_SECRET,
      { expiresIn: 1 }   // 1 giây, đợi 1100ms để chắc chắn expired
    );
    await new Promise(r => setTimeout(r, 1100));

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    assert('Status 401',                  res.status === 401,             `got ${res.status}`);
    assert('code = ERR_TOKEN_EXPIRED',    res.body.code === 'ERR_TOKEN_EXPIRED');
    assert('success: false',              res.body.success === false);
  } catch (err) {
    assert('TC6 không throw', false, err.message);
  }

  // ================================================================
  // Summary
  // ================================================================
  const total = passed + failed;
  console.log(`\n${BOLD}═══════════════════════════════════════${RESET}`);
  console.log(`${BOLD}KẾT QUẢ: ${GREEN}${passed} PASS${RESET}${BOLD} / ${RED}${failed} FAIL${RESET}${BOLD} / ${total} total${RESET}`);
  console.log(`${BOLD}═══════════════════════════════════════${RESET}\n`);

  if (failed > 0) {
    console.log(`${RED}Các test FAIL:${RESET}`);
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  - ${r.name}${r.detail ? ': ' + r.detail : ''}`);
    });
  }

  // Đóng pool để process thoát
  const pool = require('../src/config/db');
  await pool.end();

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Unhandled error in test runner:', err);
  process.exit(1);
});
