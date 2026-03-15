const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(bodyParser.json());

const port = 8000;
let conn = null;

const initMySQL = async () => {
    conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'Project',
        port: 8700
    });
    console.log('Connected to MySQL database');
}

// REGISTER
app.post('/register', async (req, res) => {
    try {
        let userData = req.body;
        if (!userData.firstname || !userData.lastname || !userData.password || !userData.role) {
            throw { statusCode: 400, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
        }
        const results = await conn.query('INSERT INTO users SET ?', userData);
        res.json({ message: 'User registered successfully' });
    } catch (error) {
        let statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: 'Error registering user', error: error.message });
    }
});

// LOGIN
app.post('/login', async (req, res) => {
    try {
        let { firstname, password } = req.body;
        if (!firstname || !password) {
            throw { statusCode: 400, message: 'กรุณากรอกชื่อและรหัสผ่านให้ครบถ้วน' };
        }
        const results = await conn.query('SELECT * FROM users WHERE firstname = ? AND password = ?', [firstname, password]);
        if (results[0].length === 0) {
            throw { statusCode: 404, message: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' };
        }
        res.json({ message: 'Login successful', data: results[0][0] });
    } catch (error) {
        let statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: 'Error during login', error: error.message });
    }
});

//EDIT USER
app.get('/users/:id', async (req, res) => {
    try {
        const results = await conn.query('SELECT firstname, lastname, password FROM users WHERE user_id = ?', [req.params.id]);
        if (results[0].length === 0) {
            throw { statusCode: 404, message: 'User not found' };
        }
        res.json(results[0][0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user data', error: error.message });
    }
});

app.put('/users/:id', async (req, res) => {
    try {
        let userId = req.params.id;
        let { firstname, lastname, password } = req.body;

        if (!firstname || !lastname || !password) {
            throw { statusCode: 400, message: 'กรุณากรอกข้อมูลให้ครบถ้วน' };
        }

        await conn.query('UPDATE users SET firstname = ?, lastname = ?, password = ? WHERE user_id = ?', [firstname, lastname, password, userId]);
        res.json({ message: 'อัปเดตข้อมูลส่วนตัวสำเร็จ' });
    } catch (error) {
        let statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: 'Error updating user profile', error: error.message });
    }
});

app.delete('/users/:id', async (req, res) => {
    try {
        let userId = req.params.id;
        await conn.query('DELETE FROM users WHERE user_id = ?', [userId]);
        res.json({ message: 'ลบบัญชีผู้ใช้สำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user account', error: error.message });
    }
});

// COURSE
app.get('/teacher/courses/:teacherId', async (req, res) => {
    try {
        const results = await conn.query(
            'SELECT * FROM courses WHERE user_id = ?',
            [req.params.teacherId]   // ต้องใส่ []
        );

        res.json(results[0]);
    } catch (error) {
        res.status(500).json({
            message: 'Error fetching teacher courses',
            error: error.message
        });
    }
});


// CREATE COURSE
app.post('/courses/create', async (req, res) => {
    try {
        let courseData = req.body;
        if (!courseData.title || !courseData.user_id) {
            throw { statusCode: 400, message: 'กรุณากรอกชื่อคอร์สและระบุอาจารย์ผู้สอน' };
        }
        const results = await conn.query('INSERT INTO courses SET ?', [courseData]);
        res.json({ message: 'Course created successfully', courseId: results[0].insertId });
    } catch (error) {
        let statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: 'Error creating course', error: error.message });
    }
});

app.put('/courses/:id', async (req, res) => {
    try {
        let courseId = req.params.id;
        let { title } = req.body;

        if (!title) {
            throw { statusCode: 400, message: 'กรุณากรอกชื่อคอร์ส' };
        }

        await conn.query('UPDATE courses SET title = ? WHERE course_id = ?', [title, courseId]);
        res.json({ message: 'อัปเดตชื่อคอร์สสำเร็จ' });
    } catch (error) {
        let statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: 'Error updating course', error: error.message });
    }
});

//DELETE student
app.delete('/enrollments/:courseId/:userId', async (req, res) => {
    try {
        let { courseId, userId } = req.params;
        await conn.query('DELETE FROM enrollments WHERE course_id = ? AND user_id = ?', [courseId, userId]);
        res.json({ message: 'ลบนักศึกษาออกจากคอร์สสำเร็จ' });
    } catch (error) {
        let statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: 'Error removing student', error: error.message });
    }
});

