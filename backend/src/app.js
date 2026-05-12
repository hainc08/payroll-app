require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const authRoutes      = require('./routes/auth');
const employeeRoutes  = require('./routes/employees');
const mappingRoutes    = require('./routes/mapping');
const attendanceRoutes = require('./routes/attendance');
const payrollRoutes    = require('./routes/payroll');
const payslipRoutes    = require('./routes/payslip');

const app = express();

// ── Security ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:         process.env.FRONTEND_URL || '*',
  exposedHeaders: ['X-Token-Refreshed'],
}));

// ── Body parsing ─────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Routes ───────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/mapping',   mappingRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payroll',    payrollRoutes);
app.use('/api/payslip',    payslipRoutes);

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ success: true, data: { status: 'ok' } }));

// ── 404 ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint không tồn tại.', code: 'ERR_NOT_FOUND' });
});

// ── Global error handler ─────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[UnhandledError]', err);
  res.status(500).json({ success: false, message: 'Lỗi máy chủ.', code: 'ERR_INTERNAL' });
});

module.exports = app;
