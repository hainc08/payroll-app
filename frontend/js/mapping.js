/**
 * Employee ID Mapping Logic
 */

const MappingView = {
    mappings: [],
    employees: [],
    currentFilter: 'all',

    async init() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="card">
                <div class="flex justify-between items-center mb-4">
                    <div>
                        <h2 class="font-heading">Mapping mã nhân viên</h2>
                        <p style="color:var(--slate-500);font-size:14px;margin-top:4px">Liên kết mã máy chấm công với nhân viên trong hệ thống</p>
                    </div>
                    <div class="flex gap-3">
                        <button class="btn btn-secondary" onclick="MappingView.exportList()">
                            <i data-lucide="download"></i> Xuất DS
                        </button>
                        <button class="btn btn-primary" onclick="MappingView.openCreateModal()">
                            <i data-lucide="plus"></i> Tạo mapping
                        </button>
                    </div>
                </div>

                <div style="background:var(--primary-light);padding:14px 16px;border-radius:var(--radius-md);margin-bottom:20px;display:flex;gap:10px;align-items:center;color:var(--primary)">
                    <i data-lucide="info" style="width:18px;flex-shrink:0"></i>
                    <p style="font-size:13px;font-weight:500">Mã máy CC là mã số từ file Excel (vd: 00002). Mỗi mã cần được gán vào đúng nhân viên trước khi import chấm công.</p>
                </div>

                <div class="filter-bar">
                    <div class="filter-tabs">
                        <button class="filter-tab active" id="tab-all" onclick="MappingView.setFilter('all')">Tất cả</button>
                        <button class="filter-tab" id="tab-mapped" onclick="MappingView.setFilter('mapped')">Đã map</button>
                        <button class="filter-tab" id="tab-unmapped" onclick="MappingView.setFilter('unmapped')">Chưa map</button>
                    </div>
                    <span id="mappingStats" class="text-sm text-slate-400"></span>
                </div>

                <table style="width:100%;border-collapse:collapse">
                    <thead>
                        <tr style="border-bottom:2px solid var(--slate-100)">
                            <th style="padding:14px 16px;text-align:left;font-size:12px;font-weight:700;color:var(--slate-600);text-transform:uppercase">Mã máy CC</th>
                            <th style="padding:14px 16px;text-align:left;font-size:12px;font-weight:700;color:var(--slate-600);text-transform:uppercase">Tên trên máy CC</th>
                            <th style="padding:14px 16px;text-align:left;font-size:12px;font-weight:700;color:var(--slate-600);text-transform:uppercase">Nhân viên hệ thống</th>
                            <th style="padding:14px 16px;text-align:left;font-size:12px;font-weight:700;color:var(--slate-600);text-transform:uppercase">Trạng thái</th>
                            <th style="padding:14px 16px;text-align:right;font-size:12px;font-weight:700;color:var(--slate-600);text-transform:uppercase">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="mappingList">
                        <tr><td colspan="5" style="padding:40px;text-align:center;color:var(--slate-400)">Đang tải...</td></tr>
                    </tbody>
                </table>
            </div>
        `;
        lucide.createIcons();
        await Promise.all([this.loadMappings(), this.loadEmployeeList()]);
    },

    async loadEmployeeList() {
        try {
            const res = await fetch(`${API_BASE}/employees?limit=200&status=active`, {
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });
            const data = await res.json();
            if (data.success) this.employees = data.data.employees;
        } catch (err) { /* ignore */ }
    },

    async loadMappings() {
        try {
            // Gọi song song: list theo filter + tổng toàn bộ để hiển thị stats đúng
            const [filteredRes, totalRes] = await Promise.all([
                fetch(`${API_BASE}/mapping?filter=${this.currentFilter}&limit=200`, {
                    headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
                }).then(r => r.json()),
                fetch(`${API_BASE}/mapping?filter=all&limit=1`, {
                    headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
                }).then(r => r.json()),
            ]);

            if (filteredRes.success) {
                this.mappings = filteredRes.data.mappings || filteredRes.data;
                this.renderList();
            }
            if (totalRes.success) {
                const total = totalRes.data.pagination?.total ?? 0;
                // Lấy thêm list không filter để đếm đúng mapped/unmapped
                const allRes = await fetch(`${API_BASE}/mapping?filter=all&limit=200`, {
                    headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
                }).then(r => r.json());
                if (allRes.success) {
                    const all = allRes.data.mappings || allRes.data;
                    this.updateStats(all);
                }
            }
        } catch (err) {
            document.getElementById('mappingList').innerHTML =
                `<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--danger)">Lỗi kết nối</td></tr>`;
        }
    },

    updateStats(allMappings) {
        const list = allMappings || this.mappings;
        const mapped = list.filter(m => m.employee_id).length;
        const unmapped = list.filter(m => !m.employee_id).length;
        const el = document.getElementById('mappingStats');
        if (el) el.innerText = `${mapped} đã map · ${unmapped} chưa map`;
    },

    setFilter(f) {
        this.currentFilter = f;
        ['all','mapped','unmapped'].forEach(k => {
            document.getElementById(`tab-${k}`)?.classList.toggle('active', k === f);
        });
        this.loadMappings();
    },

    renderList() {
        const list = document.getElementById('mappingList');
        const user = Auth.getUser();
        const canEdit = user && ['ADMIN','KETOAN'].includes(user.role);
        const canDelete = user?.role === 'ADMIN';

        if (!this.mappings.length) {
            list.innerHTML = `<tr><td colspan="5" style="padding:40px;text-align:center;color:var(--slate-400)">Không có dữ liệu</td></tr>`;
            return;
        }

        list.innerHTML = this.mappings.map(m => {
            const isMapped = !!m.employee_id;
            return `
            <tr style="border-bottom:1px solid var(--slate-50);transition:background 0.15s"
                onmouseover="this.style.background='var(--slate-50)'"
                onmouseout="this.style.background='transparent'">
                <td style="padding:14px 16px">
                    <span style="font-family:monospace;background:var(--slate-100);padding:4px 10px;border-radius:4px;font-weight:600;font-size:14px">${m.timeclock_code}</span>
                </td>
                <td style="padding:14px 16px;color:var(--slate-600);font-size:13px">${m.timeclock_name || '—'}</td>
                <td style="padding:14px 16px">
                    ${isMapped ? `
                    <div style="display:flex;align-items:center;gap:10px">
                        <div style="width:32px;height:32px;background:var(--primary-light);color:var(--primary);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">
                            ${(m.employee_name || '??').split(' ').map(n=>n[0]).join('').substring(0,2)}
                        </div>
                        <div>
                            <div style="font-weight:600;font-size:14px">${m.employee_name || '—'}</div>
                            <div style="font-size:12px;color:var(--slate-400);font-family:monospace">${m.employee_id}</div>
                        </div>
                    </div>` : `<span style="color:var(--slate-400);font-style:italic;font-size:13px">Chưa gán nhân viên</span>`}
                </td>
                <td style="padding:14px 16px">
                    <span class="status-badge ${isMapped ? 'status-active' : ''}" style="${!isMapped ? 'background:#fee2e2;color:#991b1b' : ''}">
                        ${isMapped ? '✓ Đã liên kết' : '✕ Chưa gán'}
                    </span>
                </td>
                <td style="padding:14px 16px;text-align:right">
                    ${canEdit ? `<button class="icon-btn" onclick="MappingView.openEditModal(${m.id})" title="Chỉnh sửa"><i data-lucide="edit-2"></i></button>` : ''}
                    ${canDelete ? `<button class="icon-btn" style="color:var(--danger)" onclick="MappingView.deleteMapping(${m.id}, '${m.timeclock_code}')" title="Xóa"><i data-lucide="trash-2"></i></button>` : ''}
                </td>
            </tr>`;
        }).join('');
        lucide.createIcons();
    },

    openCreateModal() {
        this.openModal(null);
    },

    openEditModal(id) {
        const m = this.mappings.find(x => x.id === id);
        if (!m) return;
        this.openModal(m);
    },

    openModal(mapping) {
        const isEdit = !!mapping;
        const empOptions = this.employees.map(e =>
            `<option value="${e.employee_id}" ${mapping?.employee_id === e.employee_id ? 'selected' : ''}>${e.full_name} (${e.employee_id})</option>`
        ).join('');

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <h3>${isEdit ? 'Chỉnh sửa mapping' : 'Tạo mapping mới'}</h3>
                    <button class="icon-btn" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
                </div>
                <div id="mapFormErr" class="text-danger hidden" style="margin-bottom:12px"></div>
                <div class="form-group">
                    <label>Mã máy chấm công <span style="color:var(--danger)">*</span></label>
                    <input class="form-control" id="mTimeclock" placeholder="00002" value="${mapping?.timeclock_code || ''}" ${isEdit ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                    <label>Tên trên máy CC</label>
                    <input class="form-control" id="mTimeclockName" placeholder="Nguyen Van A" value="${mapping?.timeclock_name || ''}">
                </div>
                <div class="form-group">
                    <label>Nhân viên hệ thống <span style="color:var(--danger)">*</span></label>
                    <select class="form-select" id="mEmployee">
                        <option value="">-- Chọn nhân viên --</option>
                        ${empOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>Ghi chú</label>
                    <input class="form-control" id="mNote" placeholder="Ghi chú (tùy chọn)" value="${mapping?.note || ''}">
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Hủy</button>
                    <button class="btn btn-primary" onclick="MappingView.saveMapping(${isEdit}, ${mapping?.id || 'null'})">
                        ${isEdit ? 'Lưu thay đổi' : 'Tạo mapping'}
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        lucide.createIcons();
    },

    async saveMapping(isEdit, id) {
        const errDiv = document.getElementById('mapFormErr');
        errDiv.classList.add('hidden');

        const timeclock_code = document.getElementById('mTimeclock')?.value?.trim();
        const timeclock_name = document.getElementById('mTimeclockName')?.value?.trim();
        const employee_id = document.getElementById('mEmployee')?.value;
        const note = document.getElementById('mNote')?.value?.trim();

        if (!isEdit && !timeclock_code) {
            errDiv.innerText = 'Vui lòng nhập mã máy chấm công.';
            errDiv.classList.remove('hidden');
            return;
        }
        if (!employee_id) {
            errDiv.innerText = 'Vui lòng chọn nhân viên.';
            errDiv.classList.remove('hidden');
            return;
        }

        const body = { employee_id, note };
        if (!isEdit) { body.timeclock_code = timeclock_code; }
        if (timeclock_name) body.timeclock_name = timeclock_name;

        const url = isEdit ? `${API_BASE}/mapping/${id}` : `${API_BASE}/mapping`;
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            const result = await res.json();
            if (result.success) {
                document.querySelector('.modal-overlay').remove();
                Toast.show(isEdit ? 'Đã cập nhật mapping' : 'Đã tạo mapping mới', 'success');
                await this.loadMappings();
            } else {
                errDiv.innerText = result.message || 'Lỗi lưu dữ liệu';
                errDiv.classList.remove('hidden');
            }
        } catch (err) {
            errDiv.innerText = 'Lỗi kết nối máy chủ';
            errDiv.classList.remove('hidden');
        }
    },

    async deleteMapping(id, code) {
        if (!confirm(`Xóa mapping cho mã CC "${code}"?`)) return;
        try {
            const res = await fetch(`${API_BASE}/mapping/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });
            const result = await res.json();
            if (result.success) {
                Toast.show('Đã xóa mapping', 'success');
                await this.loadMappings();
            } else {
                Toast.show(result.message || 'Lỗi xóa', 'error');
            }
        } catch (err) {
            Toast.show('Lỗi kết nối', 'error');
        }
    },

    exportList() {
        Toast.show('Tính năng xuất danh sách đang phát triển', 'error');
    }
};