// COURSE & STUDENT for teacher
app.get('/course/details/:courseId', async (req, res) => {
    try {
        let courseId = req.params.courseId;
        const courseRes = await conn.query('SELECT * FROM courses WHERE course_id = ?', [courseId]);
        if (courseRes[0].length === 0) throw { statusCode: 404, message: 'Course not found' };

        const studentsRes = await conn.query(
            'SELECT e.*, u.firstname, u.lastname FROM enrollments e JOIN users u ON e.user_id = u.user_id WHERE e.course_id = ?',
            courseId
        );

        res.json({
            course: courseRes[0][0],
            enrolled_students: studentsRes[0]
        });
    } catch (error) {
        let statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: 'Error fetching course details', error: error.message });
    }
});

//DELETE course
app.delete('/courses/:id', async (req, res) => {
    try {
        let courseId = req.params.id;
        // ลบข้อมูลนักศึกษาที่ลงทะเบียนวิชานี้ออก
        await conn.query('DELETE FROM enrollments WHERE course_id = ?', [courseId]);
        // ลบตัวคอร์สเรียนทิ้ง
        await conn.query('DELETE FROM courses WHERE course_id = ?', [courseId]);

        res.json({ message: 'ลบคอร์สเรียนสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting course', error: error.message });
    }
});

// COURSE for student
app.get('/courses', async (req, res) => {
    try {
        const results = await conn.query('SELECT * FROM courses');
        res.json(results[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching all courses', error: error.message });
    }
});

// ENROLLED COURSE
app.get('/student/enrollments/:userId', async (req, res) => {
    try {
        const query = 'SELECT e.*, c.title FROM enrollments e JOIN courses c ON e.course_id = c.course_id WHERE e.user_id = ?';

        const results = await conn.query(query, [req.params.userId]);
        res.json(results[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching enrollments', error: error.message });
    }
});

// ENROLL
app.post('/enroll', async (req, res) => {
    try {
        let { user_id, course_id } = req.body;
        if (!user_id || !course_id) {
            throw { statusCode: 400, message: 'ข้อมูลไม่ครบถ้วน' };
        }

        const checkExist = await conn.query('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [user_id, course_id]);
        if (checkExist[0].length > 0) {
            throw { statusCode: 409, message: 'คุณลงทะเบียนคอร์สนี้ไปแล้ว' };
        }

        const enrollData = {
            user_id,
            course_id,
            attendance_score: 0,
            assignment_score: 0,
            quiz_score: 0,
            midterm_score: 0,
            final_score: 0,
            teacher_comment: ''
        };

        await conn.query('INSERT INTO enrollments SET ?', [enrollData]);
        res.json({ message: 'Enrollment successful' });
    } catch (error) {
        let statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: 'Error during enrollment', error: error.message });
    }
});

//DROP
app.delete('/student/enrollments/:user_id/:course_id', async (req, res) => {
    try {
        let userId = req.params.user_id;
        let courseId = req.params.course_id;

        await conn.query('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, courseId]);
        res.json({ message: 'ยกเลิกการลงทะเบียนสำเร็จ' });
    } catch (error) {
        res.status(500).json({ message: 'Error dropping course', error: error.message });
    }
});

// SCORE
app.post('/score/update', async (req, res) => {
    try {
        let { user_id, course_id, attendance_score, assignment_score, quiz_score, midterm_score, final_score, teacher_comment } = req.body;

        if (!user_id || !course_id) {
            throw { statusCode: 400, message: 'ข้อมูลไม่ครบถ้วน (ต้องระบุนักศึกษาและคอร์ส)' };
        }

        const query = `
            UPDATE enrollments 
            SET attendance_score = ?, assignment_score = ?, quiz_score = ?, midterm_score = ?, final_score = ?, teacher_comment = ? 
            WHERE user_id = ? AND course_id = ?
        `;

        const results = await conn.query(query, [
            attendance_score || 0,
            assignment_score || 0,
            quiz_score || 0,
            midterm_score || 0,
            final_score || 0,
            teacher_comment || '',
            user_id,
            course_id
        ]);

        if (results[0].affectedRows === 0) {
            throw { statusCode: 404, message: 'ไม่พบประวัติการลงทะเบียนของนักศึกษารายนี้' };
        }

        res.json({ message: 'Score updated successfully' });
    } catch (error) {
        let statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: 'Error updating score', error: error.message });
    }
});

// Stat
app.get('/course/stats/:courseId', async (req, res) => {
    try {
        const query = `
            SELECT 
                MAX(attendance_score + assignment_score + quiz_score + midterm_score + final_score) AS max_score,
                MIN(attendance_score + assignment_score + quiz_score + midterm_score + final_score) AS min_score,
                AVG(attendance_score + assignment_score + quiz_score + midterm_score + final_score) AS avg_score
            FROM enrollments 
            WHERE course_id = ?
        `;
        const results = await conn.query(query, req.params.courseId);
        res.json(results[0][0]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching course stats', error: error.message });
    }
});

app.listen(port, async () => {
    await initMySQL();
    console.log(`Server is running on http://localhost:${port}`);
});