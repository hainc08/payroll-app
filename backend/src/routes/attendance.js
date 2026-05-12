const { Router } = require('express');
const multer = require('multer');
const { verifyJWT } = require('../middleware/auth');
const { checkRole } = require('../middleware/rbac');
const ctrl = require('../controllers/attendanceController');

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * @route POST /api/attendance/import
 * @desc  Upload Excel file and get preview
 * @access KETOAN, ADMIN
 */
router.post(
  '/import',
  verifyJWT,
  checkRole(['KETOAN', 'ADMIN']),
  upload.single('file'),
  ctrl.importPreview
);

/**
 * @route POST /api/attendance/confirm
 * @desc  Confirm and save records to DB
 * @access KETOAN, ADMIN
 */
router.post(
  '/confirm',
  verifyJWT,
  checkRole(['KETOAN', 'ADMIN']),
  ctrl.confirmImport
);

module.exports = router;
