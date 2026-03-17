// teacher/lesson.js — ใช้ utils.js (initAuth, toast, escHtml, openModal, closeModal, logout, API_URL)

const params   = new URLSearchParams(window.location.search);
const courseId = params.get('courseId');

const user = initAuth('teacher', '../auth/login.html');
if (!courseId) window.location.href = '../auth/login.html';

const lessonWrap     = document.getElementById('lessonWrap');
const pageTitle      = document.getElementById('pageTitle');
const pageSubtitle   = document.getElementById('pageSubtitle');
const courseIdBadge  = document.getElementById('courseIdBadge');
const statLessons    = document.getElementById('statLessons');
const statVideos     = document.getElementById('statVideos');
const statQuizzes    = document.getElementById('statQuizzes');

let cachedLessons = []; // ไว้ใช้ใน openEditLesson โดยไม่ต้องเรียก API ซ้ำ

// ── Init ──────────────────────────────────────────────────────────────────────
function initUI() {
    document.getElementById('topbarName').textContent =
        `${user.firstname} ${user.lastname}`;
    document.getElementById('avatarInitial').textContent =
        (user.firstname?.[0] || '') + (user.lastname?.[0] || '');
    courseIdBadge.textContent = `Course ID: ${courseId}`;
    initModalBackdrop();
    loadLessons();
}

// ── Load lessons ──────────────────────────────────────────────────────────────
async function loadLessons() {
    lessonWrap.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;gap:var(--space-2);
                    padding:var(--space-12);color:var(--text-2);font-size:var(--text-sm);">
            <span class="spinner"></span> กำลังโหลดบทเรียน...
        </div>`;

    try {
        const [{ data: lessons }, { data: courses }] = await Promise.all([
            axios.get(`${API_URL}/teacher/courses/${courseId}/lessons`),
            axios.get(`${API_URL}/teacher/courses/${user.id}`),
        ]);

        cachedLessons = lessons;

        const courseInfo = courses.find(c => String(c.course_id) === String(courseId));
        if (courseInfo) {
            pageTitle.textContent    = courseInfo.title;
            pageSubtitle.textContent = courseInfo.description || 'ไม่มีคำอธิบายรายวิชา';
        }

        statLessons.textContent = lessons.length;
        statVideos.textContent  = lessons.filter(l => l.video_url).length;
        statQuizzes.textContent = lessons.filter(l => l.quiz_url).length;

        if (lessons.length === 0) {
            lessonWrap.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <div class="empty-title">ยังไม่มีบทเรียน</div>
                    <p class="empty-text">กดปุ่ม "เพิ่มบทเรียน" เพื่อเริ่มต้นสร้างบทเรียนแรก</p>
                </div>`;
            return;
        }

        lessonWrap.innerHTML = `<div class="lesson-list">
            ${lessons.map((l, idx) => `
                <div class="lesson-item" style="animation-delay:${idx * 0.05}s">
                    <div class="lesson-number">${idx + 1}</div>
                    <div class="lesson-info">
                        <div class="lesson-title">${escHtml(l.title)}</div>
                        <div class="lesson-desc">${escHtml(l.description || 'ไม่มีรายละเอียด')}</div>
                    </div>
                    <div class="lesson-links">
                        ${linkChip(l.video_url,    '🎬', 'วิดีโอ')}
                        ${linkChip(l.document_url, '📄', 'เอกสาร')}
                        ${linkChip(l.quiz_url,     '📝', 'แบบทดสอบ')}
                    </div>
                    <div class="lesson-actions">
                        <button class="btn-view" onclick="openEditLesson(${l.lesson_id})" data-tooltip="แก้ไข">✏️ แก้ไข</button>
                        <button class="btn-drop" onclick="openDeleteConfirm(${l.lesson_id},'${escHtml(l.title)}')" data-tooltip="ลบ">🗑️ ลบ</button>
                    </div>
                </div>`).join('')}
        </div>`;

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
    return url
        ? `<a href="${escHtml(url)}" target="_blank" rel="noopener" class="link-chip has-link">${icon} ${label}</a>`
        : `<span class="link-chip">${icon} ${label}</span>`;
}

