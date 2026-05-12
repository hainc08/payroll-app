const { Router } = require('express');
const { body, query, param } = require('express-validator');
const { verifyJWT } = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');
const ctrl          = require('../controllers/mappingController');

const router = Router();

// ── Validator sets ────────────────────────────────────────────────

const idParam = [
  param('id').isInt({ min: 1 }).withMessage('id phải là số nguyên dương.'),
];

const createRules = [
  body('timeclock_code')
    .trim().notEmpty().withMessage('timeclock_code là bắt buộc.')
    .isLength({ max: 20 }).withMessage('timeclock_code tối đa 20 ký tự.'),
  body('timeclock_name')
    .optional({ nullable: true }).isString().isLength({ max: 100 }),
  body('employee_id')
    .trim().notEmpty().withMessage('employee_id là bắt buộc.')
    .matches(/^EC-[A-Z0-9]+$/).withMessage('Định dạng employee_id không hợp lệ.'),
  body('note')
    .optional({ nullable: true }).isString().isLength({ max: 255 }),
];

const updateRules = [
  ...idParam,
  body('timeclock_name')
    .optional({ nullable: true }).isString().isLength({ max: 100 }),
  body('employee_id')
    .optional()
    .trim().notEmpty()
    .matches(/^EC-[A-Z0-9]+$/).withMessage('Định dạng employee_id không hợp lệ.'),
  body('is_active')
    .optional().isBoolean().withMessage('is_active phải là true hoặc false.'),
  body('note')
    .optional({ nullable: true }).isString().isLength({ max: 255 }),
];

const listQueryRules = [
  query('filter').optional().isIn(['all', 'mapped', 'unmapped']).withMessage('filter phải là all, mapped hoặc unmapped.'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
];

// ── Routes ────────────────────────────────────────────────────────
// Tất cả routes mapping đều yêu cầu đăng nhập
// GET: mọi role xác thực đều xem được
// POST/PUT: ADMIN, KETOAN
// DELETE: ADMIN only

router.get(
  '/',
  verifyJWT, checkRole(['ADMIN', 'KETOAN', 'QUANLY', 'GIAMDOC']),
  listQueryRules,
  ctrl.listMappings
);

router.post(
  '/',
  verifyJWT, checkRole(['ADMIN', 'KETOAN']),
  createRules,
  ctrl.createMapping
);

router.put(
  '/:id',
  verifyJWT, checkRole(['ADMIN', 'KETOAN']),
  updateRules,
  ctrl.updateMapping
);

router.delete(
  '/:id',
  verifyJWT, checkRole(['ADMIN']),
  idParam,
  ctrl.deleteMapping
);

module.exports = router;
