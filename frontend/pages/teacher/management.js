// teacher/management.js — ใช้ utils.js (initAuth, toast, escHtml, openModal, closeModal, logout, API_URL)

const params   = new URLSearchParams(window.location.search);
const courseId = params.get('courseId');

const user = initAuth('teacher', '../auth/login.html');
if (!courseId) window.location.href = '../auth/login.html';

const studentWrap  = document.getElementById('studentWrap');
const pageTitle    = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const statTotal    = document.getElementById('statTotal');
const statDone     = document.getElementById('statDone');
const statAvg      = document.getElementById('statAvg');

// ── Init ──────────────────────────────────────────────────────────────────────
function initUI() {
    document.getElementById('topbarName').textContent =
        `${user.firstname} ${user.lastname}`;
    document.getElementById('avatarInitial').textContent =
        (user.firstname?.[0] || '') + (user.lastname?.[0] || '');
    document.getElementById('courseIdBadge').textContent = `Course ID: ${courseId}`;
    initModalBackdrop();
    loadStudents();
}

// ── Load students ─────────────────────────────────────────────────────────────
async function loadStudents() {
    studentWrap.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;
                    gap:var(--space-2);padding:var(--space-12);
                    color:var(--text-2);font-size:var(--text-sm);">
            <span class="spinner"></span> กำลังโหลด...
        </div>`;

    try {
        const { data } = await axios.get(`${API_URL}/teacher/courses/${courseId}/students`);
        const { course, students } = data;

        pageTitle.textContent    = course.title;
        pageSubtitle.textContent = course.description || 'ไม่มีคำอธิบายรายวิชา';
        document.getElementById('enrollBadge').textContent = `${students.length} คน`;

        const doneCount = students.filter(s => s.progress_percent >= 100).length;
        const avgPct    = students.length
            ? Math.round(students.reduce((sum, s) => sum + s.progress_percent, 0) / students.length)
            : 0;

        statTotal.textContent = students.length;
        statDone.textContent  = doneCount;
        statAvg.textContent   = `${avgPct}%`;

        if (students.length === 0) {
            studentWrap.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👥</div>
                    <div class="empty-title">ยังไม่มีนักศึกษา</div>
                    <p class="empty-text">ยังไม่มีนักศึกษาลงทะเบียนในรายวิชานี้</p>
                </div>`;
            return;
        }

        studentWrap.innerHTML = `
            <div class="table-head-row">
                <span></span>
                <span>นักศึกษา</span>
                <span class="th-progress">ความคืบหน้า</span>
                <span class="th-action">จัดการ</span>
            </div>
            <div id="studentList">
                ${students.map((s, idx) => renderStudentRow(s, idx)).join('')}
            </div>`;

    } catch (err) {
        studentWrap.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <div class="empty-title" style="color:var(--red)">เกิดข้อผิดพลาด</div>
                <p class="empty-text">${err.response?.data?.message || err.message}</p>
            </div>`;
        toast(err.response?.data?.message || 'โหลดข้อมูลไม่สำเร็จ', 'error');
    }
}

function renderStudentRow(s, idx) {
    const initials = (s.firstname?.[0] || '') + (s.lastname?.[0] || '');
    const pct      = s.progress_percent ?? 0;
    const isDone   = pct >= 100;
    const barColor = isDone ? 'green' : pct >= 50 ? '' : 'orange';

    return `
        <div class="student-row" style="animation-delay:${idx * 0.05}s">
            <div class="student-avatar">${escHtml(initials)}</div>
            <div class="student-info">
                <div class="student-name">${escHtml(s.firstname)} ${escHtml(s.lastname)}</div>
                <div class="student-email">${escHtml(s.email)}</div>
            </div>
            <div class="progress-col">
                <div class="progress-header">
                    <span class="progress-label">${s.completed_lessons}/${s.total_lessons} บทเรียน</span>
                    <span class="progress-pct ${isDone ? 'done' : ''}">${pct}%</span>
                </div>
                <div class="progress-wrap">
                    <div class="progress-bar ${barColor}" style="width:${pct}%"></div>
                </div>
            </div>
            <div class="action-col">
                <button class="btn-drop"
                    onclick="openRemoveConfirm(${s.user_id},'${escHtml(s.firstname)} ${escHtml(s.lastname)}')">
                    🗑️ ลบออก
                </button>
            </div>
        </div>`;
}

// ── Remove student ────────────────────────────────────────────────────────────
let pendingStudentId = null;

function openRemoveConfirm(studentId, studentName) {
    pendingStudentId = studentId;
    document.getElementById('confirmStudentName').textContent = `"${studentName}"`;
    openModal('confirmModal');
}
document.getElementById('btnCancelRemove').addEventListener('click', () => closeModal('confirmModal'));

document.getElementById('btnConfirmRemove').addEventListener('click', async () => {
    if (!pendingStudentId) return;
    const btn = document.getElementById('btnConfirmRemove');
    btn.disabled = true; btn.textContent = 'กำลังลบ...';
    try {
        await axios.delete(`${API_URL}/teacher/courses/${courseId}/students/${pendingStudentId}`);
        closeModal('confirmModal');
        toast('ลบนักศึกษาออกจากรายวิชาสำเร็จ');
        loadStudents();
    } catch (err) {
        toast(err.response?.data?.message || 'ลบไม่สำเร็จ', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'ลบออกจากรายวิชา';
        pendingStudentId = null;
    }
});

// ── Navigation ────────────────────────────────────────────────────────────────
document.getElementById('btnBack').addEventListener('click', () => {
    window.location.href = `lesson.html?courseId=${courseId}`;
});
document.getElementById('btnLogout').addEventListener('click', () => logout('../auth/login.html'));
document.getElementById('btnProfile').addEventListener('click', () => window.location.href = 'dashboard.html');

// ── Start ─────────────────────────────────────────────────────────────────────
initUI();
