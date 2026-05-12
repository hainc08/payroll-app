-- ============================================================
-- Hệ thống Chấm công & Tính lương v1.1
-- MariaDB 10.6 | utf8mb4_unicode_ci
-- DB: salary | Tạo: 2026-05-12
-- ============================================================
-- Thứ tự tạo bảng (tuân theo FK dependencies):
--   employees → users → employee_id_mapping → holidays
--   → system_config → payroll_periods
--   → attendance_import_batches → attendance_records
--   → attendance_summary → payroll_details
--   → payroll_audit_log → approval_history → salary_history
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';
SET foreign_key_checks = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE DATABASE IF NOT EXISTS `salary`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `salary`;


-- ============================================================
-- TABLE: employees
-- Hồ sơ nhân viên + thông tin lương cơ bản
-- PK: employee_id dạng "EC-NVTHUONG" (mã lương)
-- ============================================================
CREATE TABLE IF NOT EXISTS `employees` (
  `employee_id`                VARCHAR(20)      NOT NULL                   COMMENT 'Mã lương: EC-NVTHUONG',
  `full_name`                  VARCHAR(100)     NOT NULL,
  `department`                 VARCHAR(100)     NOT NULL                   COMMENT 'Nhà hàng, Văn phòng...',
  `position`                   VARCHAR(100)     NOT NULL                   COMMENT 'Quản lý, Nhân viên...',
  `employment_type`            ENUM('TNC','TH') NOT NULL DEFAULT 'TNC'     COMMENT 'TNC=Toàn thời gian, TH=Thời vụ',
  `standard_hours_per_day`     DECIMAL(4,2)     NOT NULL DEFAULT 8.00      COMMENT 'Giờ chuẩn/ngày theo HĐ (8 hoặc 9)',
  `standard_work_days`         TINYINT UNSIGNED NOT NULL DEFAULT 26        COMMENT 'Ngày công chuẩn/tháng',
  `join_date`                  DATE             NOT NULL,
  `resign_date`                DATE             NULL     DEFAULT NULL,
  -- Thông tin định danh (nhạy cảm — mã hoá ở tầng app)
  `id_number`                  VARCHAR(20)      NULL     DEFAULT NULL       COMMENT 'CCCD hoặc Hộ chiếu',
  `bank_name`                  VARCHAR(100)     NULL     DEFAULT NULL,
  `bank_account`               VARCHAR(50)      NULL     DEFAULT NULL,
  `dependents`                 TINYINT UNSIGNED NOT NULL DEFAULT 0          COMMENT 'Số người phụ thuộc (tính giảm trừ thuế TNCN)',
  -- Thông tin lương cơ bản (theo HĐ)
  `base_salary`                DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Lương thoả thuận HĐ (gross)',
  `allowance_responsibility`   DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Phụ cấp trách nhiệm',
  `allowance_phone`            DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Trợ cấp điện thoại',
  `allowance_transport`        DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Trợ cấp xăng xe / đi lại',
  `allowance_work`             DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Trợ cấp công việc',
  `default_bonus_revenue`      DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Thưởng doanh thu mặc định (có thể ghi đè mỗi tháng)',
  `is_active`                  BOOLEAN          NOT NULL DEFAULT TRUE,
  `created_at`                 DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                 DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`employee_id`)
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Hồ sơ nhân viên + thông tin lương cơ bản';

CREATE INDEX `idx_emp_department`      ON `employees` (`department`);
CREATE INDEX `idx_emp_employment_type` ON `employees` (`employment_type`);
CREATE INDEX `idx_emp_is_active`       ON `employees` (`is_active`);
CREATE INDEX `idx_emp_join_date`       ON `employees` (`join_date`);


-- ============================================================
-- TABLE: users
-- Tài khoản đăng nhập + role
-- employee_id: nullable — chỉ role NHANVIEN mới liên kết
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(50)     NOT NULL,
  `email`         VARCHAR(100)    NOT NULL,
  `password_hash` VARCHAR(255)    NOT NULL                    COMMENT 'bcrypt hash',
  `full_name`     VARCHAR(100)    NOT NULL,
  `role`          ENUM('ADMIN','GIAMDOC','KETOAN','QUANLY','NHANVIEN')
                                  NOT NULL DEFAULT 'NHANVIEN',
  `department`    VARCHAR(100)    NULL DEFAULT NULL            COMMENT 'Cho QUANLY: giới hạn xem bộ phận này',
  `employee_id`   VARCHAR(20)     NULL DEFAULT NULL            COMMENT 'Liên kết employees (role NHANVIEN)',
  `is_active`     BOOLEAN         NOT NULL DEFAULT TRUE,
  `last_login`    DATETIME        NULL DEFAULT NULL,
  `created_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email`    (`email`),
  CONSTRAINT `fk_users_employee_id`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Tài khoản đăng nhập + role';

