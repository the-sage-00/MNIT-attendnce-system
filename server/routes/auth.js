import express from 'express';
import {
    studentGoogleLogin,
    professorGoogleLogin,
    getMe,
    adminLogin,
    updateBatch,
    deleteAccount
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Student Google Login (MNIT emails only)
router.post('/google/student', studentGoogleLogin);

// Professor Google Login (Any email)
router.post('/google/professor', professorGoogleLogin);

// Admin Email/Password Login
router.post('/admin/login', adminLogin);

// Get current user
router.get('/me', protect, getMe);

// Update student batch
router.put('/batch', protect, updateBatch);

// Delete own account
router.delete('/delete-account', protect, deleteAccount);

export default router;

