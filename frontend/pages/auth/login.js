document.addEventListener('DOMContentLoaded', () => {
    const form      = document.querySelector('form');
    const submitBtn = form.querySelector('.btn-submit');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = form.querySelector('input[type="email"]').value.trim();
        const password = form.querySelector('input[type="password"]').value.trim();

        if (!email || !password) {
            showPopup('กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน', 'warning');
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

            showPopup('เข้าสู่ระบบสำเร็จ! กำลังนำคุณไปยังหน้าหลัก...', 'success').then(() => {
                window.location.href = data.role === 'teacher'
                    ? '../teacher/dashboard.html'
                    : '../student/dashboard.html';
            });

        } catch (error) {
            showPopup(error.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองอีกครั้ง', 'error');
        } finally {
            submitBtn.disabled    = false;
            submitBtn.textContent = 'เข้าสู่ระบบ';
        }
    });
});