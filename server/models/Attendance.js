import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Redundant but useful for fast display without population
    studentName: {
        type: String,
        required: true
    },
    rollNo: {
        type: String,
        required: true
    },
    // Verification Data
    timestamp: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['PRESENT', 'LATE', 'REJECTED'],
        default: 'PRESENT'
    },
    // Location Data at time of scan
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    distance: { type: Number, required: true },

    // Anticheat
    deviceFingerprint: {
        type: String,
        required: true
    },
    ipAddress: String
}, {
    timestamps: true
});

// One attendance per student per session
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });
// One attendance per device per session
attendanceSchema.index({ session: 1, deviceFingerprint: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
