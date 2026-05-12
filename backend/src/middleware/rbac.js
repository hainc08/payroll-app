/**
 * Middleware RBAC — kiểm tra role người dùng
 *
 * Dùng sau verifyJWT.  Ví dụ:
 *   router.post('/lock', verifyJWT, checkRole(['KETOAN', 'ADMIN']), controller)
 *
 * @param {string[]} roles - Danh sách role được phép (ít nhất 1 role)
 */
function checkRole(roles) {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new Error('checkRole() cần nhận một mảng roles không rỗng.');
  }

  return (req, res, next) => {
    // verifyJWT phải chạy trước; req.user phải tồn tại
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực.',
        code: 'ERR_UNAUTHORIZED',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền thực hiện thao tác này. Cần role: ${roles.join(', ')}.`,
        code: 'ERR_FORBIDDEN',
      });
    }

    next();
  };
}

module.exports = { checkRole };
