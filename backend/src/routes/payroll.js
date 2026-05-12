const { Router } = require('express');
const { verifyJWT } = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');
const ctrl = require('../controllers/payrollController');
const approvalCtrl = require('../controllers/approvalController');

const router = Router();

/**
 * @route POST /api/payroll/generate
 * @desc  Bulk generate payroll for a period
 * @access KETOAN, ADMIN
 */
router.post(
  '/generate',
  verifyJWT,
  checkRole(['KETOAN', 'ADMIN']),
  ctrl.generatePayroll
);

/**
 * @route GET /api/payroll/:period_id
 * @desc  Get payroll list for a period
 * @access KETOAN, ADMIN, GIAMDOC
 */
router.get(
  '/:period_id',
  verifyJWT,
  checkRole(['KETOAN', 'ADMIN', 'GIAMDOC']),
  ctrl.getPayroll
);

/**
 * @route PUT /api/payroll/:period_id/detail/:employee_id
 * @desc  Update specific payroll fields for an employee
 * @access KETOAN, ADMIN
 */
router.put(
  '/:period_id/detail/:employee_id',
  verifyJWT,
  checkRole(['KETOAN', 'ADMIN']),
  ctrl.updatePayrollDetail
);

/**
 * Approval Workflow
 */
router.post(
  '/:period_id/submit',
  verifyJWT,
  checkRole(['KETOAN', 'ADMIN']),
  approvalCtrl.submitPayroll
);

router.post(
  '/:period_id/approve',
  verifyJWT,
  checkRole(['KETOAN', 'ADMIN', 'GIAMDOC']),
  approvalCtrl.approvePayroll
);

router.post(
  '/:period_id/reject',
  verifyJWT,
  checkRole(['KETOAN', 'ADMIN', 'GIAMDOC']),
  approvalCtrl.rejectPayroll
);

router.get(
  '/:period_id/history',
  verifyJWT,
  checkRole(['KETOAN', 'ADMIN', 'GIAMDOC']),
  approvalCtrl.getApprovalHistory
);

module.exports = router;
