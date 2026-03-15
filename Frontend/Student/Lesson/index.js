const BASE_URL = 'http://localhost:8000';

// ── Auth guard ──
const user = {
    id:   localStorage.getItem('user_id'),
    role: localStorage.getItem('role'),
};
if (!user.id || user.role !== 'student') {
    window.location.href = '../../Home/Login/index.html';
}

// ── Axios header ──
axios.defaults.headers.common['x-user-role'] = 'student';

// ── Read URL params ──
const params   = new URLSearchParams(window.location.search);
const courseId = params.get('courseId');
const lessonId = params.get('lessonId');   // optional: เปิดบทเรียนโดยตรง

if (!courseId) {
    window.location.href = '../../Dashboard/index.html';
}

// ── State ──
let allLessons    = [];
let currentLesson = null;
let progress      = { completed_lessons: 0, total_lessons: 0, progress_percent: 0 };

// ── DOM refs ──
const courseBreadcrumb = document.getElementById('courseBreadcrumb');
const lessonList       = document.getElementById('lessonList');
const progressFill     = document.getElementById('progressFill');
const progressPct      = document.getElementById('progressPct');
const progressSub      = document.getElementById('progressSub');
const contentLoading   = document.getElementById('contentLoading');
const lessonBody       = document.getElementById('lessonBody');
const lessonNumber     = document.getElementById('lessonNumber');
const lessonTitle      = document.getElementById('lessonTitle');
const lessonDesc       = document.getElementById('lessonDesc');
const mediaSection     = document.getElementById('mediaSection');
const videoSection     = document.getElementById('videoSection');
const videoFrame       = document.getElementById('videoFrame');
const completeCard     = document.getElementById('completeCard');
const completedBadge   = document.getElementById('completedBadge');
const btnComplete      = document.getElementById('btnComplete');
const btnCompleteText  = document.getElementById('btnCompleteText');
const btnPrev          = document.getElementById('btnPrev');
const btnNext          = document.getElementById('btnNext');

// ─────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────
async function init() {
    try {
        // โหลดข้อมูลรายวิชา + บทเรียนทั้งหมด พร้อม is_completed
        const { data } = await axios.get(
            `${BASE_URL}/student/courses/${courseId}/${user.id}`
        );

        courseBreadcrumb.textContent = data.course.title;
        document.title = `${data.course.title} — OnlineCourse`;

        allLessons = data.lessons;
        progress   = data.progress;

        renderSidebar();
        updateProgress(progress);

        // เลือกบทเรียนแรก หรือบทที่ระบุใน URL
        const targetId = lessonId
            ? allLessons.find(l => String(l.lesson_id) === String(lessonId))?.lesson_id
            : allLessons[0]?.lesson_id;

        if (targetId) openLesson(targetId);

    } catch (err) {
        toast(err.response?.data?.message || 'โหลดข้อมูลไม่สำเร็จ', 'error');
    }
}

// ─────────────────────────────────────────
//  SIDEBAR
// ─────────────────────────────────────────
function renderSidebar() {
    if (allLessons.length === 0) {
        lessonList.innerHTML = '<li class="lesson-item loading" style="cursor:default;justify-content:center;">ยังไม่มีบทเรียน</li>';
        return;
    }

    lessonList.innerHTML = allLessons.map((l, idx) => `
        <li class="lesson-item ${l.is_completed ? 'completed' : ''} ${currentLesson?.lesson_id === l.lesson_id ? 'active' : ''}"
            id="item-${l.lesson_id}"
            onclick="openLesson(${l.lesson_id})">
            <span class="lesson-num">${idx + 1}</span>
            <span class="lesson-name">${escHtml(l.title)}</span>
            <span class="lesson-check">${l.is_completed ? '✓' : ''}</span>
        </li>
    `).join('');
}

