require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-user-role']
}));
app.use(bodyParser.json());

const PORT = process.env.PORT || 8000;
let db = null;

const connectDB = async () => {
    db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT),
    });
};

const requireRole = (role) => (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    if (!userRole) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });
    if (userRole !== role) return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงส่วนนี้' });
    next();
};

// ===================== AUTH =====================

app.post('/auth/register', async (req, res) => {
    try {
        const { firstname, lastname, email, password, role } = req.body;

        if (!firstname || !lastname || !email || !password || !role) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }
        if (!['student', 'teacher'].includes(role)) {
            return res.status(400).json({ message: 'Role ต้องเป็น student หรือ teacher เท่านั้น' });
        }

        const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
        }

        await db.query('INSERT INTO users SET ?', [{ firstname, lastname, email, password, role }]);
        res.status(201).json({ message: 'ลงทะเบียนสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงทะเบียน', error: error.message });
    }
});

app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'กรุณากรอกอีเมลและรหัสผ่านให้ครบถ้วน' });
        }

        const [rows] = await db.query(
            'SELECT user_id, firstname, lastname, email, role FROM users WHERE email = ? AND password = ?',
            [email, password]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
        }

        res.json({ message: 'เข้าสู่ระบบสำเร็จ', data: rows[0] });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', error: error.message });
    }
});

// ===================== USERS =====================

app.get('/users/:userId', async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT user_id, firstname, lastname, email, role FROM users WHERE user_id = ?',
            [req.params.userId]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้', error: error.message });
    }
});

app.put('/users/:userId', async (req, res) => {
    try {
        const { firstname, lastname, password } = req.body;
        if (!firstname || !lastname || !password) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }
        await db.query(
            'UPDATE users SET firstname = ?, lastname = ?, password = ? WHERE user_id = ?',
            [firstname, lastname, password, req.params.userId]
        );
        res.json({ message: 'อัปเดตข้อมูลส่วนตัวสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล', error: error.message });
    }
});

app.delete('/users/:userId', async (req, res) => {
    try {
        await db.query('DELETE FROM lesson_progress WHERE student_id = ?', [req.params.userId]);
        await db.query('DELETE FROM enrollments WHERE student_id = ?', [req.params.userId]);
        await db.query('DELETE FROM users WHERE user_id = ?', [req.params.userId]);
        res.json({ message: 'ลบบัญชีผู้ใช้สำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบบัญชี', error: error.message });
    }
});

// ===================== COURSES =====================

app.get('/courses', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM courses');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายวิชา', error: error.message });
    }
});

// ===================== TEACHER =====================

app.get('/teacher/courses/:teacherId', requireRole('teacher'), async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM courses WHERE teacher_id = ?',
            [req.params.teacherId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายวิชา', error: error.message });
    }
});

app.post('/teacher/courses', requireRole('teacher'), async (req, res) => {
    try {
        const { teacher_id, title, description } = req.body;
        if (!teacher_id || !title) {
            return res.status(400).json({ message: 'กรุณากรอกชื่อคอร์สและระบุอาจารย์ผู้สอน' });
        }
        const [result] = await db.query(
            'INSERT INTO courses SET ?',
            [{ teacher_id, title, description: description || '' }]
        );
        res.status(201).json({ message: 'สร้างรายวิชาสำเร็จ', courseId: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างรายวิชา', error: error.message });
    }
});

app.put('/teacher/courses/:courseId', requireRole('teacher'), async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title) return res.status(400).json({ message: 'กรุณากรอกชื่อคอร์ส' });
        await db.query(
            'UPDATE courses SET title = ?, description = ? WHERE course_id = ?',
            [title, description || '', req.params.courseId]
        );
        res.json({ message: 'อัปเดตรายวิชาสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตรายวิชา', error: error.message });
    }
});

app.delete('/teacher/courses/:courseId', requireRole('teacher'), async (req, res) => {
    try {
        const { courseId } = req.params;

        const [lessonRows] = await db.query(
            'SELECT lesson_id FROM lessons WHERE course_id = ?',
            [courseId]
        );
        if (lessonRows.length > 0) {
            const lessonIds = lessonRows.map((l) => l.lesson_id);
            await db.query('DELETE FROM lesson_progress WHERE lesson_id IN (?)', [lessonIds]);
        }

        await db.query('DELETE FROM enrollments WHERE course_id = ?', [courseId]);
        await db.query('DELETE FROM lessons WHERE course_id = ?', [courseId]);
        await db.query('DELETE FROM courses WHERE course_id = ?', [courseId]);
        res.json({ message: 'ลบรายวิชาสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบรายวิชา', error: error.message });
    }
});

