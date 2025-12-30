import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Enhanced Session Model with Security Features
 * - Rotating nonces for QR security
 * - HMAC-based token generation
 * - Session caching support
 */

const sessionSchema = new mongoose.Schema({
    // Unique session identifier (for external use)
    sessionId: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomBytes(8).toString('hex')
    },

    // Course and Professor references
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    professor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Time constraints
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },

    // Geolocation constraints
    centerLat: {
        type: Number,
        required: true
    },
    centerLng: {
        type: Number,
        required: true
    },
    radius: {
        type: Number,
        default: 50  // meters
    },

    // Enhanced location requirements
    requiredAccuracy: {
        type: Number,
        default: 100  // meters - reject if GPS accuracy worse than this
    },
    requireLocationSamples: {
        type: Boolean,
        default: false  // If true, require multiple location samples
    },

    // QR Security (Enhanced)
    qrToken: {
        type: String,
        default: () => crypto.randomBytes(16).toString('hex')
    },
    qrNonce: {
        type: String,
        default: () => crypto.randomBytes(12).toString('hex')
    },
    qrTimestamp: {
        type: Number,
        default: () => Date.now()
    },
    qrExpiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30000)  // 30 seconds
    },
    qrRotationInterval: {
        type: Number,
        default: 30000  // 30 seconds in milliseconds
    },
    qrRotationCount: {
        type: Number,
        default: 0  // Track how many times QR has been rotated
    },

    // Session status
    isActive: {
        type: Boolean,
        default: true
    },

    // Late threshold (minutes after start to be marked late)
    lateThreshold: {
        type: Number,
        default: 15  // 15 minutes
    },

    // Security settings
    securityLevel: {
        type: String,
        enum: ['standard', 'strict', 'paranoid'],
        default: 'standard'
    },
    deviceBinding: {
        type: Boolean,
        default: true  // Enforce device binding
    },
    locationBinding: {
        type: Boolean,
        default: true  // Enforce location binding
    },

    // Statistics (cached for performance)
    attendanceCount: {
        type: Number,
        default: 0
    },
    lastAttendanceAt: Date,

    // Security events
    securityEvents: [{
        type: {
            type: String,
            enum: ['suspicious_activity', 'spoofing_attempt', 'device_abuse', 'rate_limit']
        },
        studentId: mongoose.Schema.Types.ObjectId,
        timestamp: Date,
        details: String
    }]
}, {
    timestamps: true
});

// Indexes for efficient queries
sessionSchema.index({ course: 1, isActive: 1 });
sessionSchema.index({ professor: 1, createdAt: -1 });
sessionSchema.index({ isActive: 1, endTime: 1 });

/**
 * Generate new rotating QR token
 * Creates HMAC-signed token with nonce and timestamp
 */
sessionSchema.methods.refreshQRToken = async function () {
    const serverSecret = process.env.JWT_SECRET || 'default-secret';

    // Generate new nonce
    this.qrNonce = crypto.randomBytes(12).toString('hex');
    this.qrTimestamp = Date.now();
    this.qrExpiresAt = new Date(this.qrTimestamp + this.qrRotationInterval);

    // Generate HMAC token
    const payload = `${this._id}:${this.qrNonce}:${this.qrTimestamp}`;
    this.qrToken = crypto.createHmac('sha256', serverSecret)
        .update(payload)
        .digest('hex');

    this.qrRotationCount += 1;

    return await this.save();
};

/**
 * Validate QR token with timing safety
 * @param {string} token - The token from QR
 * @param {string} nonce - The nonce from QR
 * @param {number} timestamp - The timestamp from QR
 * @returns {object} { valid, reason }
 */
sessionSchema.methods.isQRTokenValid = function (token, nonce, timestamp) {
    const serverSecret = process.env.JWT_SECRET || 'default-secret';

    // Check if session is active
    if (!this.isActive) {
        return { valid: false, reason: 'SESSION_INACTIVE' };
    }

    // Legacy validation (simple token comparison)
    if (!nonce && !timestamp) {
        const isValid = this.qrToken === token && new Date() < this.qrExpiresAt;
        return {
            valid: isValid,
            reason: isValid ? null : 'INVALID_OR_EXPIRED_TOKEN'
        };
    }

    // Enhanced validation with HMAC
    const now = Date.now();
    const tokenAge = now - timestamp;
    const maxAge = this.qrRotationInterval + 5000; // Add 5s grace period

    // Check timestamp expiry
    if (tokenAge > maxAge) {
        return { valid: false, reason: 'TOKEN_EXPIRED' };
    }

    // Regenerate expected token
    const payload = `${this._id}:${nonce}:${timestamp}`;
    const expectedToken = crypto.createHmac('sha256', serverSecret)
        .update(payload)
        .digest('hex');

    // Timing-safe comparison
    try {
        const isValid = crypto.timingSafeEqual(
            Buffer.from(token),
            Buffer.from(expectedToken)
        );
        return {
            valid: isValid,
            reason: isValid ? null : 'INVALID_TOKEN'
        };
    } catch (err) {
        return { valid: false, reason: 'INVALID_TOKEN' };
    }
};

/**
 * Get QR data for display
 * Returns the data to encode in QR code
 */
sessionSchema.methods.getQRData = function () {
    return {
        s: this._id.toString(),      // Session ID
        t: this.qrToken,             // Token
        n: this.qrNonce,             // Nonce
        ts: this.qrTimestamp,        // Timestamp
        e: this.qrExpiresAt.getTime() // Expiry timestamp
    };
};

/**
 * Check if session time is valid
 */
sessionSchema.methods.isTimeValid = function () {
    const now = new Date();
    return now >= this.startTime && now <= this.endTime;
};

/**
 * Log security event
 */
sessionSchema.methods.logSecurityEvent = async function (type, studentId, details) {
    this.securityEvents.push({
        type,
        studentId,
        timestamp: new Date(),
        details
    });

    // Keep only last 100 events
    if (this.securityEvents.length > 100) {
        this.securityEvents = this.securityEvents.slice(-100);
    }

    return await this.save();
};

/**
 * Get session summary for caching
 */
sessionSchema.methods.getCacheSummary = function () {
    return {
        _id: this._id,
        sessionId: this.sessionId,
        course: this.course,
        professor: this.professor,
        startTime: this.startTime,
        endTime: this.endTime,
        centerLat: this.centerLat,
        centerLng: this.centerLng,
        radius: this.radius,
        requiredAccuracy: this.requiredAccuracy,
        isActive: this.isActive,
        lateThreshold: this.lateThreshold,
        securityLevel: this.securityLevel,
        deviceBinding: this.deviceBinding,
        locationBinding: this.locationBinding,
        qrExpiresAt: this.qrExpiresAt,
        qrRotationInterval: this.qrRotationInterval
    };
};

/**
 * Static: Find active session by course
 */
sessionSchema.statics.findActiveByProfessor = async function (professorId) {
    return await this.find({
        professor: professorId,
        isActive: true,
        endTime: { $gt: new Date() }
    }).populate('course', 'courseName courseCode');
};

/**
 * Static: End all expired sessions
 */
sessionSchema.statics.endExpiredSessions = async function () {
    const result = await this.updateMany(
        { isActive: true, endTime: { $lt: new Date() } },
        { isActive: false }
    );
    return result.modifiedCount;
};

export default mongoose.model('Session', sessionSchema);
