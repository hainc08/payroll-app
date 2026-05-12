const jwt = require('jsonwebtoken');

const SECRET     = process.env.JWT_SECRET;
const EXPIRES_IN = '8h';
const REFRESH_THRESHOLD_SECS = 3600; // 1h còn lại → phát token mới

/**
 * Middleware: xác thực JWT từ header Authorization: Bearer <token>
 * Nếu hợp lệ: gắn req.user = { id, username, email, role, employee_id }
 * Nếu còn < 1h: gắn res header X-Token-Refreshed với token mới
 */
function verifyJWT(req, res, next) {
  // Ưu tiên Authorization header, fallback sang query param ?token= (dùng cho PDF window.open)
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Chưa đăng nhập hoặc thiếu token.',
      code: 'ERR_UNAUTHORIZED',
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, SECRET);
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: isExpired ? 'Phiên đăng nhập đã hết hạn.' : 'Token không hợp lệ.',
      code: isExpired ? 'ERR_TOKEN_EXPIRED' : 'ERR_TOKEN_INVALID',
    });
  }

  req.user = {
    id:          decoded.id,
    username:    decoded.username,
    email:       decoded.email,
    role:        decoded.role,
    employee_id: decoded.employee_id ?? null,
  };

  // --- Auto-refresh: nếu token còn < 1h thì phát token mới ---
  const nowSecs = Math.floor(Date.now() / 1000);
  if (decoded.exp - nowSecs < REFRESH_THRESHOLD_SECS) {
    const refreshed = jwt.sign(
      {
        id:          decoded.id,
        username:    decoded.username,
        email:       decoded.email,
        role:        decoded.role,
        employee_id: decoded.employee_id ?? null,
      },
      SECRET,
      { expiresIn: EXPIRES_IN }
    );
    res.setHeader('X-Token-Refreshed', refreshed);
  }

  next();
}

/**
 * Tạo JWT cho user (dùng trong login)
 */
function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

module.exports = { verifyJWT, signToken };
