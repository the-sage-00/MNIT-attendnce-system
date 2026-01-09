import express from 'express';
import {
    // Professor management
    getPendingProfessors,
    approveProfessor,
    getAllStudents,
    getAllProfessors,
    // Course management
    createCourse,
    bulkImportCourses,
    getAllCourses,
    updateCourse,
    deleteCourse,
    // Timetable management
    createTimetable,
    getTimetable,
    updateTimetable,
    // Claim requests
    getClaimRequests,
    processClaimRequest,
    // Elective requests
    getElectiveRequests,
    processElectiveRequest,
    // Pending users
    getPendingUsers,
    processPendingUser,
    // Analytics
    getSystemAnalytics,
    bulkApproveStudents,
    // User management
    deleteUser
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

// ============================================
// ANALYTICS
// ============================================
router.get('/analytics', getSystemAnalytics);

// ============================================
// USER LISTS
// ============================================
router.get('/students', getAllStudents);
router.get('/professors', getAllProfessors);

// ============================================
// USER MANAGEMENT (DELETE)
// ============================================
router.delete('/users/:id', deleteUser);

// ============================================
// PROFESSOR MANAGEMENT
// ============================================
router.get('/pending-professors', getPendingProfessors);
router.put('/approve-professor/:id', approveProfessor);

// ============================================
// COURSE MANAGEMENT (NEW - Admin creates courses)
// ============================================
router.post('/courses', createCourse);
router.post('/courses/bulk', bulkImportCourses);
router.get('/courses', getAllCourses);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

// ============================================
// TIMETABLE MANAGEMENT (NEW)
// ============================================
router.post('/timetable', createTimetable);
router.get('/timetable/:branch/:year', getTimetable);
router.put('/timetable/:id', updateTimetable);

// ============================================
// CLAIM REQUEST APPROVAL (NEW)
// ============================================
router.get('/claim-requests', getClaimRequests);
router.put('/claim-requests/:id', processClaimRequest);

// ============================================
// ELECTIVE REQUEST APPROVAL (NEW)
// ============================================
router.get('/elective-requests', getElectiveRequests);
router.put('/elective-requests/:id', processElectiveRequest);

// ============================================
// PENDING USERS (Non-standard emails)
// ============================================
router.get('/pending-users', getPendingUsers);
router.put('/pending-users/:id', processPendingUser);

// ============================================
// BULK OPERATIONS
// ============================================
router.post('/bulk-approve', bulkApproveStudents);

// ============================================
// REDIS CACHE MANAGEMENT (for fixing stale entries)
// ============================================
import { redisService } from '../config/redis.js';

router.post('/flush-redis-attendance', async (req, res) => {
    try {
        const result = await redisService.flushAllAttendanceMarks();
        if (result.success) {
            res.json({
                success: true,
                message: `Flushed ${result.deleted} attendance marks from Redis cache`
            });
        } else {
            res.status(500).json({
                success: false,
                error: result.error || 'Failed to flush Redis'
            });
        }
    } catch (error) {
        console.error('Flush Redis Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

export default router;