// ── Create / Edit lesson ──────────────────────────────────────────────────────
let editingLessonId = null;

document.getElementById('btnAddLesson').addEventListener('click', () => {
    editingLessonId = null;
    document.getElementById('lessonModalTitle').textContent = '➕ เพิ่มบทเรียนใหม่';
    clearForm();
    openModal('lessonModal');
});
document.getElementById('btnCancelLesson').addEventListener('click', () => closeModal('lessonModal'));

document.getElementById('btnSaveLesson').addEventListener('click', async () => {
    const title        = document.getElementById('inputTitle').value.trim();
    const description  = document.getElementById('inputDesc').value.trim();
    const video_url    = document.getElementById('inputVideo').value.trim();
    const document_url = document.getElementById('inputDoc').value.trim();
    const quiz_url     = document.getElementById('inputQuiz').value.trim();

    if (!title) { toast('กรุณากรอกชื่อบทเรียน', 'error'); return; }

    const btn = document.getElementById('btnSaveLesson');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก...';
    try {
        const payload = { title, description, video_url, document_url, quiz_url };
        if (editingLessonId) {
            await axios.put(`${API_URL}/teacher/lessons/${editingLessonId}`, payload);
            toast('อัปเดตบทเรียนสำเร็จ');
        } else {
            await axios.post(`${API_URL}/teacher/courses/${courseId}/lessons`, payload);
            toast('เพิ่มบทเรียนสำเร็จ');
        }
        closeModal('lessonModal');
        loadLessons();
    } catch (err) {
        toast(err.response?.data?.message || 'บันทึกไม่สำเร็จ', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'บันทึก';
        editingLessonId = null;
    }
});

function openEditLesson(lessonId) {
    editingLessonId = lessonId;
    document.getElementById('lessonModalTitle').textContent = '✏️ แก้ไขบทเรียน';
    const lesson = cachedLessons.find(l => String(l.lesson_id) === String(lessonId));
    if (!lesson) { toast('ไม่พบข้อมูลบทเรียน กรุณาลองใหม่อีกครั้ง', 'error'); return; }
    document.getElementById('inputTitle').value = lesson.title        || '';
    document.getElementById('inputDesc').value  = lesson.description  || '';
    document.getElementById('inputVideo').value = lesson.video_url    || '';
    document.getElementById('inputDoc').value   = lesson.document_url || '';
    document.getElementById('inputQuiz').value  = lesson.quiz_url     || '';
    openModal('lessonModal');
}

// ── Delete lesson ─────────────────────────────────────────────────────────────
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
    btn.disabled = true; btn.textContent = 'กำลังลบ...';
    try {
        await axios.delete(`${API_URL}/teacher/lessons/${pendingDeleteId}`);
        closeModal('confirmDeleteModal');
        toast('ลบบทเรียนสำเร็จ');
        loadLessons();
    } catch (err) {
        toast(err.response?.data?.message || 'ลบบทเรียนไม่สำเร็จ', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'ลบบทเรียน';
        pendingDeleteId = null;
    }
});

// ── Navigation ────────────────────────────────────────────────────────────────
document.getElementById('btnBack').addEventListener('click', () => window.location.href = 'dashboard.html');
document.getElementById('btnLogout').addEventListener('click', () => logout('../auth/login.html'));
document.getElementById('btnProfile').addEventListener('click', () => window.location.href = 'dashboard.html');
document.getElementById('btnManageStudents').addEventListener('click', () => {
    window.location.href = `management.html?courseId=${courseId}`;
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function clearForm() {
    ['inputTitle', 'inputDesc', 'inputVideo', 'inputDoc', 'inputQuiz']
        .forEach(id => { document.getElementById(id).value = ''; });
}

// ── Start ─────────────────────────────────────────────────────────────────────
initUI();
