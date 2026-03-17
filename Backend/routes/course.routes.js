const router = require('express').Router();
const { getDB } = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const [rows] = await getDB().query('SELECT * FROM courses');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายวิชา', error: error.message });
    }
});

module.exports = router;
