const router = require('express').Router();
const { requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/student.controller');

const student = requireRole('student');

// Enrollments
router.get   ('/enrollments/:studentId',          student, ctrl.getEnrollments);
router.post  ('/enroll',                          student, ctrl.enroll);
router.delete('/enrollments/:studentId/:courseId',student, ctrl.unenroll);

// Lessons
router.get   ('/courses/:courseId/:studentId',                  student, ctrl.getCourseWithLessons);
router.get   ('/courses/:courseId/lessons/:lessonId',           student, ctrl.getLesson);
router.post  ('/courses/:courseId/lessons/:lessonId/complete',  student, ctrl.completeLesson);

module.exports = router;
