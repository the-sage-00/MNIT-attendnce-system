import { User, Course, Session, Attendance, AuditLog, Timetable, ClaimRequest, ElectiveRequest } from '../models/index.js';

// ============================================
// PROFESSOR MANAGEMENT (EXISTING)
// ============================================

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

// ============================================
// COURSE MANAGEMENT (NEW - ADMIN ONLY)
// ============================================

/**
 * @route   POST /api/admin/courses
 * @desc    Create a new course (Admin only)
 * @access  Private (Admin)
 */
export const createCourse = async (req, res) => {
    try {
        const {
            courseCode,
            courseName,
            description,
            branch,
            year,
            semester,
            schedule,
            defaultLocation,
            defaultDuration,
            lateThreshold
        } = req.body;

        // Validate required fields
        if (!courseCode || !courseName || !branch || !year || !semester || !schedule) {
            return res.status(400).json({
                success: false,
                error: 'Please provide courseCode, courseName, branch, year, semester, and schedule'
            });
        }

        // Check if course already exists for this branch/year
        const existingCourse = await Course.findOne({
            courseCode: courseCode.toUpperCase(),
            branch: branch.toLowerCase(),
            year
        });

        if (existingCourse) {
            return res.status(400).json({
                success: false,
                error: 'Course with this code already exists for this branch and year'
            });
        }

        const course = await Course.create({
            courseCode,
            courseName,
            description,
            branch: branch.toLowerCase(),
            year,
            semester,
            schedule,
            defaultLocation,
            defaultDuration,
            lateThreshold,
            createdBy: req.user._id,
            claimedBy: []
        });

        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: course
        });
    } catch (error) {
        console.error('Create Course Error:', error);
        res.status(500).json({ success: false, error: error.message || 'Server Error' });
    }
};

/**
 * @route   GET /api/admin/courses
 * @desc    Get all courses (Admin view with claim status)
 * @access  Private (Admin)
 */
