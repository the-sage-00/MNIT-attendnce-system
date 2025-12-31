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

/**
 * @route   GET /api/admin/students
 * @desc    Get all students
 * @access  Private (Admin)
 */
export const getAllStudents = async (req, res) => {
    try {
        const students = await User.find({ role: 'student' })
            .select('name email rollNo branch branchCode academicState createdAt')
            .sort({ createdAt: -1 });
        res.json({ success: true, count: students.length, data: students });
    } catch (error) {
        console.error('Get Students Error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @route   GET /api/admin/professors
 * @desc    Get all approved professors
 * @access  Private (Admin)
 */
export const getAllProfessors = async (req, res) => {
    try {
        const professors = await User.find({ role: 'professor' })
            .select('name email createdAt');

        // Get count of courses claimed by each professor
        const professorsWithCourses = await Promise.all(
            professors.map(async (prof) => {
                const courseCount = await Course.countDocuments({ claimedBy: prof._id });
                return { ...prof.toObject(), courseCount };
            })
        );

        res.json({ success: true, count: professors.length, data: professorsWithCourses });
    } catch (error) {
        console.error('Get Professors Error:', error);
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
            batch,
            schedules,
            schedule, // Support legacy single schedule
            defaultLocation,
            defaultDuration,
            lateThreshold
        } = req.body;

        // Validate required fields
        if (!courseCode || !courseName || !branch || !year || !semester) {
            return res.status(400).json({
                success: false,
                error: 'Please provide courseCode, courseName, branch, year, and semester'
            });
        }

        // Handle both schedules array and legacy single schedule
        let courseSchedules = schedules || [];
        if (!schedules && schedule) {
            // Convert legacy single schedule to array
            courseSchedules = [schedule];
        }

        // Check if course already exists for this branch/year/batch combination
        const existingCourse = await Course.findOne({
            courseCode: courseCode.toUpperCase(),
            branch: branch.toLowerCase(),
            year,
            batch: batch || 'all'
        });

        if (existingCourse) {
            return res.status(400).json({
                success: false,
                error: 'Course with this code already exists for this branch, year, and batch'
            });
        }

        const course = await Course.create({
            courseCode,
            courseName,
            description,
            branch: branch.toLowerCase(),
            year,
            semester,
            batch: batch || 'all',
            schedules: courseSchedules,
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
 * @route   POST /api/admin/courses/bulk
 * @desc    Bulk import courses from JSON timetable
 * @access  Private (Admin)
 * 
 * Expected JSON format:
 * {
 *   "courses": [
 *     {
 *       "courseCode": "CS101",
 *       "courseName": "Data Structures",
 *       "branch": "ucp",
 *       "year": 2,
 *       "semester": 3,
 *       "batch": "all",
 *       "schedules": [
 *         { "day": "Monday", "startTime": "09:00", "endTime": "10:00", "room": "LH-101" },
 *         { "day": "Wednesday", "startTime": "14:00", "endTime": "15:00", "room": "LH-101" }
 *       ]
 *     }
 *   ]
 * }
 */
export const bulkImportCourses = async (req, res) => {
    try {
        const { courses } = req.body;

        if (!courses || !Array.isArray(courses) || courses.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'courses array is required in the request body'
            });
        }

        const validBranches = ['uch', 'ucp', 'uce', 'uec', 'uee', 'ume', 'umt'];
        const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const validBatches = ['all', '1', '2', '3', '4', '5'];

        const results = {
            created: [],
            failed: [],
            skipped: []
        };

        for (const courseData of courses) {
            try {
                const { courseCode, courseName, branch, year, semester, batch, schedules, schedule, description } = courseData;

                // Validate required fields
                if (!courseCode || !courseName || !branch || !year || !semester) {
                    results.failed.push({
                        courseCode: courseCode || 'unknown',
                        error: 'Missing required fields (courseCode, courseName, branch, year, semester)'
                    });
                    continue;
                }

                // Validate branch
                if (!validBranches.includes(branch.toLowerCase())) {
                    results.failed.push({
                        courseCode,
                        error: `Invalid branch code. Must be one of: ${validBranches.join(', ')}`
                    });
                    continue;
                }

                // Validate year
                if (year < 1 || year > 4) {
                    results.failed.push({ courseCode, error: 'Year must be between 1 and 4' });
                    continue;
                }

                // Validate semester
                if (semester < 1 || semester > 8) {
                    results.failed.push({ courseCode, error: 'Semester must be between 1 and 8' });
                    continue;
                }

                // Validate batch if provided
                const courseBatch = batch || 'all';
                if (!validBatches.includes(courseBatch)) {
                    results.failed.push({
                        courseCode,
                        error: `Invalid batch. Must be one of: ${validBatches.join(', ')}`
                    });
                    continue;
                }

                // Handle both schedules array and legacy single schedule
                let courseSchedules = schedules || [];
                if (!schedules && schedule) {
                    courseSchedules = [schedule];
                }

                // Validate schedule days
                let invalidDay = false;
                for (const sched of courseSchedules) {
                    if (sched.day && !validDays.includes(sched.day)) {
                        results.failed.push({
                            courseCode,
                            error: `Invalid day '${sched.day}'. Must be one of: ${validDays.join(', ')}`
                        });
                        invalidDay = true;
                        break;
                    }
                }
                if (invalidDay) continue;

                // Check if course already exists
                const existingCourse = await Course.findOne({
                    courseCode: courseCode.toUpperCase(),
                    branch: branch.toLowerCase(),
                    year,
                    batch: courseBatch
                });

                if (existingCourse) {
                    results.skipped.push({
                        courseCode,
                        reason: `Course already exists for ${branch.toUpperCase()} Year ${year} Batch ${courseBatch}`
                    });
                    continue;
                }

                // Create the course
                const newCourse = await Course.create({
                    courseCode: courseCode.toUpperCase(),
                    courseName,
                    description: description || '',
                    branch: branch.toLowerCase(),
                    year,
                    semester,
                    batch: courseBatch,
                    schedules: courseSchedules,
                    createdBy: req.user._id,
                    claimedBy: []
                });

                results.created.push({
                    courseCode: newCourse.courseCode,
                    courseName: newCourse.courseName,
                    batch: newCourse.batch,
                    _id: newCourse._id
                });

            } catch (courseError) {
                results.failed.push({
                    courseCode: courseData.courseCode || 'unknown',
                    error: courseError.message
                });
            }
        }

        res.json({
            success: true,
            message: `Import complete: ${results.created.length} created, ${results.skipped.length} skipped, ${results.failed.length} failed`,
            data: results
        });

    } catch (error) {
        console.error('Bulk Import Error:', error);
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

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete a user (student/professor) and all related data
 * @access  Private (Admin)
 */
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Cannot delete admin accounts
        if (user.role === 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Cannot delete admin accounts'
            });
        }

        const deletionSummary = {
            user: { email: user.email, role: user.role, name: user.name },
            deletedRecords: {}
        };

        // Handle STUDENT deletion
        if (user.role === 'student') {
            // Delete all attendance records for this student
            const attendanceResult = await Attendance.deleteMany({ student: user._id });
            deletionSummary.deletedRecords.attendanceRecords = attendanceResult.deletedCount;

            // Delete any elective requests
            const electiveResult = await ElectiveRequest.deleteMany({ student: user._id });
            deletionSummary.deletedRecords.electiveRequests = electiveResult.deletedCount;

            console.log(`Deleted student data: ${attendanceResult.deletedCount} attendance records, ${electiveResult.deletedCount} elective requests`);
        }

        // Handle PROFESSOR deletion
        if (user.role === 'professor' || user.role === 'pending_professor') {
            // Get all sessions created by this professor
            const professorSessions = await Session.find({ professor: user._id });
            const sessionIds = professorSessions.map(s => s._id);

            // Delete all attendance records for sessions created by this professor
            const attendanceResult = await Attendance.deleteMany({ session: { $in: sessionIds } });
            deletionSummary.deletedRecords.attendanceRecords = attendanceResult.deletedCount;

            // Delete all sessions created by this professor
            const sessionResult = await Session.deleteMany({ professor: user._id });
            deletionSummary.deletedRecords.sessions = sessionResult.deletedCount;

            // Release all courses claimed by this professor
            const courseResult = await Course.updateMany(
                { claimedBy: user._id },
                { $pull: { claimedBy: user._id } }
            );
            deletionSummary.deletedRecords.coursesReleased = courseResult.modifiedCount;

            // Delete any claim requests by this professor
            const claimResult = await ClaimRequest.deleteMany({ professor: user._id });
            deletionSummary.deletedRecords.claimRequests = claimResult.deletedCount;

            console.log(`Deleted professor data: ${sessionResult.deletedCount} sessions, ${attendanceResult.deletedCount} attendance records, ${courseResult.modifiedCount} courses released`);
        }

        // Log the deletion
        await AuditLog.log({
            eventType: 'ADMIN_DELETED_USER',
            userId: user._id,
            userEmail: user.email,
            userRole: user.role,
            adminId: req.user._id,
            adminEmail: req.user.email,
            metadata: {
                deletedAt: new Date(),
                deletionSummary
            }
        });

        // Delete the user
        await User.findByIdAndDelete(user._id);

        console.log(`Admin ${req.user.email} deleted user: ${user.email} (${user.role})`);

        res.json({
            success: true,
            message: `User ${user.email} and all related data deleted successfully`,
            data: deletionSummary
        });

    } catch (error) {
        console.error('Delete User Error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete user' });
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
    bulkApproveStudents,
    // User management
    deleteUser
};

