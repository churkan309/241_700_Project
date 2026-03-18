// student/lesson.js — ใช้ utils.js (initAuth, toast, escHtml, API_URL)

const params = new URLSearchParams(window.location.search);
const courseId = params.get('courseId');

const user = initAuth('student', '../auth/login.html');
if (!courseId) {
    window.location.href = '../auth/login.html';
} else { initUI(); }

let lessons = [];
let activeLessonIdx = 0;
let progress = { completed_lessons: 0, total_lessons: 0, progress_percent: 0 };

// ── Init ──────────────────────────────────────────────────────────────────────
function initUI() {
    document.getElementById('topbarName').textContent =
        `${user.firstname} ${user.lastname}`;
    document.getElementById('avatarInitial').textContent =
        (user.firstname?.[0] || '') + (user.lastname?.[0] || '');
    loadCourse();
}

// ── Load course + lessons ─────────────────────────────────────────────────────
async function loadCourse() {
    try {
        const { data } = await axios.get(`${API_URL}/student/courses/${courseId}/${user.id}`);
        lessons = data.lessons || [];
        progress = data.progress || { completed_lessons: 0, total_lessons: 0, progress_percent: 0 };

        renderCourseHero(data.course);
        renderSidebar();

        if (lessons.length > 0) {
            activeLessonIdx = 0;
            renderContent(activeLessonIdx);
        } else {
            document.getElementById('lessonContent').innerHTML = `
                <div class="panel-loading" style="flex-direction:column;gap:var(--space-3);min-height:320px;">
                    <span style="font-size:2.5rem;">📭</span>
                    <span style="color:var(--text-2);">รายวิชานี้ยังไม่มีบทเรียน</span>
                </div>`;
        }
    } catch (err) {
        if (err.response?.status === 403) {
            window.location.href = 'dashboard.html';
            return;
        }
        document.getElementById('courseHero').innerHTML =
            `<div style="color:var(--red);padding:var(--space-6);">เกิดข้อผิดพลาด: ${err.response?.data?.message || err.message}</div>`;
        toast(err.response?.data?.message || 'โหลดรายวิชาไม่สำเร็จ', 'error');
    }
}

