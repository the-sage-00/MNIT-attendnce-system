import { Course, Session, ClaimRequest, User, Timetable } from '../models/index.js';
import { calculateAcademicState } from '../utils/identity.js';

// ============================================
// PROFESSOR: GET COURSES
// ============================================

/**
 * @route   GET /api/courses
 * @desc    Get all courses claimed by this professor
 * @access  Private (Professor)
 */
export const getCourses = async (req, res) => {
    try {
        const { archived } = req.query;

        const query = { claimedBy: req.user._id };
        if (archived !== 'true') {
            query.isArchived = false;
        }

        const courses = await Course.find(query)
            .populate('claimedBy', 'name email')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        console.error('Get Courses Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get courses'
        });
    }
};

/**
 * @route   GET /api/courses/claimable
 * @desc    Get courses available for claiming (not already claimed by this professor)
 * @access  Private (Professor)
 */
export const getClaimableCourses = async (req, res) => {
    try {
        const { branch, year, batch } = req.query;

        const query = {
            isArchived: false,
            claimedBy: { $ne: req.user._id } // Not already claimed by this professor
        };

        if (branch) query.branch = branch.toLowerCase();
        if (year) query.year = parseInt(year);
        if (batch) query.batch = batch;

        const courses = await Course.find(query)
            .populate('claimedBy', 'name email')
            .populate('createdBy', 'name')
            .sort({ branch: 1, year: 1, courseCode: 1 });

        res.json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        console.error('Get Claimable Courses Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get claimable courses'
        });
    }
};

/**
 * @route   GET /api/courses/:id
 * @desc    Get course details (only if professor has claimed it)
 * @access  Private (Professor)
 */
export const getCourse = async (req, res) => {
    try {
        const course = await Course.findOne({
            _id: req.params.id,
            claimedBy: req.user._id
        }).populate('claimedBy', 'name email');

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found or not claimed by you'
            });
        }

        // Get recent sessions
        const sessions = await Session.find({ course: course._id })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            data: {
                ...course.toObject(),
                sessions
            }
        });
    } catch (error) {
        console.error('Get Course Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get course'
        });
    }
};

// ============================================
// PROFESSOR: CLAIM/UNCLAIM COURSES
// ============================================

/**
 * @route   POST /api/courses/:id/claim
 * @desc    Request to claim a course (requires admin approval)
 * @access  Private (Professor)
 */
export const claimCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }

        // Check if already claimed by this professor
        if (course.claimedBy.includes(req.user._id)) {
            return res.status(400).json({
                success: false,
                error: 'You have already claimed this course'
            });
        }

        // Check for existing pending claim request
        const existingRequest = await ClaimRequest.findOne({
            professor: req.user._id,
            course: id,
            type: 'claim',
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                error: 'You already have a pending claim request for this course'
            });
        }

        // Create claim request
        const claimRequest = await ClaimRequest.create({
            professor: req.user._id,
            course: id,
            type: 'claim',
            message: message || ''
        });

        res.status(201).json({
            success: true,
            message: 'Claim request submitted. Waiting for admin approval.',
            data: claimRequest
        });
    } catch (error) {
        console.error('Claim Course Error:', error);
        res.status(500).json({ success: false, error: 'Failed to submit claim request' });
    }
};

/**
 * @route   POST /api/courses/:id/unclaim
 * @desc    Request to unclaim a course (requires admin approval)
 * @access  Private (Professor)
 */
export const unclaimCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }

        // Check if claimed by this professor
        if (!course.claimedBy.includes(req.user._id)) {
            return res.status(400).json({
                success: false,
                error: 'You have not claimed this course'
            });
        }

        // Check for existing pending unclaim request
        const existingRequest = await ClaimRequest.findOne({
            professor: req.user._id,
            course: id,
            type: 'unclaim',
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                error: 'You already have a pending unclaim request for this course'
            });
        }

        // Create unclaim request
        const unclaimRequest = await ClaimRequest.create({
            professor: req.user._id,
            course: id,
            type: 'unclaim',
            message: message || ''
        });

        res.status(201).json({
            success: true,
            message: 'Unclaim request submitted. Waiting for admin approval.',
            data: unclaimRequest
        });
    } catch (error) {
        console.error('Unclaim Course Error:', error);
        res.status(500).json({ success: false, error: 'Failed to submit unclaim request' });
    }
};