// ดึงข้อมูลรายวิชา + รายชื่อนักเรียนพร้อมเปอร์เซ็นต์ความคืบหน้าของแต่ละคน
app.get('/teacher/courses/:courseId/details', requireRole('teacher'), async (req, res) => {
    try {
        const { courseId } = req.params;

        const [courseRows] = await db.query(
            'SELECT * FROM courses WHERE course_id = ?',
            [courseId]
        );
        if (courseRows.length === 0) return res.status(404).json({ message: 'ไม่พบรายวิชา' });

        const [totalRows] = await db.query(
            'SELECT COUNT(*) AS total FROM lessons WHERE course_id = ?',
            [courseId]
        );
        const totalLessons = totalRows[0].total;

        const [studentRows] = await db.query(
            `SELECT
                u.user_id,
                u.firstname,
                u.lastname,
                u.email,
                COUNT(lp.progress_id) AS completed_lessons
             FROM enrollments e
             JOIN users u ON e.student_id = u.user_id
             LEFT JOIN lesson_progress lp
                ON lp.student_id = u.user_id
                AND lp.is_completed = 1
                AND lp.lesson_id IN (SELECT lesson_id FROM lessons WHERE course_id = ?)
             WHERE e.course_id = ?
             GROUP BY u.user_id, u.firstname, u.lastname, u.email`,
            [courseId, courseId]
        );

        const studentsWithProgress = studentRows.map((student) => ({
            ...student,
            progress_percent: totalLessons > 0
                ? Math.round((student.completed_lessons / totalLessons) * 100)
                : 0,
        }));

        res.json({
            course: courseRows[0],
            total_lessons: totalLessons,
            enrolled_students: studentsWithProgress,
        });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา', error: error.message });
    }
});

app.delete('/teacher/courses/:courseId/students/:studentId', requireRole('teacher'), async (req, res) => {
    try {
        const { courseId, studentId } = req.params;
        await db.query(
            'DELETE FROM enrollments WHERE course_id = ? AND student_id = ?',
            [courseId, studentId]
        );
        res.json({ message: 'ลบนักศึกษาออกจากรายวิชาสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบนักศึกษา', error: error.message });
    }
});

app.get('/teacher/courses/:courseId/lessons', requireRole('teacher'), async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM lessons WHERE course_id = ?',
            [req.params.courseId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงบทเรียน', error: error.message });
    }
});

