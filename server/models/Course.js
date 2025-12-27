import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
    courseCode: {
        type: String,
        required: [true, 'Please add a course code'],
        trim: true,
        uppercase: true
        // e.g., "22CH132", "CS101"
    },
    courseName: {
        type: String,
        required: [true, 'Please add a course name']
        // e.g., "Organic Chemistry", "Data Structures"
    },
    description: {
        type: String,
        default: ''
    },
    semester: {
        type: String,
        default: ''
        // e.g., "Fall 2024", "Spring 2025"
    },
    // Default location for sessions (can be overridden per session)
    defaultLocation: {
        latitude: {
            type: Number,
            default: null
        },
        longitude: {
            type: Number,
            default: null
        },
        radius: {
            type: Number,
            default: 50
        }
    },
    // Default duration in minutes
    defaultDuration: {
        type: Number,
        default: 60
    },
    // Late threshold in minutes
    lateThreshold: {
        type: Number,
        default: 15
    },
    // Stats
    totalSessions: {
        type: Number,
        default: 0
    },
    // Current active session ID (if any)
    activeSession: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        default: null
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    }
}, {
    timestamps: true
});

// Index for faster queries
CourseSchema.index({ createdBy: 1, isArchived: 1 });
CourseSchema.index({ courseCode: 1, createdBy: 1 }, { unique: true });

export default mongoose.model('Course', CourseSchema);
