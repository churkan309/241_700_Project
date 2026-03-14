const BASE_URL = "http://localhost:8000";
let userID = localStorage.getItem('userID');
let role = localStorage.getItem('userRole');
const urlParams = new URLSearchParams(window.location.search);
const courseID = urlParams.get('id');

window.onload = async () => {
    if (!userID) window.location.href = '../Home/home.html';
    if (role === 'teacher') {
        await renderTeacherView();
    } else {
        await renderStudentView();
    }
}

const renderTeacherView = async () => {
    try {
        const res = await axios.get(`${BASE_URL}/course/details/${courseID}`);
        document.getElementById('courseTitle').innerText = `วิชา: ${res.data.course.title}`;

        let html = `<table border="1" width="100%" cellpadding="5" style="border-collapse: collapse; text-align: center; background: white;">
            <tr style="background: #f3f4f6;">
                <th>ชื่อ-สกุล</th>
                <th>เช็คชื่อ</th>
                <th>งาน</th>
                <th>ควิซ</th>
                <th>กลางภาค</th>
                <th>ปลายภาค</th>
                <th>ข้อเสนอแนะ</th>
                <th>จัดการ</th>
            </tr>`;

        res.data.enrolled_students.forEach(s => {
            html += `<tr>
                <td style="text-align: left;">${s.firstname} ${s.lastname}</td>
                <td><input type="number" id="att_${s.student_id}" value="${s.attendance_score}" style="width:60px"></td>
                <td><input type="number" id="ass_${s.student_id}" value="${s.assignment_score}" style="width:60px"></td>
                <td><input type="number" id="quiz_${s.student_id}" value="${s.quiz_score}" style="width:60px"></td>
                <td><input type="number" id="mid_${s.student_id}" value="${s.midterm_score}" style="width:60px"></td>
                <td><input type="number" id="fin_${s.student_id}" value="${s.final_score}" style="width:60px"></td>
                <td><textarea id="com_${s.student_id}" style="width: 100px;">${s.teacher_comment || ''}</textarea></td>
                <td>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        <button onclick="saveScore(${s.student_id})" style="padding: 5px; font-size: 12px; background: #10b981;">บันทึกคะแนน</button>
                        <button onclick="removeStudent(${s.student_id})" style="padding: 5px; font-size: 12px; background: #ef4444;">ลบผู้เรียน</button>
                    </div>
                </td>
            </tr>`;
        });
        html += `</table>`;
        document.getElementById('contentArea').innerHTML = html;
    } catch (error) {
        document.getElementById('contentArea').innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

const saveScore = async (studentId) => {
    try {
        await axios.post(`${BASE_URL}/score/update`, {
            student_id: studentId,
            course_id: courseID,
            attendance_score: document.getElementById(`att_${studentId}`).value,
            assignment_score: document.getElementById(`ass_${studentId}`).value,
            quiz_score: document.getElementById(`quiz_${studentId}`).value,
            midterm_score: document.getElementById(`mid_${studentId}`).value,
            final_score: document.getElementById(`fin_${studentId}`).value,
            teacher_comment: document.getElementById(`com_${studentId}`).value
        });
        alert('บันทึกคะแนนสำเร็จ');
    } catch (error) { alert('เกิดข้อผิดพลาดในการบันทึกคะแนน'); }
}

const removeStudent = async (studentId) => {
    let confirmDelete = confirm('คุณต้องการลบนักศึกษาคนนี้ออกจากคอร์สใช่หรือไม่? (ข้อมูลคะแนนจะหายทั้งหมด)');
    if (confirmDelete) {
        try {
            await axios.delete(`${BASE_URL}/enrollments/${courseID}/${studentId}`);
            alert('ลบนักศึกษาออกจากคอร์สสำเร็จ');
            renderTeacherView();
        } catch (error) {
            alert('ลบนักศึกษาไม่สำเร็จ');
        }
    }
}

const renderStudentView = async () => {
    try {
        const res = await axios.get(`${BASE_URL}/student/enrollments/${userID}`);
        const myData = res.data.find(c => c.course_id == courseID);
        document.getElementById('courseTitle').innerText = `วิชา: ${myData.title}`;

        const statRes = await axios.get(`${BASE_URL}/course/stats/${courseID}`);
        const stats = statRes.data;

        let totalScore = Number(myData.attendance_score) + Number(myData.assignment_score) + Number(myData.quiz_score) + Number(myData.midterm_score) + Number(myData.final_score);

        document.getElementById('contentArea').innerHTML = `
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
                <h3>คะแนนของคุณ</h3>
                <ul>
                    <li>เช็คชื่อ: ${myData.attendance_score}</li>
                    <li>คะแนนเก็บ/ชิ้นงาน: ${myData.assignment_score}</li>
                    <li>สอบย่อย (Quiz): ${myData.quiz_score}</li>
                    <li>สอบกลางภาค: ${myData.midterm_score}</li>
                    <li>สอบปลายภาค: ${myData.final_score}</li>
                </ul>
                <h3>คะแนนรวม: <b>${totalScore} คะแนน</b></h3>
                <hr style="margin: 20px 0;">
                <h3>สถิติห้องเรียน</h3>
                <ul>
                    <li>คะแนนสูงสุด: ${stats.max_score || 0}</li>
                    <li>คะแนนต่ำสุด: ${stats.min_score || 0}</li>
                    <li>คะแนนเฉลี่ย: ${Number(stats.avg_score || 0).toFixed(2)}</li>
                </ul>
                <hr style="margin: 20px 0;">
                <h3>คำแนะนำจากอาจารย์:</h3>
                <p style="background: #f9fafb; padding: 10px; border-radius: 4px;">${myData.teacher_comment || 'ยังไม่มีคำแนะนำ'}</p>
            </div>
        `;
    } catch (error) {
        document.getElementById('contentArea').innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>';
    }
}

const goBack = () => {
    if (role === 'teacher') window.location.href = '../Teacher/teacher.html';
    else window.location.href = '../Student/student.html';
}