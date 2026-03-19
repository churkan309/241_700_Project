const user = initAuth('teacher', '../auth/login.html');

const heroName   = document.getElementById('heroName');
const topbarName = document.getElementById('topbarName');
const avatarInit = document.getElementById('avatarInitial');
const statCourses = document.getElementById('statCourses');
const statId      = document.getElementById('statId');
const statEmail   = document.getElementById('statEmail');
const sectionCount = document.getElementById('sectionCount');
const courseGrid   = document.getElementById('courseGrid');

// ── Init ──────────────────────────────────────────────────────────────────────
function initUI() {
    heroName.textContent   = `${user.firstname} ${user.lastname}`;
    topbarName.textContent = `${user.firstname} ${user.lastname}`;
    avatarInit.textContent = (user.firstname?.[0] || '') + (user.lastname?.[0] || '');
    statId.textContent    = `#${user.id}`;
    statEmail.textContent = user.email || '–';
    initModalBackdrop();
    loadCourses();
}

// ── Load courses ──────────────────────────────────────────────────────────────
async function loadCourses() {
    courseGrid.innerHTML = `<div class="loading-state"><span class="spinner"></span> กำลังโหลดรายวิชา...</div>`;
    try {
        const { data: courses } = await axios.get(`${API_URL}/teacher/courses/${user.id}`);
        statCourses.textContent  = courses.length;
        sectionCount.textContent = `${courses.length} วิชา`;

        if (courses.length === 0) {
            courseGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🗂️</div>
                    <div class="empty-title">ยังไม่มีรายวิชา</div>
                    <p class="empty-text">กดปุ่ม "สร้างรายวิชาใหม่" เพื่อเริ่มต้นสร้างรายวิชาแรกของคุณ</p>
                </div>`;
            return;
        }

        courseGrid.innerHTML = courses.map((c, idx) => `
            <div class="course-card" style="animation:fadeUp .4s ${idx * 0.07}s ease both;">
                <div class="course-card-header">
                    <div class="course-card-icon">📖</div>
                    <div class="course-card-menu">
                        <button class="btn-icon" onclick="toggleMenu(event,'menu-${c.course_id}')" data-tooltip="ตัวเลือก">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <circle cx="8" cy="3" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="8" cy="13" r="1.2"/>
                            </svg>
                        </button>
                        <div class="dropdown-menu" id="menu-${c.course_id}">
                            <button class="dropdown-item" onclick="openEditCourse(${c.course_id},'${escHtml(c.title)}','${escHtml(c.description || '')}')">✏️ แก้ไขรายวิชา</button>
                            <div class="dropdown-divider"></div>
                            <button class="dropdown-item danger" onclick="openDeleteConfirm(${c.course_id},'${escHtml(c.title)}')">🗑️ ลบรายวิชา</button>
                        </div>
                    </div>
                </div>
                <div class="course-card-body">
                    <div class="course-card-title">${escHtml(c.title)}</div>
                    <div class="course-card-desc">${escHtml(c.description || 'ไม่มีคำอธิบาย')}</div>
                </div>
                <div class="course-card-footer">
                    <button class="btn btn-primary btn-sm" onclick="manageCourse(${c.course_id})">
                        จัดการรายวิชา
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <span class="badge badge-gray">ID: ${c.course_id}</span>
                </div>
            </div>`).join('');

    } catch (err) {
        courseGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚠️</div>
                <div class="empty-title" style="color:var(--red)">เกิดข้อผิดพลาด</div>
                <p class="empty-text">${err.response?.data?.message || err.message}</p>
            </div>`;
        toast(err.response?.data?.message || 'โหลดรายวิชาไม่สำเร็จ', 'error');
    }
}

// ── Dropdown menu ─────────────────────────────────────────────────────────────
function toggleMenu(e, id) {
    e.stopPropagation();
    document.querySelectorAll('.dropdown-menu.open').forEach(d => { if (d.id !== id) d.classList.remove('open'); });
    document.getElementById(id).classList.toggle('open');
}
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.open').forEach(d => d.classList.remove('open'));
});

// ── Create / Edit course ──────────────────────────────────────────────────────
let editingCourseId = null;

document.getElementById('btnCreate').addEventListener('click', () => {
    editingCourseId = null;
    document.getElementById('courseModalTitle').textContent = '➕ สร้างรายวิชาใหม่';
    document.getElementById('inputCourseTitle').value = '';
    document.getElementById('inputCourseDesc').value  = '';
    openModal('courseModal');
});
document.getElementById('btnCancelCourse').addEventListener('click', () => closeModal('courseModal'));

