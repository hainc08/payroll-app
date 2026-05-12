/**
 * Employee Management Logic
 */

const EmployeeView = {
    employees: [],
    currentEmp: null,

    async init() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="master-detail-container">
                <div class="master-list">
                    <div class="list-header">
                        <div style="display:flex;justify-content:space-between;align-items:center">
                            <h3 class="font-heading" style="font-size:16px">Nhân viên</h3>
                            <button class="btn btn-primary" style="padding:6px 12px;font-size:12px" onclick="EmployeeView.openCreateModal()">
                                <i data-lucide="plus"></i> Thêm
                            </button>
                        </div>
                        <div class="search-box">
                            <i data-lucide="search"></i>
                            <input type="text" placeholder="Tìm tên, mã NV..." id="empSearch">
                        </div>
                    </div>
                    <div class="employee-items" id="empList">
                        <div style="padding:20px;text-align:center;color:var(--slate-400);font-size:13px">Đang tải...</div>
                    </div>
                </div>
                <div class="detail-view" id="empDetail">
                    <div class="detail-placeholder">Chọn một nhân viên để xem chi tiết</div>
                </div>
            </div>
        `;
        lucide.createIcons();
        await this.loadEmployees();

        document.getElementById('empSearch').addEventListener('input', (e) => {
            this.filterEmployees(e.target.value);
        });
    },

    async loadEmployees() {
        try {
            const response = await fetch(`${API_BASE}/employees?limit=200`, {
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });
            const result = await response.json();
            if (result.success) {
                this.employees = result.data.employees || result.data;
                this.renderList(this.employees);
            } else {
                document.getElementById('empList').innerHTML = `<div style="padding:20px;color:var(--danger);font-size:13px">${result.message}</div>`;
            }
        } catch (err) {
            document.getElementById('empList').innerHTML = `<div style="padding:20px;color:var(--danger);font-size:13px">Lỗi kết nối</div>`;
        }
    },

    renderList(employees) {
        const list = document.getElementById('empList');
        if (!employees || employees.length === 0) {
            list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--slate-400);font-size:13px">Không có nhân viên</div>`;
            return;
        }
        list.innerHTML = employees.map(emp => `
            <div class="emp-item" onclick="EmployeeView.showDetail('${emp.employee_id}')" id="item-${emp.employee_id}">
                <div class="avatar" style="flex-shrink:0">${this.initials(emp.full_name)}</div>
                <div class="info">
                    <h4>${emp.full_name}</h4>
                    <p>${emp.employee_id} · ${emp.department || ''}</p>
                </div>
                ${emp.resign_date ? '<span style="font-size:10px;color:var(--slate-400);margin-left:auto">Nghỉ</span>' : ''}
            </div>
        `).join('');
    },

    filterEmployees(query) {
        const q = query.toLowerCase();
        const filtered = this.employees.filter(e =>
            e.full_name.toLowerCase().includes(q) ||
            e.employee_id.toLowerCase().includes(q) ||
            (e.department || '').toLowerCase().includes(q)
        );
        this.renderList(filtered);
    },

    async showDetail(id) {
        document.querySelectorAll('.emp-item').forEach(i => i.classList.remove('active'));
        const item = document.getElementById(`item-${id}`);
        if (item) item.classList.add('active');

        const detail = document.getElementById('empDetail');
        detail.innerHTML = `<div class="detail-placeholder">Đang tải...</div>`;

        try {
            const response = await fetch(`${API_BASE}/employees/${id}`, {
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });
            const result = await response.json();
            if (result.success) {
                const emp = result.data.employee || result.data;
                this.currentEmp = emp;
                this.renderDetail(emp);
            } else {
                detail.innerHTML = `<div class="detail-placeholder" style="color:var(--danger)">${result.message}</div>`;
            }
        } catch (err) {
            detail.innerHTML = `<div class="detail-placeholder" style="color:var(--danger)">Lỗi kết nối</div>`;
        }
    },

    renderDetail(emp) {
        const user = Auth.getUser();
        const canEdit = user && ['ADMIN', 'KETOAN'].includes(user.role);
        const isActive = !emp.resign_date;
        const detail = document.getElementById('empDetail');

        detail.innerHTML = `
            <div class="detail-header">
                <div class="detail-header-info">
                    <div class="detail-avatar">${this.initials(emp.full_name)}</div>
                    <div class="detail-title">
                        <h2>${emp.full_name}</h2>
                        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                            <span class="status-badge ${isActive ? 'status-active' : 'status-inactive'}">${isActive ? 'Đang làm việc' : 'Đã nghỉ việc'}</span>
                            <span style="color:var(--slate-500);font-size:13px">${emp.employee_id} · ${emp.department || ''}</span>
                        </div>
                    </div>
                </div>
                <div class="detail-actions">
                    ${canEdit ? `
                    <button class="btn btn-secondary" onclick="EmployeeView.openEditModal()">
                        <i data-lucide="edit-3"></i> Chỉnh sửa
                    </button>
                    ${isActive && user.role === 'ADMIN' ? `<button class="btn btn-danger" onclick="EmployeeView.deactivate('${emp.employee_id}')"><i data-lucide="user-x"></i> Vô hiệu hóa</button>` : ''}
                    ` : ''}
                </div>
            </div>

            <div class="detail-tabs">
                <div class="tab-item active" data-tab="hoso" onclick="EmployeeView.switchTab(this)">Hồ sơ cá nhân</div>
                <div class="tab-item" data-tab="luong" onclick="EmployeeView.switchTab(this)">Thông tin lương</div>
                <div class="tab-item" data-tab="history" onclick="EmployeeView.switchTab(this)">Lịch sử</div>
            </div>

            <div class="tab-content" id="tabContent">
                ${this.getTabContent('hoso', emp)}
            </div>
        `;
        lucide.createIcons();
    },

    switchTab(el) {
        document.querySelectorAll('.tab-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
        const tab = el.getAttribute('data-tab');
        document.getElementById('tabContent').innerHTML = this.getTabContent(tab, this.currentEmp);
        lucide.createIcons();
    },

    getTabContent(tab, emp) {
        if (tab === 'hoso') return this.getHosoContent(emp);
        if (tab === 'luong') return this.getLuongContent(emp);
        if (tab === 'history') return this.getHistoryContent(emp);
        return '';
    },

    getHosoContent(emp) {
        const fmt = (v) => v || '—';
        return `
            <div class="info-grid">
                <div class="info-section">
                    <h3>Thông tin cơ bản</h3>
                    <div class="info-row"><span class="info-label">Bộ phận</span><span class="info-value">${fmt(emp.department)}</span></div>
                    <div class="info-row"><span class="info-label">Chức vụ</span><span class="info-value">${fmt(emp.position)}</span></div>
                    <div class="info-row"><span class="info-label">Hình thức LĐ</span><span class="info-value">${emp.employment_type === 'TNC' ? 'Toàn thời gian (TNC)' : emp.employment_type === 'TH' ? 'Thời vụ (TH)' : '—'}</span></div>
                    <div class="info-row"><span class="info-label">Ngày vào làm</span><span class="info-value">${(emp.join_date || emp.joined_date) ? new Date(emp.join_date || emp.joined_date).toLocaleDateString('vi-VN') : '—'}</span></div>
                    ${emp.resign_date ? `<div class="info-row"><span class="info-label">Ngày nghỉ việc</span><span class="info-value" style="color:var(--danger)">${new Date(emp.resign_date).toLocaleDateString('vi-VN')}</span></div>` : ''}
                    <div class="info-row"><span class="info-label">Mã máy CC</span><span class="info-value" style="font-family:monospace">${fmt(emp.timeclock_code)}</span></div>
                </div>
                <div class="info-section">
                    <h3>Thông tin cá nhân</h3>
                    <div class="info-row"><span class="info-label">CCCD</span><span class="info-value">${emp.id_number ? '●●● ' + emp.id_number.slice(-4) : '—'}</span></div>
                    <div class="info-row"><span class="info-label">Ngân hàng</span><span class="info-value">${fmt(emp.bank_name)}</span></div>
                    <div class="info-row"><span class="info-label">Số tài khoản</span><span class="info-value">${emp.bank_account ? '●●● ' + emp.bank_account.slice(-4) : '—'}</span></div>
                    <div class="info-row"><span class="info-label">Người phụ thuộc</span><span class="info-value">${emp.dependents ?? 0} người (giảm trừ ${this.fmt((emp.dependents || 0) * 4400000)} đ/tháng)</span></div>
                </div>
            </div>
        `;
    },

    getLuongContent(emp) {
        const fmt = this.fmt;
        const base = emp.base_salary || 0;
        const days = emp.standard_work_days || 26;
        const hrs = emp.standard_hours_per_day || 8;
        const estGross = base + (emp.allowance_responsibility || 0) + (emp.allowance_phone || 0) + (emp.allowance_transport || 0) + (emp.allowance_work || 0) + (emp.default_bonus_revenue || 0);
        const bhxh = base * 0.105;
        const estNet = estGross - bhxh;

        return `
            <div class="info-grid">
                <div class="info-section">
                    <h3>Thông tin hợp đồng</h3>
                    <div class="info-row"><span class="info-label">Lương HĐ (gross)</span><span class="info-value font-bold" style="color:var(--primary)">${fmt(base)} đ</span></div>
                    <div class="info-row"><span class="info-label">Giờ chuẩn/ngày</span><span class="info-value">${hrs} giờ</span></div>
                    <div class="info-row"><span class="info-label">Ngày công chuẩn</span><span class="info-value">${days} ngày/tháng</span></div>
                </div>
                <div class="info-section">
                    <h3>Phụ cấp & Thưởng</h3>
                    <div class="info-row"><span class="info-label">PC Trách nhiệm</span><span class="info-value">${fmt(emp.allowance_responsibility)} đ</span></div>
                    <div class="info-row"><span class="info-label">PC Điện thoại</span><span class="info-value">${fmt(emp.allowance_phone)} đ</span></div>
                    <div class="info-row"><span class="info-label">PC Xăng xe</span><span class="info-value">${fmt(emp.allowance_transport)} đ</span></div>
                    <div class="info-row"><span class="info-label">PC Công việc</span><span class="info-value">${fmt(emp.allowance_work)} đ</span></div>
                    <div class="info-row"><span class="info-label">Thưởng DT (default)</span><span class="info-value">${fmt(emp.default_bonus_revenue)} đ</span></div>
                </div>
            </div>
            <div style="margin-top:20px;padding:16px;background:var(--slate-50);border-radius:var(--radius-md);border:1px solid var(--slate-200)">
                <h3 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--slate-400);margin-bottom:12px">Ước tính tháng đủ công</h3>
                <div style="display:flex;gap:32px">
                    <div><span style="font-size:12px;color:var(--slate-500)">Tổng thu nhập (Gross)</span><br><strong style="font-size:16px">${fmt(estGross)} đ</strong></div>
                    <div><span style="font-size:12px;color:var(--slate-500)">BHXH (10.5%)</span><br><strong style="font-size:16px;color:var(--danger)">-${fmt(bhxh)} đ</strong></div>
                    <div><span style="font-size:12px;color:var(--slate-500)">Ước tính NET (chưa thuế)</span><br><strong style="font-size:16px;color:var(--success)">${fmt(estNet)} đ</strong></div>
                </div>
            </div>
        `;
    },

    getHistoryContent(emp) {
        const history = emp.salary_history || [];
        if (!history.length) {
            return `<div style="text-align:center;padding:40px;color:var(--slate-400);font-size:14px">Chưa có lịch sử thay đổi lương</div>`;
        }
        return `
            <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead>
                    <tr style="border-bottom:2px solid var(--slate-200)">
                        <th style="padding:10px;text-align:left;color:var(--slate-500);font-weight:600">Ngày</th>
                        <th style="padding:10px;text-align:left;color:var(--slate-500);font-weight:600">Thay đổi</th>
                        <th style="padding:10px;text-align:left;color:var(--slate-500);font-weight:600">Giá trị cũ</th>
                        <th style="padding:10px;text-align:left;color:var(--slate-500);font-weight:600">Giá trị mới</th>
                        <th style="padding:10px;text-align:left;color:var(--slate-500);font-weight:600">Người thực hiện</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map(h => `
                    <tr style="border-bottom:1px solid var(--slate-100)">
                        <td style="padding:10px">${h.changed_at ? new Date(h.changed_at).toLocaleDateString('vi-VN') : '—'}</td>
                        <td style="padding:10px">${h.field_changed || '—'}</td>
                        <td style="padding:10px;color:var(--danger)">${h.old_value || '—'}</td>
                        <td style="padding:10px;color:var(--success)">${h.new_value || '—'}</td>
                        <td style="padding:10px;color:var(--slate-500)">${h.changed_by || '—'}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        `;
    },

    openCreateModal() {
        this.openFormModal(null);
    },

    openEditModal() {
        this.openFormModal(this.currentEmp);
    },

    openFormModal(emp) {
        const isEdit = !!emp;
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box modal-lg">
                <div class="modal-header">
                    <h3>${isEdit ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}</h3>
                    <button class="icon-btn" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
                </div>
                <div id="empFormErr" class="text-danger hidden" style="margin-bottom:12px"></div>

                <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--slate-400);margin-bottom:12px">Thông tin cơ bản</p>
                <div class="form-row">
                    <div class="form-group">
                        <label>Mã NV <span style="color:var(--danger)">*</span></label>
                        <input class="form-control" id="fEmpId" placeholder="EC-HOTEN" value="${emp?.employee_id || ''}" ${isEdit ? 'disabled' : ''}>
                    </div>
                    <div class="form-group">
                        <label>Họ và tên <span style="color:var(--danger)">*</span></label>
                        <input class="form-control" id="fFullName" placeholder="Nguyễn Văn A" value="${emp?.full_name || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Bộ phận <span style="color:var(--danger)">*</span></label>
                        <input class="form-control" id="fDept" placeholder="Nhà hàng" value="${emp?.department || ''}">
                    </div>
                    <div class="form-group">
                        <label>Chức vụ <span style="color:var(--danger)">*</span></label>
                        <input class="form-control" id="fPos" placeholder="Nhân viên phục vụ" value="${emp?.position || ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Hình thức lao động</label>
                        <select class="form-select" id="fEmpType">
                            <option value="TNC" ${emp?.employment_type === 'TNC' ? 'selected' : ''}>Toàn thời gian (TNC)</option>
                            <option value="TH" ${emp?.employment_type === 'TH' ? 'selected' : ''}>Thời vụ (TH)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Ngày vào làm <span style="color:var(--danger)">*</span></label>
                        <input type="date" class="form-control" id="fJoinDate" value="${emp?.join_date ? emp.join_date.substring(0,10) : ''}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Giờ chuẩn/ngày</label>
                        <input type="number" class="form-control" id="fStdHrs" min="1" max="24" value="${emp?.standard_hours_per_day || 8}">
                    </div>
                    <div class="form-group">
                        <label>Mã máy chấm công</label>
                        <input class="form-control" id="fTimeclock" placeholder="00002" value="${emp?.timeclock_code || ''}">
                    </div>
                </div>

                <hr class="divider">
                <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:var(--slate-400);margin-bottom:12px">Thông tin lương</p>
                <div class="form-row">
                    <div class="form-group">
                        <label>Lương HĐ (gross) <span style="color:var(--danger)">*</span></label>
                        <input type="number" class="form-control" id="fSalary" min="0" value="${emp?.base_salary || ''}">
                    </div>
                    <div class="form-group">
                        <label>PC Trách nhiệm</label>
                        <input type="number" class="form-control" id="fAllResp" min="0" value="${emp?.allowance_responsibility || 0}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>PC Điện thoại</label>
                        <input type="number" class="form-control" id="fAllPhone" min="0" value="${emp?.allowance_phone || 0}">
                    </div>
                    <div class="form-group">
                        <label>PC Xăng xe</label>
                        <input type="number" class="form-control" id="fAllTransport" min="0" value="${emp?.allowance_transport || 0}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>PC Công việc</label>
                        <input type="number" class="form-control" id="fAllWork" min="0" value="${emp?.allowance_work || 0}">
                    </div>
                    <div class="form-group">
                        <label>Thưởng DT (default)</label>
                        <input type="number" class="form-control" id="fBonusDef" min="0" value="${emp?.default_bonus_revenue || 0}">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Số người phụ thuộc</label>
                        <input type="number" class="form-control" id="fDependents" min="0" max="20" value="${emp?.dependents || 0}">
                    </div>
                    <div class="form-group">
                        <label>Ngân hàng</label>
                        <input class="form-control" id="fBank" placeholder="ACB" value="${emp?.bank_name || ''}">
                    </div>
                </div>
                ${isEdit ? `
                <div class="form-group">
                    <label>Lý do thay đổi (nếu có)</label>
                    <input class="form-control" id="fReason" placeholder="Ghi chú lý do điều chỉnh lương...">
                </div>` : ''}

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Hủy</button>
                    <button class="btn btn-primary" onclick="EmployeeView.saveEmployee(${isEdit})">
                        ${isEdit ? 'Lưu thay đổi' : 'Tạo nhân viên'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        lucide.createIcons();
    },

    async saveEmployee(isEdit) {
        const errDiv = document.getElementById('empFormErr');
        errDiv.classList.add('hidden');

        const body = {
            employee_id: document.getElementById('fEmpId').value.trim().toUpperCase(),
            full_name: document.getElementById('fFullName').value.trim(),
            department: document.getElementById('fDept').value.trim(),
            position: document.getElementById('fPos').value.trim(),
            employment_type: document.getElementById('fEmpType').value,
            join_date: document.getElementById('fJoinDate').value,
            standard_hours_per_day: parseFloat(document.getElementById('fStdHrs').value) || 8,
            base_salary: parseFloat(document.getElementById('fSalary').value) || 0,
            allowance_responsibility: parseFloat(document.getElementById('fAllResp').value) || 0,
            allowance_phone: parseFloat(document.getElementById('fAllPhone').value) || 0,
            allowance_transport: parseFloat(document.getElementById('fAllTransport').value) || 0,
            allowance_work: parseFloat(document.getElementById('fAllWork').value) || 0,
            default_bonus_revenue: parseFloat(document.getElementById('fBonusDef').value) || 0,
            dependents: parseInt(document.getElementById('fDependents').value) || 0,
            bank_name: document.getElementById('fBank').value.trim(),
        };

        const timeclock = document.getElementById('fTimeclock').value.trim();
        const reasonEl = document.getElementById('fReason');
        if (reasonEl) body.reason = reasonEl.value.trim();

        const url = isEdit ? `${API_BASE}/employees/${this.currentEmp.employee_id}` : `${API_BASE}/employees`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const result = await response.json();
            if (result.success) {
                const empId = isEdit ? this.currentEmp.employee_id : body.employee_id;

                // Nếu tạo mới có nhập mã máy CC → tự động tạo mapping
                if (!isEdit && timeclock) {
                    await fetch(`${API_BASE}/mapping`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${Auth.getToken()}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ timeclock_code: timeclock, employee_id: empId })
                    });
                }

                document.querySelector('.modal-overlay').remove();
                Toast.show(isEdit ? 'Đã cập nhật nhân viên' : 'Đã tạo nhân viên mới', 'success');
                await this.loadEmployees();
                if (isEdit) await this.showDetail(this.currentEmp.employee_id);
            } else {
                errDiv.innerText = result.message || 'Lỗi lưu dữ liệu';
                errDiv.classList.remove('hidden');
            }
        } catch (err) {
            errDiv.innerText = 'Lỗi kết nối máy chủ';
            errDiv.classList.remove('hidden');
        }
    },

    async deactivate(id) {
        if (!confirm(`Vô hiệu hoá nhân viên ${id}? Họ sẽ không còn xuất hiện trong bảng lương.`)) return;
        const today = new Date().toISOString().substring(0, 10);
        try {
            const response = await fetch(`${API_BASE}/employees/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ resign_date: today })
            });
            const result = await response.json();
            if (result.success) {
                Toast.show('Đã vô hiệu hoá nhân viên', 'success');
                await this.loadEmployees();
                document.getElementById('empDetail').innerHTML = '<div class="detail-placeholder">Chọn một nhân viên để xem chi tiết</div>';
            } else {
                Toast.show(result.message || 'Lỗi', 'error');
            }
        } catch (err) {
            Toast.show('Lỗi kết nối', 'error');
        }
    },

    initials(name) {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    },

    fmt(num) {
        if (num == null || num === '') return '0';
        return new Intl.NumberFormat('vi-VN').format(Math.round(num));
    }
};
