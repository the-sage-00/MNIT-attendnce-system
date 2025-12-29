import express from 'express';
import {
    markAttendance,
    getMyAttendance,
    getAttendanceBySession
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/mark', authorize('student'), markAttendance);
router.get('/history', authorize('student'), getMyAttendance);

router.get('/session/:sessionId', authorize('professor', 'admin'), getAttendanceBySession);

export default router;
