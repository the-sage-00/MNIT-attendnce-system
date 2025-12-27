import mongoose from 'mongoose';
import crypto from 'crypto';

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        default: () => crypto.randomBytes(8).toString('hex')
    },
    // Reference to parent course
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null  // Optional for backwards compatibility
    },
    // Session number within the course (auto-incremented)
    sessionNumber: {
        type: Number,
        default: null
    },
    courseName: {
        type: String,
        required: [true, 'Please add a course name']
    },
    description: {
        type: String,
        default: ''
    },
    // Classroom center coordinates
    centerLat: {
        type: Number,
        required: [true, 'Please add center latitude']
    },
    centerLng: {
        type: Number,
        required: [true, 'Please add center longitude']
    },
    // Radius in meters (default 50m)
    radius: {
        type: Number,
        default: 50
    },
    // Dynamic QR token (rotates every 30 seconds)
    qrToken: {
        type: String,
        default: () => crypto.randomBytes(16).toString('hex')
    },
    qrExpiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30000) // 30 seconds
    },
    // Session timing
    startTime: {
        type: Date,
        required: [true, 'Please add start time']
    },
    endTime: {
        type: Date,
        required: [true, 'Please add end time']
    },
    lateThreshold: {
        type: Number,
        default: 15 // Minutes after start to be marked LATE
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true
});

// Generate new QR token
sessionSchema.methods.refreshQRToken = function () {
    this.qrToken = crypto.randomBytes(16).toString('hex');
    this.qrExpiresAt = new Date(Date.now() + 30000); // 30 seconds
    return this.save();
};

// Check if QR token is valid
sessionSchema.methods.isQRTokenValid = function (token) {
    return this.qrToken === token && new Date() < this.qrExpiresAt;
};

export default mongoose.model('Session', sessionSchema);
