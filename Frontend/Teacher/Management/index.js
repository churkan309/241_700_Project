const BASE_URL = 'http://localhost:8000';

// ── Auth guard ──
const user = {
    id:   localStorage.getItem('user_id'),
    role: localStorage.getItem('role'),
};
if (!user.id || user.role !== 'teacher') {
    window.location.href = '../../../Home/Login/index.html';
}

// ── Axios header ──
axios.defaults.headers.common['x-user-role'] = 'teacher';

// ── URL params ──
const params   = new URLSearchParams(window.location.search);
const courseId = params.get('courseId');
if (!courseId) window.location.href = '../Dashboard/index.html';

// ── State ──
let editingLessonId      = null;
let pendingDeleteLessonId  = null;
let pendingDeleteStudentId = null;

// ── DOM refs ──
const topbarCourse    = document.getElementById('topbarCourse');
const courseTitle     = document.getElementById('courseTitle');
const courseDesc      = document.getElementById('courseDesc');
const lessonCountBadge  = document.getElementById('lessonCount');
const studentCountBadge = document.getElementById('studentCount');
const lessonList      = document.getElementById('lessonList');
const studentTableBody  = document.getElementById('studentTableBody');

// ─────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────
async function init() {
    await Promise.all([loadLessons(), loadStudents()]);
}

// ─────────────────────────────────────────
//  TABS
// ─────────────────────────────────────────
function switchTab(tab) {
    document.getElementById('tabLessons').classList.toggle('active',  tab === 'lessons');
    document.getElementById('tabStudents').classList.toggle('active', tab === 'students');
    document.getElementById('panelLessons').style.display  = tab === 'lessons'  ? 'block' : 'none';
    document.getElementById('panelStudents').style.display = tab === 'students' ? 'block' : 'none';
}

