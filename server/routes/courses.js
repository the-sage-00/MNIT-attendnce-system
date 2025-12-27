import express from 'express';
import crypto from 'crypto';
import { Course, Session, Attendance, CourseEnrollment } from '../models/index.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/courses
// @desc    Create a new course
// @access  Private (Admin)
router.post('/', protect, async (req, res) => {
    try {
        const { courseCode, courseName, description, semester, defaultLocation, defaultDuration, lateThreshold } = req.body;

        // Check if course code already exists for this admin
        const existingCourse = await Course.findOne({
            courseCode: courseCode.toUpperCase(),
            createdBy: req.admin._id
        });

        if (existingCourse) {
            return res.status(400).json({
                success: false,
                error: 'Course with this code already exists'
            });
        }

        const course = await Course.create({
            courseCode: courseCode.toUpperCase(),
            courseName,
            description,
            semester,
            defaultLocation,
            defaultDuration,
            lateThreshold,
            createdBy: req.admin._id
        });

        res.status(201).json({
            success: true,
            data: course
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   GET /api/courses
// @desc    Get all courses for admin
// @access  Private (Admin)
router.get('/', protect, async (req, res) => {
    try {
        const courses = await Course.find({
            createdBy: req.admin._id,
            isArchived: false
        })
            .populate('activeSession')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: courses
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   GET /api/courses/:id
// @desc    Get course details with sessions
// @access  Private (Admin)
router.get('/:id', protect, async (req, res) => {
    try {
        const course = await Course.findOne({
            _id: req.params.id,
            createdBy: req.admin._id
        }).populate('activeSession');

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        // Get sessions for this course
        const sessions = await Session.find({ course: course._id })
            .sort({ sessionNumber: -1 })
            .limit(20);

        // Get enrolled students count
        const enrolledCount = await CourseEnrollment.countDocuments({
            course: course._id,
            isActive: true
        });

        res.json({
            success: true,
            data: {
                ...course.toObject(),
                sessions,
                enrolledCount
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   PUT /api/courses/:id
// @desc    Update course settings
// @access  Private (Admin)
router.put('/:id', protect, async (req, res) => {
    try {
        const { courseName, description, semester, defaultLocation, defaultDuration, lateThreshold } = req.body;

        const course = await Course.findOneAndUpdate(
            { _id: req.params.id, createdBy: req.admin._id },
            { courseName, description, semester, defaultLocation, defaultDuration, lateThreshold },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        res.json({
            success: true,
            data: course
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   DELETE /api/courses/:id
// @desc    Archive course (soft delete)
// @access  Private (Admin)
router.delete('/:id', protect, async (req, res) => {
    try {
        const course = await Course.findOneAndUpdate(
            { _id: req.params.id, createdBy: req.admin._id },
            { isArchived: true },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        res.json({
            success: true,
            message: 'Course archived successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   POST /api/courses/:id/start-session
// @desc    Start a new session for the course
// @access  Private (Admin)
router.post('/:id/start-session', protect, async (req, res) => {
    try {
        const { centerLat, centerLng, radius, duration } = req.body;

        const course = await Course.findOne({
            _id: req.params.id,
            createdBy: req.admin._id
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        // Check if there's already an active session
        if (course.activeSession) {
            return res.status(400).json({
                success: false,
                error: 'There is already an active session for this course. Please end it first.'
            });
        }

        // Calculate session number
        const sessionNumber = course.totalSessions + 1;

        // Use provided location or course defaults
        const lat = centerLat || course.defaultLocation?.latitude;
        const lng = centerLng || course.defaultLocation?.longitude;
        const sessionRadius = radius || course.defaultLocation?.radius || 50;
        const sessionDuration = duration || course.defaultDuration || 60;

        if (!lat || !lng) {
            return res.status(400).json({
                success: false,
                error: 'Location is required. Please provide centerLat and centerLng.'
            });
        }

        const now = new Date();
        const endTime = new Date(now.getTime() + sessionDuration * 60000);

        // Create the session
        const session = await Session.create({
            course: course._id,
            sessionNumber,
            courseName: `${course.courseCode} - Session ${sessionNumber}`,
            description: `${course.courseName} - Class ${sessionNumber}`,
            centerLat: lat,
            centerLng: lng,
            radius: sessionRadius,
            startTime: now,
            endTime: endTime,
            lateThreshold: course.lateThreshold,
            isActive: true,
            createdBy: req.admin._id
        });

        // Update course with active session and increment total
        course.activeSession = session._id;
        course.totalSessions = sessionNumber;
        await course.save();

        res.status(201).json({
            success: true,
            data: {
                session,
                course: {
                    _id: course._id,
                    courseCode: course.courseCode,
                    courseName: course.courseName,
                    totalSessions: course.totalSessions
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   POST /api/courses/:id/stop-session
// @desc    Stop the currently active session
// @access  Private (Admin)
router.post('/:id/stop-session', protect, async (req, res) => {
    try {
        const course = await Course.findOne({
            _id: req.params.id,
            createdBy: req.admin._id
        }).populate('activeSession');

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        if (!course.activeSession) {
            return res.status(400).json({
                success: false,
                error: 'No active session to stop'
            });
        }

        // Deactivate the session
        await Session.findByIdAndUpdate(course.activeSession._id, {
            isActive: false,
            endTime: new Date()
        });

        // Get attendance stats
        const stats = await Attendance.aggregate([
            { $match: { session: course.activeSession._id } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const attendanceStats = {
            present: 0,
            late: 0,
            invalid: 0,
            total: 0
        };
        stats.forEach(s => {
            attendanceStats[s._id.toLowerCase()] = s.count;
            attendanceStats.total += s.count;
        });

        // Clear active session from course
        const sessionNumber = course.activeSession.sessionNumber;
        course.activeSession = null;
        await course.save();

        res.json({
            success: true,
            message: `Session ${sessionNumber} ended successfully`,
            data: {
                sessionNumber,
                stats: attendanceStats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   GET /api/courses/:id/sessions
// @desc    Get all sessions for a course
// @access  Private (Admin)
router.get('/:id/sessions', protect, async (req, res) => {
    try {
        const course = await Course.findOne({
            _id: req.params.id,
            createdBy: req.admin._id
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        const sessions = await Session.find({ course: course._id })
            .sort({ sessionNumber: -1 });

        // Get attendance stats for each session
        const sessionsWithStats = await Promise.all(sessions.map(async (session) => {
            const stats = await Attendance.aggregate([
                { $match: { session: session._id } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const attendanceStats = { present: 0, late: 0, invalid: 0, total: 0 };
            stats.forEach(s => {
                attendanceStats[s._id.toLowerCase()] = s.count;
                attendanceStats.total += s.count;
            });

            return {
                ...session.toObject(),
                stats: attendanceStats
            };
        }));

        res.json({
            success: true,
            data: sessionsWithStats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   GET /api/courses/:id/enrollments
// @desc    Get enrolled students for a course
// @access  Private (Admin)
router.get('/:id/enrollments', protect, async (req, res) => {
    try {
        const course = await Course.findOne({
            _id: req.params.id,
            createdBy: req.admin._id
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        const enrollments = await CourseEnrollment.find({
            course: course._id,
            isActive: true
        }).sort({ studentId: 1 });

        // Get attendance count for each student
        const enrollmentsWithStats = await Promise.all(enrollments.map(async (enrollment) => {
            const attendanceCount = await Attendance.countDocuments({
                session: { $in: await Session.find({ course: course._id }).distinct('_id') },
                studentId: enrollment.studentId
            });

            return {
                ...enrollment.toObject(),
                attendanceCount,
                attendancePercentage: course.totalSessions > 0
                    ? Math.round((attendanceCount / course.totalSessions) * 100)
                    : 0
            };
        }));

        res.json({
            success: true,
            data: enrollmentsWithStats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   POST /api/courses/:id/enroll
// @desc    Enroll a student in a course (called during attendance)
// @access  Public (used during attendance marking)
router.post('/:id/enroll', async (req, res) => {
    try {
        const { studentId, studentName } = req.body;

        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        // Check if already enrolled
        let enrollment = await CourseEnrollment.findOne({
            course: course._id,
            studentId: studentId.toUpperCase()
        });

        if (enrollment) {
            return res.json({
                success: true,
                message: 'Already enrolled',
                data: enrollment
            });
        }

        // Create enrollment
        enrollment = await CourseEnrollment.create({
            course: course._id,
            studentId: studentId.toUpperCase(),
            studentName
        });

        res.status(201).json({
            success: true,
            message: 'Successfully enrolled in course',
            data: enrollment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   GET /api/courses/:id/check-enrollment/:studentId
// @desc    Check if a student is enrolled in a course
// @access  Public
router.get('/:id/check-enrollment/:studentId', async (req, res) => {
    try {
        const enrollment = await CourseEnrollment.findOne({
            course: req.params.id,
            studentId: req.params.studentId.toUpperCase()
        });

        res.json({
            success: true,
            isEnrolled: !!enrollment,
            data: enrollment
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
