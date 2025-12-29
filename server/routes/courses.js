import express from 'express';
import {
    createCourse,
    getCourses,
    getCourse,
    updateCourse,
    deleteCourse,
    getStudentCourses
} from '../controllers/courseController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Student Route
router.get('/my-courses', authorize('student'), getStudentCourses);

// Professor Routes
router.route('/')
    .get(authorize('professor', 'admin'), getCourses)
    .post(authorize('professor', 'admin'), createCourse);

router.route('/:id')
    .get(authorize('professor', 'admin'), getCourse)
    .put(authorize('professor', 'admin'), updateCourse)
    .delete(authorize('professor', 'admin'), deleteCourse);

export default router;
