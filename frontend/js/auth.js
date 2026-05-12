const API_BASE = 'http://127.0.0.1:3001/api';

/**
 * Auth Utility
 */
const Auth = {
    setToken(token) {
        localStorage.setItem('payroll_token', token);
    },

    getToken() {
        return localStorage.getItem('payroll_token');
    },

    setUser(user) {
        localStorage.setItem('payroll_user', JSON.stringify(user));
    },

    getUser() {
        const user = localStorage.getItem('payroll_user');
        return user ? JSON.parse(user) : null;
    },

    logout() {
        localStorage.removeItem('payroll_token');
        localStorage.removeItem('payroll_user');
        window.location.href = 'login.html';
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    checkAuth() {
        // Dùng DOM thay vì URL — tránh lỗi khi server redirect .html → clean URL
        const onLoginPage = !!document.getElementById('loginForm');
        if (!this.isAuthenticated() && !onLoginPage) {
            window.location.replace('login.html');
        }
    }
};

// Handle Login Form
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        const loginBtn = document.getElementById('loginBtn');

        errorDiv.classList.add('hidden');
        loginBtn.disabled = true;
        loginBtn.innerHTML = 'Đang xử lý...';

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                Auth.setToken(result.data.token);
                Auth.setUser(result.data.user);
                window.location.href = 'index.html';
            } else {
                errorDiv.innerText = result.message || 'Đăng nhập thất bại.';
                errorDiv.classList.remove('hidden');
            }
        } catch (err) {
            errorDiv.innerText = 'Lỗi kết nối máy chủ.';
            errorDiv.classList.remove('hidden');
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Đăng nhập <i data-lucide="arrow-right"></i>';
            lucide.createIcons();
        }
    });
}

// Initial Auth Check
Auth.checkAuth();
