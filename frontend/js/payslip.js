/**
 * Payslip View - Screen 5
 */

const PayslipView = {
    periodStr: null,
    periodId: null,
    selectedEmpId: null,
    currentDetail: null,

    async init() {
        const now = new Date();
        this.periodStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

        const content = document.getElementById('pageContent');
        const user = Auth.getUser();
        const isStaff = user?.role === 'NHANVIEN';

        content.innerHTML = `
            <div class="payslip-page">
                <header class="flex justify-between items-center mb-6 no-print">
                    <div>
                        <h2 class="text-2xl font-heading mb-1">Phiếu lương</h2>
                        <p class="text-slate-500">${isStaff ? 'Xem và tải về phiếu lương của bạn' : 'Xem phiếu lương nhân viên'}</p>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="period-selector">
                            <i data-lucide="calendar" style="width:16px;color:var(--slate-400)"></i>
                            <select id="payslipPeriodSelect" onchange="PayslipView.changePeriod(this.value)"></select>
                        </div>
                        ${!isStaff ? `
                        <div class="period-selector">
                            <i data-lucide="user" style="width:16px;color:var(--slate-400)"></i>
                            <select id="payslipEmpSelect" onchange="PayslipView.changeEmployee(this.value)">
                                <option value="">-- Chọn nhân viên --</option>
                            </select>
                        </div>` : ''}
                        <button class="btn btn-primary" onclick="PayslipView.downloadPDF()">
                            <i data-lucide="download"></i> Tải PDF
                        </button>
                        ${!isStaff ? `<button class="btn btn-secondary" onclick="PayslipView.downloadBatch()"><i data-lucide="layers"></i> Tải tất cả</button>` : ''}
                    </div>
                </header>

                <div id="payslipContent">
                    <div class="card" style="text-align:center;padding:60px;color:var(--slate-400)">
                        <i data-lucide="file-text" style="width:48px;height:48px;margin:0 auto 16px;display:block"></i>
                        <p>Chọn kỳ lương để xem phiếu</p>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();

        this.buildPeriodOptions();
        if (!isStaff) await this.loadEmployeeList();
        else {
            this.selectedEmpId = user?.employee_id;
            await this.loadPayslip();
        }
    },

    buildPeriodOptions() {
        const select = document.getElementById('payslipPeriodSelect');
        const now = new Date();
        let opts = '';
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const label = `Tháng ${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            opts += `<option value="${val}" ${i===0?'selected':''}>${label}</option>`;
        }
        select.innerHTML = opts;
    },

    async loadEmployeeList() {
        try {
            const res = await fetch(`${API_BASE}/employees?limit=200&status=active`, {
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });
            const data = await res.json();
            if (data.success) {
                const select = document.getElementById('payslipEmpSelect');
                const emps = data.data.employees;
                select.innerHTML = '<option value="">-- Chọn nhân viên --</option>' +
                    emps.map(e => `<option value="${e.employee_id}">${e.full_name} (${e.employee_id})</option>`).join('');
            }
        } catch (err) { /* ignore */ }
    },

    async changePeriod(val) {
        this.periodStr = val;
        this.periodId = null;
        this.currentDetail = null;
        await this.loadPayslip();
    },

    async changeEmployee(empId) {
        this.selectedEmpId = empId || null;
        await this.loadPayslip();
    },

    async loadPayslip() {
        if (!this.periodStr) return;

        const user = Auth.getUser();
        const isStaff = user?.role === 'NHANVIEN';
        const empId = isStaff ? user?.employee_id : this.selectedEmpId;

        // Lấy payroll để có period_id + data preview
        const payContent = document.getElementById('payslipContent');
        payContent.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--slate-400)">Đang tải...</div>`;

        try {
            const res = await fetch(`${API_BASE}/payroll/${this.periodStr}`, {
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });
            const data = await res.json();

            if (!data.success) {
                payContent.innerHTML = `<div class="card" style="text-align:center;padding:60px;color:var(--slate-400)"><p>Chưa có bảng lương kỳ này</p></div>`;
                return;
            }

            this.periodId = data.data.period.id;

            if (!empId) {
                payContent.innerHTML = `<div class="card" style="text-align:center;padding:60px;color:var(--slate-400)"><p>Chọn nhân viên để xem phiếu lương</p></div>`;
                return;
            }

            const detail = data.data.details.find(d => d.employee_id === empId);
            if (!detail) {
                payContent.innerHTML = `<div class="card" style="text-align:center;padding:60px;color:var(--slate-400)"><p>Không tìm thấy dữ liệu lương cho nhân viên này trong kỳ ${this.periodStr}</p></div>`;
                return;
            }

            this.currentDetail = detail;
            this.renderPayslip(detail, data.data.period);
        } catch (err) {
            payContent.innerHTML = `<div class="card" style="text-align:center;padding:40px;color:var(--danger)">Lỗi kết nối máy chủ</div>`;
        }
    },

    renderPayslip(d, period) {
        const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
        const numToWords = (n) => {
            if (!n) return 'Không đồng chẵn./.'
            // Đơn giản hóa — chỉ hiển thị số có dấu chấm
            return `${fmt(n)} đồng chẵn./.`;
        };

        document.getElementById('payslipContent').innerHTML = `
            <div class="payslip-container card p-12 bg-white mx-auto" style="max-width:800px;border:1px solid var(--slate-200);">
                <div class="payslip-header flex justify-between items-start mb-10 pb-6" style="border-bottom:2px solid var(--slate-900)">
                    <div>
                        <h1 style="font-size:20px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Phiếu thanh toán lương</h1>
                        <p style="font-size:14px;color:var(--slate-500);font-weight:600">Kỳ lương: <span style="color:var(--slate-900)">Tháng ${String(period.month).padStart(2,'0')}/${period.year}</span></p>
                    </div>
                    <div style="text-align:right">
                        <h3 style="font-size:16px;font-weight:700">NHÀ HÀNG ABC</h3>
                        <p style="font-size:12px;color:var(--slate-500)">Địa chỉ: 123 Đường Láng, Hà Nội</p>
                        <p style="font-size:12px;color:var(--slate-500)">Email: info@nhahanggabc.vn</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 mb-8">
                    <div class="space-y-2">
                        <div class="flex justify-between" style="border-bottom:1px solid var(--slate-100);padding-bottom:6px">
                            <span style="color:var(--slate-500);font-size:13px">Họ và tên:</span>
                            <span style="font-weight:700">${d.full_name}</span>
                        </div>
                        <div class="flex justify-between" style="border-bottom:1px solid var(--slate-100);padding-bottom:6px">
                            <span style="color:var(--slate-500);font-size:13px">Mã nhân viên:</span>
                            <span style="font-weight:700;font-family:monospace">${d.employee_id}</span>
                        </div>
                        <div class="flex justify-between" style="border-bottom:1px solid var(--slate-100);padding-bottom:6px">
                            <span style="color:var(--slate-500);font-size:13px">Ngày công thực tế:</span>
                            <span style="font-weight:700">${d.actual_work_days ?? '—'} / ${d.standard_work_days_snapshot ?? 26} ngày</span>
                        </div>
                    </div>
                    <div class="space-y-2">
                        <div class="flex justify-between" style="border-bottom:1px solid var(--slate-100);padding-bottom:6px">
                            <span style="color:var(--slate-500);font-size:13px">Bộ phận:</span>
                            <span style="font-weight:700">${d.department || '—'}</span>
                        </div>
                        <div class="flex justify-between" style="border-bottom:1px solid var(--slate-100);padding-bottom:6px">
                            <span style="color:var(--slate-500);font-size:13px">Hình thức LĐ:</span>
                            <span style="font-weight:700">${d.employment_type === 'TNC' ? 'Toàn thời gian' : d.employment_type || '—'}</span>
                        </div>
                        <div class="flex justify-between" style="border-bottom:1px solid var(--slate-100);padding-bottom:6px">
                            <span style="color:var(--slate-500);font-size:13px">Giờ tăng ca:</span>
                            <span style="font-weight:700">${d.overtime_hours ?? 0} giờ</span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-10 mb-8">
                    <div>
                        <h4 style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--slate-400);margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--slate-100)">1. Các khoản thu nhập</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between text-sm"><span style="color:var(--slate-600)">Lương theo công</span><span style="font-weight:600">${fmt(d.salary_by_work_days)}</span></div>
                            ${(d.overtime_pay > 0) ? `<div class="flex justify-between text-sm"><span style="color:var(--slate-600)">Lương tăng ca</span><span style="font-weight:600">${fmt(d.overtime_pay)}</span></div>` : ''}
                            ${(d.allowance_responsibility > 0) ? `<div class="flex justify-between text-sm"><span style="color:var(--slate-600)">PC Trách nhiệm</span><span style="font-weight:600">${fmt(d.allowance_responsibility)}</span></div>` : ''}
                            ${(d.allowance_phone > 0) ? `<div class="flex justify-between text-sm"><span style="color:var(--slate-600)">PC Điện thoại</span><span style="font-weight:600">${fmt(d.allowance_phone)}</span></div>` : ''}
                            ${(d.allowance_transport > 0) ? `<div class="flex justify-between text-sm"><span style="color:var(--slate-600)">PC Xăng xe</span><span style="font-weight:600">${fmt(d.allowance_transport)}</span></div>` : ''}
                            ${(d.allowance_work > 0) ? `<div class="flex justify-between text-sm"><span style="color:var(--slate-600)">PC Công việc</span><span style="font-weight:600">${fmt(d.allowance_work)}</span></div>` : ''}
                            ${(d.bonus_revenue > 0) ? `<div class="flex justify-between text-sm"><span style="color:var(--slate-600)">Thưởng doanh thu</span><span style="font-weight:600">${fmt(d.bonus_revenue)}</span></div>` : ''}
                            <div class="flex justify-between" style="padding-top:8px;border-top:2px solid var(--slate-200);font-weight:700">
                                <span>Tổng thu nhập</span>
                                <span style="color:var(--success)">${fmt(d.total_income)}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--slate-400);margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--slate-100)">2. Các khoản khấu trừ</h4>
                        <div class="space-y-3">
                            <div class="flex justify-between text-sm"><span style="color:var(--slate-600)">BHXH NV (10.5%)</span><span style="font-weight:600">${fmt(d.social_insurance)}</span></div>
                            <div class="flex justify-between text-sm">
                                <span style="color:var(--slate-600)">Thuế TNCN${d.is_tax_override ? ' ✎' : ''}</span>
                                <span style="font-weight:600${d.is_tax_override ? ';color:var(--warning)' : ''}">${fmt(d.tax_income)}</span>
                            </div>
                            ${(d.advance_payment > 0) ? `<div class="flex justify-between text-sm"><span style="color:var(--slate-600)">Tạm ứng</span><span style="font-weight:600">${fmt(d.advance_payment)}</span></div>` : ''}
                            ${(d.other_deductions > 0) ? `<div class="flex justify-between text-sm"><span style="color:var(--slate-600)">Giảm trừ khác</span><span style="font-weight:600">${fmt(d.other_deductions)}</span></div>` : ''}
                            <div class="flex justify-between" style="padding-top:8px;border-top:2px solid var(--slate-200);font-weight:700">
                                <span>Tổng khấu trừ</span>
                                <span style="color:var(--danger)">${fmt(d.total_deductions)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="background:var(--slate-900);color:white;border-radius:var(--radius-lg);padding:24px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center">
                    <div>
                        <span style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--slate-400)">Thực lĩnh chuyển khoản</span>
                        <h2 style="font-size:28px;font-weight:800;margin-top:4px">${fmt(d.net_salary)} đ</h2>
                    </div>
                    <div style="text-align:right;max-width:280px">
                        <span style="font-size:11px;color:var(--slate-400);font-style:italic">Bằng chữ:</span>
                        <p style="font-size:13px;font-weight:500;margin-top:4px">${numToWords(d.net_salary)}</p>
                    </div>
                </div>

                ${d.is_tax_override ? `
                <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:var(--radius-md);padding:12px;margin-bottom:20px">
                    <p style="font-size:12px;color:#92400e;font-weight:600">⚠ Thuế TNCN đã được điều chỉnh thủ công</p>
                    <p style="font-size:12px;color:#b45309;margin-top:4px">Lý do: ${d.tax_override_reason || 'Không có lý do'}</p>
                </div>` : ''}

                <div class="payslip-footer flex justify-between no-print" style="padding-top:20px;border-top:1px dashed var(--slate-200)">
                    <p style="font-size:12px;color:var(--slate-400)">Ngày in: ${new Date().toLocaleDateString('vi-VN')}</p>
                    <p style="font-size:12px;color:var(--slate-400)">Phiếu lương tự động từ hệ thống PayRoll VN</p>
                </div>
            </div>
        `;
    },

    downloadPDF() {
        if (!this.periodId || !this.selectedEmpId) {
            const user = Auth.getUser();
            if (user?.role === 'NHANVIEN' && user?.employee_id && this.periodId) {
                window.open(`${API_BASE}/payslip/${user.employee_id}/${this.periodId}?token=${Auth.getToken()}`, '_blank');
                return;
            }
            return Toast.show('Vui lòng chọn kỳ lương và nhân viên', 'error');
        }
        window.open(`${API_BASE}/payslip/${this.selectedEmpId}/${this.periodId}?token=${Auth.getToken()}`, '_blank');
    },

    downloadBatch() {
        if (!this.periodId) return Toast.show('Vui lòng chọn kỳ lương', 'error');
        window.open(`${API_BASE}/payslip/${this.periodId}/batch?token=${Auth.getToken()}`, '_blank');
    }
};
