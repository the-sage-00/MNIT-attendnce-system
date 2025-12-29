import express from 'express';
import { getPendingProfessors, approveProfessor } from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router.get('/pending-professors', getPendingProfessors);
router.put('/approve-professor/:id', approveProfessor);

export default router;
