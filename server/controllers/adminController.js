import { User, Course, Session, Attendance, AuditLog } from '../models/index.js';

export const getPendingProfessors = async (req, res) => {
    try {
        const pending = await User.find({ role: 'pending_professor' });
        res.json({ success: true, count: pending.length, data: pending });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const approveProfessor = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'approve' or 'reject'

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.role !== 'pending_professor') {
            return res.status(400).json({ success: false, error: 'User is not a pending professor' });
        }

        if (action === 'approve') {
            user.role = 'professor';
            await user.save();
            res.json({ success: true, message: 'Professor approved', data: user });
        } else if (action === 'reject') {
            await user.deleteOne();
            res.json({ success: true, message: 'Request rejected and user removed' });
        } else {
            res.status(400).json({ success: false, error: 'Invalid action' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @route   GET /api/admin/analytics
 * @desc    Get system-wide analytics for admin dashboard
 * @access  Private (Admin)
 */
export const getSystemAnalytics = async (req, res) => {
    try {
        // Get current date info
        const now = new Date();
        const today = new Date(now.setHours(0, 0, 0, 0));
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // User stats
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalProfessors = await User.countDocuments({ role: 'professor' });
        const pendingProfessors = await User.countDocuments({ role: 'pending_professor' });
        const pendingStudents = await User.countDocuments({ role: 'pending_student' });

        // New students this month
        const newStudentsThisMonth = await User.countDocuments({
            role: 'student',
            createdAt: { $gte: thisMonth }
        });

        // Course stats
        const totalCourses = await Course.countDocuments({ isArchived: false });

        // Session stats
        const totalSessions = await Session.countDocuments();
        const activeSessions = await Session.countDocuments({ isActive: true });
        const sessionsToday = await Session.countDocuments({
            startTime: { $gte: today }
        });
        const sessionsThisWeek = await Session.countDocuments({
            startTime: { $gte: thisWeek }
        });

        // Attendance stats
        const totalAttendance = await Attendance.countDocuments();
        const attendanceToday = await Attendance.countDocuments({
            timestamp: { $gte: today }
        });
        const attendanceThisWeek = await Attendance.countDocuments({
            timestamp: { $gte: thisWeek }
        });

        // Attendance breakdown
        const presentCount = await Attendance.countDocuments({ status: 'PRESENT' });
        const lateCount = await Attendance.countDocuments({ status: 'LATE' });
        const suspiciousCount = await Attendance.countDocuments({
            $or: [
                { status: 'SUSPICIOUS' },
                { suspicionScore: { $gte: 20 } }
            ]
        });

        // Recent suspicious activity
        const recentSuspicious = await Attendance.find({
            $or: [
                { status: 'SUSPICIOUS' },
                { suspicionScore: { $gte: 20 } }
            ]
        })
            .select('studentName rollNo status suspicionScore securityFlags timestamp')
            .sort({ timestamp: -1 })
            .limit(10);

        // Sessions by day (last 7 days)
        const sessionsByDay = await Session.aggregate([
            {
                $match: {
                    startTime: { $gte: thisWeek }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$startTime' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Attendance by day (last 7 days)
        const attendanceByDay = await Attendance.aggregate([
            {
                $match: {
                    timestamp: { $gte: thisWeek }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Top courses by session count
        const topCourses = await Session.aggregate([
            {
                $group: {
                    _id: '$course',
                    sessionCount: { $sum: 1 }
                }
            },
            { $sort: { sessionCount: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'courses',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'course'
                }
            },
            { $unwind: '$course' }
        ]);

        res.json({
            success: true,
            data: {
                users: {
                    totalStudents,
                    totalProfessors,
                    pendingProfessors,
                    pendingStudents,
                    newStudentsThisMonth
                },
                courses: {
                    total: totalCourses
                },
                sessions: {
                    total: totalSessions,
                    active: activeSessions,
                    today: sessionsToday,
                    thisWeek: sessionsThisWeek
                },
                attendance: {
                    total: totalAttendance,
                    today: attendanceToday,
                    thisWeek: attendanceThisWeek,
                    present: presentCount,
                    late: lateCount,
                    suspicious: suspiciousCount,
                    averageRate: totalAttendance > 0
                        ? Math.round((presentCount + lateCount) / totalAttendance * 100)
                        : 0
                },
                charts: {
                    sessionsByDay,
                    attendanceByDay
                },
                topCourses: topCourses.map(tc => ({
                    courseCode: tc.course.courseCode,
                    courseName: tc.course.courseName,
                    sessionCount: tc.sessionCount
                })),
                recentSuspicious
            }
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @route   POST /api/admin/bulk-approve
 * @desc    Bulk approve pending students
 * @access  Private (Admin)
 */
export const bulkApproveStudents = async (req, res) => {
    try {
        const { studentIds, action = 'approve' } = req.body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Student IDs array is required'
            });
        }

        if (action === 'approve') {
            const result = await User.updateMany(
                { _id: { $in: studentIds }, role: 'pending_student' },
                { role: 'student' }
            );

            res.json({
                success: true,
                message: `${result.modifiedCount} students approved`,
                modifiedCount: result.modifiedCount
            });
        } else if (action === 'reject') {
            const result = await User.deleteMany({
                _id: { $in: studentIds },
                role: 'pending_student'
            });

            res.json({
                success: true,
                message: `${result.deletedCount} students rejected`,
                deletedCount: result.deletedCount
            });
        } else {
            res.status(400).json({ success: false, error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Bulk Approve Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export default {
    getPendingProfessors,
    approveProfessor,
    getSystemAnalytics,
    bulkApproveStudents
};
