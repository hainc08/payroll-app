/**
 * Dashboard Logic - Screen 1
 */

const DashboardView = {
    async init() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="dashboard-container">
                <header class="flex justify-between items-center mb-8">
                    <div>
                        <h1 class="text-3xl font-heading" id="dashGreeting">Xin chào!</h1>
                        <p class="text-slate-500" id="dashDate">Đang tải...</p>
                    </div>
                    <div class="flex gap-3">
                        <button class="btn btn-primary" onclick="App.navigate('payroll')">
                            <i data-lucide="plus"></i> Tạo kỳ lương
                        </button>
                    </div>
                </header>

                <!-- KPI Cards -->
                <div class="grid grid-cols-4 gap-6 mb-8" id="kpiCards">
                    ${[1,2,3,4].map(() => `
                    <div class="card kpi-card">
                        <div class="kpi-icon bg-slate-100"><div style="width:24px;height:24px;background:var(--slate-200);border-radius:4px"></div></div>
                        <div class="kpi-data">
                            <span class="kpi-label" style="background:var(--slate-200);height:12px;width:80px;border-radius:4px;display:block"></span>
                            <div style="background:var(--slate-100);height:28px;width:60px;border-radius:4px;margin:6px 0"></div>
                        </div>
                    </div>`).join('')}
                </div>

                <!-- Main Grid -->
                <div class="grid grid-cols-3 gap-6">
                    <div class="card col-span-2" id="activityCard">
                        <h3 class="font-heading mb-4">Trạng thái kỳ lương hiện tại</h3>
                        <div style="color:var(--slate-400);text-align:center;padding:40px">Đang tải...</div>
                    </div>
                    <div class="card" id="todoCard">
                        <h3 class="font-heading mb-4">Việc cần làm</h3>
                        <div style="color:var(--slate-400);text-align:center;padding:40px">Đang tải...</div>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
        this.setGreeting();
        await this.loadData();
    },

    setGreeting() {
        const user = Auth.getUser();
        const h = new Date().getHours();
        const greeting = h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
        const name = user?.full_name || 'bạn';
        document.getElementById('dashGreeting').innerText = `${greeting}, ${name.split(' ').pop()}!`;

        const now = new Date();
        const days = ['Chủ nhật','Thứ hai','Thứ ba','Thứ tư','Thứ năm','Thứ sáu','Thứ bảy'];
        document.getElementById('dashDate').innerText =
            `${days[now.getDay()]}, ngày ${now.getDate()} tháng ${now.getMonth()+1} năm ${now.getFullYear()}`;
    },

    async loadData() {
        const now = new Date();
        const periodStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

        // Gọi song song: employees + payroll tháng hiện tại
        const [empResult, payrollResult] = await Promise.allSettled([
            fetch(`${API_BASE}/employees?limit=1&status=active`, { headers: { 'Authorization': `Bearer ${Auth.getToken()}` } }).then(r => r.json()),
            fetch(`${API_BASE}/payroll/${periodStr}`, { headers: { 'Authorization': `Bearer ${Auth.getToken()}` } }).then(r => r.json()),
        ]);

        const empData = empResult.status === 'fulfilled' ? empResult.value : null;
        const payData = payrollResult.status === 'fulfilled' ? payrollResult.value : null;

        const totalEmp = empData?.data?.pagination?.total ?? '—';
        const period = payData?.success ? payData.data.period : null;
        const details = payData?.success ? payData.data.details : [];

        const totalNet = details.reduce((s, d) => s + (parseFloat(d.net_salary) || 0), 0);
        const totalGross = details.reduce((s, d) => s + (parseFloat(d.total_income) || 0), 0);
        const overrideCount = details.filter(d => d.is_tax_override).length;

        this.renderKPI(totalEmp, totalNet, period, overrideCount);
        this.renderPayrollStatus(period, details, periodStr);
        this.renderTodo(period, overrideCount);
    },

    renderKPI(totalEmp, totalNet, period, overrideCount) {
        const fmt = (n) => n >= 1e9
            ? (n/1e9).toFixed(1) + ' tỷ'
            : n >= 1e6 ? (n/1e6).toFixed(1) + ' tr' : new Intl.NumberFormat('vi-VN').format(Math.round(n));

        const statusLabels = {
            'NHAP': 'Đang soạn',
            'CHO_DUYET': 'Chờ duyệt',
            'KETOAN_DUYET': 'KT đã duyệt',
            'GIAMDOC_DUYET': 'GĐ đã duyệt',
            'DA_CHOT': 'Đã chốt',
        };
        const statusColors = {
            'NHAP': 'amber', 'CHO_DUYET': 'amber', 'KETOAN_DUYET': 'info',
            'GIAMDOC_DUYET': 'success', 'DA_CHOT': 'success',
        };

        document.getElementById('kpiCards').innerHTML = `
            <div class="card kpi-card">
                <div class="kpi-icon bg-indigo-50" style="color:var(--primary)"><i data-lucide="users"></i></div>
                <div class="kpi-data">
                    <span class="kpi-label">Nhân viên đang làm</span>
                    <h3 class="kpi-value">${totalEmp}</h3>
                    <span class="kpi-subtext">đang hoạt động</span>
                </div>
            </div>
            <div class="card kpi-card">
                <div class="kpi-icon bg-emerald-50" style="color:var(--success)"><i data-lucide="banknote"></i></div>
                <div class="kpi-data">
                    <span class="kpi-label">Quỹ lương NET (tháng này)</span>
                    <h3 class="kpi-value">${period ? fmt(totalNet) : '—'}</h3>
                    <span class="kpi-subtext">Gross: ${period ? fmt(totalGross) : '—'}</span>
                </div>
            </div>
            <div class="card kpi-card">
                <div class="kpi-icon bg-amber-50" style="color:var(--warning)"><i data-lucide="clock"></i></div>
                <div class="kpi-data">
                    <span class="kpi-label">Trạng thái bảng lương</span>
                    <h3 class="kpi-value" style="font-size:20px">${period ? (statusLabels[period.status] || period.status) : 'Chưa tạo'}</h3>
                    <span class="kpi-subtext">${period ? `${period.month}/${period.year}` : 'Tháng này'}</span>
                </div>
            </div>
            <div class="card kpi-card">
                <div class="kpi-icon bg-rose-50" style="color:var(--danger)"><i data-lucide="alert-circle"></i></div>
                <div class="kpi-data">
                    <span class="kpi-label">Thuế điều chỉnh tay</span>
                    <h3 class="kpi-value" style="color:${overrideCount > 0 ? 'var(--danger)' : 'var(--success)'}">${overrideCount}</h3>
                    <span class="kpi-subtext">${overrideCount > 0 ? 'Cần kiểm tra trước khi duyệt' : 'Không có bất thường'}</span>
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    renderPayrollStatus(period, details, periodStr) {
        const card = document.getElementById('activityCard');
        if (!period) {
            card.innerHTML = `
                <h3 class="font-heading mb-4">Trạng thái kỳ lương — Tháng ${periodStr}</h3>
                <div style="text-align:center;padding:40px;color:var(--slate-400)">
                    <i data-lucide="file-x" style="width:40px;height:40px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto"></i>
                    <p>Chưa có bảng lương tháng này</p>
                    <button class="btn btn-primary mt-4" onclick="App.navigate('attendance')"><i data-lucide="upload"></i> Import chấm công</button>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));
        const totalNet = details.reduce((s,d)=>s+(parseFloat(d.net_salary)||0),0);
        const totalGross = details.reduce((s,d)=>s+(parseFloat(d.total_income)||0),0);
        const totalBHXH = details.reduce((s,d)=>s+(parseFloat(d.social_insurance)||0),0);
        const totalTax = details.reduce((s,d)=>s+(parseFloat(d.tax_income)||0),0);

        const statusFlow = ['NHAP','CHO_DUYET','KETOAN_DUYET','GIAMDOC_DUYET','DA_CHOT'];
        const curIdx = statusFlow.indexOf(period.status);

        const steps = [
            { label: 'Nháp', icon: 'edit' },
            { label: 'Chờ duyệt', icon: 'send' },
            { label: 'KT duyệt', icon: 'check' },
            { label: 'GĐ duyệt', icon: 'check-circle' },
            { label: 'Đã chốt', icon: 'lock' },
        ];

        card.innerHTML = `
            <h3 class="font-heading mb-6">Bảng lương T${period.month}/${period.year}</h3>
            <div class="stepper mb-8">
                ${steps.map((s, i) => `
                    <div class="step ${i < curIdx ? 'completed' : ''} ${i === curIdx ? 'active' : ''}">
                        <div class="step-circle"><i data-lucide="${s.icon}" style="width:14px;height:14px"></i></div>
                        <span class="step-label">${s.label}</span>
                        ${i < steps.length-1 ? '<div class="step-connector"></div>' : ''}
                    </div>
                `).join('')}
            </div>
            <div class="grid grid-cols-4 gap-4 mt-4">
                <div style="text-align:center;padding:16px;background:var(--slate-50);border-radius:var(--radius-md)">
                    <div style="font-size:11px;color:var(--slate-500);font-weight:600;text-transform:uppercase;margin-bottom:4px">Nhân viên</div>
                    <div style="font-size:22px;font-weight:800">${details.length}</div>
                </div>
                <div style="text-align:center;padding:16px;background:#f0fdf4;border-radius:var(--radius-md)">
                    <div style="font-size:11px;color:#065f46;font-weight:600;text-transform:uppercase;margin-bottom:4px">Tổng Gross</div>
                    <div style="font-size:18px;font-weight:800;color:#059669">${fmt(totalGross)}</div>
                </div>
                <div style="text-align:center;padding:16px;background:#fff1f2;border-radius:var(--radius-md)">
                    <div style="font-size:11px;color:#9f1239;font-weight:600;text-transform:uppercase;margin-bottom:4px">BHXH + Thuế</div>
                    <div style="font-size:18px;font-weight:800;color:#dc2626">-${fmt(totalBHXH + totalTax)}</div>
                </div>
                <div style="text-align:center;padding:16px;background:var(--primary-light);border-radius:var(--radius-md)">
                    <div style="font-size:11px;color:var(--primary-dark);font-weight:600;text-transform:uppercase;margin-bottom:4px">Tổng NET</div>
                    <div style="font-size:18px;font-weight:800;color:var(--primary)">${fmt(totalNet)}</div>
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    renderTodo(period, overrideCount) {
        const card = document.getElementById('todoCard');
        const todos = [];

        if (!period) {
            todos.push({ text: 'Import chấm công tháng này', color: 'danger', action: "App.navigate('attendance')" });
        } else {
            if (period.status === 'NHAP') {
                todos.push({ text: 'Kiểm tra bảng lương và gửi phê duyệt', color: 'warning', action: "App.navigate('payroll')" });
            }
            if (period.status === 'CHO_DUYET') {
                todos.push({ text: 'Kế toán trưởng cần duyệt bảng lương', color: 'warning', action: "App.navigate('approval')" });
            }
            if (period.status === 'KETOAN_DUYET') {
                todos.push({ text: 'Giám đốc cần phê duyệt & chốt lương', color: 'danger', action: "App.navigate('approval')" });
            }
            if (period.status === 'DA_CHOT') {
                todos.push({ text: 'Bảng lương đã chốt — Nhân viên có thể xem phiếu', color: 'success', action: "App.navigate('payslip')" });
            }
            if (overrideCount > 0) {
                todos.push({ text: `${overrideCount} dòng thuế TNCN đã sửa tay — cần kiểm tra`, color: 'warning', action: "App.navigate('payroll')" });
            }
        }

        if (!todos.length) {
            todos.push({ text: 'Không có việc cần xử lý', color: 'success', action: '' });
        }

        const colorMap = { danger: 'var(--danger)', warning: 'var(--warning)', success: 'var(--success)', info: 'var(--info)' };

        card.innerHTML = `
            <h3 class="font-heading mb-4">Việc cần làm</h3>
            <div class="space-y-3">
                ${todos.map(t => `
                <div style="display:flex;align-items:flex-start;gap:12px;padding:12px;border-radius:var(--radius-md);background:var(--slate-50);cursor:${t.action ? 'pointer' : 'default'}" ${t.action ? `onclick="${t.action}"` : ''}>
                    <div style="width:8px;height:8px;border-radius:50%;background:${colorMap[t.color]};margin-top:6px;flex-shrink:0"></div>
                    <p style="font-size:14px;font-weight:500;color:var(--slate-700)">${t.text}</p>
                </div>`).join('')}
            </div>
        `;
    }
};