app.post('/teacher/courses/:courseId/lessons', requireRole('teacher'), async (req, res) => {
    try {
        const { title, description, video_url, document_url, quiz_url } = req.body;
        if (!title) return res.status(400).json({ message: 'กรุณากรอกชื่อบทเรียน' });

        const [result] = await db.query('INSERT INTO lessons SET ?', [{
            course_id: req.params.courseId,
            title,
            description: description || '',
            video_url: video_url || '',
            document_url: document_url || '',
            quiz_url: quiz_url || '',
        }]);
        res.status(201).json({ message: 'สร้างบทเรียนสำเร็จ', lessonId: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างบทเรียน', error: error.message });
    }
});

app.put('/teacher/lessons/:lessonId', requireRole('teacher'), async (req, res) => {
    try {
        const { title, description, video_url, document_url, quiz_url } = req.body;
        if (!title) return res.status(400).json({ message: 'กรุณากรอกชื่อบทเรียน' });

        await db.query(
            `UPDATE lessons
             SET title = ?, description = ?, video_url = ?, document_url = ?, quiz_url = ?
             WHERE lesson_id = ?`,
            [title, description || '', video_url || '', document_url || '', quiz_url || '', req.params.lessonId]
        );
        res.json({ message: 'อัปเดตบทเรียนสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตบทเรียน', error: error.message });
    }
});

app.delete('/teacher/lessons/:lessonId', requireRole('teacher'), async (req, res) => {
    try {
        await db.query('DELETE FROM lesson_progress WHERE lesson_id = ?', [req.params.lessonId]);
        await db.query('DELETE FROM lessons WHERE lesson_id = ?', [req.params.lessonId]);
        res.json({ message: 'ลบบทเรียนสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบบทเรียน', error: error.message });
    }
});

// ===================== STUDENT =====================

app.get('/student/enrollments/:studentId', requireRole('student'), async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT e.*, c.title, c.description
             FROM enrollments e
             JOIN courses c ON e.course_id = c.course_id
             WHERE e.student_id = ?`,
            [req.params.studentId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายวิชาที่ลงทะเบียน', error: error.message });
    }
});

app.post('/student/enroll', requireRole('student'), async (req, res) => {
    try {
        const { student_id, course_id } = req.body;
        if (!student_id || !course_id) {
            return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
        }

        const [existing] = await db.query(
            'SELECT enroll_id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [student_id, course_id]
        );
        if (existing.length > 0) return res.status(409).json({ message: 'คุณลงทะเบียนรายวิชานี้ไปแล้ว' });

        await db.query('INSERT INTO enrollments SET ?', [{
            student_id,
            course_id,
            attendance_score: 0,
            assignment_score: 0,
            quiz_score: 0,
            midterm_score: 0,
            final_score: 0,
            teacher_comment: '',
        }]);
        res.status(201).json({ message: 'ลงทะเบียนสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงทะเบียน', error: error.message });
    }
});

app.delete('/student/enrollments/:studentId/:courseId', requireRole('student'), async (req, res) => {
    try {
        const { studentId, courseId } = req.params;
        await db.query(
            'DELETE FROM enrollments WHERE student_id = ? AND course_id = ?',
            [studentId, courseId]
        );
        res.json({ message: 'ถอนรายวิชาสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการถอนรายวิชา', error: error.message });
    }
});

// ดึงข้อมูลวิชา + รายการบทเรียนพร้อมสถานะว่าเรียนแล้วหรือยัง + ความคืบหน้ารวม
app.get('/student/courses/:courseId/:studentId', requireRole('student'), async (req, res) => {
    try {
        const { courseId, studentId } = req.params;

        const [courseRows] = await db.query(
            'SELECT * FROM courses WHERE course_id = ?',
            [courseId]
        );
        if (courseRows.length === 0) return res.status(404).json({ message: 'ไม่พบรายวิชา' });

        const [lessonRows] = await db.query(
            `SELECT
                l.*,
                COALESCE(lp.is_completed, 0) AS is_completed
             FROM lessons l
             LEFT JOIN lesson_progress lp
                ON l.lesson_id = lp.lesson_id AND lp.student_id = ?
             WHERE l.course_id = ?`,
            [studentId, courseId]
        );

        const totalLessons = lessonRows.length;
        const completedLessons = lessonRows.filter((l) => l.is_completed).length;
        const progressPercent = totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

        res.json({
            course: courseRows[0],
            lessons: lessonRows,
            progress: {
                completed: completedLessons,
                total: totalLessons,
                percent: progressPercent,
            },
        });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา', error: error.message });
    }
});

// ดึงบทเรียนเดี่ยว
app.get('/student/courses/:courseId/lessons/:lessonId', requireRole('student'), async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        const [rows] = await db.query(
            'SELECT * FROM lessons WHERE lesson_id = ? AND course_id = ?',
            [lessonId, courseId]
        );
        if (rows.length === 0) return res.status(404).json({ message: 'ไม่พบบทเรียน' });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงบทเรียน', error: error.message });
    }
});

// นักเรียนกด "ตกลง" เพื่อบันทึกว่าเรียนบทเรียนนี้เสร็จแล้ว
app.post('/student/lessons/:lessonId/complete', requireRole('student'), async (req, res) => {
    try {
        const { lessonId } = req.params;
        const { student_id } = req.body;

        if (!student_id) return res.status(400).json({ message: 'กรุณาระบุ student_id' });

        const [existing] = await db.query(
            'SELECT progress_id FROM lesson_progress WHERE student_id = ? AND lesson_id = ?',
            [student_id, lessonId]
        );

        if (existing.length > 0) {
            await db.query(
                'UPDATE lesson_progress SET is_completed = 1 WHERE student_id = ? AND lesson_id = ?',
                [student_id, lessonId]
            );
        } else {
            await db.query('INSERT INTO lesson_progress SET ?', [{
                student_id,
                lesson_id: lessonId,
                is_completed: 1,
            }]);
        }

        res.json({ message: 'บันทึกความคืบหน้าสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกความคืบหน้า', error: error.message });
    }
});

// ===================== START =====================

app.listen(PORT, async () => {
    await connectDB();
    console.log(`Server running on http://localhost:${PORT}`);
});