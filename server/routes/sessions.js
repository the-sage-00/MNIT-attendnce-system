import express from 'express';
import {
    createSession,
    getSession,
    getSessionQR,
    stopSession,
    getStudentSessionInfo
} from '../controllers/sessionController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Student Route
router.get('/:id/info', authorize('student'), getStudentSessionInfo);

// Professor Routes
router.post('/', authorize('professor', 'admin'), createSession);
router.get('/:id', authorize('professor', 'admin'), getSession);
router.get('/:id/qr', authorize('professor', 'admin'), getSessionQR);
router.put('/:id/stop', authorize('professor', 'admin'), stopSession);

export default router;
