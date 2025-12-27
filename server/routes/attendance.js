import express from 'express';
import { Session, Attendance, Student } from '../models/index.js';
import { protect } from '../middleware/auth.js';
import { calculateDistance, determineStatus } from '../utils/geolocation.js';

const router = express.Router();

// @route   GET /api/attendance/lookup/:sessionId/:rollNo
// @desc    Lookup student by roll number for auto-fill (public)
// @access  Public
router.get('/lookup/:sessionId/:rollNo', async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        // Find student that belongs to the session creator
        const student = await Student.findOne({
            rollNo: req.params.rollNo,
            createdBy: session.createdBy
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                error: 'Student not found'
            });
        }

        res.json({
            success: true,
            data: {
                name: student.name,
                rollNo: student.rollNo
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   POST /api/attendance
// @desc    Mark attendance (Student endpoint - public)
// @access  Public
router.post('/', async (req, res) => {
    try {
        const {
            sessionId,
            qrToken,
            studentName,
            studentId,
            latitude,
            longitude,
            deviceFingerprint,
            isStatic  // New: for static QR codes
        } = req.body;

        // Find session
        const session = await Session.findById(sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        // Check if session is active
        if (!session.isActive) {
            return res.status(400).json({
                success: false,
                error: 'Session is no longer active'
            });
        }

        // Validate QR token (skip for static QR codes)
        if (!isStatic && !session.isQRTokenValid(qrToken)) {
            return res.status(400).json({
                success: false,
                error: 'QR code has expired. Please scan the new QR code.'
            });
        }

        // Check if within session time
        const now = new Date();
        if (now < session.startTime) {
            return res.status(400).json({
                success: false,
                error: 'Session has not started yet'
            });
        }
        if (now > session.endTime) {
            return res.status(400).json({
                success: false,
                error: 'Session has ended'
            });
        }

        // Calculate distance from center
        const distance = calculateDistance(
            latitude, longitude,
            session.centerLat, session.centerLng
        );

        // Determine status
        const status = determineStatus(
            distance,
            session.radius,
            session.startTime,
            session.lateThreshold
        );

        // Check for duplicate attendance
        const existingAttendance = await Attendance.findOne({
            session: sessionId,
            studentId
        });

        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                error: 'Attendance already marked for this session'
            });
        }

        // Check for same device multiple submissions (if fingerprint provided)
        if (deviceFingerprint) {
            const deviceCount = await Attendance.countDocuments({
                session: sessionId,
                deviceFingerprint
            });
            if (deviceCount >= 1) {
                return res.status(400).json({
                    success: false,
                    error: 'This device has already been used for attendance in this session'
                });
            }
        }

        // Create attendance record
        const attendance = await Attendance.create({
            session: sessionId,
            studentName,
            studentId,
            latitude,
            longitude,
            distance: Math.round(distance),
            deviceFingerprint: deviceFingerprint || '',
            status,
            ipAddress: req.ip || req.connection.remoteAddress
        });

        res.status(201).json({
            success: true,
            data: {
                status,
                distance: Math.round(distance),
                message: status === 'INVALID'
                    ? `You are ${Math.round(distance)}m away. Must be within ${session.radius}m.`
                    : status === 'LATE'
                        ? 'Attendance marked as LATE'
                        : 'Attendance marked successfully!'
            }
        });
    } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Attendance already marked for this session'
            });
        }
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   GET /api/attendance/:sessionId
// @desc    Get attendance list for a session
// @access  Private (Admin)
router.get('/:sessionId', protect, async (req, res) => {
    try {
        const attendance = await Attendance.find({ session: req.params.sessionId })
            .sort({ createdAt: 1 });

        const stats = {
            total: attendance.length,
            present: attendance.filter(a => a.status === 'PRESENT').length,
            late: attendance.filter(a => a.status === 'LATE').length,
            invalid: attendance.filter(a => a.status === 'INVALID').length
        };

        res.json({
            success: true,
            stats,
            data: attendance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// @route   GET /api/attendance/:sessionId/export
// @desc    Export attendance as CSV
// @access  Private (Admin)
router.get('/:sessionId/export', protect, async (req, res) => {
    try {
        const session = await Session.findById(req.params.sessionId);
        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        const attendance = await Attendance.find({ session: req.params.sessionId })
            .sort({ createdAt: 1 });

        // Generate CSV
        const headers = ['Timestamp', 'Student ID', 'Student Name', 'Status', 'Distance (m)', 'Latitude', 'Longitude'];
        const rows = attendance.map(a => [
            a.createdAt.toISOString(),
            a.studentId,
            a.studentName,
            a.status,
            a.distance,
            a.latitude,
            a.longitude
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${session.courseName}-${session.sessionId}-attendance.csv`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
