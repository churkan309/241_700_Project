const API_URL = 'http://localhost:8000';

// ── Auth guard ────────────────────────────────────────────────────────────────
/**
 * อ่าน user จาก localStorage และตั้งค่า axios headers
 * @param {'student'|'teacher'} expectedRole — role ที่อนุญาตให้เข้าถึงหน้านี้
 * @param {string} loginPath — path ไปยังหน้า login (relative จากหน้าปัจจุบัน)
 * @returns {{ id, firstname, lastname, email, role }}
 */
function initAuth(expectedRole, loginPath = '../../pages/auth/login.html') {
    const user = {
        id:        localStorage.getItem('user_id'),
        firstname: localStorage.getItem('firstname'),
        lastname:  localStorage.getItem('lastname'),
        email:     localStorage.getItem('email'),
        role:      localStorage.getItem('role'),
    };

    if (!user.id || (expectedRole && user.role !== expectedRole)) {
        window.location.href = loginPath;
        return null;
    }

    // ตั้งค่า axios headers ทั่วทั้งหน้า
    axios.defaults.headers.common['x-user-role'] = user.role;
    axios.defaults.headers.common['x-user-id']   = user.id;

    // interceptor: redirect เมื่อ 401/403
    axios.interceptors.response.use(
        res => res,
        err => {
            if (err.response?.status === 401 || err.response?.status === 403) {
                localStorage.clear();
                window.location.href = loginPath;
            }
            return Promise.reject(err);
        }
    );

    return user;
}

// ── Toast notification ────────────────────────────────────────────────────────
/**
 * แสดง toast notification
 * @param {string} msg
 * @param {'success'|'error'} type
 */
function toast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className   = `toast${type === 'error' ? ' error' : ''}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

// ── HTML escape ───────────────────────────────────────────────────────────────
/**
 * Escape HTML special characters เพื่อป้องกัน XSS
 * @param {*} str
 * @returns {string}
 */
function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#39;');
}

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

/** ปิด modal เมื่อคลิก backdrop */
function initModalBackdrop() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.classList.remove('open');
        });
    });
}

// ── Logout ────────────────────────────────────────────────────────────────────
function logout(loginPath = '../../pages/auth/login.html') {
    localStorage.clear();
    window.location.href = loginPath;
}

// ── Popup (modal dialog with Promise) ────────────────────────────────────────
/**
 * แสดง popup dialog (ใช้ในหน้า register)
 * @param {string} message
 * @param {'success'|'error'|'warning'} type
 * @returns {Promise<void>} — resolve เมื่อผู้ใช้กด ตกลง
 */
function showPopup(message, type = 'error') {
    const existing = document.getElementById('custom-popup');
    if (existing) existing.remove();

    const palette = {
        error:   { bg: '#fee2e2', border: '#f87171', icon: '❌', title: 'เกิดข้อผิดพลาด' },
        success: { bg: '#dcfce7', border: '#4ade80', icon: '✅', title: 'สำเร็จ' },
        warning: { bg: '#fef9c3', border: '#facc15', icon: '⚠️', title: 'คำเตือน' },
    };
    const c = palette[type] || palette.error;

    const popup = document.createElement('div');
    popup.id = 'custom-popup';
    popup.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:rgba(0,0,0,.4);display:flex;
        align-items:center;justify-content:center;z-index:9999;`;

    popup.innerHTML = `
        <div style="
            background:#fff;border-radius:12px;padding:32px 28px;
            max-width:380px;width:90%;text-align:center;
            box-shadow:0 10px 30px rgba(0,0,0,.2);
            border-top:5px solid ${c.border};animation:popIn .2s ease;">
            <div style="font-size:2.5rem;margin-bottom:8px;">${c.icon}</div>
            <h3 style="margin:0 0 8px;color:#1f2937;font-size:1.1rem;">${c.title}</h3>
            <p style="margin:0 0 20px;color:#4b5563;font-size:.95rem;">${message}</p>
            <button id="popup-close-btn" style="
                background:${c.border};color:#fff;border:none;
                padding:10px 28px;border-radius:8px;cursor:pointer;
                font-size:.95rem;font-weight:600;">ตกลง</button>
        </div>
        <style>
            @keyframes popIn {
                from { transform:scale(.85);opacity:0; }
                to   { transform:scale(1);opacity:1; }
            }
        </style>`;

    document.body.appendChild(popup);

    return new Promise(resolve => {
        const close = () => { popup.remove(); resolve(); };
        document.getElementById('popup-close-btn').addEventListener('click', close);
        popup.addEventListener('click', e => { if (e.target === popup) close(); });
    });
}
