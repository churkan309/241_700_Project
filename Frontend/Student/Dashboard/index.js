const BASE_URL = 'http://localhost:8000';

// ── Auth guard ──
const user = {
    id:        localStorage.getItem('user_id'),
    firstname: localStorage.getItem('firstname'),
    lastname:  localStorage.getItem('lastname'),
    email:     localStorage.getItem('email'),
    role:      localStorage.getItem('role'),
};

if (!user.id || user.role !== 'student') {
    window.location.href = '../../Home/Login/index.html';
}

// ── Axios default header ──
axios.defaults.headers.common['x-user-role'] = 'student';

// ── DOM refs ──
const heroName      = document.getElementById('heroName');
const topbarName    = document.getElementById('topbarName');
const avatarInitial = document.getElementById('avatarInitial');
const statTotal     = document.getElementById('statTotal');
const statId        = document.getElementById('statId');
const tableBody     = document.getElementById('courseTableBody');

// ─────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────
function initUI() {
    heroName.textContent      = `${user.firstname} ${user.lastname}`;
    topbarName.textContent    = `${user.firstname} ${user.lastname}`;
    avatarInitial.textContent = (user.firstname?.[0] || '') + (user.lastname?.[0] || '');
    statId.textContent        = `#${user.id}`;
    loadEnrollments();
}

// ─────────────────────────────────────────
//  PROGRESS BAR HELPER
// ─────────────────────────────────────────
function renderProgress(pct, completed, total) {
    // สีแถบเปลี่ยนตามเปอร์เซ็นต์
    const color = pct >= 100 ? 'var(--green)'
                : pct >= 50  ? 'var(--accent)'
                :              'var(--orange)';

    return `
        <div style="min-width:140px;">
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
                gap: 8px;
            ">
                <div style="
                    flex: 1;
                    height: 6px;
                    background: var(--border);
                    border-radius: 99px;
                    overflow: hidden;
                ">
                    <div style="
                        height: 100%;
                        width: ${pct}%;
                        background: ${color};
                        border-radius: 99px;
                        transition: width .4s ease;
                    "></div>
                </div>
                <span style="
                    font-family: 'Prompt', sans-serif;
                    font-size: .75rem;
                    font-weight: 600;
                    color: ${color};
                    flex-shrink: 0;
                ">${pct}%</span>
            </div>
            <div style="font-size:.72rem; color:var(--text-3);">
                ${completed} / ${total} บทเรียน
            </div>
        </div>`;
}

// ─────────────────────────────────────────
//  LOAD ENROLLMENTS
// ─────────────────────────────────────────
let enrolledCourseIds = new Set();

