const { getDB } = require('../config/db');

// POST /auth/register
const register = async (req, res) => {
    try {
        const db = getDB();
        const { firstname, lastname, email, password, role } = req.body;

        if (!firstname || !lastname || !email || !password || !role)
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });

        if (!['student', 'teacher'].includes(role))
            return res.status(400).json({ message: 'Role ต้องเป็น student หรือ teacher เท่านั้น' });

        const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existing.length > 0)
            return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });

        await db.query('INSERT INTO users SET ?', [{ firstname, lastname, email, password, role }]);
        res.status(201).json({ message: 'ลงทะเบียนสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงทะเบียน', error: error.message });
    }
};

// POST /auth/login
const login = async (req, res) => {
    try {
        const db = getDB();
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน' });

        const [rows] = await db.query(
            'SELECT user_id, firstname, lastname, email, role FROM users WHERE email = ? AND password = ?',
            [email, password]
        );

        if (rows.length === 0)
            return res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

        res.json({ message: 'เข้าสู่ระบบสำเร็จ', data: rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', error: error.message });
    }
};

module.exports = { register, login };
