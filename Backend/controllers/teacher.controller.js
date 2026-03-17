const { getDB } = require('../config/db');

// ── COURSES ───────────────────────────────────────────────────────────────────

// GET /teacher/courses/:teacherId
const getCourses = async (req, res) => {
    try {
        const db = getDB();
        const [rows] = await db.query(
            'SELECT * FROM courses WHERE teacher_id = ?',
            [req.params.teacherId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงรายวิชา', error: error.message });
    }
};

// POST /teacher/courses
const createCourse = async (req, res) => {
    try {
        const db = getDB();
        const { teacher_id, title, description } = req.body;

        if (!teacher_id || !title)
            return res.status(400).json({ message: 'กรุณากรอกชื่อคอร์สและระบุอาจารย์ผู้สอน' });

        const [result] = await db.query(
            'INSERT INTO courses SET ?',
            [{ teacher_id, title, description: description || '' }]
        );
        res.status(201).json({ message: 'สร้างรายวิชาสำเร็จ', courseId: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างรายวิชา', error: error.message });
    }
};

// PUT /teacher/courses/:courseId
const updateCourse = async (req, res) => {
    try {
        const db = getDB();
        const { title, description } = req.body;

        if (!title) return res.status(400).json({ message: 'กรุณากรอกชื่อคอร์ส' });

        const [rows] = await db.query(
            'SELECT course_id FROM courses WHERE course_id = ? AND teacher_id = ?',
            [req.params.courseId, req.body.teacher_id ?? req.headers['x-user-id']]
        );
        if (rows.length === 0)
            return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขรายวิชานี้' });

        const [result] = await db.query(
            'UPDATE courses SET title = ?, description = ? WHERE course_id = ?',
            [title, description || '', req.params.courseId]
        );
        if (result.affectedRows === 0)
            return res.status(404).json({ message: 'ไม่พบรายวิชา' });

        res.json({ message: 'อัปเดตรายวิชาสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตรายวิชา', error: error.message });
    }
};

// DELETE /teacher/courses/:courseId
const deleteCourse = async (req, res) => {
    try {
        const db = getDB();
        const { courseId } = req.params;
        const teacherId = req.headers['x-user-id'];

        const [course] = await db.query(
            'SELECT course_id FROM courses WHERE course_id = ? AND teacher_id = ?',
            [courseId, teacherId]
        );
        if (course.length === 0)
            return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบรายวิชานี้ หรือไม่พบรายวิชา' });

        await db.query('DELETE FROM lesson_completions WHERE course_id = ?', [courseId]);
        await db.query('DELETE FROM enrollments WHERE course_id = ?', [courseId]);
        await db.query('DELETE FROM lessons WHERE course_id = ?', [courseId]);
        await db.query('DELETE FROM courses WHERE course_id = ?', [courseId]);

        res.json({ message: 'ลบรายวิชาสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบรายวิชา', error: error.message });
    }
};

// ── LESSONS ───────────────────────────────────────────────────────────────────

// GET /teacher/courses/:courseId/lessons
const getLessons = async (req, res) => {
    try {
        const db = getDB();
        const [rows] = await db.query(
            'SELECT * FROM lessons WHERE course_id = ?',
            [req.params.courseId]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงบทเรียน', error: error.message });
    }
};

// POST /teacher/courses/:courseId/lessons
const createLesson = async (req, res) => {
    try {
        const db = getDB();
        const { title, description, video_url, document_url, quiz_url } = req.body;

        if (!title) return res.status(400).json({ message: 'กรุณากรอกชื่อบทเรียน' });

        const [result] = await db.query('INSERT INTO lessons SET ?', [{
            course_id:    req.params.courseId,
            title,
            description:  description  || '',
            video_url:    video_url    || '',
            document_url: document_url || '',
            quiz_url:     quiz_url     || '',
        }]);
        res.status(201).json({ message: 'สร้างบทเรียนสำเร็จ', lessonId: result.insertId });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการสร้างบทเรียน', error: error.message });
    }
};

// PUT /teacher/lessons/:lessonId
const updateLesson = async (req, res) => {
    try {
        const db = getDB();
        const { lessonId } = req.params;
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
        if (ownership.length === 0)
            return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขบทเรียนนี้ หรือไม่พบบทเรียน' });

        const [result] = await db.query(
            `UPDATE lessons
             SET title = ?, description = ?, video_url = ?, document_url = ?, quiz_url = ?
             WHERE lesson_id = ?`,
            [title, description || '', video_url || '', document_url || '', quiz_url || '', lessonId]
        );
        if (result.affectedRows === 0)
            return res.status(404).json({ message: 'ไม่พบบทเรียนที่ต้องการอัปเดต' });

        res.json({ message: 'อัปเดตบทเรียนสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการอัปเดตบทเรียน', error: error.message });
    }
};

// DELETE /teacher/lessons/:lessonId
const deleteLesson = async (req, res) => {
    try {
        const db = getDB();
        const { lessonId } = req.params;
        const teacherId = req.headers['x-user-id'];

        const [ownership] = await db.query(
            `SELECT l.lesson_id
             FROM lessons l
             JOIN courses c ON l.course_id = c.course_id
             WHERE l.lesson_id = ? AND c.teacher_id = ?`,
            [lessonId, teacherId]
        );
        if (ownership.length === 0)
            return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบบทเรียนนี้ หรือไม่พบบทเรียน' });

        await db.query('DELETE FROM lesson_completions WHERE lesson_id = ?', [lessonId]);
        const [result] = await db.query('DELETE FROM lessons WHERE lesson_id = ?', [lessonId]);

        if (result.affectedRows === 0)
            return res.status(404).json({ message: 'ไม่พบบทเรียนที่ต้องการลบ' });

        res.json({ message: 'ลบบทเรียนสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบบทเรียน', error: error.message });
    }
};

// ── STUDENTS ──────────────────────────────────────────────────────────────────

// GET /teacher/courses/:courseId/students
const getStudents = async (req, res) => {
    try {
        const db = getDB();
        const { courseId } = req.params;

        const [courseRows] = await db.query('SELECT * FROM courses WHERE course_id = ?', [courseId]);
        if (courseRows.length === 0)
            return res.status(404).json({ message: 'ไม่พบรายวิชา' });

        const [[{ total: totalLessons }]] = await db.query(
            'SELECT COUNT(*) AS total FROM lessons WHERE course_id = ?',
            [courseId]
        );

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
            total_lessons:    totalLessons,
            progress_percent: totalLessons > 0
                ? Math.round((s.completed_lessons / totalLessons) * 100)
                : 0,
        }));

        res.json({ course: courseRows[0], students });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลนักเรียน', error: error.message });
    }
};

// DELETE /teacher/courses/:courseId/students/:studentId
const removeStudent = async (req, res) => {
    try {
        const db = getDB();
        const { courseId, studentId } = req.params;
        const teacherId = req.headers['x-user-id'];

        const [course] = await db.query(
            'SELECT course_id FROM courses WHERE course_id = ? AND teacher_id = ?',
            [courseId, teacherId]
        );
        if (course.length === 0)
            return res.status(403).json({ message: 'ไม่มีสิทธิ์จัดการคอร์สนี้ หรือไม่พบคอร์ส' });

        await db.query(
            'DELETE FROM lesson_completions WHERE course_id = ? AND student_id = ?',
            [courseId, studentId]
        );
        const [result] = await db.query(
            'DELETE FROM enrollments WHERE course_id = ? AND student_id = ?',
            [courseId, studentId]
        );

        if (result.affectedRows === 0)
            return res.status(404).json({ message: 'ไม่พบนักศึกษาในรายวิชานี้' });

        res.json({ message: 'ลบนักศึกษาออกจากรายวิชาสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลบนักศึกษา', error: error.message });
    }
};

module.exports = {
    getCourses, createCourse, updateCourse, deleteCourse,
    getLessons, createLesson, updateLesson, deleteLesson,
    getStudents, removeStudent,
};
