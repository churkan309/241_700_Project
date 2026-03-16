require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.param(['userId', 'courseId', 'lessonId', 'studentId'], (req, res, next, val) => {
    if (isNaN(Number(val)))
        return res.status(400).json({ message: `${val} ต้องเป็นตัวเลข` });
    next();
});

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

const requireSelf = (req, res, next) => {
    const requesterId = req.headers['x-user-id'];
    if (!requesterId || requesterId !== req.params.userId)
        return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
    next();
};

app.get('/users/:userId', requireSelf, async (req, res) => {
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

app.put('/users/:userId', requireSelf, async (req, res) => {
    try {
        const { firstname, lastname, password } = req.body;
        if (!firstname || !lastname || !password) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        const [result] = await db.query(
            'UPDATE users SET firstname = ?, lastname = ?, password = ? WHERE user_id = ?',
            [firstname, lastname, password, req.params.userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน หรือคุณไม่มีสิทธิ์แก้ไขข้อมูลนี้' });
        }
        res.json({ message: 'อัปเดตข้อมูลส่วนตัวสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล', error: error.message });
    }
});

app.delete('/users/:userId', requireSelf, async (req, res) => {
    try {
        const userId = req.params.userId;
        const [users] = await db.query('SELECT user_id FROM users WHERE user_id = ?', [userId]);

        if (users.length === 0)
            return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });

        await db.query('DELETE FROM lesson_completions WHERE student_id = ?', [req.params.userId]);
        await db.query('DELETE FROM enrollments WHERE student_id = ?', [req.params.userId]);
        await db.query('DELETE FROM users WHERE user_id = ?', [req.params.userId]);

        res.json({ message: 'ลบบัญชีผู้ใช้สำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบบัญชี', error: error.message });
    }
});

// ===================== COURSES (Public) =====================

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
        const [rows] = await db.query(
            'SELECT course_id FROM courses WHERE course_id = ? AND teacher_id = ?',
            [req.params.courseId, req.body.teacher_id ?? req.headers['x-user-id']]
        );
        if (rows.length === 0)
            return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขรายวิชานี้' });
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
        const courseId = req.params.courseId;
        const teacherId = req.headers['x-user-id'];

        const [course] = await db.query(
            'SELECT course_id FROM courses WHERE course_id = ? AND teacher_id = ?',
            [courseId, teacherId]
        );

        if (course.length === 0) {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบรายวิชานี้ หรือไม่พบรายวิชา' });
        }

        await db.query('DELETE FROM lesson_completions WHERE course_id = ?', [courseId]);
        await db.query('DELETE FROM enrollments WHERE course_id = ?', [courseId]);
        await db.query('DELETE FROM lessons WHERE course_id = ?', [courseId]);
        await db.query('DELETE FROM courses WHERE course_id = ?', [courseId]);

        res.json({ message: 'ลบรายวิชาสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบรายวิชา', error: error.message });
    }
});

// Tab 1: Lessons
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
        const lessonId = req.params.lessonId;
        const teacherId = req.headers['x-user-id'];

        const { title, description, video_url, document_url, quiz_url } = req.body;

        if (!title) return res.status(400).json({ message: 'กรุณากรอกชื่อบทเรียน' });

        const [ownership] = await db.query(
            `SELECT l.lesson_id 
             FROM lessons l
             JOIN courses c ON l.course_id = c.course_id
             WHERE l.lesson_id = ? AND c.teacher_id = ?`,
            [lessonId, teacherId]
        );

        if (ownership.length === 0) {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขบทเรียนนี้ หรือไม่พบบทเรียน' });
        }

        const [result] = await db.query(
            `UPDATE lessons
             SET title = ?, description = ?, video_url = ?, document_url = ?, quiz_url = ?
             WHERE lesson_id = ?`,
            [title, description || '', video_url || '', document_url || '', quiz_url || '', lessonId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบบทเรียนที่ต้องการอัปเดต' });
        }

        res.json({ message: 'อัปเดตบทเรียนสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตบทเรียน', error: error.message });
    }
});

