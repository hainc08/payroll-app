/**
 * Payroll View - Screen 3
 */

const PayrollView = {
    periodId: null,     // numeric DB id
    periodStr: null,    // 'YYYY-MM' string
    data: null,

    async init() {
        // Load available periods first
        await this.render();
    },

    async render() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="payroll-page">
                <div class="period-header">
                    <div class="period-info">
                        <h2 class="text-2xl font-heading">Bảng lương</h2>
                        <div class="period-selector">
                            <i data-lucide="calendar" style="width:16px;color:var(--slate-400)"></i>
                            <select id="periodSelect" class="period-selector" onchange="PayrollView.changePeriod(this.value)">
                                <option value="">-- Chọn kỳ lương --</option>
                            </select>
                        </div>
                        <span id="periodStatus" class="period-badge status-nhap" style="display:none">Đang soạn thảo</span>
                    </div>
                    <div class="flex gap-3">
                        <button class="btn btn-secondary" id="generateBtn" onclick="PayrollView.generatePayroll()" style="display:none">
                            <i data-lucide="refresh-cw"></i> Tính lại
                        </button>
                        <button class="btn btn-secondary" id="exportBtn" onclick="PayrollView.exportExcel()" style="display:none">
                            <i data-lucide="download"></i> Xuất Excel
                        </button>
                        <button class="btn btn-primary" id="submitBtn" onclick="PayrollView.submitPayroll()" style="display:none">
                            <i data-lucide="send"></i> Gửi phê duyệt
                        </button>
                    </div>
                </div>

                <div id="payrollContent">
                    <div class="card" style="text-align:center;padding:60px;color:var(--slate-400)">
                        <i data-lucide="calculator" style="width:48px;height:48px;margin:0 auto 16px;display:block"></i>
                        <p>Chọn kỳ lương để xem bảng lương</p>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
        await this.loadPeriods();
    },

    async loadPeriods() {
        // Tạo danh sách 6 kỳ lương gần nhất để chọn
        const select = document.getElementById('periodSelect');
        const now = new Date();
        const options = [];
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `Tháng ${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            options.push(`<option value="${val}">${label}</option>`);
        }
        select.innerHTML = '<option value="">-- Chọn kỳ lương --</option>' + options.join('');

        // Auto-chọn tháng hiện tại
        const curVal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        select.value = curVal;
        this.changePeriod(curVal);
    },

    async changePeriod(val) {
        if (!val) return;
        this.periodStr = val;
        await this.loadPayroll();
    },

    async loadPayroll() {
        const content = document.getElementById('payrollContent');
        content.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--slate-400)">Đang tải...</div>`;

        try {
            const response = await fetch(`${API_BASE}/payroll/${this.periodStr}`, {
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });
            const result = await response.json();

            if (result.success) {
                this.data = result.data;
                this.periodId = result.data.period.id;
                this.renderTable(result.data.details);
                this.updateStatus(result.data.period.status);
                document.getElementById('periodStatus').style.display = '';
                document.getElementById('exportBtn').style.display = '';

                const status = result.data.period.status;
                const user = Auth.getUser();
                const canEdit = (status === 'NHAP') && ['ADMIN', 'KETOAN'].includes(user?.role);
                document.getElementById('generateBtn').style.display = canEdit ? '' : 'none';
                document.getElementById('submitBtn').style.display = canEdit ? '' : 'none';
            } else if (result.code === 'ERR_NOT_FOUND') {
                this.showEmptyState();
            } else {
                this.showEmptyState(result.message);
            }
        } catch (err) {
            this.showEmptyState('Lỗi kết nối máy chủ');
            console.error(err);
        }
    },

    showEmptyState(msg) {
        const user = Auth.getUser();
        const canCreate = user && ['ADMIN', 'KETOAN'].includes(user.role);
        document.getElementById('payrollContent').innerHTML = `
            <div class="card payroll-empty">
                <i data-lucide="file-x" style="width:48px;height:48px;margin:0 auto 16px;display:block;color:var(--slate-300)"></i>
                <p class="font-semibold text-slate-600 mb-2">${msg || 'Chưa có bảng lương cho kỳ này'}</p>
                <p class="text-sm text-slate-400 mb-6">Cần import chấm công trước, sau đó bấm "Tính lương".</p>
                ${canCreate ? `<button class="btn btn-primary" onclick="PayrollView.generatePayroll()"><i data-lucide="calculator"></i> Tạo & Tính lương</button>` : ''}
            </div>
        `;
        document.getElementById('generateBtn').style.display = canCreate ? '' : 'none';
        document.getElementById('submitBtn').style.display = 'none';
        document.getElementById('periodStatus').style.display = 'none';
        lucide.createIcons();
    },

    renderTable(details) {
        const fmt = (num) => num != null ? new Intl.NumberFormat('vi-VN').format(Math.round(num)) : '—';
        const status = this.data?.period?.status;
        const user = Auth.getUser();
        const canEdit = (status === 'NHAP') && ['ADMIN', 'KETOAN'].includes(user?.role);

        // Tổng NET
        const totalNet = details.reduce((s, d) => s + (d.net_salary || 0), 0);

        document.getElementById('payrollContent').innerHTML = `
            <div class="filter-bar">
                <span class="text-sm text-slate-500">${details.length} nhân viên &nbsp;|&nbsp; Tổng NET: <strong>${fmt(totalNet)} đ</strong></span>
            </div>
            <div class="card p-0 overflow-hidden">
                <div class="payroll-container">
                    <table class="payroll-table" id="payrollTable">
                        <thead>
                            <tr>
                                <th class="sticky-col" style="min-width:50px">STT</th>
                                <th class="sticky-col" style="left:50px;min-width:100px">Mã NV</th>
                                <th class="sticky-col" style="left:150px;min-width:160px">Họ tên</th>
                                <th class="col-group-info" style="min-width:110px">Bộ phận</th>
                                <th class="col-group-info" style="min-width:80px">HT LĐ</th>
                                <th class="col-group-info" style="min-width:80px">Giờ chuẩn</th>
                                <th class="col-group-info" style="min-width:130px">Lương HĐ</th>
                                <th class="col-group-info" style="min-width:80px">Ngày công</th>
                                <th class="col-group-info" style="min-width:80px">Giờ OT</th>
                                <th class="col-group-income" style="min-width:130px">Lương công</th>
                                <th class="col-group-income" style="min-width:110px">Lương OT</th>
                                <th class="col-group-income" style="min-width:120px">PC Trách nhiệm</th>
                                <th class="col-group-income" style="min-width:110px">PC Điện thoại</th>
                                <th class="col-group-income" style="min-width:110px">PC Xăng xe</th>
                                <th class="col-group-income" style="min-width:110px">PC Công việc</th>
                                <th class="col-group-income" style="min-width:110px">Thưởng DT</th>
                                <th style="background:#ecfdf5;color:#065f46;min-width:140px;font-weight:800">TỔNG THU NHẬP</th>
                                <th class="col-group-deduction" style="min-width:120px">BHXH (10.5%)</th>
                                <th class="col-group-deduction" style="min-width:100px">Tạm ứng</th>
                                <th class="col-group-deduction" style="min-width:110px">Thuế TNCN</th>
                                <th class="col-group-deduction" style="min-width:110px">Giảm trừ khác</th>
                                <th style="background:#fff1f2;color:#9f1239;min-width:130px;font-weight:800">TỔNG KHẤU TRỪ</th>
                                <th class="col-group-net" style="position:sticky;right:0;z-index:10;min-width:130px">THỰC LĨNH</th>
                            </tr>
                        </thead>
                        <tbody id="payrollBody">
                        </tbody>
                        <tfoot>
                            <tr style="background:var(--slate-50);font-weight:700;border-top:2px solid var(--slate-200)">
                                <td colspan="3" class="sticky-col" style="left:0;padding:14px 16px">Tổng cộng (${details.length} NV)</td>
                                <td colspan="6"></td>
                                <td style="padding:14px 16px">${fmt(details.reduce((s,d) => s+(d.salary_by_work_days||0),0))}</td>
                                <td style="padding:14px 16px">${fmt(details.reduce((s,d) => s+(d.overtime_pay||0),0))}</td>
                                <td style="padding:14px 16px">${fmt(details.reduce((s,d) => s+(d.allowance_responsibility||0),0))}</td>
                                <td style="padding:14px 16px">${fmt(details.reduce((s,d) => s+(d.allowance_phone||0),0))}</td>
                                <td style="padding:14px 16px">${fmt(details.reduce((s,d) => s+(d.allowance_transport||0),0))}</td>
                                <td style="padding:14px 16px">${fmt(details.reduce((s,d) => s+(d.allowance_work||0),0))}</td>
                                <td style="padding:14px 16px">${fmt(details.reduce((s,d) => s+(d.bonus_revenue||0),0))}</td>
                                <td style="padding:14px 16px;color:#059669;font-weight:800">${fmt(details.reduce((s,d) => s+(d.total_income||0),0))}</td>
                                <td style="padding:14px 16px">${fmt(details.reduce((s,d) => s+(d.social_insurance||0),0))}</td>
                                <td style="padding:14px 16px">${fmt(details.reduce((s,d) => s+(d.advance_payment||0),0))}</td>
                                <td style="padding:14px 16px">${fmt(details.reduce((s,d) => s+(d.tax_income||0),0))}</td>
                                <td style="padding:14px 16px">${fmt(details.reduce((s,d) => s+(d.other_deductions||0),0))}</td>
                                <td style="padding:14px 16px;color:#dc2626;font-weight:800">${fmt(details.reduce((s,d) => s+(d.total_deductions||0),0))}</td>
                                <td class="col-group-net" style="position:sticky;right:0;padding:14px 16px">${fmt(totalNet)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;

        const body = document.getElementById('payrollBody');
        body.innerHTML = details.map((d, i) => {
            const isOverride = d.is_tax_override;
            const rowClass = isOverride ? 'override-row' : '';
            const editableClass = canEdit ? 'editable-cell' : '';
            return `
            <tr class="${rowClass}">
                <td class="sticky-col" style="left:0">${i + 1}</td>
                <td class="sticky-col" style="left:50px;font-family:monospace;font-size:12px">${d.employee_id}</td>
                <td class="sticky-col" style="left:150px;font-weight:600">${d.full_name}</td>
                <td>${d.department || '—'}</td>
                <td>${d.employment_type || '—'}</td>
                <td>${d.standard_hours_per_day || '—'}h</td>
                <td>${fmt(d.base_salary_snapshot)}</td>
                <td>${d.actual_work_days ?? '—'}</td>
                <td>${d.overtime_hours ?? '—'}</td>
                <td>${fmt(d.salary_by_work_days)}</td>
                <td>${fmt(d.overtime_pay)}</td>
                <td>${fmt(d.allowance_responsibility)}</td>
                <td>${fmt(d.allowance_phone)}</td>
                <td>${fmt(d.allowance_transport)}</td>
                <td>${fmt(d.allowance_work)}</td>
                <td class="${editableClass}" onclick="${canEdit ? `PayrollView.openEditModal('${d.employee_id}', 'bonus_revenue', ${d.bonus_revenue || 0}, '${d.full_name}')` : ''}">${fmt(d.bonus_revenue)}</td>
                <td style="font-weight:700;color:#059669">${fmt(d.total_income)}</td>
                <td>${fmt(d.social_insurance)}</td>
                <td class="${editableClass}" onclick="${canEdit ? `PayrollView.openEditModal('${d.employee_id}', 'advance_payment', ${d.advance_payment || 0}, '${d.full_name}')` : ''}">${fmt(d.advance_payment)}</td>
                <td class="${editableClass} ${isOverride ? 'text-warning' : ''}" onclick="${canEdit ? `PayrollView.openEditModal('${d.employee_id}', 'tax_income', ${d.tax_income || 0}, '${d.full_name}', true)` : ''}" title="${isOverride ? 'Đã sửa tay: ' + (d.tax_override_reason || '') : ''}">${fmt(d.tax_income)}${isOverride ? ' ✎' : ''}</td>
                <td class="${editableClass}" onclick="${canEdit ? `PayrollView.openEditModal('${d.employee_id}', 'other_deductions', ${d.other_deductions || 0}, '${d.full_name}')` : ''}">${fmt(d.other_deductions)}</td>
                <td style="font-weight:700;color:#dc2626">${fmt(d.total_deductions)}</td>
                <td class="col-group-net" style="position:sticky;right:0;font-weight:800">${fmt(d.net_salary)}</td>
            </tr>`;
        }).join('');
    },

    updateStatus(status) {
        const badge = document.getElementById('periodStatus');
        if (!badge) return;
        badge.className = `period-badge status-${status.toLowerCase()}`;
        const labels = {
            'NHAP': 'Đang soạn thảo',
            'CHO_DUYET': 'Chờ phê duyệt',
            'KETOAN_DUYET': 'Kế toán đã duyệt',
            'GIAMDOC_DUYET': 'Giám đốc đã duyệt',
            'DA_CHOT': 'Đã chốt 🔒'
        };
        badge.innerText = labels[status] || status;
    },

    openEditModal(empId, field, currentVal, empName, isTax = false) {
        if (this.data?.period?.status !== 'NHAP') return;

        const fieldLabels = {
            bonus_revenue: 'Thưởng doanh thu',
            advance_payment: 'Tạm ứng',
            tax_income: 'Thuế TNCN',
            other_deductions: 'Giảm trừ khác'
        };

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <h3>Chỉnh sửa — ${fieldLabels[field] || field}</h3>
                    <button class="icon-btn" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
                </div>
                <p class="text-sm text-slate-500 mb-4">Nhân viên: <strong>${empName}</strong></p>
                <div class="form-group">
                    <label>Giá trị mới (đồng)</label>
                    <input type="number" id="editVal" class="form-control" value="${currentVal}" min="0" step="1000">
                </div>
                ${isTax ? `
                <div class="form-group">
                    <label>Lý do điều chỉnh thuế <span style="color:var(--danger)">*</span></label>
                    <input type="text" id="editReason" class="form-control" placeholder="Nhập lý do bắt buộc...">
                </div>` : ''}
                <div id="editError" class="text-danger hidden"></div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Hủy</button>
                    <button class="btn btn-primary" onclick="PayrollView.saveEdit('${empId}', '${field}', ${isTax})">Lưu thay đổi</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        lucide.createIcons();
        document.getElementById('editVal').focus();
    },

    async saveEdit(empId, field, isTax) {
        const val = parseFloat(document.getElementById('editVal').value);
        const errDiv = document.getElementById('editError');
        errDiv.classList.add('hidden');

        if (isNaN(val) || val < 0) {
            errDiv.innerText = 'Giá trị không hợp lệ.';
            errDiv.classList.remove('hidden');
            return;
        }

        const body = { [field]: val };
        if (isTax) {
            const reason = document.getElementById('editReason')?.value?.trim();
            if (!reason) {
                errDiv.innerText = 'Vui lòng nhập lý do điều chỉnh thuế.';
                errDiv.classList.remove('hidden');
                return;
            }
            body.tax_override_reason = reason;
        }

        try {
            const response = await fetch(`${API_BASE}/payroll/${this.periodId}/detail/${empId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const result = await response.json();
            if (result.success) {
                document.querySelector('.modal-overlay')?.remove();
                Toast.show('Đã cập nhật thành công', 'success');
                await this.loadPayroll();
            } else {
                errDiv.innerText = result.message || 'Lỗi cập nhật.';
                errDiv.classList.remove('hidden');
            }
        } catch (err) {
            errDiv.innerText = 'Lỗi kết nối máy chủ.';
            errDiv.classList.remove('hidden');
        }
    },

    async generatePayroll() {
        if (!this.periodStr) return Toast.show('Vui lòng chọn kỳ lương trước', 'error');
        if (!confirm(`Tính lương cho tất cả nhân viên kỳ ${this.periodStr}?`)) return;
        try {
            const response = await fetch(`${API_BASE}/payroll/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ period: this.periodStr })
            });
            const result = await response.json();
            if (result.success) {
                Toast.show('Đã tính lương xong!', 'success');
                await this.loadPayroll();
            } else {
                Toast.show(result.message || 'Lỗi tính lương', 'error');
            }
        } catch (err) {
            Toast.show('Lỗi kết nối máy chủ', 'error');
        }
    },

    async submitPayroll() {
        if (!this.periodId) return;
        if (!confirm('Gửi phê duyệt bảng lương này?')) return;
        try {
            const response = await fetch(`${API_BASE}/payroll/${this.periodId}/submit`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });
            const result = await response.json();
            if (result.success) {
                Toast.show('Đã gửi phê duyệt!', 'success');
                await this.loadPayroll();
            } else {
                Toast.show(result.message || 'Lỗi gửi phê duyệt', 'error');
            }
        } catch (err) {
            Toast.show('Lỗi kết nối máy chủ', 'error');
        }
    },

    exportExcel() {
        Toast.show('Tính năng xuất Excel đang phát triển', 'error');
    }
};
