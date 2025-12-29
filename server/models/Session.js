import mongoose from 'mongoose';
import crypto from 'crypto';

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String, // Public usage
        required: true,
        unique: true,
        default: () => crypto.randomBytes(8).toString('hex')
    },
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
    // Captured Data
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
        default: 50
    },
    // QR Security
    qrToken: {
        type: String,
        default: () => crypto.randomBytes(16).toString('hex')
    },
    qrExpiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30000)
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

sessionSchema.methods.refreshQRToken = function () {
    this.qrToken = crypto.randomBytes(16).toString('hex');
    this.qrExpiresAt = new Date(Date.now() + 30000);
    return this.save();
};

sessionSchema.methods.isQRTokenValid = function (token) {
    return this.qrToken === token && new Date() < this.qrExpiresAt;
};

export default mongoose.model('Session', sessionSchema);