app.delete('/teacher/lessons/:lessonId', requireRole('teacher'), async (req, res) => {
    try {
        const lessonId = req.params.lessonId;
        const teacherId = req.headers['x-user-id'];

        const [ownership] = await db.query(
            `SELECT l.lesson_id 
             FROM lessons l
             JOIN courses c ON l.course_id = c.course_id
             WHERE l.lesson_id = ? AND c.teacher_id = ?`,
            [lessonId, teacherId]
        );

        if (ownership.length === 0) {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบบทเรียนนี้ หรือไม่พบบทเรียน' });
        }

        await db.query('DELETE FROM lesson_completions WHERE lesson_id = ?', [lessonId]);

        const [result] = await db.query('DELETE FROM lessons WHERE lesson_id = ?', [lessonId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบบทเรียนที่ต้องการลบ' });
        }

        res.json({ message: 'ลบบทเรียนสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบบทเรียน', error: error.message });
    }
});

// Tab 2: Students พร้อมแสดง progress ของแต่ละคน
app.get('/teacher/courses/:courseId/students', requireRole('teacher'), async (req, res) => {
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
                u.user_id, u.firstname, u.lastname, u.email,
                COUNT(lc.lesson_id) AS completed_lessons
             FROM enrollments e
             JOIN users u ON e.student_id = u.user_id
             LEFT JOIN lesson_completions lc
                ON lc.student_id = u.user_id AND lc.course_id = ?
             WHERE e.course_id = ?
             GROUP BY u.user_id`,
            [courseId, courseId]
        );

        const students = studentRows.map((s) => ({
            ...s,
            total_lessons: totalLessons,
            progress_percent: totalLessons > 0
                ? Math.round((s.completed_lessons / totalLessons) * 100)
                : 0,
        }));

        res.json({ course: courseRows[0], students });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลนักเรียน', error: error.message });
    }
});

app.delete('/teacher/courses/:courseId/students/:studentId', requireRole('teacher'), async (req, res) => {
    try {
        const { courseId, studentId } = req.params;
        const teacherId = req.headers['x-user-id'];

        const [course] = await db.query(
            'SELECT course_id FROM courses WHERE course_id = ? AND teacher_id = ?',
            [courseId, teacherId]
        );

        if (course.length === 0) {
            return res.status(403).json({ message: 'ไม่มีสิทธิ์จัดการคอร์สนี้ หรือไม่พบคอร์ส' });
        }

        await db.query(
            'DELETE FROM lesson_completions WHERE course_id = ? AND student_id = ?',
            [courseId, studentId]
        );

        const [result] = await db.query(
            'DELETE FROM enrollments WHERE course_id = ? AND student_id = ?',
            [courseId, studentId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'ไม่พบนักศึกษาในรายวิชานี้' });
        }

        res.json({ message: 'ลบนักศึกษาออกจากรายวิชาสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบนักศึกษา', error: error.message });
    }
});

// ===================== STUDENT =====================

// Dashboard: รายวิชาที่ลงทะเบียน + progress แต่ละวิชา
app.get('/student/enrollments/:studentId', requireRole('student'), async (req, res) => {
    try {
        const { studentId } = req.params;

        const [rows] = await db.query(
            `SELECT
                e.enroll_id, c.course_id, c.title, c.description,
                COUNT(DISTINCT l.lesson_id) AS total_lessons,
                COUNT(DISTINCT lc.lesson_id) AS completed_lessons
             FROM enrollments e
             JOIN courses c ON e.course_id = c.course_id
             LEFT JOIN lessons l ON l.course_id = c.course_id
             LEFT JOIN lesson_completions lc
                ON lc.course_id = c.course_id AND lc.student_id = e.student_id
             WHERE e.student_id = ?
             GROUP BY e.enroll_id`,
            [studentId]
        );

        const enrollments = rows.map((row) => ({
            ...row,
            progress_percent: row.total_lessons > 0
                ? Math.round((row.completed_lessons / row.total_lessons) * 100)
                : 0,
        }));

        res.json(enrollments);
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

        const [course] = await db.query(
            'SELECT course_id FROM courses WHERE course_id = ?',
            [course_id]
        );
        if (course.length === 0)
            return res.status(404).json({ message: 'ไม่พบรายวิชา' });

        const [existing] = await db.query(
            'SELECT enroll_id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [student_id, course_id]
        );
        if (existing.length > 0) return res.status(409).json({ message: 'คุณลงทะเบียนรายวิชานี้ไปแล้ว' });

        await db.query('INSERT INTO enrollments SET ?', [{ student_id, course_id }]);
        res.status(201).json({ message: 'ลงทะเบียนสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงทะเบียน', error: error.message });
    }
});

app.delete('/student/enrollments/:studentId/:courseId', requireRole('student'), async (req, res) => {
    try {
        const { studentId, courseId } = req.params;
        const [check] = await db.query(
            'SELECT enroll_id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [studentId, courseId]
        );
        if (check.length === 0)
            return res.status(404).json({ message: 'ไม่พบรายวิชาที่ลงทะเบียน' });

        await db.query(
            'DELETE FROM lesson_completions WHERE student_id = ? AND course_id = ?',
            [studentId, courseId]
        );
        await db.query(
            'DELETE FROM enrollments WHERE student_id = ? AND course_id = ?',
            [studentId, courseId]
        );
        res.json({ message: 'ถอนรายวิชาสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการถอนรายวิชา', error: error.message });
    }
});

// หน้าเรียน: วิชา + บทเรียนทั้งหมด + สถานะว่าเรียนแล้วหรือยัง + progress รวม
app.get('/student/courses/:courseId/:studentId', requireRole('student'), async (req, res) => {
    try {
        const { courseId, studentId } = req.params;

        const [courseRows] = await db.query(
            'SELECT * FROM courses WHERE course_id = ?',
            [courseId]
        );
        if (courseRows.length === 0) return res.status(404).json({ message: 'ไม่พบรายวิชา' });

        const [lessonRows] = await db.query(
            `SELECT l.*,
                CASE WHEN lc.lesson_id IS NOT NULL THEN true ELSE false END AS is_completed
             FROM lessons l
             LEFT JOIN lesson_completions lc
                ON lc.lesson_id = l.lesson_id AND lc.student_id = ?
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
            progress: { completed_lessons: completedLessons, total_lessons: totalLessons, progress_percent: progressPercent },
        });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา', error: error.message });
    }
});

