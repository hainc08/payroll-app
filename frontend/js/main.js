/**
 * Main App Logic — Router, Toast, Sidebar
 */

// ── Toast Utility ─────────────────────────────────────────────────
const Toast = {
    _el: null,
    _timer: null,

    _getEl() {
        if (!this._el) {
            this._el = document.createElement('div');
            this._el.className = 'toast';
            document.body.appendChild(this._el);
        }
        return this._el;
    },

    show(msg, type = 'success') {
        const el = this._getEl();
        el.className = `toast toast-${type} show`;
        el.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}" style="width:18px;height:18px"></i> ${msg}`;
        lucide.createIcons();

        clearTimeout(this._timer);
        this._timer = setTimeout(() => { el.classList.remove('show'); }, 3000);
    }
};

// ── App Router ────────────────────────────────────────────────────
const PAGES = {
    dashboard:  { label: 'Tổng quan',      view: () => DashboardView.init() },
    employees:  { label: 'Nhân viên',      view: () => EmployeeView.init() },
    attendance: { label: 'Chấm công',      view: () => AttendanceView.init() },
    mapping:    { label: 'Mapping mã NV',  view: () => MappingView.init() },
    payroll:    { label: 'Bảng lương',     view: () => PayrollView.init() },
    approval:   { label: 'Phê duyệt',      view: () => ApprovalView.init() },
    payslip:    { label: 'Phiếu lương',    view: () => PayslipView.init() },
};

// Pages ẩn theo role
const ROLE_HIDDEN = {
    NHANVIEN: ['employees', 'attendance', 'mapping', 'payroll', 'approval'],
    QUANLY:   ['attendance', 'mapping'],
    GIAMDOC:  ['attendance', 'mapping'],
    KETOAN:   [],
    ADMIN:    [],
};

const App = {
    currentPage: 'dashboard',

    navigate(page) {
        if (!PAGES[page]) return;

        const user = Auth.getUser();
        const hidden = ROLE_HIDDEN[user?.role] || [];
        if (hidden.includes(page)) {
            Toast.show('Bạn không có quyền truy cập trang này', 'error');
            return;
        }

        this.currentPage = page;

        // Update sidebar active
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-page') === page);
        });

        // Update breadcrumb
        document.getElementById('breadcrumb').innerHTML = `
            <span style="cursor:pointer;color:var(--slate-500)" onclick="App.navigate('dashboard')">Trang chủ</span>
            <span class="breadcrumb-sep">/</span>
            <span style="color:var(--slate-800);font-weight:600">${PAGES[page].label}</span>
        `;

        // Load page
        PAGES[page].view();
    },

    async loadApprovalBadge() {
        // Đếm bảng lương đang chờ phê duyệt của user hiện tại
        const user = Auth.getUser();
        if (!user || !['ADMIN','KETOAN','GIAMDOC'].includes(user.role)) return;

        try {
            const now = new Date();
            const periodStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
            const res = await fetch(`${API_BASE}/payroll/${periodStr}`, {
                headers: { 'Authorization': `Bearer ${Auth.getToken()}` }
            });
            const data = await res.json();
            if (!data.success) return;

            const status = data.data.period.status;
            let needsAction = false;
            if (['KETOAN','ADMIN'].includes(user.role) && status === 'CHO_DUYET') needsAction = true;
            if (user.role === 'GIAMDOC' && status === 'KETOAN_DUYET') needsAction = true;

            const badge = document.getElementById('approvalBadge');
            if (badge) badge.style.display = needsAction ? '' : 'none';
        } catch (err) { /* ignore */ }
    }
};

// ── Sidebar Builder ───────────────────────────────────────────────
function buildSidebar() {
    const user = Auth.getUser();
    const role = user?.role || '';
    const hidden = ROLE_HIDDEN[role] || [];

    const navItems = [
        { page: 'dashboard',  icon: 'layout-dashboard', label: 'Tổng quan' },
        { page: 'employees',  icon: 'users',             label: 'Nhân viên' },
        { page: 'attendance', icon: 'calendar-check',    label: 'Chấm công' },
        { page: 'mapping',    icon: 'link-2',             label: 'Mapping mã NV' },
        { page: 'payroll',    icon: 'calculator',        label: 'Bảng lương' },
        { page: 'approval',   icon: 'check-square',      label: 'Phê duyệt', badge: true },
        { page: 'payslip',    icon: 'file-text',         label: 'Phiếu lương' },
    ];

    const nav = document.querySelector('.nav-menu');
    if (!nav) return;

    nav.innerHTML = navItems
        .filter(item => !hidden.includes(item.page))
        .map(item => `
            <a href="#" class="nav-item" data-page="${item.page}" onclick="event.preventDefault();App.navigate('${item.page}')">
                <i data-lucide="${item.icon}"></i>
                <span>${item.label}</span>
                ${item.badge ? `<span id="approvalBadge" class="nav-badge" style="display:none;margin-left:auto;background:var(--danger);color:white;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px">!</span>` : ''}
            </a>
        `).join('');

    lucide.createIcons();
}

// ── Sidebar Footer (user info) ────────────────────────────────────
function populateUserInfo() {
    const user = Auth.getUser();
    if (!user) return;

    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    const avatarEl = document.getElementById('userAvatar');

    if (nameEl) nameEl.innerText = user.full_name || user.email || '';
    if (roleEl) roleEl.innerText = user.role || '';
    if (avatarEl) {
        const initials = (user.full_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        avatarEl.innerText = initials;
    }
}

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Auth.checkAuth() đã chạy ở cuối auth.js khi script load — không gọi lại ở đây

    populateUserInfo();
    buildSidebar();

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Xác nhận đăng xuất?')) Auth.logout();
        });
    }

    // Initial page load
    App.navigate('dashboard');

    // Load approval badge sau 500ms
    setTimeout(() => App.loadApprovalBadge(), 500);
});
