const { Router } = require('express');
const { verifyJWT } = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');
const ctrl = require('../controllers/payslipController');

const router = Router();

/**
 * @route GET /api/payslip/:period_id/batch
 * @desc  Get batch payslips PDF
 * @access ADMIN, KETOAN, GIAMDOC
 */
router.get(
  '/:period_id/batch',
  verifyJWT,
  checkRole(['ADMIN', 'KETOAN', 'GIAMDOC']),
  ctrl.getBatchPayslips
);

/**
 * @route GET /api/payslip/:employeeId/:period_id
 * @desc  Get individual payslip PDF
 */
router.get(
  '/:employeeId/:period_id',
  verifyJWT,
  ctrl.getPayslip
);

module.exports = router;
