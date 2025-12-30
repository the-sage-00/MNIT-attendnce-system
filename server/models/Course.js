import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
    courseCode: {
        type: String,
        required: [true, 'Please add a course code'],
        trim: true,
        uppercase: true
    },
    courseName: {
        type: String,
        required: [true, 'Please add a course name']
    },
    description: {
        type: String,
        default: ''
    },

    // Academic Binding
    branch: {
        type: String,
        required: true,
        lowercase: true,
        enum: ['uch', 'ucs', 'ume', 'umt', 'uce', 'uec', 'uee']
    },
    year: {
        type: Number, // 1, 2, 3, 4
        required: true,
        min: 1,
        max: 4
    },
    semester: {
        type: Number, // 1-8
        required: true,
        min: 1,
        max: 8
    },

    // Admin who created the course
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Professors who have claimed this course (can be multiple)
    claimedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // Schedule (set by admin, can be modified by professor)
    schedule: {
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            required: true
        },
        startTime: {
            type: String, // HH:MM format
            required: true
        },
        endTime: {
            type: String, // HH:MM format
            required: true
        },
        room: {
            type: String,
            default: ''
        }
    },

    // Default location for sessions (geofencing)
    defaultLocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        radius: { type: Number, default: 50 }
    },
    defaultDuration: { type: Number, default: 60 },
    lateThreshold: { type: Number, default: 15 },

    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
CourseSchema.index({ createdBy: 1 });
CourseSchema.index({ claimedBy: 1 });
CourseSchema.index({ branch: 1, year: 1, semester: 1 });
CourseSchema.index({ courseCode: 1, branch: 1, year: 1 }, { unique: true });

// Virtual to check if course has been claimed
CourseSchema.virtual('isClaimed').get(function () {
    return this.claimedBy && this.claimedBy.length > 0;
});

// Virtual to get professor count
CourseSchema.virtual('professorCount').get(function () {
    return this.claimedBy ? this.claimedBy.length : 0;
});

export default mongoose.model('Course', CourseSchema);