// ─────────────────────────────────────────
//  LOAD LESSONS
// ─────────────────────────────────────────
async function loadLessons() {
    lessonList.innerHTML = '<div class="loading-state"><span class="spinner"></span> กำลังโหลด...</div>';
    try {
        const { data: lessons } = await axios.get(
            `${BASE_URL}/teacher/courses/${courseId}/lessons`
        );

        lessonCountBadge.textContent = lessons.length;

        if (lessons.length === 0) {
            lessonList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>ยังไม่มีบทเรียน<br>กดปุ่ม "เพิ่มบทเรียน" เพื่อสร้างบทเรียนแรก</p>
                </div>`;
            return;
        }

        lessonList.innerHTML = lessons.map((l, idx) => {
            const mediaTags = [
                l.video_url    ? `<span class="media-tag video">🎬 วิดีโอ</span>`   : '',
                l.document_url ? `<span class="media-tag document">📄 เอกสาร</span>` : '',
                l.quiz_url     ? `<span class="media-tag quiz">📝 แบบทดสอบ</span>`  : '',
            ].filter(Boolean).join('');

            return `
            <div class="lesson-card" style="animation-delay:${idx * 0.05}s">
                <div class="lesson-num-badge">${idx + 1}</div>
                <div class="lesson-info">
                    <div class="lesson-title">${escHtml(l.title)}</div>
                    ${l.description
                        ? `<div class="lesson-desc-preview">${escHtml(l.description)}</div>`
                        : ''}
                    ${mediaTags ? `<div class="lesson-media">${mediaTags}</div>` : ''}
                </div>
                <div class="lesson-actions">
                    <button class="btn-icon edit"
                        onclick="openEditLesson(${l.lesson_id},'${escHtml(l.title)}','${escHtml(l.description || '')}','${escHtml(l.video_url || '')}','${escHtml(l.document_url || '')}','${escHtml(l.quiz_url || '')}')">
                        ✏️ แก้ไข
                    </button>
                    <button class="btn-icon delete"
                        onclick="openDeleteLesson(${l.lesson_id},'${escHtml(l.title)}')">
                        🗑️ ลบ
                    </button>
                </div>
            </div>`;
        }).join('');

    } catch (err) {
        lessonList.innerHTML = `<div class="empty-state" style="color:var(--red)">${err.response?.data?.message || 'โหลดไม่สำเร็จ'}</div>`;
        toast(err.response?.data?.message || 'โหลดบทเรียนไม่สำเร็จ', 'error');
    }
}

// ─────────────────────────────────────────
//  LOAD STUDENTS
// ─────────────────────────────────────────
async function loadStudents() {
    studentTableBody.innerHTML = '<tr class="loading-row"><td colspan="4"><span class="spinner"></span> กำลังโหลด...</td></tr>';
    try {
        const { data } = await axios.get(
            `${BASE_URL}/teacher/courses/${courseId}/students`
        );

        // อัปเดต course info จาก students endpoint
        topbarCourse.textContent  = data.course.title;
        courseTitle.textContent   = data.course.title;
        courseDesc.textContent    = data.course.description || '';
        courseDesc.style.display  = data.course.description ? 'block' : 'none';
        document.title            = `${data.course.title} — จัดการรายวิชา`;

        const students = data.students;
        studentCountBadge.textContent = students.length;

        if (students.length === 0) {
            studentTableBody.innerHTML = `
                <tr>
                    <td colspan="4">
                        <div class="empty-state">
                            <div class="empty-icon">👤</div>
                            <p>ยังไม่มีนักศึกษาลงทะเบียนในรายวิชานี้</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        studentTableBody.innerHTML = students.map((s, idx) => {
            const pct   = s.progress_percent ?? 0;
            const color = pct >= 100 ? 'var(--green)'
                        : pct >= 50  ? 'var(--accent)'
                        :              'var(--orange)';
            return `
            <tr style="animation-delay:${idx * 0.04}s">
                <td>
                    <div class="student-name">${escHtml(s.firstname)} ${escHtml(s.lastname)}</div>
                    <div class="student-email">${escHtml(s.email)}</div>
                </td>
                <td>${escHtml(s.email)}</td>
                <td>
                    <div class="progress-inline">
                        <div class="progress-inline-top">
                            <div class="progress-inline-bar">
                                <div class="progress-inline-fill"
                                    style="width:${pct}%; background:${color};">
                                </div>
                            </div>
                            <span class="progress-inline-pct" style="color:${color}">${pct}%</span>
                        </div>
                        <div class="progress-inline-sub">${s.completed_lessons} / ${s.total_lessons} บทเรียน</div>
                    </div>
                </td>
                <td>
                    <button class="btn-remove"
                        onclick="openDeleteStudent(${s.user_id},'${escHtml(s.firstname)} ${escHtml(s.lastname)}')">
                        ลบออก
                    </button>
                </td>
            </tr>`;
        }).join('');

    } catch (err) {
        studentTableBody.innerHTML = `<tr><td colspan="4" style="color:var(--red);padding:20px;">${err.response?.data?.message || 'โหลดไม่สำเร็จ'}</td></tr>`;
        toast(err.response?.data?.message || 'โหลดนักศึกษาไม่สำเร็จ', 'error');
    }
}

// ─────────────────────────────────────────
//  ADD LESSON
// ─────────────────────────────────────────
document.getElementById('btnAddLesson').addEventListener('click', () => {
    editingLessonId = null;
    document.getElementById('lessonModalTitle').textContent = '➕ เพิ่มบทเรียน';
    document.getElementById('inputLessonTitle').value = '';
    document.getElementById('inputLessonDesc').value  = '';
    document.getElementById('inputVideoUrl').value    = '';
    document.getElementById('inputDocUrl').value      = '';
    document.getElementById('inputQuizUrl').value     = '';
    openModal('lessonModal');
});

document.getElementById('btnCancelLesson').addEventListener('click', () => closeModal('lessonModal'));

document.getElementById('btnSaveLesson').addEventListener('click', async () => {
    const title        = document.getElementById('inputLessonTitle').value.trim();
    const description  = document.getElementById('inputLessonDesc').value.trim();
    const video_url    = document.getElementById('inputVideoUrl').value.trim();
    const document_url = document.getElementById('inputDocUrl').value.trim();
    const quiz_url     = document.getElementById('inputQuizUrl').value.trim();

    if (!title) { toast('กรุณากรอกชื่อบทเรียน', 'error'); return; }

    const btn       = document.getElementById('btnSaveLesson');
    btn.disabled    = true;
    btn.textContent = 'กำลังบันทึก...';

    try {
        if (editingLessonId) {
            await axios.put(`${BASE_URL}/teacher/lessons/${editingLessonId}`,
                { title, description, video_url, document_url, quiz_url });
            toast('อัปเดตบทเรียนสำเร็จ');
        } else {
            await axios.post(`${BASE_URL}/teacher/courses/${courseId}/lessons`,
                { title, description, video_url, document_url, quiz_url });
            toast('เพิ่มบทเรียนสำเร็จ');
        }
        closeModal('lessonModal');
        loadLessons();
    } catch (err) {
        toast(err.response?.data?.message || 'บันทึกไม่สำเร็จ', 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'บันทึก';
        editingLessonId = null;
    }
});

// ─────────────────────────────────────────
//  EDIT LESSON
// ─────────────────────────────────────────
function openEditLesson(id, title, desc, video, doc, quiz) {
    editingLessonId = id;
    document.getElementById('lessonModalTitle').textContent   = '✏️ แก้ไขบทเรียน';
    document.getElementById('inputLessonTitle').value = title;
    document.getElementById('inputLessonDesc').value  = desc;
    document.getElementById('inputVideoUrl').value    = video;
    document.getElementById('inputDocUrl').value      = doc;
    document.getElementById('inputQuizUrl').value     = quiz;
    openModal('lessonModal');
}

// ─────────────────────────────────────────
//  DELETE LESSON
// ─────────────────────────────────────────
function openDeleteLesson(id, title) {
    pendingDeleteLessonId = id;
    document.getElementById('confirmLessonName').textContent = `"${title}"`;
    openModal('confirmLessonModal');
}

document.getElementById('btnCancelDelLesson').addEventListener('click', () => closeModal('confirmLessonModal'));

document.getElementById('btnConfirmDelLesson').addEventListener('click', async () => {
    if (!pendingDeleteLessonId) return;
    const btn = document.getElementById('btnConfirmDelLesson');
    btn.disabled    = true;
    btn.textContent = 'กำลังลบ...';
    try {
        await axios.delete(`${BASE_URL}/teacher/lessons/${pendingDeleteLessonId}`);
        closeModal('confirmLessonModal');
        toast('ลบบทเรียนสำเร็จ');
        loadLessons();
    } catch (err) {
        toast(err.response?.data?.message || 'ลบไม่สำเร็จ', 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'ลบบทเรียน';
        pendingDeleteLessonId = null;
    }
});

// ─────────────────────────────────────────
//  DELETE STUDENT
// ─────────────────────────────────────────
function openDeleteStudent(studentId, name) {
    pendingDeleteStudentId = studentId;
    document.getElementById('confirmStudentName').textContent = `"${name}"`;
    openModal('confirmStudentModal');
}

document.getElementById('btnCancelDelStudent').addEventListener('click', () => closeModal('confirmStudentModal'));

document.getElementById('btnConfirmDelStudent').addEventListener('click', async () => {
    if (!pendingDeleteStudentId) return;
    const btn = document.getElementById('btnConfirmDelStudent');
    btn.disabled    = true;
    btn.textContent = 'กำลังลบ...';
    try {
        await axios.delete(`${BASE_URL}/teacher/courses/${courseId}/students/${pendingDeleteStudentId}`);
        closeModal('confirmStudentModal');
        toast('ลบนักศึกษาออกจากรายวิชาสำเร็จ');
        loadStudents();
    } catch (err) {
        toast(err.response?.data?.message || 'ลบไม่สำเร็จ', 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'ลบออก';
        pendingDeleteStudentId = null;
    }
});

// ─────────────────────────────────────────
//  BACK
// ─────────────────────────────────────────
document.getElementById('btnBack').addEventListener('click', () => {
    window.location.href = '../Dashboard/index.html';
});

// ─────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
    });
});

function toast(msg, type = 'success') {
    const t       = document.createElement('div');
    t.className   = `toast ${type === 'error' ? 'error' : ''}`;
    t.textContent = msg;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;');
}

// ── Start ──
init();