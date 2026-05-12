const { Router } = require('express');
const { verifyJWT } = require('../middleware/auth');
const { login, logout, me } = require('../controllers/authController');

const router = Router();

// POST /api/auth/login — không cần xác thực
router.post('/login', login);

// POST /api/auth/logout — cần token hợp lệ (để ghi nhận user)
router.post('/logout', verifyJWT, logout);

// GET /api/auth/me — trả thông tin user đang đăng nhập
router.get('/me', verifyJWT, me);

module.exports = router;
