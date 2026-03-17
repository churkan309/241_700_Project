const { getDB } = require('../config/db');

// ── ENROLLMENTS ───────────────────────────────────────────────────────────────

// GET /student/enrollments/:studentId
const getEnrollments = async (req, res) => {
    try {
        const db = getDB();
        const { studentId } = req.params;

        const [rows] = await db.query(
            `SELECT
                e.enroll_id, c.course_id, c.title, c.description,
                COUNT(DISTINCT l.lesson_id)  AS total_lessons,
                COUNT(DISTINCT lc.lesson_id) AS completed_lessons
             FROM enrollments e
             JOIN courses c ON e.course_id = c.course_id
             LEFT JOIN lessons l  ON l.course_id = c.course_id
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
};

// POST /student/enroll
const enroll = async (req, res) => {
    try {
        const db = getDB();
        const { student_id, course_id } = req.body;

        if (!student_id || !course_id)
            return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });

        const [course] = await db.query('SELECT course_id FROM courses WHERE course_id = ?', [course_id]);
        if (course.length === 0)
            return res.status(404).json({ message: 'ไม่พบรายวิชา' });

        const [existing] = await db.query(
            'SELECT enroll_id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [student_id, course_id]
        );
        if (existing.length > 0)
            return res.status(409).json({ message: 'คุณลงทะเบียนรายวิชานี้ไปแล้ว' });

        await db.query('INSERT INTO enrollments SET ?', [{ student_id, course_id }]);
        res.status(201).json({ message: 'ลงทะเบียนสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการลงทะเบียน', error: error.message });
    }
};

// DELETE /student/enrollments/:studentId/:courseId
const unenroll = async (req, res) => {
    try {
        const db = getDB();
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
};

// ── LESSONS ───────────────────────────────────────────────────────────────────

// GET /student/courses/:courseId/:studentId
const getCourseWithLessons = async (req, res) => {
    try {
        const db = getDB();
        const { courseId, studentId } = req.params;

        const [courseRows] = await db.query('SELECT * FROM courses WHERE course_id = ?', [courseId]);
        if (courseRows.length === 0)
            return res.status(404).json({ message: 'ไม่พบรายวิชา' });

        const [lessonRows] = await db.query(
            `SELECT l.*,
                CASE WHEN lc.lesson_id IS NOT NULL THEN true ELSE false END AS is_completed
             FROM lessons l
             LEFT JOIN lesson_completions lc
                ON lc.lesson_id = l.lesson_id AND lc.student_id = ?
             WHERE l.course_id = ?`,
            [studentId, courseId]
        );

        const totalLessons     = lessonRows.length;
        const completedLessons = lessonRows.filter((l) => l.is_completed).length;
        const progressPercent  = totalLessons > 0
            ? Math.round((completedLessons / totalLessons) * 100)
            : 0;

        res.json({
            course:   courseRows[0],
            lessons:  lessonRows,
            progress: { completed_lessons: completedLessons, total_lessons: totalLessons, progress_percent: progressPercent },
        });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายวิชา', error: error.message });
    }
};

// GET /student/courses/:courseId/lessons/:lessonId
const getLesson = async (req, res) => {
    try {
        const db = getDB();
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
};

// POST /student/courses/:courseId/lessons/:lessonId/complete
const completeLesson = async (req, res) => {
    try {
        const db = getDB();
        const { courseId, lessonId } = req.params;
        const { student_id } = req.body;

        if (!student_id)
            return res.status(400).json({ message: 'กรุณาระบุ student_id' });

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
        if (alreadyDone.length > 0)
            return res.status(409).json({ message: 'บันทึกไว้แล้ว' });

        await db.query('INSERT INTO lesson_completions SET ?', [{
            student_id,
            lesson_id:    lessonId,
            course_id:    courseId,
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
            message:  'บันทึกการเรียนสำเร็จ',
            progress: { completed_lessons, total_lessons, progress_percent: progressPercent },
        });
    } catch (error) {
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกการเรียน', error: error.message });
    }
};

module.exports = {
    getEnrollments, enroll, unenroll,
    getCourseWithLessons, getLesson, completeLesson,
};