async function loadEnrollments() {
    try {
        const { data: enrollments } = await axios.get(`${BASE_URL}/student/enrollments/${user.id}`);

        enrolledCourseIds = new Set(enrollments.map(e => e.course_id));
        statTotal.textContent = enrollments.length;

        if (enrollments.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="3">
                        <div class="empty-state">
                            <div class="empty-icon">📚</div>
                            <p class="empty-text">คุณยังไม่ได้ลงทะเบียนรายวิชาใด<br>กดปุ่ม "ค้นหารายวิชาเพิ่มเติม" เพื่อเริ่มต้น</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        tableBody.innerHTML = enrollments.map((e, idx) => `
            <tr style="animation-delay:${idx * 0.05}s">
                <td>
                    <div class="course-name">${escHtml(e.title)}</div>
                    <div class="course-desc">${escHtml(e.description || 'ไม่มีคำอธิบาย')}</div>
                </td>
                <td>
                    ${renderProgress(
                        e.progress_percent    ?? 0,
                        e.completed_lessons   ?? 0,
                        e.total_lessons       ?? 0
                    )}
                </td>
                <td>
                    <button class="btn-view" onclick="viewCourse(${e.course_id})">ดูบทเรียน</button>
                    <button class="btn-drop" onclick="openDropConfirm(${e.course_id},'${escHtml(e.title)}')">ถอน</button>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="3" style="color:var(--red);padding:20px">เกิดข้อผิดพลาด: ${err.response?.data?.message || err.message}</td></tr>`;
        toast(err.response?.data?.message || 'โหลดรายวิชาไม่สำเร็จ', 'error');
    }
}

// ─────────────────────────────────────────
//  DROP COURSE
// ─────────────────────────────────────────
let pendingDropCourseId = null;

function openDropConfirm(courseId, courseName) {
    pendingDropCourseId = courseId;
    document.getElementById('confirmCourseName').textContent = `"${courseName}"`;
    openModal('confirmModal');
}

document.getElementById('btnConfirmDrop').addEventListener('click', async () => {
    if (!pendingDropCourseId) return;
    const btn = document.getElementById('btnConfirmDrop');
    btn.disabled    = true;
    btn.textContent = 'กำลังถอน...';
    try {
        await axios.delete(`${BASE_URL}/student/enrollments/${user.id}/${pendingDropCourseId}`);
        closeModal('confirmModal');
        toast('ถอนรายวิชาสำเร็จ');
        loadEnrollments();
    } catch (err) {
        toast(err.response?.data?.message || 'ถอนรายวิชาไม่สำเร็จ', 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'ถอนรายวิชา';
        pendingDropCourseId = null;
    }
});

document.getElementById('btnCancelDrop').addEventListener('click', () => closeModal('confirmModal'));

// ─────────────────────────────────────────
//  VIEW COURSE
// ─────────────────────────────────────────
function viewCourse(courseId) {
    window.location.href = `../Course/index.html?courseId=${courseId}`;
}

// ─────────────────────────────────────────
//  BROWSE COURSES
// ─────────────────────────────────────────
document.getElementById('btnBrowse').addEventListener('click', openBrowse);
document.getElementById('btnCloseBrowse').addEventListener('click', () => closeModal('browseModal'));

async function openBrowse() {
    openModal('browseModal');
    const list = document.getElementById('browseList');
    list.innerHTML = '<div style="text-align:center;padding:32px;color:var(--text-2);"><span class="spinner"></span> กำลังโหลด...</div>';

    try {
        const { data: courses } = await axios.get(`${BASE_URL}/courses`);

        if (courses.length === 0) {
            list.innerHTML = '<p style="text-align:center;color:var(--text-2);padding:32px;">ไม่พบรายวิชาในระบบ</p>';
            return;
        }

        list.innerHTML = courses.map(c => {
            const isEnrolled = enrolledCourseIds.has(c.course_id);
            return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--border);gap:12px;">
                <div>
                    <div style="font-weight:600;font-size:.9rem">${escHtml(c.title)}</div>
                    <div style="font-size:.8rem;color:var(--text-2);margin-top:2px">${escHtml(c.description || 'ไม่มีคำอธิบาย')}</div>
                </div>
                ${isEnrolled
                    ? `<span class="badge badge-enrolled" style="flex-shrink:0">ลงทะเบียนแล้ว</span>`
                    : `<button class="btn-browse" style="flex-shrink:0;font-size:.8rem;padding:6px 14px;"
                            onclick="enrollCourse(${c.course_id},'${escHtml(c.title)}',this)">
                            + ลงทะเบียน
                       </button>`
                }
            </div>`;
        }).join('');

    } catch (err) {
        list.innerHTML = `<p style="color:var(--red);padding:20px;">${err.response?.data?.message || 'โหลดไม่สำเร็จ'}</p>`;
    }
}

async function enrollCourse(courseId, courseTitle, btn) {
    btn.disabled    = true;
    btn.textContent = 'กำลังลง...';
    try {
        await axios.post(`${BASE_URL}/student/enroll`, { student_id: user.id, course_id: courseId });
        toast(`ลงทะเบียน "${courseTitle}" สำเร็จ`);
        enrolledCourseIds.add(courseId);
        btn.replaceWith((() => {
            const s = document.createElement('span');
            s.className        = 'badge badge-enrolled';
            s.style.flexShrink = '0';
            s.textContent      = 'ลงทะเบียนแล้ว';
            return s;
        })());
        loadEnrollments();
    } catch (err) {
        toast(err.response?.data?.message || 'ลงทะเบียนไม่สำเร็จ', 'error');
        btn.disabled    = false;
        btn.textContent = '+ ลงทะเบียน';
    }
}

// ─────────────────────────────────────────
//  PROFILE
// ─────────────────────────────────────────
document.getElementById('btnProfile').addEventListener('click', openProfileModal);
document.getElementById('btnCancelProfile').addEventListener('click', () => closeModal('profileModal'));

function openProfileModal() {
    document.getElementById('inputFirstname').value = user.firstname || '';
    document.getElementById('inputLastname').value  = user.lastname  || '';
    document.getElementById('inputPassword').value  = '';
    document.getElementById('inputEmail').value     = user.email     || '';
    openModal('profileModal');
}

document.getElementById('btnSaveProfile').addEventListener('click', async () => {
    const firstname = document.getElementById('inputFirstname').value.trim();
    const lastname  = document.getElementById('inputLastname').value.trim();
    const password  = document.getElementById('inputPassword').value.trim();

    if (!firstname || !lastname || !password) {
        toast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
        return;
    }

    const btn       = document.getElementById('btnSaveProfile');
    btn.disabled    = true;
    btn.textContent = 'กำลังบันทึก...';

    try {
        await axios.put(`${BASE_URL}/users/${user.id}`, { firstname, lastname, password });
        user.firstname = firstname;
        user.lastname  = lastname;
        localStorage.setItem('firstname', firstname);
        localStorage.setItem('lastname',  lastname);

        heroName.textContent      = `${firstname} ${lastname}`;
        topbarName.textContent    = `${firstname} ${lastname}`;
        avatarInitial.textContent = (firstname?.[0] || '') + (lastname?.[0] || '');

        closeModal('profileModal');
        toast('อัปเดตโปรไฟล์สำเร็จ');
    } catch (err) {
        toast(err.response?.data?.message || 'อัปเดตไม่สำเร็จ', 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = 'บันทึก';
    }
});

// ─────────────────────────────────────────
//  DELETE ACCOUNT
// ─────────────────────────────────────────
document.getElementById('btnDeleteAccount').addEventListener('click', async () => {
    const confirmed = confirm('คุณต้องการลบบัญชีนี้ถาวรใช่หรือไม่?\nการดำเนินการนี้ไม่สามารถย้อนกลับได้');
    if (!confirmed) return;

    const btn       = document.getElementById('btnDeleteAccount');
    btn.disabled    = true;
    btn.textContent = 'กำลังลบ...';

    try {
        await axios.delete(`${BASE_URL}/users/${user.id}`);
        localStorage.clear();
        alert('ลบบัญชีสำเร็จ');
        window.location.href = '../../Home/Login/index.html';
    } catch (err) {
        toast(err.response?.data?.message || 'ลบบัญชีไม่สำเร็จ', 'error');
        btn.disabled    = false;
        btn.textContent = 'ลบบัญชี';
    }
});

// ─────────────────────────────────────────
//  LOGOUT
// ─────────────────────────────────────────
document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = '../../Home/Login/index.html';
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
initUI();