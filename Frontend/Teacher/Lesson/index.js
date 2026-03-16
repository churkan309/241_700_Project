const BASE_URL = 'http://localhost:8000';

const user = {
    id: localStorage.getItem('user_id'),
    firstname: localStorage.getItem('firstname'),
    lastname: localStorage.getItem('lastname'),
    role: localStorage.getItem('role'),
};

const params = new URLSearchParams(window.location.search);
const courseId = params.get('courseId');

if (!user.id || user.role !== 'teacher' || !courseId) {
    window.location.href = '../../Home/Login/index.html';
}

axios.defaults.headers.common['x-user-role'] = 'teacher';

const lessonWrap = document.getElementById('lessonWrap');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const courseIdBadge = document.getElementById('courseIdBadge');
const statLessons = document.getElementById('statLessons');
const statVideos = document.getElementById('statVideos');
const statQuizzes = document.getElementById('statQuizzes');

function initUI() {
    document.getElementById('topbarName').textContent = `${user.firstname} ${user.lastname}`;
    document.getElementById('avatarInitial').textContent =
        (user.firstname?.[0] || '') + (user.lastname?.[0] || '');
    courseIdBadge.textContent = `Course ID: ${courseId}`;
    loadLessons();
}

// ─────────────────────────────────────────
//  LOAD LESSONS
// ─────────────────────────────────────────
async function loadLessons() {
    lessonWrap.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;gap:var(--space-2);
                    padding:var(--space-12);color:var(--text-2);font-size:var(--text-sm);">
            <span class="spinner"></span> กำลังโหลดบทเรียน...
        </div>`;

    try {
        const [{ data: lessons }, { data: course }] = await Promise.all([
            axios.get(`${BASE_URL}/teacher/courses/${courseId}/lessons`),
            axios.get(`${BASE_URL}/users/${user.id}`).then(() =>
                axios.get(`${BASE_URL}/teacher/courses/${user.id}`)
            ).catch(() => ({ data: [] })),
        ]);

        const courseRes = await axios.get(`${BASE_URL}/teacher/courses/${user.id}`).catch(() => ({ data: [] }));
        const courseInfo = courseRes.data.find(c => String(c.course_id) === String(courseId));

        if (courseInfo) {
            pageTitle.textContent = courseInfo.title;
            pageSubtitle.textContent = courseInfo.description || 'ไม่มีคำอธิบายรายวิชา';
        }

        const videoCount = lessons.filter(l => l.video_url).length;
        const quizCount = lessons.filter(l => l.quiz_url).length;

        statLessons.textContent = lessons.length;
        statVideos.textContent = videoCount;
        statQuizzes.textContent = quizCount;

        if (lessons.length === 0) {
            lessonWrap.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <div class="empty-title">ยังไม่มีบทเรียน</div>
                    <p class="empty-text">กดปุ่ม "เพิ่มบทเรียน" เพื่อเริ่มต้นสร้างบทเรียนแรก</p>
                </div>`;
            return;
        }

        lessonWrap.innerHTML = `<div class="lesson-list">${lessons.map((l, idx) => `
                <div class="lesson-item" style="animation-delay:${idx * 0.05}s">
                    <div class="lesson-number">${idx + 1}</div>
                    <div class="lesson-info">
                        <div class="lesson-title">${escHtml(l.title)}</div>
                        <div class="lesson-desc">${escHtml(l.description || 'ไม่มีรายละเอียด')}</div>
                    </div>
                    <div class="lesson-links">
                        ${linkChip(l.video_url, '🎬', 'วิดีโอ')}
                        ${linkChip(l.document_url, '📄', 'เอกสาร')}
                        ${linkChip(l.quiz_url, '📝', 'แบบทดสอบ')}
                    </div>
                    <div class="lesson-actions">
                        <button class="btn-view" onclick="openEditLesson(${l.lesson_id})" data-tooltip="แก้ไข">
                            ✏️ แก้ไข
                        </button>
                        <button class="btn-drop" onclick="openDeleteConfirm(${l.lesson_id}, '${escHtml(l.title)}')" data-tooltip="ลบ">
                            🗑️ ลบ
                        </button>
                    </div>
                </div>
            `).join('')
            }</div>`;

    } catch (err) {
        lessonWrap.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <div class="empty-title" style="color:var(--red)">เกิดข้อผิดพลาด</div>
                <p class="empty-text">${err.response?.data?.message || err.message}</p>
            </div>`;
        toast(err.response?.data?.message || 'โหลดบทเรียนไม่สำเร็จ', 'error');
    }
}

function linkChip(url, icon, label) {
    if (url) {
        return `<a href="${escHtml(url)}" target="_blank" rel="noopener" class="link-chip has-link">${icon} ${label}</a>`;
    }
    return `<span class="link-chip">${icon} ${label}</span>`;
}

// ─────────────────────────────────────────
//  CREATE LESSON
// ─────────────────────────────────────────
let editingLessonId = null;

document.getElementById('btnAddLesson').addEventListener('click', () => {
    editingLessonId = null;
    document.getElementById('lessonModalTitle').textContent = '➕ เพิ่มบทเรียนใหม่';
    clearForm();
    openModal('lessonModal');
});

document.getElementById('btnCancelLesson').addEventListener('click', () => closeModal('lessonModal'));

document.getElementById('btnSaveLesson').addEventListener('click', async () => {
    const title = document.getElementById('inputTitle').value.trim();
    const description = document.getElementById('inputDesc').value.trim();
    const video_url = document.getElementById('inputVideo').value.trim();
    const document_url = document.getElementById('inputDoc').value.trim();
    const quiz_url = document.getElementById('inputQuiz').value.trim();

    if (!title) { toast('กรุณากรอกชื่อบทเรียน', 'error'); return; }

    const btn = document.getElementById('btnSaveLesson');
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก...';

    try {
        const payload = { title, description, video_url, document_url, quiz_url };

        if (editingLessonId) {
            await axios.put(`${BASE_URL}/teacher/lessons/${editingLessonId}`, payload);
            toast('อัปเดตบทเรียนสำเร็จ');
        } else {
            await axios.post(`${BASE_URL}/teacher/courses/${courseId}/lessons`, payload);
            toast('เพิ่มบทเรียนสำเร็จ');
        }

        closeModal('lessonModal');
        loadLessons();
    } catch (err) {
        toast(err.response?.data?.message || 'บันทึกไม่สำเร็จ', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'บันทึก';
        editingLessonId = null;
    }
});

// ─────────────────────────────────────────
//  EDIT LESSON
// ─────────────────────────────────────────
async function openEditLesson(lessonId) {
    editingLessonId = lessonId;
    document.getElementById('lessonModalTitle').textContent = '✏️ แก้ไขบทเรียน';

    try {
        const { data: lesson } = await axios.get(
            `${BASE_URL}/student/courses/${courseId}/lessons/${lessonId}`,
            { headers: { 'x-user-role': 'student' } }
        ).catch(() =>
            axios.get(`${BASE_URL}/teacher/courses/${courseId}/lessons`)
                .then(r => ({ data: r.data.find(l => l.lesson_id === lessonId) || {} }))
        );

        document.getElementById('inputTitle').value = lesson.title || '';
        document.getElementById('inputDesc').value = lesson.description || '';
        document.getElementById('inputVideo').value = lesson.video_url || '';
        document.getElementById('inputDoc').value = lesson.document_url || '';
        document.getElementById('inputQuiz').value = lesson.quiz_url || '';
        openModal('lessonModal');
    } catch {
        const { data: lessons } = await axios.get(`${BASE_URL}/teacher/courses/${courseId}/lessons`);
        const lesson = lessons.find(l => l.lesson_id === lessonId) || {};
        document.getElementById('inputTitle').value = lesson.title || '';
        document.getElementById('inputDesc').value = lesson.description || '';
        document.getElementById('inputVideo').value = lesson.video_url || '';
        document.getElementById('inputDoc').value = lesson.document_url || '';
        document.getElementById('inputQuiz').value = lesson.quiz_url || '';
        openModal('lessonModal');
    }
}

// ─────────────────────────────────────────
//  DELETE LESSON
// ─────────────────────────────────────────
let pendingDeleteId = null;

function openDeleteConfirm(lessonId, lessonName) {
    pendingDeleteId = lessonId;
    document.getElementById('confirmLessonName').textContent = `"${lessonName}"`;
    openModal('confirmDeleteModal');
}

document.getElementById('btnCancelDelete').addEventListener('click', () => closeModal('confirmDeleteModal'));

document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
    if (!pendingDeleteId) return;

    const btn = document.getElementById('btnConfirmDelete');
    btn.disabled = true;
    btn.textContent = 'กำลังลบ...';

    try {
        await axios.delete(`${BASE_URL}/teacher/lessons/${pendingDeleteId}`);
        closeModal('confirmDeleteModal');
        toast('ลบบทเรียนสำเร็จ');
        loadLessons();
    } catch (err) {
        toast(err.response?.data?.message || 'ลบบทเรียนไม่สำเร็จ', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'ลบบทเรียน';
        pendingDeleteId = null;
    }
});

// ─────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────
document.getElementById('btnBack').addEventListener('click', () => {
    window.location.href = '../Dashboard/index.html';
});

document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '../../Home/Login/index.html';
});

document.getElementById('btnProfile').addEventListener('click', () => {
    window.location.href = '../Dashboard/index.html';
});

document.getElementById('btnManageStudents').addEventListener('click', () => {
    window.location.href = `../Management/index.html?courseId=${courseId}`;
});

// ─────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────
function clearForm() {
    ['inputTitle', 'inputDesc', 'inputVideo', 'inputDoc', 'inputQuiz']
        .forEach(id => { document.getElementById(id).value = ''; });
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
    });
});

function toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast${type === 'error' ? ' error' : ''}`;
    t.textContent = msg;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

initUI();