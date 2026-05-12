/**
 * Attendance View - Screen 2
 */

const AttendanceView = {
    step: 1,
    file: null,
    batchId: null,
    previewData: null,
    periodStr: null,

    init() {
        this.step = 1;
        this.file = null;
        this.batchId = null;
        this.previewData = null;
        // Mặc định kỳ lương tháng hiện tại
        const now = new Date();
        this.periodStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        this.render();
    },

    buildPeriodOptions(selected) {
        const now = new Date();
        let opts = '';
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const label = `Tháng ${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            opts += `<option value="${val}" ${val===selected?'selected':''}>${label}</option>`;
        }
        return opts;
    },

    stepLabel(n) {
        return ['Tải lên file','Đang xử lý','Xem trước & Xác nhận','Hoàn tất'][n-1];
    },

    renderStepper() {
        const steps = [1,2,3,4];
        return `
        <div class="stepper mb-10">
            ${steps.map((s, i) => `
                <div class="step ${this.step >= s ? 'active' : ''} ${this.step > s ? 'completed' : ''}">
                    <div class="step-circle">
                        ${this.step > s ? '<i data-lucide="check" style="width:14px;height:14px"></i>' : s}
                    </div>
                    <span class="step-label">${this.stepLabel(s)}</span>
                    ${i < steps.length-1 ? '<div class="step-connector"></div>' : ''}
                </div>
            `).join('')}
        </div>`;
    },

    render() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="attendance-page">
                <header class="mb-6">
                    <div class="flex justify-between items-center">
                        <div>
                            <h2 class="text-2xl font-heading mb-1">Import dữ liệu chấm công</h2>
                            <p class="text-slate-500">Tải lên file Excel từ máy chấm công ZKTeco / Ronald Jack</p>
                        </div>
                        <div class="period-selector">
                            <i data-lucide="calendar" style="width:16px;color:var(--slate-400)"></i>
                            <select id="attPeriodSelect" onchange="AttendanceView.changePeriod(this.value)" ${this.step > 1 ? 'disabled' : ''}>
                                ${this.buildPeriodOptions(this.periodStr)}
                            </select>
                        </div>
                    </div>
                </header>

                ${this.renderStepper()}

                <div id="stepContent" class="card p-10">
                    ${this.renderStep()}
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    changePeriod(val) {
        this.periodStr = val;
    },

    renderStep() {
        if (this.step === 1) return this.renderStep1();
        if (this.step === 2) return this.renderStep2();
        if (this.step === 3) return this.renderStep3();
        if (this.step === 4) return this.renderStep4();
        return '';
    },

    renderStep1() {
        return `
            <div class="upload-container" id="dropZone"
                onclick="document.getElementById('fileInput').click()"
                ondragover="event.preventDefault();this.style.borderColor='var(--primary)'"
                ondragleave="this.style.borderColor=''"
                ondrop="event.preventDefault();AttendanceView.handleFile(event.dataTransfer.files[0])">
                <div class="upload-icon"><i data-lucide="upload-cloud"></i></div>
                <h3 class="text-xl font-heading mb-2">Kéo thả hoặc click để chọn file</h3>
                <p class="text-slate-400 mb-2">Hỗ trợ định dạng .xlsx, .xls (ZKTeco, Ronald Jack)</p>
                <p class="text-slate-400 mb-6" style="font-size:13px">Kỳ lương: <strong>${this.periodStr}</strong></p>
                <input type="file" id="fileInput" hidden accept=".xlsx,.xls"
                    onchange="AttendanceView.handleFile(this.files[0])">
                <button class="btn btn-primary" onclick="event.stopPropagation();document.getElementById('fileInput').click()">
                    <i data-lucide="folder-open"></i> Chọn file từ máy tính
                </button>
            </div>
        `;
    },

    renderStep2() {
        return `
            <div style="text-align:center;padding:40px">
                <div style="width:64px;height:64px;border:4px solid var(--primary-light);border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px"></div>
                <h3 class="font-heading">Đang phân tích file...</h3>
                <p class="text-slate-400 mt-2" id="parseStatus">Đang upload và xử lý dữ liệu</p>
            </div>
            <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
        `;
    },

    renderStep3() {
        if (!this.previewData) return '<p>Không có dữ liệu</p>';
        const { valid = [], warnings = [], errors = [], total = 0, sheets = [] } = this.previewData;
        const allRows = [...valid, ...warnings, ...errors];

        return `
            <div class="flex justify-between items-center mb-6">
                <div>
                    <h3 class="font-heading">Xem trước dữ liệu</h3>
                    <p class="text-sm text-slate-500">Kiểm tra và xác nhận trước khi lưu vào hệ thống</p>
                </div>
                <div class="flex gap-2">
                    <button class="btn btn-secondary" onclick="AttendanceView.init()">Hủy / Chọn lại</button>
                    <button class="btn btn-primary" onclick="AttendanceView.confirm()">
                        <i data-lucide="save"></i> Xác nhận & Lưu
                    </button>
                </div>
            </div>

            <div class="import-stats mb-4">
                <div class="import-stat-item" style="background:var(--slate-100);color:var(--slate-700)">
                    <i data-lucide="database" style="width:14px;display:inline-block;margin-right:4px"></i>
                    Tổng: <strong>${total || allRows.length}</strong>
                </div>
                <div class="import-stat-item" style="background:#dcfce7;color:#166534">
                    <i data-lucide="check" style="width:14px;display:inline-block;margin-right:4px"></i>
                    Hợp lệ: <strong>${valid.length}</strong>
                </div>
                ${warnings.length ? `
                <div class="import-stat-item" style="background:#fef3c7;color:#92400e">
                    <i data-lucide="alert-triangle" style="width:14px;display:inline-block;margin-right:4px"></i>
                    Cảnh báo: <strong>${warnings.length}</strong>
                </div>` : ''}
                ${errors.length ? `
                <div class="import-stat-item" style="background:#fee2e2;color:#991b1b">
                    <i data-lucide="x-circle" style="width:14px;display:inline-block;margin-right:4px"></i>
                    Lỗi: <strong>${errors.length}</strong>
                </div>` : ''}
                ${sheets.length ? `<span class="text-sm text-slate-400">Sheets: ${sheets.join(', ')}</span>` : ''}
            </div>

            ${errors.length > 0 ? `
            <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:var(--radius-md);padding:14px;margin-bottom:16px">
                <p style="font-weight:700;color:#dc2626;font-size:13px;margin-bottom:6px">⛔ ${errors.length} bản ghi lỗi — Không thể import:</p>
                ${errors.slice(0,3).map(e => `<p style="font-size:12px;color:#991b1b">• Mã CC <code>${e.timeclock_code}</code>: ${e.error_message || 'Lỗi không xác định'}</p>`).join('')}
                ${errors.length > 3 ? `<p style="font-size:12px;color:#991b1b">... và ${errors.length-3} lỗi khác</p>` : ''}
            </div>` : ''}

            <div class="table-responsive border rounded-lg overflow-hidden">
                <table class="w-full" style="border-collapse:collapse;font-size:13px">
                    <thead style="background:var(--slate-50);border-bottom:2px solid var(--slate-200)">
                        <tr>
                            <th style="padding:12px;text-align:left;color:var(--slate-600);font-weight:700">Mã CC</th>
                            <th style="padding:12px;text-align:left;color:var(--slate-600);font-weight:700">Nhân viên</th>
                            <th style="padding:12px;text-align:left;color:var(--slate-600);font-weight:700">Ngày</th>
                            <th style="padding:12px;text-align:left;color:var(--slate-600);font-weight:700">Vào 1</th>
                            <th style="padding:12px;text-align:left;color:var(--slate-600);font-weight:700">Ra 1</th>
                            <th style="padding:12px;text-align:left;color:var(--slate-600);font-weight:700">Tổng giờ</th>
                            <th style="padding:12px;text-align:left;color:var(--slate-600);font-weight:700">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allRows.slice(0, 50).map(r => {
                            const hasErr = !!r.error_message;
                            const hasWarn = !hasErr && (!r.checkout1 || r.total_hours > 16);
                            const rowBg = hasErr ? '#fff1f2' : hasWarn ? '#fffbeb' : 'transparent';
                            const badge = hasErr
                                ? `<span class="v-badge v-err">${r.error_message || 'Lỗi'}</span>`
                                : hasWarn
                                    ? `<span class="v-badge v-warn">${!r.checkout1 ? 'Thiếu giờ Ra' : 'Bất thường'}</span>`
                                    : `<span class="v-badge v-ok">Hợp lệ</span>`;
                            return `
                            <tr style="border-bottom:1px solid var(--slate-100);background:${rowBg}">
                                <td style="padding:10px;font-family:monospace">${r.timeclock_code || '—'}</td>
                                <td style="padding:10px;font-weight:600">${r.full_name || `<span style="color:var(--danger)">Chưa map</span>`}</td>
                                <td style="padding:10px">${r.work_date || '—'}</td>
                                <td style="padding:10px">${r.checkin1 || '—'}</td>
                                <td style="padding:10px">${r.checkout1 || '<span style="color:var(--warning)">—</span>'}</td>
                                <td style="padding:10px">${r.total_hours != null ? r.total_hours + 'h' : '—'}</td>
                                <td style="padding:10px">${badge}</td>
                            </tr>`;
                        }).join('')}
                        ${allRows.length > 50 ? `
                        <tr>
                            <td colspan="7" style="padding:12px;text-align:center;color:var(--slate-400);font-style:italic">
                                ... và ${allRows.length - 50} dòng khác
                            </td>
                        </tr>` : ''}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderStep4() {
        const d = this.previewData;
        return `
            <div style="text-align:center;padding:40px">
                <div style="width:80px;height:80px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
                    <i data-lucide="check-circle" style="width:48px;height:48px;color:#166534"></i>
                </div>
                <h2 class="text-2xl font-heading mb-2">Import thành công!</h2>
                <p class="text-slate-500 mb-2">Dữ liệu chấm công đã được lưu vào hệ thống.</p>
                ${d ? `<p class="text-slate-400 mb-8" style="font-size:13px">${d.valid?.length || 0} bản ghi hợp lệ đã được lưu</p>` : ''}
                <div class="flex gap-3 justify-center">
                    <button class="btn btn-secondary" onclick="AttendanceView.init()">Import thêm</button>
                    <button class="btn btn-primary" onclick="App.navigate('payroll')">
                        <i data-lucide="calculator"></i> Tiếp tục tính lương
                    </button>
                </div>
            </div>
        `;
    },

    async handleFile(file) {
        if (!file) return;
        if (!this.periodStr) return Toast.show('Vui lòng chọn kỳ lương trước', 'error');
        this.file = file;
        this.step = 2;
        this.render();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('period', this.periodStr);

        try {
            const res = await fetch(`${API_BASE}/attendance/import`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` },
                body: formData
            });
            const result = await res.json();

            if (result.success) {
                this.batchId = result.data.batch_id;
                this.previewData = result.data;
                this.step = 3;
                this.render();
                lucide.createIcons();
            } else {
                Toast.show(result.message || 'Lỗi phân tích file', 'error');
                this.step = 1;
                this.render();
            }
        } catch (err) {
            Toast.show('Lỗi kết nối máy chủ', 'error');
            this.step = 1;
            this.render();
        }
    },

    async confirm() {
        if (!this.batchId) return Toast.show('Không có batch_id để xác nhận', 'error');

        try {
            const res = await fetch(`${API_BASE}/attendance/confirm`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ batch_id: this.batchId, period: this.periodStr })
            });
            const result = await res.json();
            if (result.success) {
                this.step = 4;
                this.render();
                lucide.createIcons();
            } else {
                Toast.show(result.message || 'Lỗi lưu dữ liệu', 'error');
            }
        } catch (err) {
            Toast.show('Lỗi kết nối máy chủ', 'error');
        }
    }
};
