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
        // Logic: Must match student's branch
    },
    year: {
        type: Number, // 1, 2, 3, 4
        required: true
    },
    semester: {
        type: Number, // 1-8
        required: true
    },

    // Owning Professor
    professor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Default location for sessions
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

CourseSchema.index({ professor: 1 });
CourseSchema.index({ branch: 1, year: 1, semester: 1 });

export default mongoose.model('Course', CourseSchema);
