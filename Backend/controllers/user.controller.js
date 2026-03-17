const { getDB } = require('../config/db');

// GET /users/:userId
const getUser = async (req, res) => {
    try {
        const db = getDB();
        const [rows] = await db.query(
            'SELECT user_id, firstname, lastname, email, role FROM users WHERE user_id = ?',
            [req.params.userId]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', error: error.message });
    }
};

// PUT /users/:userId
const updateUser = async (req, res) => {
    try {
        const db = getDB();
        const { firstname, lastname, password } = req.body;

        if (!firstname || !lastname || !password)
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });

        const [result] = await db.query(
            'UPDATE users SET firstname = ?, lastname = ?, password = ? WHERE user_id = ?',
            [firstname, lastname, password, req.params.userId]
        );

        if (result.affectedRows === 0)
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน หรือคุณไม่มีสิทธิ์แก้ไขข้อมูลนี้' });

        res.json({ message: 'อัปเดตข้อมูลส่วนตัวสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล', error: error.message });
    }
};

// DELETE /users/:userId
const deleteUser = async (req, res) => {
    try {
        const db = getDB();
        const { userId } = req.params;

        const [users] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [userId]);
        if (users.length === 0)
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });

        await db.query('DELETE FROM lesson_completions WHERE student_id = ?', [userId]);
        await db.query('DELETE FROM enrollments WHERE student_id = ?', [userId]);
        await db.query('DELETE FROM users WHERE user_id = ?', [userId]);

        res.json({ message: 'ลบบัญชีผู้ใช้สำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบบัญชี', error: error.message });
    }
};

module.exports = { getUser, updateUser, deleteUser };
