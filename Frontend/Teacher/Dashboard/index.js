const BASE_URL = 'http://localhost:8000';

// ── Auth guard ──
const user = {
    id: localStorage.getItem('user_id'),
    firstname: localStorage.getItem('firstname'),
    lastname: localStorage.getItem('lastname'),
    email: localStorage.getItem('email'),
    role: localStorage.getItem('role'),
};

if (!user.id || user.role !== 'teacher') {
    window.location.href = '../../Home/Login/index.html';
}

// ── Axios default header ──
axios.defaults.headers.common['x-user-role'] = 'teacher';

// ── DOM refs ──
const heroName = document.getElementById('heroName');
const topbarName = document.getElementById('topbarName');
const avatarInit = document.getElementById('avatarInitial');
const statCourses = document.getElementById('statCourses');
const statId = document.getElementById('statId');
const statEmail = document.getElementById('statEmail');
const sectionCount = document.getElementById('sectionCount');
const courseGrid = document.getElementById('courseGrid');

// ─────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────
function initUI() {
    heroName.textContent = `${user.firstname} ${user.lastname}`;
    topbarName.textContent = `${user.firstname} ${user.lastname}`;
    avatarInit.textContent = (user.firstname?.[0] || '') + (user.lastname?.[0] || '');
    statId.textContent = `#${user.id}`;
    statEmail.textContent = user.email || '–';
    loadCourses();
}

