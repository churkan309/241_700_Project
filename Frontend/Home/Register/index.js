const BASE_URL = 'http://localhost:8000';

// --- Popup Helper ---
function showPopup(message, type = 'error') {
    // ลบ popup เก่าถ้ามี
    const existing = document.getElementById('custom-popup');
    if (existing) existing.remove();

    const colors = {
        error: { bg: '#fee2e2', border: '#f87171', icon: '❌', title: 'เกิดข้อผิดพลาด' },
        success: { bg: '#dcfce7', border: '#4ade80', icon: '✅', title: 'สำเร็จ' },
        warning: { bg: '#fef9c3', border: '#facc15', icon: '⚠️', title: 'คำเตือน' },
    };
    const c = colors[type] || colors.error;

    const popup = document.createElement('div');
    popup.id = 'custom-popup';
    popup.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.4); display: flex;
        align-items: center; justify-content: center; z-index: 9999;
    `;

    popup.innerHTML = `
        <div style="
            background: #fff; border-radius: 12px; padding: 32px 28px;
            max-width: 380px; width: 90%; text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            border-top: 5px solid ${c.border};
            animation: popIn 0.2s ease;
        ">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">${c.icon}</div>
            <h3 style="margin: 0 0 8px; color: #1f2937; font-size: 1.1rem;">${c.title}</h3>
            <p style="margin: 0 0 20px; color: #4b5563; font-size: 0.95rem;">${message}</p>
            <button id="popup-close-btn" style="
                background: ${c.border}; color: #fff; border: none;
                padding: 10px 28px; border-radius: 8px; cursor: pointer;
                font-size: 0.95rem; font-weight: 600;
                transition: opacity 0.2s;
            ">ตกลง</button>
        </div>
        <style>
            @keyframes popIn {
                from { transform: scale(0.85); opacity: 0; }
                to   { transform: scale(1);    opacity: 1; }
            }
        </style>
    `;

    document.body.appendChild(popup);

    // ปิดเมื่อกดปุ่ม หรือคลิกนอก popup
    document.getElementById('popup-close-btn').addEventListener('click', () => popup.remove());
    popup.addEventListener('click', (e) => { if (e.target === popup) popup.remove(); });

    // คืน Promise เพื่อรอให้ผู้ใช้กด ตกลง ก่อน redirect
    return new Promise(resolve => {
        document.getElementById('popup-close-btn').addEventListener('click', resolve);
        popup.addEventListener('click', (e) => { if (e.target === popup) resolve(); });
    });
}

// --- Register Form ---
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const role = document.querySelector('input[name="role"]:checked')?.value;
    if (!role) {
        showPopup('กรุณาเลือกประเภทผู้ใช้ (นักเรียน / อาจารย์)', 'warning');
        return;
    }
    const firstname = document.getElementById('inputFirstname').value.trim();
    const lastname = document.querySelector('input[type="lastname"]').value.trim();
    const email = document.querySelector('input[type="email"]').value.trim();
    const password = document.querySelector('input[type="password"]').value.trim();

    if (!firstname || !lastname || !email || !password) {
        showPopup('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
        return;
    }

    try {
        const response = await axios.post(`${BASE_URL}/auth/register`, {
            firstname, lastname, email, password, role
        });

        await showPopup(response.data.message, 'success'); // รอกด ตกลง ก่อน redirect
        window.location.href = '../Login/index.html';

    } catch (error) {
        if (error.response) {
            showPopup(error.response.data.message, 'error');
        } else {
            showPopup('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', 'error');
        }
    }
});