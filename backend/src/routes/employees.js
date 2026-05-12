const { Router } = require('express');
const { body, query, param } = require('express-validator');
const { verifyJWT }  = require('../middleware/auth');
const { checkRole }  = require('../middleware/rbac');
const ctrl           = require('../controllers/employeeController');

const router = Router();

// ── Validator sets ────────────────────────────────────────────────

const idParam = [
  param('id')
    .trim().notEmpty().withMessage('employee_id không được rỗng.')
    .matches(/^EC-[A-Z0-9]+$/).withMessage('Định dạng employee_id không hợp lệ (VD: EC-NVTHUONG).'),
];

const createRules = [
  body('employee_id')
    .trim().notEmpty().withMessage('employee_id là bắt buộc.')
    .matches(/^EC-[A-Z0-9]+$/).withMessage('Định dạng không hợp lệ. VD: EC-NVTHUONG.'),
  body('full_name')
    .trim().notEmpty().withMessage('Họ tên là bắt buộc.')
    .isLength({ max: 100 }).withMessage('Họ tên tối đa 100 ký tự.'),
  body('department')
    .trim().notEmpty().withMessage('Bộ phận là bắt buộc.')
    .isLength({ max: 100 }),
  body('position')
    .trim().notEmpty().withMessage('Chức vụ là bắt buộc.')
    .isLength({ max: 100 }),
  body('employment_type')
    .optional()
    .isIn(['TNC', 'TH']).withMessage('employment_type phải là TNC hoặc TH.'),
  body('standard_hours_per_day')
    .optional()
    .isFloat({ min: 1, max: 24 }).withMessage('Giờ chuẩn/ngày phải từ 1–24.'),
  body('standard_work_days')
    .optional()
    .isInt({ min: 1, max: 31 }).withMessage('Ngày công chuẩn phải từ 1–31.'),
  body('join_date')
    .notEmpty().withMessage('Ngày vào làm là bắt buộc.')
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('join_date phải đúng định dạng YYYY-MM-DD.'),
  body('resign_date')
    .optional({ nullable: true })
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('resign_date phải đúng định dạng YYYY-MM-DD.'),
  body('dependents')
    .optional()
    .isInt({ min: 0, max: 20 }).withMessage('Số người phụ thuộc phải từ 0–20.'),
  body(['base_salary', 'allowance_responsibility', 'allowance_phone',
        'allowance_transport', 'allowance_work', 'default_bonus_revenue'])
    .optional()
    .isFloat({ min: 0 }).withMessage('Giá trị tiền phải >= 0.'),
];

const updateRules = [
  ...idParam,
  body('full_name')
    .optional().trim().notEmpty().isLength({ max: 100 }),
  body('department')
    .optional().trim().notEmpty().isLength({ max: 100 }),
  body('position')
    .optional().trim().notEmpty().isLength({ max: 100 }),
  body('employment_type')
    .optional().isIn(['TNC', 'TH']).withMessage('employment_type phải là TNC hoặc TH.'),
  body('standard_hours_per_day')
    .optional().isFloat({ min: 1, max: 24 }),
  body('standard_work_days')
    .optional().isInt({ min: 1, max: 31 }),
  body('join_date')
    .optional().isDate({ format: 'YYYY-MM-DD' }).withMessage('join_date phải YYYY-MM-DD.'),
  body('resign_date')
    .optional({ nullable: true }).isDate({ format: 'YYYY-MM-DD' }),
  body('dependents')
    .optional().isInt({ min: 0, max: 20 }),
  body(['base_salary', 'allowance_responsibility', 'allowance_phone',
        'allowance_transport', 'allowance_work', 'default_bonus_revenue'])
    .optional().isFloat({ min: 0 }).withMessage('Giá trị tiền phải >= 0.'),
  body('reason')
    .optional().isString().isLength({ max: 500 }),
];

const listQueryRules = [
  query('status').optional().isIn(['active', 'inactive', 'all']).withMessage('status phải là active, inactive hoặc all.'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
];

// ── Routes ────────────────────────────────────────────────────────

router.get(
  '/',
  verifyJWT, checkRole(['ADMIN', 'KETOAN', 'QUANLY']),
  listQueryRules,
  ctrl.listEmployees
);

router.get(
  '/:id',
  verifyJWT, checkRole(['ADMIN', 'KETOAN', 'QUANLY', 'GIAMDOC']),
  idParam,
  ctrl.getEmployee
);

router.post(
  '/',
  verifyJWT, checkRole(['ADMIN', 'KETOAN']),
  createRules,
  ctrl.createEmployee
);

router.put(
  '/:id',
  verifyJWT, checkRole(['ADMIN', 'KETOAN']),
  updateRules,
  ctrl.updateEmployee
);

router.delete(
  '/:id',
  verifyJWT, checkRole(['ADMIN']),
  idParam,
  ctrl.deleteEmployee
);

module.exports = router;
