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

// Debug endpoint to check student's attendance records
import { Attendance, Session } from '../models/index.js';

router.get('/debug/student-attendance/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        // Get all attendance records for this student
        const records = await Attendance.find({ student: studentId })
            .populate({
                path: 'session',
                select: 'startTime isActive course',
                populate: { path: 'course', select: 'courseName courseCode' }
            })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({
            success: true,
            count: records.length,
            records: records.map(r => ({
                id: r._id,
                sessionId: r.session?._id,
                courseName: r.session?.course?.courseName,
                courseCode: r.session?.course?.courseCode,
                sessionActive: r.session?.isActive,
                sessionStartTime: r.session?.startTime,
                attendanceMarkedAt: r.createdAt,
                status: r.status
            }))
        });
    } catch (error) {
        console.error('Debug Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

// Debug endpoint to clear stale attendance for a student (for specific session)
router.delete('/debug/clear-attendance/:studentId/:sessionId', async (req, res) => {
    try {
        const { studentId, sessionId } = req.params;

        const result = await Attendance.deleteOne({
            student: studentId,
            session: sessionId
        });

        // Also clear from Redis
        await redisService.clearAttendanceMark(sessionId, studentId);

        res.json({
            success: true,
            message: `Deleted ${result.deletedCount} attendance record`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Clear Attendance Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});

export default router;