/**
 * @route   GET /api/courses/my-requests
 * @desc    Get all claim/unclaim requests by this professor
 * @access  Private (Professor)
 */
export const getMyClaimRequests = async (req, res) => {
    try {
        const requests = await ClaimRequest.find({ professor: req.user._id })
            .populate('course', 'courseCode courseName branch year')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (error) {
        console.error('Get Claim Requests Error:', error);
        res.status(500).json({ success: false, error: 'Failed to get requests' });
    }
};

// ============================================
// PROFESSOR: UPDATE COURSE (Limited)
// ============================================

/**
 * @route   PUT /api/courses/:id
 * @desc    Update course settings (professor can only update schedule/location)
 * @access  Private (Professor - must have claimed the course)
 */
export const updateCourse = async (req, res) => {
    try {
        // Professors can only update certain fields
        const allowedFields = [
            'schedule', 'defaultLocation', 'defaultDuration', 'lateThreshold'
        ];

        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const course = await Course.findOneAndUpdate(
            { _id: req.params.id, claimedBy: req.user._id },
            updates,
            { new: true, runValidators: true }
        );

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found or not claimed by you'
            });
        }

        res.json({
            success: true,
            message: 'Course updated successfully',
            data: course
        });
    } catch (error) {
        console.error('Update Course Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update course'
        });
    }
};

// ============================================
// STUDENT: GET COURSES
// ============================================

/**
 * @route   GET /api/courses/my-courses
 * @desc    Get courses for the student (auto-enrolled + electives)
 * @access  Private (Student)
 */
export const getStudentCourses = async (req, res) => {
    try {
        const user = req.user;

        const branchCode = user.branchCode;
        const admissionYear = user.admissionYear;
        const studentBatch = user.batch;

        if (!branchCode || !admissionYear) {
            return res.json({ success: true, data: [], message: 'Missing academic info' });
        }

        const academicState = calculateAcademicState(admissionYear);

        // UCP and UCS are both Computer Science - match either
        const branchLower = branchCode.toLowerCase();
        const branchesToMatch = branchLower === 'ucp' || branchLower === 'ucs'
            ? ['ucp', 'ucs']
            : [branchLower];

        // Auto-enrolled courses (matching branch, year, AND batch)
        // Show courses for student's specific batch OR courses for 'all' batches
        const autoEnrolledCourses = await Course.find({
            branch: { $in: branchesToMatch },
            year: academicState.year,
            isArchived: false,
            $or: [
                { batch: 'all' },
                { batch: { $exists: false } },  // Courses without batch field
                { batch: studentBatch }
            ]
        })
            .populate('claimedBy', 'name email')
            .select('courseName courseCode branch year semester batch schedule claimedBy');

        // Elective courses (from user's electiveCourses array)
        const userWithElectives = await User.findById(user._id)
            .populate({
                path: 'electiveCourses',
                match: { isArchived: false },
                populate: { path: 'claimedBy', select: 'name email' }
            });

        const electiveCourses = userWithElectives.electiveCourses || [];

        res.json({
            success: true,
            data: {
                autoEnrolled: autoEnrolledCourses,
                electives: electiveCourses,
                total: autoEnrolledCourses.length + electiveCourses.length
            },
            academicInfo: {
                branch: branchCode,
                year: academicState.year,
                semester: academicState.semester
            }
        });
    } catch (error) {
        console.error('Get Student Courses Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch courses'
        });
    }
};

/**
 * @route   GET /api/courses/my-timetable
 * @desc    Get weekly timetable for the student (built from course schedules)
 * @access  Private (Student)
 */
