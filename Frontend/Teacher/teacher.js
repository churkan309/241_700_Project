const BASE_URL = "http://localhost:8000";
let userID = localStorage.getItem('userID');

window.onload = async () => {
    if (!userID || localStorage.getItem('userRole') !== 'teacher') window.location.href = '../Home/home.html';
    document.getElementById('teacherName').innerText = localStorage.getItem('userName');
    loadCourses();
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
        document.getElementById('teacherName').innerText = firstname;
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

const loadCourses = async () => {
    try {
        const res = await axios.get(`${BASE_URL}/teacher/courses/${userID}`);
        let html = '';
        res.data.forEach(course => {
            html += `<div class="course-card">
                <div class="course-info">
                    <h3 id="title-${course.course_id}">${course.title}</h3>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="window.location.href='../Course/course.html?id=${course.course_id}'" style="background-color: var(--primary);">จัดการผู้เรียน</button>
                    <button onclick="editCourseName(${course.course_id})" style="background-color: var(--warning);">แก้ไขชื่อ</button>
                    <button onclick="deleteCourse(${course.course_id})" style="background-color: var(--danger);">ลบ</button>
                </div>
            </div>`;
        });
        document.getElementById('courseList').innerHTML = html;
    } catch (error) { console.error(error); }
}

const createCourse = async () => {
    let title = document.getElementById('courseTitle').value;
    try {
        if (!title) { alert('กรุณากรอกชื่อคอร์ส'); return; }
        await axios.post(`${BASE_URL}/courses/create`, { title, user_id: userID });
        document.getElementById('courseTitle').value = '';
        loadCourses();
    } catch (error) { alert("สร้างไม่สำเร็จ"); }
}

const editCourseName = async (courseId) => {
    let currentTitle = document.getElementById(`title-${courseId}`).innerText;
    let newTitle = prompt("กรอกชื่อคอร์สใหม่:", currentTitle);
    if (newTitle && newTitle !== currentTitle) {
        try {
            await axios.put(`${BASE_URL}/courses/${courseId}`, { title: newTitle });
            loadCourses();
        } catch (error) { alert('แก้ไขชื่อคอร์สไม่สำเร็จ'); }
    }
}

const deleteCourse = async (courseId) => {
    let confirmDelete = confirm('⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบคอร์สนี้? ข้อมูลการลงทะเบียนและคะแนนทั้งหมดของนักศึกษาในคอร์สนี้จะหายไป');
    if (confirmDelete) {
        try {
            await axios.delete(`${BASE_URL}/courses/${courseId}`);
            loadCourses();
        } catch (error) { alert('ลบคอร์สไม่สำเร็จ'); }
    }
}

const logout = () => { window.location.href = '../Home/home.html'; }