export const getAllCourses = async (req, res) => {
    try {
        const { branch, year, semester, claimed } = req.query;

        const filter = { isArchived: false };
        if (branch) filter.branch = branch.toLowerCase();
        if (year) filter.year = parseInt(year);
        if (semester) filter.semester = parseInt(semester);

        let courses = await Course.find(filter)
            .populate('createdBy', 'name email')
            .populate('claimedBy', 'name email')
            .sort({ branch: 1, year: 1, courseCode: 1 });

        // Filter by claimed status if specified
        if (claimed === 'true') {
            courses = courses.filter(c => c.claimedBy.length > 0);
        } else if (claimed === 'false') {
            courses = courses.filter(c => c.claimedBy.length === 0);
        }

        res.json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        console.error('Get Courses Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @route   PUT /api/admin/courses/:id
 * @desc    Update a course (Admin only)
 * @access  Private (Admin)
 */
export const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }

        // Fields that can be updated
        const allowedUpdates = [
            'courseName', 'description', 'schedule',
            'defaultLocation', 'defaultDuration', 'lateThreshold'
        ];

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                course[field] = updates[field];
            }
        });

        await course.save();

        res.json({
            success: true,
            message: 'Course updated successfully',
            data: course
        });
    } catch (error) {
        console.error('Update Course Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @route   DELETE /api/admin/courses/:id
 * @desc    Archive or delete a course (Admin only)
 * @access  Private (Admin)
 */
export const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { permanent } = req.query;

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }

        if (permanent === 'true') {
            // Check for existing sessions
            const sessionCount = await Session.countDocuments({ course: id });
            if (sessionCount > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot permanently delete course with ${sessionCount} sessions. Archive instead.`
                });
            }
            await course.deleteOne();
            res.json({ success: true, message: 'Course permanently deleted' });
        } else {
            course.isArchived = true;
            await course.save();
            res.json({ success: true, message: 'Course archived' });
        }
    } catch (error) {
        console.error('Delete Course Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// ============================================
// TIMETABLE MANAGEMENT (NEW)
// ============================================

/**
 * @route   POST /api/admin/timetable
 * @desc    Create/upload timetable for a branch/year
 * @access  Private (Admin)
 */
export const createTimetable = async (req, res) => {
    try {
        const { branch, year, semester, academicYear, slots } = req.body;

        if (!branch || !year || !semester || !academicYear || !slots) {
            return res.status(400).json({
                success: false,
                error: 'Please provide branch, year, semester, academicYear, and slots'
            });
        }

        // Deactivate existing timetable for this branch/year/semester
        await Timetable.updateMany(
            { branch: branch.toLowerCase(), year, semester },
            { isActive: false }
        );

        const timetable = await Timetable.create({
            branch: branch.toLowerCase(),
            year,
            semester,
            academicYear,
            slots,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            message: 'Timetable created successfully',
            data: timetable
        });
    } catch (error) {
        console.error('Create Timetable Error:', error);
        res.status(500).json({ success: false, error: error.message || 'Server Error' });
    }
};

/**
 * @route   GET /api/admin/timetable/:branch/:year
 * @desc    Get active timetable for a branch/year
 * @access  Private (Admin/Student/Professor)
 */
export const getTimetable = async (req, res) => {
    try {
        const { branch, year } = req.params;

        const timetable = await Timetable.findOne({
            branch: branch.toLowerCase(),
            year: parseInt(year),
            isActive: true
        }).populate('slots.course', 'courseCode courseName');

        if (!timetable) {
            return res.status(404).json({
                success: false,
                error: 'No active timetable found for this branch and year'
            });
        }

        res.json({ success: true, data: timetable });
    } catch (error) {
        console.error('Get Timetable Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @route   PUT /api/admin/timetable/:id
 * @desc    Update a timetable
 * @access  Private (Admin)
 */
export const updateTimetable = async (req, res) => {
    try {
        const { id } = req.params;
        const { slots, isActive } = req.body;

        const timetable = await Timetable.findById(id);
        if (!timetable) {
            return res.status(404).json({ success: false, error: 'Timetable not found' });
        }

        if (slots) timetable.slots = slots;
        if (isActive !== undefined) timetable.isActive = isActive;

        await timetable.save();

        res.json({
            success: true,
            message: 'Timetable updated successfully',
            data: timetable
        });
    } catch (error) {
        console.error('Update Timetable Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// ============================================
// CLAIM REQUEST MANAGEMENT (NEW)
// ============================================

/**
 * @route   GET /api/admin/claim-requests
 * @desc    Get all pending claim/unclaim requests
 * @access  Private (Admin)
 */
export const getClaimRequests = async (req, res) => {
    try {
        const { status = 'pending', type } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (type) filter.type = type;

        const requests = await ClaimRequest.find(filter)
            .populate('professor', 'name email')
            .populate('course', 'courseCode courseName branch year')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        console.error('Get Claim Requests Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @route   PUT /api/admin/claim-requests/:id
 * @desc    Approve or reject a claim request
 * @access  Private (Admin)
 */
export const processClaimRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, reviewNote } = req.body; // 'approve' or 'reject'

        const request = await ClaimRequest.findById(id).populate('course');
        if (!request) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, error: 'Request already processed' });
        }

        if (action === 'approve') {
            request.status = 'approved';

            if (request.type === 'claim') {
                // Add professor to course's claimedBy array
                await Course.findByIdAndUpdate(request.course._id, {
                    $addToSet: { claimedBy: request.professor }
                });
            } else if (request.type === 'unclaim') {
                // Remove professor from course's claimedBy array
                await Course.findByIdAndUpdate(request.course._id, {
                    $pull: { claimedBy: request.professor }
                });
            }
        } else if (action === 'reject') {
            request.status = 'rejected';
        } else {
            return res.status(400).json({ success: false, error: 'Invalid action' });
        }

        request.reviewedBy = req.user._id;
        request.reviewedAt = new Date();
        request.reviewNote = reviewNote || '';
        await request.save();

        res.json({
            success: true,
            message: `Claim request ${action}d successfully`,
            data: request
        });
    } catch (error) {
        console.error('Process Claim Request Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// ============================================
// ELECTIVE REQUEST MANAGEMENT (NEW)
// ============================================

/**
 * @route   GET /api/admin/elective-requests
 * @desc    Get all pending elective requests
 * @access  Private (Admin)
 */
export const getElectiveRequests = async (req, res) => {
    try {
        const { status = 'pending' } = req.query;

        const requests = await ElectiveRequest.find({ status })
            .populate('student', 'name email rollNo branch')
            .populate('course', 'courseCode courseName branch year')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        console.error('Get Elective Requests Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @route   PUT /api/admin/elective-requests/:id
 * @desc    Approve or reject an elective request
 * @access  Private (Admin)
 */
export const processElectiveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, reviewNote } = req.body;

        const request = await ElectiveRequest.findById(id);
        if (!request) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ success: false, error: 'Request already processed' });
        }

        if (action === 'approve') {
            request.status = 'approved';

            // Add course to student's electiveCourses
            await User.findByIdAndUpdate(request.student, {
                $addToSet: { electiveCourses: request.course }
            });
        } else if (action === 'reject') {
            request.status = 'rejected';
        } else {
            return res.status(400).json({ success: false, error: 'Invalid action' });
        }

        request.reviewedBy = req.user._id;
        request.reviewedAt = new Date();
        request.reviewNote = reviewNote || '';
        await request.save();

        res.json({
            success: true,
            message: `Elective request ${action}d successfully`,
            data: request
        });
    } catch (error) {
        console.error('Process Elective Request Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// ============================================
// PENDING USERS (NON-STANDARD EMAILS)
// ============================================

/**
 * @route   GET /api/admin/pending-users
 * @desc    Get users with non-standard emails needing review
 * @access  Private (Admin)
 */
export const getPendingUsers = async (req, res) => {
    try {
        const users = await User.find({ pendingReview: true })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        console.error('Get Pending Users Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @route   PUT /api/admin/pending-users/:id
 * @desc    Assign role and branch to a pending user
 * @access  Private (Admin)
 */
export const processPendingUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, branch, branchCode, admissionYear, action } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (action === 'reject') {
            await user.deleteOne();
            return res.json({ success: true, message: 'User rejected and removed' });
        }

        if (!role) {
            return res.status(400).json({ success: false, error: 'Role is required' });
        }

        user.role = role;
        if (role === 'student') {
            user.branch = branch;
            user.branchCode = branchCode;
            user.admissionYear = admissionYear;
        }
        user.pendingReview = false;
        await user.save();

        res.json({
            success: true,
            message: 'User updated successfully',
            data: user
        });
    } catch (error) {
        console.error('Process Pending User Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// ============================================
// ANALYTICS (EXISTING - UPDATED)
// ============================================

export const getSystemAnalytics = async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.setHours(0, 0, 0, 0));
        const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        // User stats
        const totalStudents = await User.countDocuments({ role: 'student' });
        const totalProfessors = await User.countDocuments({ role: 'professor' });
        const pendingProfessors = await User.countDocuments({ role: 'pending_professor' });
        const pendingReviewUsers = await User.countDocuments({ pendingReview: true });

        // Course stats (updated for new model)
        const totalCourses = await Course.countDocuments({ isArchived: false });
        const claimedCourses = await Course.countDocuments({
            isArchived: false,
            'claimedBy.0': { $exists: true }
        });
        const unclaimedCourses = totalCourses - claimedCourses;

        // Request stats
        const pendingClaimRequests = await ClaimRequest.countDocuments({ status: 'pending' });
        const pendingElectiveRequests = await ElectiveRequest.countDocuments({ status: 'pending' });

        // Session stats
        const totalSessions = await Session.countDocuments();
        const activeSessions = await Session.countDocuments({ isActive: true });
        const sessionsToday = await Session.countDocuments({ startTime: { $gte: today } });

        // Attendance stats
        const totalAttendance = await Attendance.countDocuments();
        const presentCount = await Attendance.countDocuments({ status: 'PRESENT' });
        const lateCount = await Attendance.countDocuments({ status: 'LATE' });

        res.json({
            success: true,
            data: {
                users: {
                    totalStudents,
                    totalProfessors,
                    pendingProfessors,
                    pendingReviewUsers
                },
                courses: {
                    total: totalCourses,
                    claimed: claimedCourses,
                    unclaimed: unclaimedCourses
                },
                requests: {
                    pendingClaims: pendingClaimRequests,
                    pendingElectives: pendingElectiveRequests
                },
                sessions: {
                    total: totalSessions,
                    active: activeSessions,
                    today: sessionsToday
                },
                attendance: {
                    total: totalAttendance,
                    present: presentCount,
                    late: lateCount,
                    averageRate: totalAttendance > 0
                        ? Math.round((presentCount + lateCount) / totalAttendance * 100)
                        : 0
                }
            }
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

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
    // Professor management
    getPendingProfessors,
    approveProfessor,
    // Course management
    createCourse,
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
    bulkApproveStudents
};
