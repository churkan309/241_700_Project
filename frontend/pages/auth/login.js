// login.js — ใช้ utils.js (toast, escHtml, API_URL, showPopup)

document.addEventListener('DOMContentLoaded', () => {
    const form      = document.querySelector('form');
    const submitBtn = form.querySelector('.btn-submit');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = form.querySelector('input[type="email"]').value.trim();
        const password = form.querySelector('input[type="password"]').value.trim();

        if (!email || !password) {
            showAlert('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน', 'error');
            return;
        }

        submitBtn.disabled    = true;
        submitBtn.textContent = 'กำลังเข้าสู่ระบบ...';

        try {
            const response = await axios.post(`${API_URL}/auth/login`, { email, password });
            const { data } = response.data;

            localStorage.setItem('user_id',   data.user_id);
            localStorage.setItem('firstname',  data.firstname);
            localStorage.setItem('lastname',   data.lastname);
            localStorage.setItem('email',      data.email);
            localStorage.setItem('role',       data.role);

            showAlert('เข้าสู่ระบบสำเร็จ! กำลังนำคุณไปยังหน้าหลัก...', 'success');

            setTimeout(() => {
                window.location.href = data.role === 'teacher'
                    ? '../teacher/dashboard.html'
                    : '../student/dashboard.html';
            }, 1000);

        } catch (error) {
            showAlert(error.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง', 'error');
        } finally {
            submitBtn.disabled    = false;
            submitBtn.textContent = 'เข้าสู่ระบบ';
        }
    });
});

function showAlert(message, type) {
    const existing = document.querySelector('.alert-msg');
    if (existing) existing.remove();

    const alert       = document.createElement('p');
    alert.className   = 'alert-msg';
    alert.textContent = message;
    alert.style.cssText = `
        margin-top:12px;font-size:.875rem;text-align:center;
        color:${type === 'success' ? '#16a34a' : '#dc2626'};`;

    document.querySelector('form').appendChild(alert);
}
