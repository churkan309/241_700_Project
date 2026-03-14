const BASE_URL = "http://localhost:8000";
let userID = localStorage.getItem('userID');
console.log("USER ID:", userID);


window.onload = async () => {
    if (!userID || localStorage.getItem('userRole') !== 'student') window.location.href = '../Home/home.html';
    document.getElementById('studentName').innerText = localStorage.getItem('userName');
    loadEnrolled();
    loadAllCourses();
    loadProfile();
}

const toggleProfile = () => {
    const section = document.getElementById('profileSection');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
}

const loadProfile = async () => {
    try {
        const res = await axios.get(`${BASE_URL}/users/${userID}`);
        document.getElementById('editFirstname').value = res.data.firstname;
        document.getElementById('editLastname').value = res.data.lastname;
        document.getElementById('editPassword').value = res.data.password;
    } catch (error) { console.error(error); }
}

const updateProfile = async () => {
    let firstname = document.getElementById('editFirstname').value;
    let lastname = document.getElementById('editLastname').value;
    let password = document.getElementById('editPassword').value;

    try {
        if (!firstname || !lastname || !password) {
            alert('กรุณากรอกข้อมูลให้ครบทุกช่อง'); return;
        }
        await axios.put(`${BASE_URL}/users/${userID}`, { firstname, lastname, password });
        alert('อัปเดตข้อมูลส่วนตัวสำเร็จ!');
        localStorage.setItem('userName', firstname);
        document.getElementById('studentName').innerText = firstname;
        toggleProfile();
    } catch (error) { alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล'); }
}

const deleteAccount = async () => {
    let confirmDelete = confirm('คุณแน่ใจหรือไม่ว่าต้องการลบบัญชี? ข้อมูลทั้งหมดของคุณจะถูกลบและไม่สามารถกู้คืนได้');
    if (confirmDelete) {
        try {
            await axios.delete(`${BASE_URL}/users/${userID}`);
            alert('ลบบัญชีผู้ใช้สำเร็จ');
            localStorage.clear();
            window.location.href = '../Home/home.html';
        } catch (error) { alert('ลบบัญชีไม่สำเร็จ'); }
    }
}

const loadEnrolled = async () => {
    try {
        const res = await axios.get(`${BASE_URL}/student/enrollments/${userID}`);
        let html = '';

        res.data.forEach(course => {
            html += `<div class="course-card">
                <div class="course-info"><h3>${course.title}</h3></div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.location.href='../Course/course.html?id=${course.course_id}'" style="background-color: var(--primary);">ดูคะแนน</button>
                    <button onclick="dropCourse(${course.course_id})" style="background-color: var(--danger);">ยกเลิก</button>
                </div>
            </div>`;
        });
        document.getElementById('enrolledList').innerHTML = html;
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการโหลดคอร์สที่เรียนอยู่:", error);
    }
}

const loadAllCourses = async () => {
    try {
        const res = await axios.get(`${BASE_URL}/courses`);
        let html = '';
        res.data.forEach(course => {
            html += `<div class="course-card">
                <div class="course-info"><h3>${course.title}</h3></div>
                <button onclick="enroll(${course.course_id})" style="width: auto;">+ ลงทะเบียน</button>
            </div>`;
        });
        document.getElementById('allCoursesList').innerHTML = html;
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการโหลดคอร์สทั้งหมด:", error);
    }
}

const enroll = async (courseId) => {
    try {
        await axios.post(`${BASE_URL}/enroll`, { user_id: userID, course_id: courseId });
        loadEnrolled();
    } catch (error) { alert(error.response.data.message); }
}

const dropCourse = async (courseId) => {
    let confirmDrop = confirm('ต้องการยกเลิกการลงทะเบียนวิชานี้ใช่หรือไม่?');
    if (confirmDrop) {
        try {
            await axios.delete(`${BASE_URL}/student/enrollments/${userID}/${courseId}`);
            loadEnrolled();
        } catch (error) { alert('ยกเลิกการลงทะเบียนไม่สำเร็จ'); }
    }
}

const logout = () => { window.location.href = '../Home/home.html'; }