export const getStudentTimetable = async (req, res) => {
    try {
        const user = req.user;

        const branchCode = user.branchCode;
        const admissionYear = user.admissionYear;
        const studentBatch = user.batch;

        if (!branchCode || !admissionYear) {
            return res.status(400).json({
                success: false,
                error: 'Missing academic information'
            });
        }

        const academicState = calculateAcademicState(admissionYear);

        // UCP and UCS are both Computer Science - match either
        const branchLower = branchCode.toLowerCase();
        const branchesToMatch = branchLower === 'ucp' || branchLower === 'ucs'
            ? ['ucp', 'ucs']
            : [branchLower];

        // Get all courses for this student's branch, year, and batch (or 'all' batch)
        // Courses with schedules array
        const courses = await Course.find({
            branch: { $in: branchesToMatch },
            year: academicState.year,
            isArchived: false,
            $or: [
                { batch: 'all' },
                { batch: studentBatch }
            ],
            schedules: { $exists: true, $ne: [] }
        }).populate('claimedBy', 'name email');

        // Also get elective courses the student has been approved for
        const electives = await Course.find({
            _id: { $in: user.electiveCourses || [] },
            isArchived: false
        }).populate('claimedBy', 'name email');

        const allCourses = [...courses, ...electives];

        // Organize by day - a course can appear on multiple days
        const byDay = {};
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        days.forEach(day => {
            byDay[day] = [];
        });

        // Iterate through courses and their schedules
        allCourses.forEach(course => {
            const schedules = course.schedules || [];
            schedules.forEach(schedule => {
                if (schedule.day && days.includes(schedule.day)) {
                    byDay[schedule.day].push({
                        startTime: schedule.startTime,
                        endTime: schedule.endTime,
                        room: schedule.room,
                        course: {
                            _id: course._id,
                            courseCode: course.courseCode,
                            courseName: course.courseName,
                            batch: course.batch,
                            claimedBy: course.claimedBy
                        }
                    });
                }
            });
        });

        // Sort each day by start time
        days.forEach(day => {
            byDay[day].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
        });

        res.json({
            success: true,
            data: {
                byDay,
                academicInfo: {
                    branch: branchCode,
                    year: academicState.year,
                    semester: academicState.semester,
                    batch: studentBatch
                }
            }
        });
    } catch (error) {
        console.error('Get Student Timetable Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch timetable'
        });
    }
};

/**
 * @route   POST /api/courses/:id/request-elective
 * @desc    Request enrollment in an elective course
 * @access  Private (Student)
 */
export const requestElective = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a reason for requesting this elective'
            });
        }

        const course = await Course.findById(id);
        if (!course) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }

        // Check if already enrolled (auto or elective)
        const user = req.user;
        const academicState = calculateAcademicState(user.admissionYear);

        // Check if it's already an auto-enrolled course
        if (course.branch === user.branchCode?.toLowerCase() && course.year === academicState.year) {
            return res.status(400).json({
                success: false,
                error: 'You are already auto-enrolled in this course'
            });
        }

        // Check if already in electives
        const userDoc = await User.findById(user._id);
        if (userDoc.electiveCourses?.includes(id)) {
            return res.status(400).json({
                success: false,
                error: 'You are already enrolled in this elective'
            });
        }

        // Check for existing pending request
        const { default: ElectiveRequest } = await import('../models/ElectiveRequest.js');
        const existingRequest = await ElectiveRequest.findOne({
            student: user._id,
            course: id,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({
                success: false,
                error: 'You already have a pending request for this course'
            });
        }

        // Create request
        const electiveRequest = await ElectiveRequest.create({
            student: user._id,
            course: id,
            reason
        });

        res.status(201).json({
            success: true,
            message: 'Elective request submitted. Waiting for admin approval.',
            data: electiveRequest
        });
    } catch (error) {
        console.error('Request Elective Error:', error);
        res.status(500).json({ success: false, error: 'Failed to submit request' });
    }
};

export default {
    getCourses,
    getClaimableCourses,
    getCourse,
    claimCourse,
    unclaimCourse,
    getMyClaimRequests,
    updateCourse,
    getStudentCourses,
    getStudentTimetable,
    requestElective
};
