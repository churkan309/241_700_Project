document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const role = document.querySelector('input[name="role"]:checked')?.value;
    if (!role) {
        showPopup('กรุณาเลือกประเภทผู้ใช้ (นักเรียน / อาจารย์)', 'warning');
        return;
    }

    const firstname = document.getElementById('inputFirstname').value.trim();
    const lastname  = document.getElementById('inputLastname').value.trim();
    const email     = document.querySelector('input[type="email"]').value.trim();
    const password  = document.querySelector('input[type="password"]').value.trim();

    if (!firstname || !lastname || !email || !password) {
        showPopup('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
        return;
    }

    try {
        const response = await axios.post(`${API_URL}/auth/register`, {
            firstname, lastname, email, password, role,
        });

        await showPopup(response.data.message, 'success'); // รอ ตกลง แล้วค่อย redirect
        window.location.href = 'login.html';

    } catch (error) {
        showPopup(
            error.response?.data?.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
            'error'
        );
    }
});
