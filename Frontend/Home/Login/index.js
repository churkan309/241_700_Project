const API_URL = 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = form.querySelector('input[type="email"]').value.trim();
        const password = form.querySelector('input[type="password"]').value.trim();

        if (!email || !password) {
            showAlert('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน', 'error');
            return;
        }

        const submitBtn = form.querySelector('.btn-submit');
        submitBtn.disabled = true;
        submitBtn.textContent = 'กำลังเข้าสู่ระบบ...';

        try {
            const response = await axios.post(`${API_URL}/auth/login`, { email, password });
            const { data } = response.data;

            // เก็บข้อมูลผู้ใช้ลง localStorage
            localStorage.setItem('user_id',   data.user_id);
            localStorage.setItem('firstname', data.firstname);
            localStorage.setItem('lastname',  data.lastname);
            localStorage.setItem('email',     data.email);
            localStorage.setItem('role',      data.role);

            showAlert('เข้าสู่ระบบสำเร็จ! กำลังนำคุณไปยังหน้าหลัก...', 'success');

            setTimeout(() => {
                if (data.role === 'teacher') {
                    window.location.href = '../../Teacher/index.html';
                } else {
                    window.location.href = '../../Student/Dashboard/index.html';
                }
            }, 1000);

        } catch (error) {
            const message = error.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง';
            showAlert(message, 'error');

        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'เข้าสู่ระบบ';
        }
    });
});

/**
 * แสดงข้อความแจ้งเตือนใต้ปุ่ม submit
 * @param {string} message - ข้อความ
 * @param {'success'|'error'} type - ประเภทการแจ้งเตือน
 */
function showAlert(message, type) {
    // ลบ alert เดิมออกก่อน (ถ้ามี)
    const existing = document.querySelector('.alert-msg');
    if (existing) existing.remove();

    const alert = document.createElement('p');
    alert.className = 'alert-msg';
    alert.textContent = message;
    alert.style.cssText = `
        margin-top: 12px;
        font-size: 0.875rem;
        text-align: center;
        color: ${type === 'success' ? '#16a34a' : '#dc2626'};
    `;

    document.querySelector('form').appendChild(alert);
}