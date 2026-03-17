const router = require('express').Router();
const { requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/teacher.controller');

const teacher = requireRole('teacher');

// Courses
router.get   ('/courses/:teacherId',          teacher, ctrl.getCourses);
router.post  ('/courses',                     teacher, ctrl.createCourse);
router.put   ('/courses/:courseId',           teacher, ctrl.updateCourse);
router.delete('/courses/:courseId',           teacher, ctrl.deleteCourse);

// Lessons
router.get   ('/courses/:courseId/lessons',   teacher, ctrl.getLessons);
router.post  ('/courses/:courseId/lessons',   teacher, ctrl.createLesson);
router.put   ('/lessons/:lessonId',           teacher, ctrl.updateLesson);
router.delete('/lessons/:lessonId',           teacher, ctrl.deleteLesson);

// Students
router.get   ('/courses/:courseId/students',                  teacher, ctrl.getStudents);
router.delete('/courses/:courseId/students/:studentId',       teacher, ctrl.removeStudent);

module.exports = router;