document.getElementById('btnSaveCourse').addEventListener('click', async () => {
    const title       = document.getElementById('inputCourseTitle').value.trim();
    const description = document.getElementById('inputCourseDesc').value.trim();
    if (!title) { toast('กรุณากรอกชื่อรายวิชา', 'error'); return; }

    const btn = document.getElementById('btnSaveCourse');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก...';
    try {
        if (editingCourseId) {
            await axios.put(`${API_URL}/teacher/courses/${editingCourseId}`, { title, description });
            toast('อัปเดตรายวิชาสำเร็จ');
        } else {
            await axios.post(`${API_URL}/teacher/courses`, { teacher_id: user.id, title, description });
            toast('สร้างรายวิชาสำเร็จ');
        }
        closeModal('courseModal');
        loadCourses();
    } catch (err) {
        toast(err.response?.data?.message || 'บันทึกไม่สำเร็จ', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'บันทึก';
        editingCourseId = null;
    }
});

function openEditCourse(courseId, title, description) {
    editingCourseId = courseId;
    document.getElementById('courseModalTitle').textContent = '✏️ แก้ไขรายวิชา';
    document.getElementById('inputCourseTitle').value = title;
    document.getElementById('inputCourseDesc').value  = description;
    openModal('courseModal');
}

// ── Delete course ─────────────────────────────────────────────────────────────
let pendingDeleteCourseId = null;

function openDeleteConfirm(courseId, courseName) {
    pendingDeleteCourseId = courseId;
    document.getElementById('confirmDeleteName').textContent = `"${courseName}"`;
    openModal('confirmDeleteModal');
}
document.getElementById('btnCancelDelete').addEventListener('click', () => closeModal('confirmDeleteModal'));

document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
    if (!pendingDeleteCourseId) return;
    const btn = document.getElementById('btnConfirmDelete');
    btn.disabled = true; btn.textContent = 'กำลังลบ...';
    try {
        await axios.delete(`${API_URL}/teacher/courses/${pendingDeleteCourseId}`);
        closeModal('confirmDeleteModal');
        toast('ลบรายวิชาสำเร็จ');
        loadCourses();
    } catch (err) {
        toast(err.response?.data?.message || 'ลบรายวิชาไม่สำเร็จ', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'ลบรายวิชา';
        pendingDeleteCourseId = null;
    }
});

function manageCourse(courseId) {
    window.location.href = `lesson.html?courseId=${courseId}`;
}

// ── Profile ───────────────────────────────────────────────────────────────────
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
    if (!firstname || !lastname || !password) { toast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error'); return; }

    const btn = document.getElementById('btnSaveProfile');
    btn.disabled = true; btn.textContent = 'กำลังบันทึก...';
    try {
        await axios.put(`${API_URL}/users/${user.id}`, { firstname, lastname, password });
        user.firstname = firstname; user.lastname = lastname;
        localStorage.setItem('firstname', firstname);
        localStorage.setItem('lastname',  lastname);
        heroName.textContent   = `${firstname} ${lastname}`;
        topbarName.textContent = `${firstname} ${lastname}`;
        avatarInit.textContent = (firstname?.[0] || '') + (lastname?.[0] || '');
        closeModal('profileModal');
        toast('อัปเดตโปรไฟล์สำเร็จ');
    } catch (err) {
        toast(err.response?.data?.message || 'อัปเดตไม่สำเร็จ', 'error');
    } finally {
        btn.disabled = false; btn.textContent = 'บันทึก';
    }
});

// ── Delete account ────────────────────────────────────────────────────────────
document.getElementById('btnDeleteAccount').addEventListener('click', async () => {
    const confirmed = await showPopup(
        'คุณต้องการลบบัญชีนี้ถาวรใช่หรือไม่?\nรายวิชาและข้อมูลทั้งหมดจะถูกลบด้วย',
        'confirm'
    );
    if (!confirmed) return;
    const btn = document.getElementById('btnDeleteAccount');
    btn.disabled = true; btn.textContent = 'กำลังลบ...';
    try {
        await axios.delete(`${API_URL}/users/${user.id}`);
        toast('ลบบัญชีสำเร็จ');
        setTimeout(() => logout('../auth/login.html'), 1000);
    } catch (err) {
        toast(err.response?.data?.message || 'ลบบัญชีไม่สำเร็จ', 'error');
        btn.disabled = false; btn.textContent = 'ลบบัญชี';
    }
});

// ── Logout ────────────────────────────────────────────────────────────────────
document.getElementById('btnLogout').addEventListener('click', () => logout('../auth/login.html'));

// ── Start ─────────────────────────────────────────────────────────────────────
initUI();