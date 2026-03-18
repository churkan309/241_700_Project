require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');

const { connectDB }       = require('./config/db');
const { validateNumeric } = require('./middleware/auth');

const authRoutes    = require('./routes/auth.routes');
const userRoutes    = require('./routes/user.routes');
const courseRoutes  = require('./routes/course.routes');
const teacherRoutes = require('./routes/teacher.routes');
const studentRoutes = require('./routes/student.routes');

// ── Process Error Handlers ───────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // ไม่ควร process.exit() ทันทีใน production - ควร log แล้วตัดสินใจ graceful shutdown
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1); // uncaughtException ร้ายแรงกว่า ควร restart
});

const app  = express();
const PORT = process.env.PORT || 8000;

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json());

// ตรวจสอบ numeric params ทั่วทั้ง app
app.param(['userId', 'courseId', 'lessonId', 'studentId', 'teacherId'], validateNumeric);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth',    authRoutes);
app.use('/users',   userRoutes);
app.use('/courses', courseRoutes);
app.use('/teacher', teacherRoutes);
app.use('/student', studentRoutes);

// ── 404 & Error handlers ──────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ message: `ไม่พบ endpoint: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์', error: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
connectDB()
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch(err => { console.error('DB connection failed:', err); process.exit(1); });