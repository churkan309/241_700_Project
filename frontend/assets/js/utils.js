const API_URL = 'http://localhost:8000';
let _interceptorAdded = false;

// ── Auth guard ────────────────────────────────────────────────────────────────
/**
 * @param {'student'|'teacher'} expectedRole
 * @param {string} loginPath
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

    axios.defaults.headers.common['x-user-role'] = user.role;
    axios.defaults.headers.common['x-user-id']   = user.id;

    if (!_interceptorAdded) {
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
        _interceptorAdded = true;
    }
    return user;
}

// ── Toast notification ────────────────────────────────────────────────────────
/**
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

// ── Popup ────────────────────────────────────────
/**
 * @param {string}  message  ข้อความที่ต้องการแสดง (รองรับ \n)
 * @param {'success'|'error'|'warning'|'confirm'} type
 * @returns {Promise<boolean>}
 */
function showPopup(message, type = 'error') {
    // ── ลบ popup เดิมออกก่อน (ถ้ามี) ──────────────────────────────────────
    const existing = document.getElementById('custom-popup');
    if (existing) existing.remove();

    const palette = {
        error:   { color: 'var(--red)',    iconBg: 'var(--red-muted)',    icon: '❌', title: 'เกิดข้อผิดพลาด'       },
        success: { color: 'var(--green)',  iconBg: 'var(--green-muted)',  icon: '✅', title: 'สำเร็จ'               },
        warning: { color: 'var(--orange)', iconBg: 'var(--orange-muted)', icon: '⚠️', title: 'คำเตือน'             },
        confirm: { color: 'var(--red)',    iconBg: 'var(--red-muted)',    icon: '🗑️', title: 'ยืนยันการดำเนินการ'  },
    };
    const c = palette[type] || palette.error;
    const isConfirm = type === 'confirm';

    // ── Inject Keyframe + popup-style เพียงครั้งเดียว ──────────────────────
    if (!document.getElementById('popup-style')) {
        const style = document.createElement('style');
        style.id = 'popup-style';
        style.textContent = `
            @keyframes popIn {
                from { transform: scale(.88) translateY(12px); opacity: 0; }
                to   { transform: scale(1)   translateY(0);    opacity: 1; }
            }
            #custom-popup .popup-card {
                background    : var(--bg-card);
                border        : 1px solid var(--border);
                border-radius : var(--radius-lg);
                padding       : 36px 32px 28px;
                max-width     : 420px;
                width         : 90%;
                text-align    : center;
                box-shadow    : var(--shadow-xl);
                animation     : popIn .3s var(--transition-bounce) both;
                font-family   : var(--font-body);
            }
            #custom-popup .popup-icon-wrap {
                width         : 56px;
                height        : 56px;
                border-radius : var(--radius);
                display       : flex;
                align-items   : center;
                justify-content: center;
                margin        : 0 auto 16px;
                font-size     : 1.6rem;
            }
            #custom-popup .popup-title {
                font-family   : var(--font-display);
                font-size     : var(--text-lg);
                font-weight   : 600;
                color         : var(--text-1);
                margin        : 0 0 10px;
                line-height   : var(--leading-tight);
            }
            #custom-popup .popup-msg {
                font-size     : var(--text-sm);
                color         : var(--text-2);
                line-height   : var(--leading-loose);
                margin        : 0 0 24px;
                white-space   : pre-line;
            }
            #custom-popup .popup-actions {
                display       : flex;
                gap           : var(--space-3);
                justify-content: center;
            }
            #custom-popup .popup-btn {
                font-family   : var(--font-body);
                font-size     : var(--text-sm);
                font-weight   : 600;
                padding       : 9px 28px;
                border-radius : var(--radius-sm);
                border        : 1px solid transparent;
                cursor        : pointer;
                transition    : var(--transition);
                line-height   : 1;
            }
            #custom-popup .popup-btn-ok {
                color         : var(--text-inverse);
            }
            #custom-popup .popup-btn-ok:hover {
                filter        : brightness(1.15);
                transform     : translateY(-1px);
            }
            #custom-popup .popup-btn-cancel {
                background    : transparent;
                border-color  : var(--border);
                color         : var(--text-2);
            }
            #custom-popup .popup-btn-cancel:hover {
                background    : var(--bg-hover);
                border-color  : var(--text-3);
                color         : var(--text-1);
            }`;
        document.head.appendChild(style);
    }

    // ── Overlay ────────────────────────────────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'custom-popup';
    Object.assign(overlay.style, {
        position       : 'fixed',
        inset          : '0',
        background     : 'var(--bg-overlay)',
        backdropFilter : 'blur(6px)',
        webkitBackdropFilter: 'blur(6px)',
        display        : 'flex',
        alignItems     : 'center',
        justifyContent : 'center',
        zIndex         : '9999',
        padding        : 'var(--space-4)',
    });

    // ── Card ───────────────────────────────────────────────────────────────
    const card = document.createElement('div');
    card.className = 'popup-card';
    card.style.borderTop = `3px solid ${c.color}`;

    // ── Icon wrapper ───────────────────────────────────────────────────────
    const iconWrap = document.createElement('div');
    iconWrap.className = 'popup-icon-wrap';
    iconWrap.style.background = c.iconBg;
    iconWrap.textContent = c.icon;

    // ── Title ──────────────────────────────────────────────────────────────
    const titleEl = document.createElement('h3');
    titleEl.className = 'popup-title';
    titleEl.textContent = c.title;

    // ── Message ────────────────────────────────────────────────────────────
    const msgEl = document.createElement('p');
    msgEl.className = 'popup-msg';
    msgEl.textContent = message;

    // ── Actions row ────────────────────────────────────────────────────────
    const actions = document.createElement('div');
    actions.className = 'popup-actions';

    // ปุ่ม Cancel (เฉพาะ confirm type)
    let cancelBtn;
    if (isConfirm) {
        cancelBtn = document.createElement('button');
        cancelBtn.className = 'popup-btn popup-btn-cancel';
        cancelBtn.textContent = 'ยกเลิก';
        actions.appendChild(cancelBtn);
    }

    // ปุ่ม OK / ยืนยัน
    const okBtn = document.createElement('button');
    okBtn.className = 'popup-btn popup-btn-ok';
    okBtn.textContent = isConfirm ? 'ยืนยัน' : 'ตกลง';
    okBtn.style.background   = c.color;
    okBtn.style.borderColor  = c.color;
    actions.appendChild(okBtn);

    // ── ประกอบ DOM ─────────────────────────────────────────────────────────
    card.append(iconWrap, titleEl, msgEl, actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    // ── Return Promise ─────────────────────────────────────────────────────
    return new Promise(resolve => {
        const confirm = () => { overlay.remove(); resolve(true);  };
        const cancel  = () => { overlay.remove(); resolve(false); };

        okBtn.addEventListener('click', confirm);
        if (cancelBtn) cancelBtn.addEventListener('click', cancel);

        // คลิก overlay ด้านนอก = ยกเลิก (confirm) หรือ ปิด (อื่นๆ)
        overlay.addEventListener('click', e => {
            if (e.target === overlay) isConfirm ? cancel() : confirm();
        });
    });
}