// ── Course hero ───────────────────────────────────────────────────────────────
function renderCourseHero(course) {
    const pct = progress.progress_percent;
    const pctClass = pct >= 100 ? 'done' : pct >= 50 ? 'half' : 'low';
    const barColor = pct >= 100 ? 'green' : pct >= 50 ? '' : 'orange';

    document.getElementById('courseHero').innerHTML = `
        <div class="course-hero-top">
            <div>
                <div class="course-hero-title">${escHtml(course.title)}</div>
                <div class="course-hero-desc">${escHtml(course.description || 'ไม่มีคำอธิบายรายวิชา')}</div>
            </div>
            <div class="progress-summary">
                <div class="progress-big-pct ${pctClass}" id="bigPct">${pct}%</div>
                <div class="progress-sub" id="progressSub">
                    ${progress.completed_lessons} / ${progress.total_lessons} บทเรียน
                </div>
            </div>
        </div>
        <div class="progress-wrap-lg">
            <div class="progress-bar-lg progress-bar ${barColor}" id="heroBar" style="width:${pct}%;"></div>
        </div>`;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function renderSidebar() {
    if (lessons.length === 0) {
        document.getElementById('lessonSidebarList').innerHTML =
            `<div style="padding:var(--space-6);text-align:center;color:var(--text-3);font-size:var(--text-xs);">ยังไม่มีบทเรียน</div>`;
        return;
    }
    document.getElementById('lessonSidebarList').innerHTML = lessons.map((l, idx) => `
        <div class="lesson-nav-item ${l.is_completed ? 'completed' : ''} ${idx === activeLessonIdx ? 'active' : ''}"
             id="nav-${idx}" onclick="selectLesson(${idx})">
            <div class="nav-check">${l.is_completed ? '✓' : `<span class="nav-num">${idx + 1}</span>`}</div>
            <div class="nav-title">${escHtml(l.title)}</div>
        </div>`).join('');
}

// ── Lesson content ────────────────────────────────────────────────────────────
function renderContent(idx) {
    const l = lessons[idx];
    const isDone = !!l.is_completed;
    const resources = [
        l.video_url ? { type: 'video', icon: '🎬', label: 'วิดีโอบทเรียน', url: l.video_url } : null,
        l.document_url ? { type: 'doc', icon: '📄', label: 'เอกสารประกอบ', url: l.document_url } : null,
        l.quiz_url ? { type: 'quiz', icon: '📝', label: 'แบบทดสอบ', url: l.quiz_url } : null,
    ].filter(Boolean);

    document.getElementById('lessonContent').innerHTML = `
        <div class="content-header">
            <div class="content-lesson-num">บทที่ ${idx + 1} จาก ${lessons.length}</div>
            <div class="content-lesson-title">${escHtml(l.title)}</div>
        </div>
        <div class="content-body">
            ${l.description ? `<p class="content-desc">${escHtml(l.description)}</p>` : ''}
            ${resources.length > 0 ? `
                <div class="resources-title">สื่อการเรียน</div>
                <div class="resource-list">
                    ${resources.map(r => `
                        <a href="${escHtml(r.url)}" target="_blank" rel="noopener" class="resource-card">
                            <div class="resource-icon ${r.type}">${r.icon}</div>
                            <div class="resource-info">
                                <div class="resource-label">${r.label}</div>
                                <div class="resource-url">${escHtml(r.url)}</div>
                            </div>
                            <div class="resource-arrow">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                        </a>`).join('')}
                </div>` : `<div class="no-resource">ไม่มีสื่อประกอบบทเรียนนี้</div>`}
        </div>
        <div class="content-footer">
            <div class="nav-btns">
                <button class="btn btn-ghost btn-sm" onclick="selectLesson(${idx - 1})" ${idx === 0 ? 'disabled' : ''}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg> ก่อนหน้า
                </button>
                <button class="btn btn-ghost btn-sm" onclick="selectLesson(${idx + 1})" ${idx === lessons.length - 1 ? 'disabled' : ''}>
                    ถัดไป
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
            <button class="btn-complete ${isDone ? 'done' : ''}" id="btnComplete"
                    onclick="completeLesson(${l.lesson_id}, ${idx})" ${isDone ? 'disabled' : ''}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ${isDone ? 'เรียนแล้ว' : 'เสร็จสิ้น'}
            </button>
        </div>`;
}

// ── Select lesson ─────────────────────────────────────────────────────────────
function selectLesson(idx) {
    if (idx < 0 || idx >= lessons.length) return;
    document.querySelectorAll('.lesson-nav-item').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById(`nav-${idx}`);
    if (navEl) { navEl.classList.add('active'); navEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    activeLessonIdx = idx;
    renderContent(idx);
}

// ── Complete lesson ───────────────────────────────────────────────────────────
async function completeLesson(lessonId, idx) {
    const btn = document.getElementById('btnComplete');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก...';
    try {
        const { data } = await axios.post(
            `${API_URL}/student/courses/${courseId}/lessons/${lessonId}/complete`,
            { student_id: user.id }
        );
        lessons[idx].is_completed = true;
        progress = data.progress;
        updateProgressUI();
        renderSidebar();
        renderContent(idx);
        toast('บันทึกความคืบหน้าสำเร็จ ✓');
        if (progress.progress_percent >= 100)
            setTimeout(() => toast('🎉 ยินดีด้วย! คุณเรียนครบทุกบทเรียนแล้ว'), 600);
    } catch (err) {
        if (err.response?.status === 409) {
            lessons[idx].is_completed = true;
            renderSidebar(); renderContent(idx);
        } else {
            toast(err.response?.data?.message || 'บันทึกไม่สำเร็จ', 'error');
            btn.disabled = false; btn.textContent = 'เสร็จสิ้น';
        }
    }
}

// ── Update progress UI ────────────────────────────────────────────────────────
function updateProgressUI() {
    const pct = progress.progress_percent;
    const pctClass = pct >= 100 ? 'done' : pct >= 50 ? 'half' : 'low';
    const barColor = pct >= 100 ? 'green' : pct >= 50 ? '' : 'orange';

    const bigPct = document.getElementById('bigPct');
    const sub = document.getElementById('progressSub');
    const bar = document.getElementById('heroBar');

    if (bigPct) { bigPct.textContent = `${pct}%`; bigPct.className = `progress-big-pct ${pctClass}`; }
    if (sub) sub.textContent = `${progress.completed_lessons} / ${progress.total_lessons} บทเรียน`;
    if (bar) { bar.style.width = `${pct}%`; bar.className = `progress-bar-lg progress-bar ${barColor}`; }
}

// ── Navigation ────────────────────────────────────────────────────────────────
document.getElementById('btnBack').addEventListener('click', () => window.location.href = 'dashboard.html');
document.getElementById('btnLogout').addEventListener('click', () => logout('../auth/login.html'));
document.getElementById('btnProfile').addEventListener('click', () => window.location.href = 'dashboard.html');

// ── Start ─────────────────────────────────────────────────────────────────────
initUI();