CREATE INDEX `idx_users_role`      ON `users` (`role`);
CREATE INDEX `idx_users_is_active` ON `users` (`is_active`);


-- ============================================================
-- TABLE: employee_id_mapping  [MODULE 0]
-- Map mã máy chấm công (00002) ↔ mã lương (EC-NVTHUONG)
-- ============================================================
CREATE TABLE IF NOT EXISTS `employee_id_mapping` (
  `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `timeclock_code` VARCHAR(20)   NOT NULL                     COMMENT 'Mã máy chấm công: 00002',
  `timeclock_name` VARCHAR(100)  NULL DEFAULT NULL             COMMENT 'Tên hiển thị trên máy CC',
  `employee_id`    VARCHAR(20)   NOT NULL                     COMMENT 'Mã lương: EC-NVTHUONG',
  `mapped_by`      INT UNSIGNED  NULL DEFAULT NULL,
  `mapped_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active`      BOOLEAN       NOT NULL DEFAULT TRUE,
  `note`           VARCHAR(255)  NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_mapping_timeclock_code` (`timeclock_code`),
  CONSTRAINT `fk_mapping_employee_id`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_mapping_mapped_by`
    FOREIGN KEY (`mapped_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Map mã máy chấm công ↔ mã lương nhân viên';

CREATE INDEX `idx_mapping_employee_id` ON `employee_id_mapping` (`employee_id`);
CREATE INDEX `idx_mapping_is_active`   ON `employee_id_mapping` (`is_active`);


-- ============================================================
-- TABLE: holidays
-- Danh sách ngày lễ (áp hệ số OT 3x theo cấu hình)
-- ============================================================
CREATE TABLE IF NOT EXISTS `holidays` (
  `id`             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `holiday_date`   DATE            NOT NULL,
  `name`           VARCHAR(100)    NOT NULL,
  `ot_coefficient` DECIMAL(3,1)    NOT NULL DEFAULT 3.0        COMMENT 'Mặc định 3.0x theo luật',
  `year`           SMALLINT UNSIGNED NOT NULL,
  `created_by`     INT UNSIGNED    NULL DEFAULT NULL,
  `created_at`     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_holidays_date` (`holiday_date`),
  CONSTRAINT `fk_holidays_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Ngày lễ theo năm — dùng khi tính hệ số OT';

CREATE INDEX `idx_holidays_year` ON `holidays` (`year`);


-- ============================================================
-- TABLE: system_config
-- Cấu hình hệ thống dạng key-value (Module 7)
-- ============================================================
CREATE TABLE IF NOT EXISTS `system_config` (
  `config_key`   VARCHAR(100)  NOT NULL,
  `config_value` TEXT          NOT NULL,
  `config_group` VARCHAR(50)   NOT NULL DEFAULT 'general'
                               COMMENT 'ot_rate | tax | bhxh | payroll | company',
  `description`  VARCHAR(255)  NULL DEFAULT NULL,
  `updated_by`   INT UNSIGNED  NULL DEFAULT NULL,
  `updated_at`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_key`),
  CONSTRAINT `fk_config_updated_by`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Cấu hình hệ thống — hệ số OT, biểu thuế, ngày công chuẩn...';

CREATE INDEX `idx_config_group` ON `system_config` (`config_group`);


-- ============================================================
-- TABLE: payroll_periods
-- Kỳ lương (tháng/năm + luồng trạng thái)
-- Trạng thái: NHAP → CHO_DUYET → KETOAN_DUYET → GIAMDOC_DUYET → DA_CHOT
-- ============================================================
CREATE TABLE IF NOT EXISTS `payroll_periods` (
  `id`                  INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `month`               TINYINT UNSIGNED NOT NULL                   COMMENT '1–12',
  `year`                SMALLINT UNSIGNED NOT NULL,
  `status`              ENUM('NHAP','CHO_DUYET','KETOAN_DUYET','GIAMDOC_DUYET','DA_CHOT')
                                          NOT NULL DEFAULT 'NHAP',
  `standard_work_days`  TINYINT UNSIGNED NOT NULL DEFAULT 26,
  `note`                TEXT             NULL DEFAULT NULL,
  `created_by`          INT UNSIGNED     NOT NULL,
  `submitted_at`        DATETIME         NULL DEFAULT NULL,
  `ketoan_approved_at`  DATETIME         NULL DEFAULT NULL,
  `giamdoc_approved_at` DATETIME         NULL DEFAULT NULL,
  `locked_at`           DATETIME         NULL DEFAULT NULL,
  `created_at`          DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`          DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_period_month_year` (`month`, `year`),
  CONSTRAINT `fk_period_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Kỳ lương theo tháng/năm + trạng thái phê duyệt';

CREATE INDEX `idx_period_status`     ON `payroll_periods` (`status`);
CREATE INDEX `idx_period_year_month` ON `payroll_periods` (`year`, `month`);


-- ============================================================
-- TABLE: attendance_import_batches
-- Theo dõi từng lần import file chấm công Excel
-- ============================================================
CREATE TABLE IF NOT EXISTS `attendance_import_batches` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `period_id`     INT UNSIGNED  NOT NULL,
  `filename`      VARCHAR(255)  NOT NULL,
  `total_records` INT UNSIGNED  NOT NULL DEFAULT 0,
  `valid_records` INT UNSIGNED  NOT NULL DEFAULT 0,
  `warn_records`  INT UNSIGNED  NOT NULL DEFAULT 0,
  `error_records` INT UNSIGNED  NOT NULL DEFAULT 0,
  `status`        ENUM('PREVIEW','IMPORTED','CANCELLED') NOT NULL DEFAULT 'PREVIEW',
  `imported_by`   INT UNSIGNED  NOT NULL,
  `imported_at`   DATETIME      NULL DEFAULT NULL,
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_batch_period_id`
    FOREIGN KEY (`period_id`) REFERENCES `payroll_periods` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_batch_imported_by`
    FOREIGN KEY (`imported_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Lịch sử import file chấm công Excel';

CREATE INDEX `idx_batch_period_id` ON `attendance_import_batches` (`period_id`);
CREATE INDEX `idx_batch_status`    ON `attendance_import_batches` (`status`);


-- ============================================================
-- TABLE: attendance_records
-- Dữ liệu chấm công thô — 1 hàng = 1 ngày 1 nhân viên
-- Lưu tối đa 3 ca vào/ra (khớp format Excel ZKTeco/Ronald Jack)
-- ============================================================
CREATE TABLE IF NOT EXISTS `attendance_records` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` VARCHAR(20)     NOT NULL,
  `period_id`   INT UNSIGNED    NOT NULL,
  `batch_id`    INT UNSIGNED    NULL DEFAULT NULL,
  `work_date`   DATE            NOT NULL,
  -- Ca 1
  `checkin1`    TIME            NULL DEFAULT NULL,
  `checkout1`   TIME            NULL DEFAULT NULL,
  -- Ca 2
  `checkin2`    TIME            NULL DEFAULT NULL,
  `checkout2`   TIME            NULL DEFAULT NULL,
  -- Ca 3
  `checkin3`    TIME            NULL DEFAULT NULL,
  `checkout3`   TIME            NULL DEFAULT NULL,
  -- Tổng hợp (tính từ các ca, hoặc lấy từ cột Tổng giờ trong Excel)
  `total_hours` DECIMAL(5,2)    NULL DEFAULT NULL              COMMENT 'Tổng giờ làm thực tế trong ngày',
  `is_holiday`  BOOLEAN         NOT NULL DEFAULT FALSE,
  `is_weekend`  BOOLEAN         NOT NULL DEFAULT FALSE,
  `status`      ENUM('OK','MISSING_CHECKOUT','ABNORMAL','MANUAL_EDIT')
                                NOT NULL DEFAULT 'OK',
  `note`        TEXT            NULL DEFAULT NULL,
  -- Audit khi chỉnh sửa thủ công
  `edited_by`   INT UNSIGNED    NULL DEFAULT NULL,
  `edited_at`   DATETIME        NULL DEFAULT NULL,
  `edit_reason` TEXT            NULL DEFAULT NULL              COMMENT 'Bắt buộc khi chỉnh tay',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_att_rec_emp_date` (`employee_id`, `work_date`),
  CONSTRAINT `fk_att_rec_employee_id`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_att_rec_period_id`
    FOREIGN KEY (`period_id`) REFERENCES `payroll_periods` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_att_rec_batch_id`
    FOREIGN KEY (`batch_id`) REFERENCES `attendance_import_batches` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_att_rec_edited_by`
    FOREIGN KEY (`edited_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Dữ liệu chấm công thô: 1 hàng = 1 ngày × 1 NV, tối đa 3 ca';

CREATE INDEX `idx_att_rec_employee_id` ON `attendance_records` (`employee_id`);
CREATE INDEX `idx_att_rec_period_id`   ON `attendance_records` (`period_id`);
CREATE INDEX `idx_att_rec_work_date`   ON `attendance_records` (`work_date`);
CREATE INDEX `idx_att_rec_status`      ON `attendance_records` (`status`);


-- ============================================================
-- TABLE: attendance_summary
-- Tổng hợp ngày công / giờ OT mỗi ngày (sau khi tính toán)
-- ============================================================
CREATE TABLE IF NOT EXISTS `attendance_summary` (
  `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `employee_id`    VARCHAR(20)   NOT NULL,
  `period_id`      INT UNSIGNED  NOT NULL,
  `work_date`      DATE          NOT NULL,
  `actual_hours`   DECIMAL(5,2)  NOT NULL DEFAULT 0.00         COMMENT 'Tổng giờ làm thực tế',
  `overtime_hours` DECIMAL(5,2)  NOT NULL DEFAULT 0.00         COMMENT 'Giờ OT (= actual - chuẩn, min 0)',
  `work_day_count` DECIMAL(3,2)  NOT NULL DEFAULT 0.00         COMMENT '0 | 0.5 | 1.0 — theo ngưỡng cấu hình',
  `is_holiday`     BOOLEAN       NOT NULL DEFAULT FALSE,
  `is_weekend`     BOOLEAN       NOT NULL DEFAULT FALSE,
  `ot_coefficient` DECIMAL(3,1)  NOT NULL DEFAULT 1.50         COMMENT '1.5 thường | 2.0 cuối tuần | 3.0 lễ',
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_att_sum_emp_date` (`employee_id`, `work_date`),
  CONSTRAINT `fk_att_sum_employee_id`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_att_sum_period_id`
    FOREIGN KEY (`period_id`) REFERENCES `payroll_periods` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Tổng hợp ngày công và giờ OT mỗi ngày sau khi tính toán';

CREATE INDEX `idx_att_sum_employee_id` ON `attendance_summary` (`employee_id`);
CREATE INDEX `idx_att_sum_period_id`   ON `attendance_summary` (`period_id`);
CREATE INDEX `idx_att_sum_work_date`   ON `attendance_summary` (`work_date`);


-- ============================================================
-- TABLE: payroll_details
-- Chi tiết lương 23 cột từng nhân viên trong kỳ (Module 3)
-- ============================================================
CREATE TABLE IF NOT EXISTS `payroll_details` (
  `id`                           INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `period_id`                    INT UNSIGNED     NOT NULL,
  `employee_id`                  VARCHAR(20)      NOT NULL,
  -- Snapshot HĐ tại thời điểm tính (bảo toàn lịch sử khi NV được tăng lương)
  `base_salary_snapshot`         DECIMAL(15,2)    NOT NULL                   COMMENT 'Lương HĐ gross lúc tính',
  `standard_hours_snapshot`      DECIMAL(4,2)     NOT NULL                   COMMENT 'Giờ chuẩn/ngày lúc tính',
  `standard_work_days_snapshot`  TINYINT UNSIGNED NOT NULL,
  `dependents_snapshot`          TINYINT UNSIGNED NOT NULL DEFAULT 0          COMMENT 'Số người PT dùng để tính thuế',
  -- Cột 8–9: Chấm công
  `actual_work_days`             DECIMAL(5,2)     NOT NULL DEFAULT 0.00,
  `overtime_hours`               DECIMAL(5,2)     NOT NULL DEFAULT 0.00,
  -- Cột 10–16: Thu nhập
  `salary_by_work_days`          DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Lương theo công = HĐ÷NC_chuẩn×NC_thực',
  `overtime_pay`                 DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Lương OT = (HĐ÷NC÷Giờ)×OT×hệ_số',
  `allowance_responsibility`     DECIMAL(15,2)    NOT NULL DEFAULT 0.00,
  `allowance_phone`              DECIMAL(15,2)    NOT NULL DEFAULT 0.00,
  `allowance_transport`          DECIMAL(15,2)    NOT NULL DEFAULT 0.00,
  `allowance_work`               DECIMAL(15,2)    NOT NULL DEFAULT 0.00,
  `bonus_revenue`                DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Thưởng DT — nhập tay mỗi tháng',
  `total_income`                 DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Σ cột 10–16',
  -- Cột 18–22: Khấu trừ
  `social_insurance`             DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'BHXH NV 10.5%',
  `advance_payment`              DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Tạm ứng — nhập tay',
  `tax_income`                   DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Thuế TNCN (tự tính hoặc override)',
  `is_tax_override`              BOOLEAN          NOT NULL DEFAULT FALSE,
  `tax_override_reason`          TEXT             NULL DEFAULT NULL            COMMENT 'Bắt buộc khi is_tax_override = TRUE',
  `other_deductions`             DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Giảm trừ khác — nhập tay',
  `total_deductions`             DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'Σ cột 18–21',
  -- Cột 23: Lương thực lĩnh
  `net_salary`                   DECIMAL(15,2)    NOT NULL DEFAULT 0.00       COMMENT 'total_income − total_deductions',
  -- Metadata
  `calculated_at`                DATETIME         NULL DEFAULT NULL,
  `calculated_by`                INT UNSIGNED     NULL DEFAULT NULL,
  `created_at`                   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_pd_period_employee` (`period_id`, `employee_id`),
  CONSTRAINT `fk_pd_period_id`
    FOREIGN KEY (`period_id`) REFERENCES `payroll_periods` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_pd_employee_id`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_pd_calculated_by`
    FOREIGN KEY (`calculated_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Chi tiết 23 cột bảng lương từng NV trong kỳ';

CREATE INDEX `idx_pd_period_id`      ON `payroll_details` (`period_id`);
CREATE INDEX `idx_pd_employee_id`    ON `payroll_details` (`employee_id`);
CREATE INDEX `idx_pd_net_salary`     ON `payroll_details` (`net_salary`);
CREATE INDEX `idx_pd_is_tax_override` ON `payroll_details` (`is_tax_override`);


-- ============================================================
-- TABLE: payroll_audit_log
-- Lịch sử MỌI thay đổi dữ liệu lương (append-only)
-- Ghi log: ai | khi nào | trường nào | cũ → mới | lý do
-- ============================================================
CREATE TABLE IF NOT EXISTS `payroll_audit_log` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`           INT UNSIGNED    NOT NULL,
  `period_id`         INT UNSIGNED    NULL DEFAULT NULL,
  `employee_id`       VARCHAR(20)     NULL DEFAULT NULL,
  `payroll_detail_id` INT UNSIGNED    NULL DEFAULT NULL          COMMENT 'Tham chiếu lỏng, không FK',
  `action`            VARCHAR(50)     NOT NULL
                      COMMENT 'UPDATE_SALARY|OVERRIDE_TAX|EDIT_ATTENDANCE|CREATE_PERIOD|...',
  `field_name`        VARCHAR(100)    NULL DEFAULT NULL,
  `old_value`         TEXT            NULL DEFAULT NULL,
  `new_value`         TEXT            NULL DEFAULT NULL,
  `reason`            TEXT            NULL DEFAULT NULL,
  `ip_address`        VARCHAR(45)     NULL DEFAULT NULL,
  `created_at`        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_audit_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_audit_period_id`
    FOREIGN KEY (`period_id`) REFERENCES `payroll_periods` (`id`)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT `fk_audit_employee_id`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Audit log toàn bộ thay đổi dữ liệu lương — append-only';

CREATE INDEX `idx_audit_user_id`     ON `payroll_audit_log` (`user_id`);
CREATE INDEX `idx_audit_period_id`   ON `payroll_audit_log` (`period_id`);
CREATE INDEX `idx_audit_employee_id` ON `payroll_audit_log` (`employee_id`);
CREATE INDEX `idx_audit_action`      ON `payroll_audit_log` (`action`);
CREATE INDEX `idx_audit_created_at`  ON `payroll_audit_log` (`created_at`);


-- ============================================================
-- TABLE: approval_history
-- Lịch sử phê duyệt bảng lương (ai | quyết định | lúc nào | ghi chú)
-- ============================================================
CREATE TABLE IF NOT EXISTS `approval_history` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `period_id`   INT UNSIGNED  NOT NULL,
  `user_id`     INT UNSIGNED  NOT NULL,
  `action`      ENUM('SUBMIT','KETOAN_APPROVE','KETOAN_REJECT','GIAMDOC_APPROVE','GIAMDOC_REJECT')
                              NOT NULL,
  `from_status` ENUM('NHAP','CHO_DUYET','KETOAN_DUYET','GIAMDOC_DUYET','DA_CHOT') NOT NULL,
  `to_status`   ENUM('NHAP','CHO_DUYET','KETOAN_DUYET','GIAMDOC_DUYET','DA_CHOT') NOT NULL,
  `note`        TEXT          NULL DEFAULT NULL                COMMENT 'Lý do từ chối — bắt buộc khi REJECT',
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_approval_period_id`
    FOREIGN KEY (`period_id`) REFERENCES `payroll_periods` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_approval_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Lịch sử phê duyệt bảng lương 2 cấp';

CREATE INDEX `idx_approval_period_id` ON `approval_history` (`period_id`);
CREATE INDEX `idx_approval_user_id`   ON `approval_history` (`user_id`);
CREATE INDEX `idx_approval_action`    ON `approval_history` (`action`);


-- ============================================================
-- TABLE: salary_history
-- Lịch sử thay đổi lương (Tab "Lịch sử lương" trong wireframes)
-- ============================================================
CREATE TABLE IF NOT EXISTS `salary_history` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `employee_id`     VARCHAR(20)   NOT NULL,
  `change_type`     VARCHAR(50)   NOT NULL
                    COMMENT 'TANG_LUONG|DIEU_CHINH_PC|HET_THU_VIEC|GIAM_LUONG|...',
  `effective_date`  DATE          NOT NULL,
  `old_base_salary` DECIMAL(15,2) NULL DEFAULT NULL,
  `new_base_salary` DECIMAL(15,2) NULL DEFAULT NULL,
  `old_allowances`  JSON          NULL DEFAULT NULL            COMMENT 'Snapshot phụ cấp trước',
  `new_allowances`  JSON          NULL DEFAULT NULL            COMMENT 'Snapshot phụ cấp sau',
  `reason`          TEXT          NULL DEFAULT NULL,
  `changed_by`      INT UNSIGNED  NOT NULL,
  `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sal_hist_employee_id`
    FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT `fk_sal_hist_changed_by`
    FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  COMMENT='Lịch sử thay đổi lương và phụ cấp nhân viên';

CREATE INDEX `idx_sal_hist_employee_id`    ON `salary_history` (`employee_id`);
CREATE INDEX `idx_sal_hist_effective_date` ON `salary_history` (`effective_date`);


-- ============================================================
-- ============================================================
-- SEED DATA
-- ============================================================
-- Mật khẩu mặc định cho tất cả user seed: Admin@123
-- Hash (bcrypt cost=10) — tạo lại bằng:
--   node -e "require('bcrypt').hash('Admin@123',10).then(console.log)"
-- ⚠️  ĐỔI MẬT KHẨU TRƯỚC KHI DEPLOY LÊN PRODUCTION
-- ============================================================


-- ------------------------------------------------------------
-- Seed: 5 nhân viên mẫu (từ wireframes.md)
-- ------------------------------------------------------------
INSERT INTO `employees`
  (employee_id, full_name, department, position, employment_type,
   standard_hours_per_day, standard_work_days, join_date,
   id_number, bank_name, bank_account, dependents,
   base_salary, allowance_responsibility, allowance_phone,
   allowance_transport, allowance_work, default_bonus_revenue,
   is_active)
VALUES
  -- 1. Nguyễn Văn Thương — Quản lý Nhà hàng (dữ liệu đầy đủ từ wireframes)
  ('EC-NVTHUONG', N'Nguyễn Văn Thương', N'Nhà hàng', N'Quản lý',
   'TNC', 9.00, 26, '2022-03-01',
   '079084524521', 'ACB', '8901234521', 2,
   20000000.00, 10150000.00, 500000.00, 0.00, 0.00, 17120000.00,
   TRUE),

  -- 2. Phạm Thị Ngọc Bích — Văn phòng (mã CC 00002)
  ('EC-PTNBICH', N'Phạm Thị Ngọc Bích', N'Văn phòng', N'Nhân viên',
   'TNC', 8.00, 26, '2023-01-15',
   '079091238765', 'Vietcombank', '0011002345678', 1,
   12000000.00, 0.00, 300000.00, 200000.00, 0.00, 0.00,
   TRUE),

  -- 3. Nguyễn Thế Thái — Nhà hàng (mã CC 00015)
  ('EC-NTHAI', N'Nguyễn Thế Thái', N'Nhà hàng', N'Nhân viên',
   'TNC', 8.00, 26, '2023-06-01',
   '036089512345', 'BIDV', '31410001234567', 0,
   10000000.00, 0.00, 0.00, 200000.00, 0.00, 0.00,
   TRUE),

  -- 4. Cao Minh Hiếu — TH (có override thuế trong approval screen)
  ('EC-CMHIEU', N'Cao Minh Hiếu', N'Nhà hàng', N'Nhân viên',
   'TH', 8.00, 26, '2024-01-10',
   NULL, 'Techcombank', '19033456789012', 0,
   9000000.00, 0.00, 0.00, 0.00, 0.00, 0.00,
   TRUE),

  -- 5. Nguyễn Thị Ngân — TNC Nhà hàng (mã CC 00043 từ Import screen)
  ('EC-NTNGAN', N'Nguyễn Thị Ngân', N'Nhà hàng', N'Nhân viên',
   'TNC', 8.00, 26, '2022-08-01',
   '079094567890', 'ACB', '8900987654', 0,
   20000000.00, 0.00, 300000.00, 200000.00, 0.00, 0.00,
   TRUE);


-- ------------------------------------------------------------
-- Seed: 3 user mẫu (admin / ketoan / giamdoc)
-- ------------------------------------------------------------
INSERT INTO `users`
  (username, email, password_hash, full_name, role, department, employee_id, is_active)
VALUES
  ('admin',
   'admin@nhahanggabc.vn',
   '$2b$10$/1PRgsOP3dGwddjwGfR1/ebnNM/50EFEXP0aczeY0Mxjmgdxax6hy',
   N'Quản trị viên',
   'ADMIN', NULL, NULL, TRUE),

  ('ketoan',
   'ketoan@nhahanggabc.vn',
   '$2b$10$/1PRgsOP3dGwddjwGfR1/ebnNM/50EFEXP0aczeY0Mxjmgdxax6hy',
   N'Nguyễn Thị Kế Toán',
   'KETOAN', NULL, NULL, TRUE),

  ('giamdoc',
   'giamdoc@nhahanggabc.vn',
   '$2b$10$/1PRgsOP3dGwddjwGfR1/ebnNM/50EFEXP0aczeY0Mxjmgdxax6hy',
   N'Trần Văn Giám Đốc',
   'GIAMDOC', NULL, NULL, TRUE);


-- ------------------------------------------------------------
-- Seed: employee_id_mapping (2 đã map + 1 chưa map)
-- mapped_by = 2 (user ketoan, id=2)
-- ------------------------------------------------------------
INSERT INTO `employee_id_mapping`
  (timeclock_code, timeclock_name, employee_id, mapped_by, is_active, note)
VALUES
  ('00002', 'Pham Thi Ngoc Bich', 'EC-PTNBICH', 2, TRUE, NULL),
  ('00015', 'Nguyen The Thai',    'EC-NTHAI',   2, TRUE, NULL),
  ('00043', 'Nguyen Thi Ngan',    'EC-NTNGAN',  2, TRUE, NULL);
-- Mã 00999 (Unknown) cố tình KHÔNG insert để demo trường hợp "Chưa map"


-- ------------------------------------------------------------
-- Seed: Lịch sử lương của Nguyễn Văn Thương (Tab "Lịch sử lương")
-- changed_by = 2 (ketoan)
-- ------------------------------------------------------------
INSERT INTO `salary_history`
  (employee_id, change_type, effective_date,
   old_base_salary, new_base_salary,
   old_allowances, new_allowances, reason, changed_by)
VALUES
  ('EC-NVTHUONG', 'HET_THU_VIEC', '2022-06-15',
   16000000.00, 18000000.00,
   NULL, NULL,
   N'Kết thúc thử việc, chính thức', 2),

  ('EC-NVTHUONG', 'DIEU_CHINH_PC', '2023-01-01',
   18000000.00, 18000000.00,
   '{"allowance_responsibility": 8000000}',
   '{"allowance_responsibility": 10150000}',
   N'Điều chỉnh phụ cấp trách nhiệm theo đánh giá năm 2022', 2),

  ('EC-NVTHUONG', 'TANG_LUONG', '2024-03-01',
   18000000.00, 20000000.00,
   NULL, NULL,
   N'Tăng lương theo kết quả kinh doanh Q1/2024', 2);


-- ------------------------------------------------------------
-- Seed: Ngày lễ 2026 (Việt Nam)
-- ------------------------------------------------------------
INSERT INTO `holidays` (holiday_date, name, ot_coefficient, year, created_by) VALUES
  ('2026-01-01', N'Tết Dương lịch',                            3.0, 2026, 1),
  ('2026-02-16', N'Nghỉ Tết Nguyên Đán (28 Tết)',              3.0, 2026, 1),
  ('2026-02-17', N'Nghỉ Tết Nguyên Đán (29 Tết)',              3.0, 2026, 1),
  ('2026-02-18', N'Giao thừa Tết Bính Ngọ',                    3.0, 2026, 1),
  ('2026-02-19', N'Mồng 1 Tết Bính Ngọ',                       3.0, 2026, 1),
  ('2026-02-20', N'Mồng 2 Tết Bính Ngọ',                       3.0, 2026, 1),
  ('2026-02-21', N'Mồng 3 Tết Bính Ngọ',                       3.0, 2026, 1),
  ('2026-04-10', N'Giỗ Tổ Hùng Vương (10/3 âm lịch)',          3.0, 2026, 1),
  ('2026-04-30', N'Ngày Giải phóng miền Nam',                   3.0, 2026, 1),
  ('2026-05-01', N'Ngày Quốc tế Lao động',                      3.0, 2026, 1),
  ('2026-09-02', N'Ngày Quốc khánh',                            3.0, 2026, 1);


-- ------------------------------------------------------------
-- Seed: system_config — cấu hình mặc định theo SPEC Module 7
-- ------------------------------------------------------------
INSERT INTO `system_config` (config_key, config_value, config_group, description) VALUES
  -- Ngày công
  ('payroll.standard_work_days',      '26',          'payroll',  N'Ngày công chuẩn mặc định mỗi tháng'),
  -- Ngưỡng tính ngày công (theo % giờ chuẩn)
  ('payroll.work_day_full_threshold',  '0.50',        'payroll',  N'≥ 50% giờ chuẩn = 1 ngày công'),
  ('payroll.work_day_half_threshold',  '0.25',        'payroll',  N'≥ 25% giờ chuẩn = 0.5 ngày công'),
  ('payroll.abnormal_hours_threshold', '16.00',       'payroll',  N'Cảnh báo bất thường khi tổng giờ > X/ngày'),
  -- Hệ số OT
  ('ot_rate.weekday',                  '1.5',         'ot_rate',  N'Hệ số OT ngày thường'),
  ('ot_rate.weekend',                  '2.0',         'ot_rate',  N'Hệ số OT cuối tuần'),
  ('ot_rate.holiday',                  '3.0',         'ot_rate',  N'Hệ số OT ngày lễ'),
  -- BHXH
  ('bhxh.employee_rate',               '0.105',       'bhxh',     N'BHXH NV đóng: 10.5% (BHXH 8% + BHYT 1.5% + BHTN 1%)'),
  ('bhxh.company_rate',                '0.215',       'bhxh',     N'BHXH công ty đóng: 21.5%'),
  -- Thuế TNCN
  ('tax.personal_deduction',           '11000000',    'tax',      N'Giảm trừ gia cảnh bản thân (đồng/tháng)'),
  ('tax.dependent_deduction',          '4400000',     'tax',      N'Giảm trừ mỗi người phụ thuộc (đồng/tháng)'),
  -- Biểu thuế TNCN 7 bậc luỹ tiến (JSON)
  ('tax.brackets', '[
    {"from":0,        "to":5000000,  "rate":0.05},
    {"from":5000001,  "to":10000000, "rate":0.10},
    {"from":10000001, "to":18000000, "rate":0.15},
    {"from":18000001, "to":32000000, "rate":0.20},
    {"from":32000001, "to":52000000, "rate":0.25},
    {"from":52000001, "to":80000000, "rate":0.30},
    {"from":80000001, "to":null,     "rate":0.35}
  ]', 'tax', N'Biểu thuế TNCN luỹ tiến 7 bậc (Thông tư 111/2013/TT-BTC)'),
  -- Thông tin công ty
  ('company.name',         N'Nhà hàng ABC',         'company',  N'Tên công ty — hiển thị trên phiếu lương'),
  ('company.logo_url',     '',                      'company',  N'URL logo công ty'),
  ('company.address',      N'Hà Nội, Việt Nam',     'company',  N'Địa chỉ công ty');


-- ============================================================
SET foreign_key_checks = 1;
-- ============================================================
-- Tóm tắt schema:
--   employees              (5 bản ghi seed)
--   users                  (3 bản ghi seed: admin/ketoan/giamdoc)
--   employee_id_mapping    (3 bản ghi seed — 00999 cố ý chưa map)
--   holidays               (11 ngày lễ 2026)
--   system_config          (16 cấu hình mặc định)
--   payroll_periods        (trống — tạo qua app)
--   attendance_import_batches (trống)
--   attendance_records     (trống)
--   attendance_summary     (trống)
--   payroll_details        (trống)
--   payroll_audit_log      (trống)
--   approval_history       (trống)
--   salary_history         (3 bản ghi seed cho EC-NVTHUONG)
-- ============================================================
