import mongoose from 'mongoose';

const CourseEnrollmentSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    studentId: {
        type: String,
        required: [true, 'Student ID is required'],
        uppercase: true,  // Case-insensitive storage
        trim: true
        // e.g., "2024UCH1345"
    },
    studentName: {
        type: String,
        required: [true, 'Student name is required']
    },
    // Reference to student account (if they have one)
    studentAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        default: null
    },
    enrolledAt: {
        type: Date,
        default: Date.now
    },
    // Stats for quick access
    attendanceCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index: one enrollment per student per course
CourseEnrollmentSchema.index({ course: 1, studentId: 1 }, { unique: true });

// Index for finding all enrollments for a course
CourseEnrollmentSchema.index({ course: 1, isActive: 1 });

// Index for finding all courses a student is enrolled in
CourseEnrollmentSchema.index({ studentId: 1 });

export default mongoose.model('CourseEnrollment', CourseEnrollmentSchema);
