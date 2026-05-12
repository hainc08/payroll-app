/**
 * Approval View - Screen 4
 */

const ApprovalView = {
    periodId: null,
    periodStr: null,
    data: null,
    history: [],

    async init() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="approval-page">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-2xl font-heading mb-1">Phê duyệt bảng lương</h2>
                    </div>
                    <div class="period-selector">
                        <i data-lucide="calendar" style="width:16px;color:var(--slate-400)"></i>
                        <select id="approvalPeriodSelect" onchange="ApprovalView.changePeriod(this.value)">
                            <option value="">-- Chọn kỳ lương --</option>
                        </select>
                    </div>
                </div>
                <div id="approvalContent">
                    <div class="card" style="text-align:center;padding:60px;color:var(--slate-400)">
                        <i data-lucide="check-square" style="width:48px;height:48px;margin:0 auto 16px;display:block"></i>
                        <p>Chọn kỳ lương để xem trạng thái phê duyệt</p>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
        this.buildPeriodOptions();
    },

    buildPeriodOptions() {
        const select = document.getElementById('approvalPeriodSelect');
        const now = new Date();
        let opts = '<option value="">-- Chọn kỳ lương --</option>';
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            const label = `Tháng ${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
            opts += `<option value="${val}">${label}</option>`;
        }
        select.innerHTML = opts;

        const curVal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
        select.value = curVal;
        this.changePeriod(curVal);
    },

    async changePeriod(val) {
        if (!val) return;
        this.periodStr = val;
        await this.loadData();
    },

    async loadData() {
        document.getElementById('approvalContent').innerHTML =
            `<div class="card" style="text-align:center;padding:40px;color:var(--slate-400)">Đang tải...</div>`;

        try {
            const payrollRes = await fetch(`${API_BASE}/payroll/${this.periodStr}`, {
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });
            const payrollData = await payrollRes.json();

            if (!payrollData.success) {
                document.getElementById('approvalContent').innerHTML = `
                    <div class="card" style="text-align:center;padding:60px;color:var(--slate-400)">
                        <p>${payrollData.message || 'Chưa có bảng lương cho kỳ này'}</p>
                    </div>`;
                return;
            }

            this.data = payrollData.data;
            this.periodId = payrollData.data.period.id;

            // Lấy lịch sử phê duyệt
            const histRes = await fetch(`${API_BASE}/payroll/${this.periodId}/history`, {
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });
            const histData = await histRes.json();
            this.history = histData.success ? histData.data : [];

            this.render();
        } catch (err) {
            document.getElementById('approvalContent').innerHTML =
                `<div class="card" style="text-align:center;padding:40px;color:var(--danger)">Lỗi kết nối máy chủ</div>`;
        }
    },

    render() {
        const period = this.data.period;
        const details = this.data.details;
        const user = Auth.getUser();
        const fmt = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(n || 0));

        const totalGross = details.reduce((s,d)=>s+(parseFloat(d.total_income)||0),0);
        const totalBHXH = details.reduce((s,d)=>s+(parseFloat(d.social_insurance)||0),0);
        const totalTax = details.reduce((s,d)=>s+(parseFloat(d.tax_income)||0),0);
        const totalNet = details.reduce((s,d)=>s+(parseFloat(d.net_salary)||0),0);
        const overrideList = details.filter(d => d.is_tax_override);

        // Quyền action
        const canKetoanApprove = ['ADMIN','KETOAN'].includes(user?.role) && period.status === 'CHO_DUYET';
        const canGiamdocApprove = user?.role === 'GIAMDOC' && period.status === 'KETOAN_DUYET';
        const canReject = ['ADMIN','KETOAN','GIAMDOC'].includes(user?.role) &&
            ['CHO_DUYET','KETOAN_DUYET'].includes(period.status);
        const canApprove = canKetoanApprove || canGiamdocApprove;

        const statusLabel = {
            'NHAP': 'Đang soạn thảo', 'CHO_DUYET': 'Chờ Kế toán duyệt',
            'KETOAN_DUYET': 'Chờ Giám đốc duyệt', 'GIAMDOC_DUYET': 'Giám đốc đã duyệt',
            'DA_CHOT': 'Đã chốt lương 🔒'
        };

        document.getElementById('approvalContent').innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <span class="period-badge status-${period.status.toLowerCase()}">${statusLabel[period.status] || period.status}</span>
                <div class="flex gap-3">
                    ${canReject ? `<button class="btn btn-danger" onclick="ApprovalView.reject()"><i data-lucide="x-circle"></i> Từ chối</button>` : ''}
                    ${canApprove ? `<button class="btn btn-success" onclick="ApprovalView.approve()"><i data-lucide="check-circle"></i> ${canKetoanApprove ? 'Duyệt (Kế toán)' : 'Phê duyệt & Chốt (Giám đốc)'}</button>` : ''}
                    ${period.status === 'DA_CHOT' ? `<button class="btn btn-secondary" onclick="ApprovalView.downloadBatch()"><i data-lucide="download"></i> Tải PDF tất cả</button>` : ''}
                </div>
            </div>

            <div class="grid grid-cols-3 gap-6">
                <!-- Summary -->
                <div class="card p-8">
                    <h3 class="font-heading mb-6 border-b pb-4">Tóm tắt kỳ T${period.month}/${period.year}</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between">
                            <span class="text-slate-500">Tổng nhân viên</span>
                            <span class="font-bold">${details.length}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-500">Tổng thu nhập (Gross)</span>
                            <span class="font-bold">${fmt(totalGross)} đ</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-500">BHXH + Thuế TNCN</span>
                            <span class="font-bold text-danger">- ${fmt(totalBHXH + totalTax)} đ</span>
                        </div>
                        <div class="flex justify-between pt-4 border-t">
                            <span class="font-heading">Tổng NET thực lĩnh</span>
                            <span style="font-size:20px;font-weight:800;color:var(--primary)">${fmt(totalNet)} đ</span>
                        </div>
                        ${overrideList.length > 0 ? `
                        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:var(--radius-md);padding:12px;margin-top:8px">
                            <p style="font-size:12px;font-weight:700;color:#c2410c;margin-bottom:6px">⚠ ${overrideList.length} dòng thuế sửa tay:</p>
                            ${overrideList.map(d => `<p style="font-size:12px;color:#92400e">• ${d.full_name} — ${d.tax_override_reason || 'Không có lý do'}</p>`).join('')}
                        </div>` : ''}
                    </div>
                </div>

                <!-- Timeline -->
                <div class="card col-span-2 p-8">
                    <h3 class="font-heading mb-6 border-b pb-4">Timeline phê duyệt</h3>
                    <div id="timelineContainer">
                        ${this.renderTimeline(period)}
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    renderTimeline(period) {
        const actionLabels = {
            'SUBMIT': 'Kế toán gửi phê duyệt',
            'KETOAN_APPROVE': 'Kế toán trưởng đã duyệt',
            'KETOAN_REJECT': 'Kế toán trưởng từ chối',
            'GIAMDOC_APPROVE': 'Giám đốc đã chốt lương',
            'GIAMDOC_REJECT': 'Giám đốc từ chối',
        };
        const actionColors = {
            'SUBMIT': '#3b82f6',
            'KETOAN_APPROVE': '#10b981', 'GIAMDOC_APPROVE': '#10b981',
            'KETOAN_REJECT': '#ef4444', 'GIAMDOC_REJECT': '#ef4444',
        };

        // Hiện tại
        const currentStep = {
            'NHAP': 'Bảng lương đang soạn thảo',
            'CHO_DUYET': 'Đang chờ Kế toán trưởng phê duyệt...',
            'KETOAN_DUYET': 'Đang chờ Giám đốc phê duyệt & chốt...',
            'DA_CHOT': null,
        };

        let html = '';

        // Lịch sử (đảo ngược để hiện mới nhất dưới cùng)
        const reversed = [...this.history].reverse();
        reversed.forEach(h => {
            const color = actionColors[h.action] || '#64748b';
            const date = h.created_at ? new Date(h.created_at).toLocaleString('vi-VN') : '';
            html += `
            <div class="flex gap-4 pb-6 relative">
                <div style="width:36px;height:36px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <i data-lucide="${h.action.includes('REJECT') ? 'x' : 'check'}" style="width:16px;height:16px;color:white"></i>
                </div>
                <div style="flex:1;padding-top:6px">
                    <div class="flex justify-between">
                        <h4 style="font-weight:700;font-size:14px;color:${color}">${actionLabels[h.action] || h.action}</h4>
                        <span style="font-size:12px;color:var(--slate-400)">${date}</span>
                    </div>
                    <p style="font-size:13px;color:var(--slate-500);margin-top:2px">${h.full_name || ''} (${h.role || ''})</p>
                    ${h.note ? `<p style="font-size:12px;color:var(--slate-400);font-style:italic;margin-top:4px">"${h.note}"</p>` : ''}
                </div>
            </div>`;
        });

        // Bước hiện tại đang chờ
        if (currentStep[period.status]) {
            html += `
            <div class="flex gap-4 pb-6">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--slate-200);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <i data-lucide="clock" style="width:16px;height:16px;color:var(--slate-500)"></i>
                </div>
                <div style="flex:1;padding-top:6px">
                    <h4 style="font-weight:700;font-size:14px;color:var(--slate-400)">${currentStep[period.status]}</h4>
                </div>
            </div>`;
        }

        if (!html) {
            html = `<p style="color:var(--slate-400);font-size:14px">Chưa có hoạt động phê duyệt nào.</p>`;
        }

        return html;
    },

    async approve() {
        const user = Auth.getUser();
        const isGD = user?.role === 'GIAMDOC';
        const msg = isGD
            ? `Xác nhận chốt bảng lương T${this.data.period.month}/${this.data.period.year}? Thao tác này không thể hoàn tác.`
            : `Duyệt bảng lương (cấp 1 - Kế toán)?`;
        if (!confirm(msg)) return;
        try {
            const res = await fetch(`${API_BASE}/payroll/${this.periodId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });
            const result = await res.json();
            if (result.success) {
                Toast.show(isGD ? 'Đã chốt bảng lương!' : 'Đã duyệt cấp 1!', 'success');
                await this.loadData();
            } else {
                Toast.show(result.message || 'Lỗi phê duyệt', 'error');
            }
        } catch (err) {
            Toast.show('Lỗi kết nối', 'error');
        }
    },

    async reject() {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-box">
                <div class="modal-header">
                    <h3>Từ chối bảng lương</h3>
                    <button class="icon-btn" onclick="this.closest('.modal-overlay').remove()"><i data-lucide="x"></i></button>
                </div>
                <div class="form-group">
                    <label>Lý do từ chối <span style="color:var(--danger)">*</span></label>
                    <textarea id="rejectReason" class="form-control" rows="3" placeholder="Nhập lý do từ chối..."></textarea>
                </div>
                <div id="rejectErr" class="text-danger hidden"></div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Hủy</button>
                    <button class="btn btn-danger" onclick="ApprovalView.confirmReject()">Xác nhận từ chối</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        lucide.createIcons();
    },

    async confirmReject() {
        const reason = document.getElementById('rejectReason').value.trim();
        const errDiv = document.getElementById('rejectErr');
        if (!reason) {
            errDiv.innerText = 'Vui lòng nhập lý do từ chối.';
            errDiv.classList.remove('hidden');
            return;
        }
        try {
            const res = await fetch(`${API_BASE}/payroll/${this.periodId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${Auth.getToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });
            const result = await res.json();
            if (result.success) {
                document.querySelector('.modal-overlay')?.remove();
                Toast.show('Đã từ chối bảng lương', 'success');
                await this.loadData();
            } else {
                errDiv.innerText = result.message || 'Lỗi';
                errDiv.classList.remove('hidden');
            }
        } catch (err) {
            errDiv.innerText = 'Lỗi kết nối';
            errDiv.classList.remove('hidden');
        }
    },

    downloadBatch() {
        if (!this.periodId) return;
        window.open(`${API_BASE}/payslip/${this.periodId}/batch?token=${Auth.getToken()}`, '_blank');
    }
};