// ─────────────────────────────────────────
//  LOAD COURSES
// ─────────────────────────────────────────
async function loadCourses() {
    courseGrid.innerHTML = '<div class="loading-state"><span class="spinner"></span> กำลังโหลดรายวิชา...</div>';

    try {
        const { data: courses } = await axios.get(
            `${BASE_URL}/teacher/courses/${user.id}`
        );

        statCourses.textContent = courses.length;
        sectionCount.textContent = `${courses.length} วิชา`;

        if (courses.length === 0) {
            courseGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🗂️</div>
                    <p>คุณยังไม่มีรายวิชา<br>กดปุ่ม "สร้างรายวิชาใหม่" เพื่อเริ่มต้น</p>
                </div>`;
            return;
        }

        courseGrid.innerHTML = courses.map((c, idx) => `
            <div class="course-card" style="animation-delay:${idx * 0.06}s">
                <div class="card-header">
                    <div class="card-icon">📖</div>
                    <div class="card-menu">
                        <button class="btn-menu" onclick="toggleMenu(event, 'menu-${c.course_id}')">⋯</button>
                        <div class="dropdown" id="menu-${c.course_id}">
                            <button class="dropdown-item" onclick="openEditCourse(${c.course_id},'${escHtml(c.title)}','${escHtml(c.description || '')}')">
                                ✏️ แก้ไขรายวิชา
                            </button>
                            <button class="dropdown-item danger" onclick="openDeleteConfirm(${c.course_id},'${escHtml(c.title)}')">
                                🗑️ ลบรายวิชา
                            </button>
                        </div>
                    </div>
                </div>
                <div>
                    <div class="card-title">${escHtml(c.title)}</div>
                    <div class="card-desc">${escHtml(c.description || 'ไม่มีคำอธิบาย')}</div>
                </div>
                <div class="card-footer">
                    <button class="btn-manage" onclick="manageCourse(${c.course_id})">
                        จัดการรายวิชา →
                    </button>
                    <span class="card-id">ID: ${c.course_id}</span>
                </div>
            </div>
        `).join('');

    } catch (err) {
        courseGrid.innerHTML = `<div class="empty-state" style="color:var(--red)">เกิดข้อผิดพลาด: ${err.response?.data?.message || err.message}</div>`;
        toast(err.response?.data?.message || 'โหลดรายวิชาไม่สำเร็จ', 'error');
    }
}

// ─────────────────────────────────────────
//  DROPDOWN MENU
// ─────────────────────────────────────────
function toggleMenu(e, id) {
    e.stopPropagation();
    // ปิด dropdown อื่นๆ ก่อน
    document.querySelectorAll('.dropdown.open').forEach(d => {
        if (d.id !== id) d.classList.remove('open');
    });
    document.getElementById(id).classList.toggle('open');
}

// ปิด dropdown เมื่อคลิกที่อื่น
document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
});

// ─────────────────────────────────────────
//  CREATE COURSE
// ─────────────────────────────────────────
let editingCourseId = null;

document.getElementById('btnCreate').addEventListener('click', () => {
    editingCourseId = null;
    document.getElementById('courseModalTitle').textContent = '➕ สร้างรายวิชาใหม่';
    document.getElementById('inputCourseTitle').value = '';
    document.getElementById('inputCourseDesc').value = '';
    openModal('courseModal');
});

document.getElementById('btnCancelCourse').addEventListener('click', () => closeModal('courseModal'));

document.getElementById('btnSaveCourse').addEventListener('click', async () => {
    const title = document.getElementById('inputCourseTitle').value.trim();
    const description = document.getElementById('inputCourseDesc').value.trim();

    if (!title) {
        toast('กรุณากรอกชื่อรายวิชา', 'error');
        return;
    }

    const btn = document.getElementById('btnSaveCourse');
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก...';

    try {
        if (editingCourseId) {
            // แก้ไข
            await axios.put(`${BASE_URL}/teacher/courses/${editingCourseId}`, { title, description });
            toast('อัปเดตรายวิชาสำเร็จ');
        } else {
            // สร้างใหม่
            await axios.post(`${BASE_URL}/teacher/courses`, {
                teacher_id: user.id,
                title,
                description,
            });
            toast('สร้างรายวิชาสำเร็จ');
        }
        closeModal('courseModal');
        loadCourses();
    } catch (err) {
        toast(err.response?.data?.message || 'บันทึกไม่สำเร็จ', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'บันทึก';
        editingCourseId = null;
    }
});

// ─────────────────────────────────────────
//  EDIT COURSE
// ─────────────────────────────────────────
function openEditCourse(courseId, title, description) {
    editingCourseId = courseId;
    document.getElementById('courseModalTitle').textContent = '✏️ แก้ไขรายวิชา';
    document.getElementById('inputCourseTitle').value = title;
    document.getElementById('inputCourseDesc').value = description;
    openModal('courseModal');
}

// ─────────────────────────────────────────
//  DELETE COURSE
// ─────────────────────────────────────────
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
    btn.disabled = true;
    btn.textContent = 'กำลังลบ...';
    try {
        await axios.delete(`${BASE_URL}/teacher/courses/${pendingDeleteCourseId}`);
        closeModal('confirmDeleteModal');
        toast('ลบรายวิชาสำเร็จ');
        loadCourses();
    } catch (err) {
        toast(err.response?.data?.message || 'ลบรายวิชาไม่สำเร็จ', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'ลบรายวิชา';
        pendingDeleteCourseId = null;
    }
});

// ─────────────────────────────────────────
//  MANAGE COURSE (ไปหน้าจัดการรายวิชา)
// ─────────────────────────────────────────
function manageCourse(courseId) {
    window.location.href = `../Course/index.html?courseId=${courseId}`;
}

// ─────────────────────────────────────────
//  PROFILE
// ─────────────────────────────────────────
document.getElementById('btnProfile').addEventListener('click', openProfileModal);
document.getElementById('btnCancelProfile').addEventListener('click', () => closeModal('profileModal'));

function openProfileModal() {
    document.getElementById('inputFirstname').value = user.firstname || '';
    document.getElementById('inputLastname').value = user.lastname || '';
    document.getElementById('inputPassword').value = '';
    document.getElementById('inputEmail').value = user.email || '';
    openModal('profileModal');
}

document.getElementById('btnSaveProfile').addEventListener('click', async () => {
    const firstname = document.getElementById('inputFirstname').value.trim();
    const lastname = document.getElementById('inputLastname').value.trim();
    const password = document.getElementById('inputPassword').value.trim();

    if (!firstname || !lastname || !password) {
        toast('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
        return;
    }

    const btn = document.getElementById('btnSaveProfile');
    btn.disabled = true;
    btn.textContent = 'กำลังบันทึก...';

    try {
        await axios.put(`${BASE_URL}/users/${user.id}`, { firstname, lastname, password });
        user.firstname = firstname;
        user.lastname = lastname;
        localStorage.setItem('firstname', firstname);
        localStorage.setItem('lastname', lastname);

        heroName.textContent = `${firstname} ${lastname}`;
        topbarName.textContent = `${firstname} ${lastname}`;
        avatarInit.textContent = (firstname?.[0] || '') + (lastname?.[0] || '');
        statEmail.textContent = user.email;

        closeModal('profileModal');
        toast('อัปเดตโปรไฟล์สำเร็จ');
    } catch (err) {
        toast(err.response?.data?.message || 'อัปเดตไม่สำเร็จ', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'บันทึก';
    }
});

// ─────────────────────────────────────────
//  DELETE ACCOUNT
// ─────────────────────────────────────────
document.getElementById('btnDeleteAccount').addEventListener('click', async () => {
    const confirmed = confirm('คุณต้องการลบบัญชีนี้ถาวรใช่หรือไม่?\nรายวิชาและข้อมูลทั้งหมดจะถูกลบด้วย');
    if (!confirmed) return;

    const btn = document.getElementById('btnDeleteAccount');
    btn.disabled = true;
    btn.textContent = 'กำลังลบ...';

    try {
        await axios.delete(`${BASE_URL}/users/${user.id}`);
        localStorage.clear();
        alert('ลบบัญชีสำเร็จ');
        window.location.href = '../../Home/Login/index.html';
    } catch (err) {
        toast(err.response?.data?.message || 'ลบบัญชีไม่สำเร็จ', 'error');
        btn.disabled = false;
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
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('open');
    });
});

function toast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `toast ${type === 'error' ? 'error' : ''}`;
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

// ── Start ──
initUI();