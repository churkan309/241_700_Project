const BASE_URL = "http://localhost:8000";

window.onload = () => { localStorage.clear(); }

const loginData = async () => {
    let firstnameValue = document.getElementById('firstname').value;
    let passwordValue = document.getElementById('password').value;
    let messageDOM = document.getElementById('message');

    try {
        if (!firstnameValue || !passwordValue) throw { message: 'กรุณากรอกชื่อและรหัสผ่าน' };

        const res = await axios.post(`${BASE_URL}/login`, {
            firstname: firstnameValue,
            password: passwordValue
        });


        const user = res.data.data;

        localStorage.setItem('userID', user.user_id);
        localStorage.setItem('userName', user.firstname);
        localStorage.setItem('userRole', user.role);


        if (user.role === 'teacher') {
            window.location.href = '../Teacher/teacher.html';
        } else {
            window.location.href = '../Student/student.html';
        }


    } catch (error) {
        messageDOM.innerText = error.response ? error.response.data.message : error.message;
        messageDOM.className = 'message danger';
    }
}