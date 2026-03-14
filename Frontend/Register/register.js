const BASE_URL = "http://localhost:8000";

const submitRegister = async () => {
    let firstname = document.getElementById('firstname').value;
    let lastname = document.getElementById('lastname').value;
    let password = document.getElementById('password').value;
    let roleDOM = document.querySelector('input[name=role]:checked');
    let messageDOM = document.getElementById('message');

    try {
        if (!firstname || !lastname || !password || !roleDOM) throw { message: 'ข้อมูลไม่ครบถ้วน' };

        await axios.post(`${BASE_URL}/register`, {
            firstname, lastname, password, role: roleDOM.value
        });

        messageDOM.innerText = 'สมัครสมาชิกสำเร็จ! กำลังพากลับไปหน้าเข้าสู่ระบบ...';
        messageDOM.className = 'message success';
        setTimeout(() => { window.location.href = '../Home/home.html'; }, 2000);

    } catch (error) {
        messageDOM.innerText = error.response ? error.response.data.message : error.message;
        messageDOM.className = 'message danger';
    }
}