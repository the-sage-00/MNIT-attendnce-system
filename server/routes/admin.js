import express from 'express';
import {
    getPendingProfessors,
    approveProfessor,
    getSystemAnalytics,
    bulkApproveStudents
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

// Analytics
router.get('/analytics', getSystemAnalytics);

// Professor management
router.get('/pending-professors', getPendingProfessors);
router.put('/approve-professor/:id', approveProfessor);

// Bulk operations
router.post('/bulk-approve', bulkApproveStudents);

export default router;
