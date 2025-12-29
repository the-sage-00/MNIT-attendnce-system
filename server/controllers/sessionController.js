import QRCode from 'qrcode';
import { Session, Course, Attendance } from '../models/index.js';
import config from '../config/index.js';

/**
 * @route   POST /api/sessions
 * @desc    Start a session (Professor Only)
 * @access  Private (Professor)
 */
export const createSession = async (req, res) => {
    try {
        const {
            courseId,
            centerLat,
            centerLng,
            radius,
            duration // minutes
        } = req.body;

        if (!courseId || !centerLat || !centerLng) {
            return res.status(400).json({
                success: false,
                error: 'Course ID and location are required'
            });
        }

        const course = await Course.findOne({
            _id: courseId,
            professor: req.user._id
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        // Optional: Check active session for this course?
        // Prompt says "The session is tied to exactly one course".

        const startTime = new Date();
        const endTime = new Date(startTime.getTime() + (duration || course.defaultDuration || 60) * 60000);

        const session = await Session.create({
            course: course._id,
            professor: req.user._id,
            startTime,
            endTime,
            centerLat,
            centerLng,
            radius: radius || course.defaultLocation?.radius || 50,
            isActive: true
        });

        res.status(201).json({
            success: true,
            message: 'Session started',
            data: session
        });

    } catch (error) {
        console.error('Create Session Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start session'
        });
    }
};

/**
 * @route   GET /api/sessions/:id
 * @desc    Get session details (Professor)
 * @access  Private (Professor)
 */
export const getSession = async (req, res) => {
    try {
        const session = await Session.findOne({
            _id: req.params.id,
            professor: req.user._id
        }).populate('course');

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        // Get Stats
        const validCount = await Attendance.countDocuments({ session: session._id, status: 'PRESENT' });
        const totalCount = await Attendance.countDocuments({ session: session._id });

        res.json({
            success: true,
            data: {
                ...session.toObject(),
                stats: { validCount, totalCount }
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @route   GET /api/sessions/:id/qr
 * @desc    Get/Refresh QR (Professor Only)
 * @access  Private (Professor)
 */
export const getSessionQR = async (req, res) => {
    try {
        const session = await Session.findOne({
            _id: req.params.id,
            professor: req.user._id
        });

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        if (!session.isActive) {
            return res.status(400).json({ success: false, error: 'Session is not active' });
        }

        // Auto Refresh if expired
        if (new Date() >= session.qrExpiresAt) {
            await session.refreshQRToken();
        }

        // Generate QR Data: JSON containing sessionID and Token
        // The student scanner will read this JSON.
        const qrContent = JSON.stringify({
            s: session._id,
            t: session.qrToken
        });

        const qrCodeDataUrl = await QRCode.toDataURL(qrContent, {
            width: 400,
            margin: 2
        });

        res.json({
            success: true,
            data: {
                qrCode: qrCodeDataUrl,
                expiresAt: session.qrExpiresAt,
                remainingMs: new Date(session.qrExpiresAt).getTime() - Date.now()
            }
        });

    } catch (error) {
        console.error('QR Error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate QR' });
    }
};

/**
 * @route   PUT /api/sessions/:id/stop
 * @desc    Stop/End session
 * @access  Private (Professor)
 */
export const stopSession = async (req, res) => {
    try {
        const session = await Session.findOneAndUpdate(
            { _id: req.params.id, professor: req.user._id },
            { isActive: false, endTime: new Date() },
            { new: true }
        );

        if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

        res.json({ success: true, message: 'Session stopped' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @route   GET /api/sessions/:id/info
 * @desc    Get session basic info for student verification (Authenticated)
 * @access  Private (Student)
 */
export const getStudentSessionInfo = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id)
            .populate('course', 'courseName courseCode branch year semester');

        if (!session) return res.status(404).json({ success: false, error: 'Session not found' });

        // Students should only see active sessions? Or defined by status.
        // Prompt doesn't specify hiding inactive, but "Session Validity Check" fails if inactive.

        res.json({
            success: true,
            data: {
                id: session._id,
                courseName: session.course.courseName,
                courseCode: session.course.courseCode,
                startTime: session.startTime,
                endTime: session.endTime,
                isActive: session.isActive,
                centerLat: session.centerLat, // Maybe needed for frontend distance check ui?
                centerLng: session.centerLng,
                radius: session.radius
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
