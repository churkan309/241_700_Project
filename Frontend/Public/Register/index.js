const BASE_URL = 'http://localhost:8000';

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const role = document.querySelector('input[name="role"]:checked').value;
    const firstname = document.querySelector('input[type="firstname"]').value.trim();
    const lastname = document.querySelector('input[type="lastname"]').value.trim();
    const email = document.querySelector('input[type="email"]').value.trim();
    const password = document.querySelector('input[type="password"]').value.trim();

    if (!firstname || !lastname || !email || !password) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }

    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, {
            firstname,
            lastname,
            email,
            password,
            role
        });

        alert(response.data.message);
        window.location.href = '../Login/index.html';
    } catch (error) {
        if (error.response) {
            alert(error.response.data.message);
        } else {
            alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
        }
    }
});