const bcrypt = require('bcryptjs');
const pool   = require('../config/db');
const { signToken } = require('../middleware/auth');

// ----------------------------------------------------------------
// POST /api/auth/login
// Body: { email, password }
// ----------------------------------------------------------------
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email và mật khẩu là bắt buộc.',
      code: 'ERR_MISSING_FIELDS',
    });
  }

  try {
    // Tìm user theo email (chỉ user đang active)
    const [rows] = await pool.execute(
      `SELECT id, username, email, password_hash, full_name, role, department, employee_id, is_active
       FROM users
       WHERE email = ? AND is_active = TRUE
       LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng.',
        code: 'ERR_INVALID_CREDENTIALS',
      });
    }

    const user = rows[0];

    // So sánh password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không đúng.',
        code: 'ERR_INVALID_CREDENTIALS',
      });
    }

    // Cập nhật last_login
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Ký JWT
    const token = signToken({
      id:          user.id,
      username:    user.username,
      email:       user.email,
      role:        user.role,
      employee_id: user.employee_id,
    });

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id:          user.id,
          username:    user.username,
          email:       user.email,
          full_name:   user.full_name,
          role:        user.role,
          department:  user.department,
          employee_id: user.employee_id,
        },
      },
    });
  } catch (err) {
    console.error('[authController.login]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ, vui lòng thử lại.',
      code: 'ERR_INTERNAL',
    });
  }
}

// ----------------------------------------------------------------
// POST /api/auth/logout
// JWT là stateless; ta chỉ xác nhận thành công (client tự xoá token).
// Nếu sau này cần blacklist token: thêm vào Redis tại đây.
// ----------------------------------------------------------------
async function logout(req, res) {
  // req.user được gắn bởi verifyJWT (route này yêu cầu auth)
  return res.json({
    success: true,
    data: { message: 'Đăng xuất thành công.' },
  });
}

// ----------------------------------------------------------------
// GET /api/auth/me
// Trả thông tin user đang đăng nhập (đã được xác thực bởi verifyJWT)
// ----------------------------------------------------------------
async function me(req, res) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, username, email, full_name, role, department, employee_id, last_login, created_at
       FROM users
       WHERE id = ? AND is_active = TRUE
       LIMIT 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không còn tồn tại hoặc đã bị vô hiệu hoá.',
        code: 'ERR_USER_NOT_FOUND',
      });
    }

    return res.json({
      success: true,
      data: { user: rows[0] },
    });
  } catch (err) {
    console.error('[authController.me]', err);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ.',
      code: 'ERR_INTERNAL',
    });
  }
}

module.exports = { login, logout, me };