function setActiveItem(lessonId) {
    document.querySelectorAll('.lesson-item').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(`item-${lessonId}`);
    if (el) {
        el.classList.add('active');
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
}

// ─────────────────────────────────────────
//  PROGRESS
// ─────────────────────────────────────────
function updateProgress(p) {
    const pct = p.progress_percent ?? 0;
    progressFill.style.width  = `${pct}%`;
    progressPct.textContent   = `${pct}%`;
    progressSub.textContent   = `${p.completed_lessons} / ${p.total_lessons} บทเรียน`;

    // เปลี่ยนสีแถบ
    progressFill.style.background = pct >= 100 ? 'var(--green)'
                                  : pct >= 50  ? 'var(--accent)'
                                  :              'var(--orange)';
    progressPct.style.color       = pct >= 100 ? 'var(--green)'
                                  : pct >= 50  ? 'var(--accent)'
                                  :              'var(--orange)';
}

// ─────────────────────────────────────────
//  OPEN LESSON
// ─────────────────────────────────────────
async function openLesson(id) {
    // แสดง loading
    contentLoading.style.display = 'flex';
    lessonBody.style.display     = 'none';
    setActiveItem(id);

    try {
        const { data: lesson } = await axios.get(
            `${BASE_URL}/student/courses/${courseId}/lessons/${id}`
        );
        currentLesson = lesson;
        renderLesson(lesson);
    } catch (err) {
        toast(err.response?.data?.message || 'โหลดบทเรียนไม่สำเร็จ', 'error');
    }
}

function renderLesson(lesson) {
    const idx = allLessons.findIndex(l => l.lesson_id === lesson.lesson_id);

    // ── Header ──
    lessonNumber.textContent = `บทที่ ${idx + 1}`;
    lessonTitle.textContent  = lesson.title;
    lessonDesc.textContent   = lesson.description || '';
    lessonDesc.style.display = lesson.description ? 'block' : 'none';

    // ── Media links ──
    const links = [];
    if (lesson.video_url && !isYouTube(lesson.video_url)) {
        links.push(`<a href="${escHtml(lesson.video_url)}" target="_blank" class="media-link video">
            🎬 <span>วิดีโอบทเรียน</span>
        </a>`);
    }
    if (lesson.document_url) {
        links.push(`<a href="${escHtml(lesson.document_url)}" target="_blank" class="media-link document">
            📄 <span>เอกสารประกอบ</span>
        </a>`);
    }
    if (lesson.quiz_url) {
        links.push(`<a href="${escHtml(lesson.quiz_url)}" target="_blank" class="media-link quiz">
            📝 <span>แบบทดสอบ</span>
        </a>`);
    }

    if (links.length > 0) {
        mediaSection.innerHTML = `
            <div class="section-label">🔗 สื่อการสอน</div>
            ${links.join('')}`;
        mediaSection.style.display = 'block';
    } else {
        mediaSection.innerHTML = '';
        mediaSection.style.display = 'none';
    }

    // ── YouTube embed ──
    if (lesson.video_url && isYouTube(lesson.video_url)) {
        const embedUrl = toYouTubeEmbed(lesson.video_url);
        videoFrame.src        = embedUrl;
        videoSection.style.display = 'block';
    } else {
        videoFrame.src        = '';
        videoSection.style.display = 'none';
    }

    // ── Complete button ──
    const lessonState = allLessons.find(l => l.lesson_id === lesson.lesson_id);
    setCompleteState(lessonState?.is_completed ?? false);

    // ── Prev / Next ──
    btnPrev.disabled = idx === 0;
    btnNext.disabled = idx === allLessons.length - 1;

    // ── Show content ──
    contentLoading.style.display = 'none';
    lessonBody.style.display     = 'block';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setCompleteState(isDone) {
    if (isDone) {
        completeCard.style.display   = 'none';
        completedBadge.style.display = 'flex';
    } else {
        completeCard.style.display   = 'flex';
        completedBadge.style.display = 'none';
        btnComplete.disabled    = false;
        btnCompleteText.textContent  = 'ตกลง — เรียนจบแล้ว';
    }
}

// ─────────────────────────────────────────
//  MARK AS COMPLETED
// ─────────────────────────────────────────
btnComplete.addEventListener('click', async () => {
    if (!currentLesson) return;

    btnComplete.disabled   = true;
    btnCompleteText.textContent = 'กำลังบันทึก...';

    try {
        const { data } = await axios.post(
            `${BASE_URL}/student/courses/${courseId}/lessons/${currentLesson.lesson_id}/complete`,
            { student_id: user.id }
        );

        // อัปเดต state ใน allLessons
        const lesson = allLessons.find(l => l.lesson_id === currentLesson.lesson_id);
        if (lesson) lesson.is_completed = true;

        // อัปเดต progress
        progress = data.progress;
        updateProgress(progress);

        // อัปเดต sidebar
        const item = document.getElementById(`item-${currentLesson.lesson_id}`);
        if (item) {
            item.classList.add('completed');
            item.querySelector('.lesson-check').textContent = '✓';
        }

        // แสดง badge
        setCompleteState(true);
        toast('บันทึกความคืบหน้าสำเร็จ 🎉');

    } catch (err) {
        const msg = err.response?.data?.message || '';
        if (err.response?.status === 409) {
            // บันทึกไว้แล้ว → แค่เปลี่ยนสถานะ
            const lesson = allLessons.find(l => l.lesson_id === currentLesson.lesson_id);
            if (lesson) lesson.is_completed = true;
            setCompleteState(true);
        } else {
            toast(msg || 'บันทึกไม่สำเร็จ', 'error');
            btnComplete.disabled   = false;
            btnCompleteText.textContent = 'ตกลง — เรียนจบแล้ว';
        }
    }
});

// ─────────────────────────────────────────
//  NAV PREV / NEXT
// ─────────────────────────────────────────
btnPrev.addEventListener('click', () => {
    if (!currentLesson) return;
    const idx = allLessons.findIndex(l => l.lesson_id === currentLesson.lesson_id);
    if (idx > 0) openLesson(allLessons[idx - 1].lesson_id);
});

btnNext.addEventListener('click', () => {
    if (!currentLesson) return;
    const idx = allLessons.findIndex(l => l.lesson_id === currentLesson.lesson_id);
    if (idx < allLessons.length - 1) openLesson(allLessons[idx + 1].lesson_id);
});

// ─────────────────────────────────────────
//  BACK BUTTON
// ─────────────────────────────────────────
document.getElementById('btnBack').addEventListener('click', () => {
    window.location.href = '../Dashboard/index.html';
});

// ─────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────
function isYouTube(url) {
    return /youtube\.com|youtu\.be/.test(url);
}

function toYouTubeEmbed(url) {
    // รองรับทั้ง youtube.com/watch?v= และ youtu.be/
    const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

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