// ดูเนื้อหาบทเรียน
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

// กด "ตกลง" เพื่อบันทึกว่าเรียนบทเรียนนี้แล้ว — ส่ง progress กลับมาด้วย
app.post('/student/courses/:courseId/lessons/:lessonId/complete', requireRole('student'), async (req, res) => {
    try {
        const { courseId, lessonId } = req.params;
        const { student_id } = req.body;

        if (!student_id) return res.status(400).json({ message: 'กรุณาระบุ student_id' });

        const [enrolled] = await db.query(
            'SELECT enroll_id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [student_id, courseId]
        );
        if (enrolled.length === 0)
            return res.status(403).json({ message: 'คุณยังไม่ได้ลงทะเบียนรายวิชานี้' });

        const [alreadyDone] = await db.query(
            'SELECT id FROM lesson_completions WHERE student_id = ? AND lesson_id = ? AND course_id = ?',
            [student_id, lessonId, courseId]
        );
        if (alreadyDone.length > 0) {
            return res.status(409).json({ message: 'บันทึกไว้แล้ว' });
        }

        await db.query('INSERT INTO lesson_completions SET ?', [{
            student_id,
            lesson_id: lessonId,
            course_id: courseId,
            completed_at: new Date(),
        }]);

        const [[{ total_lessons }]] = await db.query(
            'SELECT COUNT(*) AS total_lessons FROM lessons WHERE course_id = ?',
            [courseId]
        );
        const [[{ completed_lessons }]] = await db.query(
            'SELECT COUNT(*) AS completed_lessons FROM lesson_completions WHERE student_id = ? AND course_id = ?',
            [student_id, courseId]
        );
        const progressPercent = total_lessons > 0
            ? Math.round((completed_lessons / total_lessons) * 100)
            : 0;

        res.status(201).json({
            message: 'บันทึกการเรียนสำเร็จ',
            progress: { completed_lessons, total_lessons, progress_percent: progressPercent },
        });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกการเรียน', error: error.message });
    }
});

// ===================== START =====================

connectDB()
    .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
    .catch(err => { console.error('DB connection failed:', err); process.exit(1); });