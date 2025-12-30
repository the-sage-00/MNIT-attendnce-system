import mongoose from 'mongoose';

/**
 * Timetable Model
 * Stores semester-level timetable for each branch/year combination.
 * Admin uploads this once per semester.
 */
const TimetableSchema = new mongoose.Schema({
    // Academic binding
    branch: {
        type: String,
        required: true,
        lowercase: true,
        enum: ['uch', 'ucs', 'ume', 'umt', 'uce', 'uec', 'uee']
    },
    year: {
        type: Number,
        required: true,
        min: 1,
        max: 4
    },
    semester: {
        type: Number,
        required: true,
        min: 1,
        max: 8
    },
    academicYear: {
        type: String, // e.g., '2024-2025'
        required: true
    },

    // Admin who created/uploaded
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // Timetable slots (array of schedule entries)
    slots: [{
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
        course: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Course',
            required: true
        },
        room: {
            type: String,
            default: 'TBD'
        }
    }],

    // Whether this timetable is currently active
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Unique constraint: one active timetable per branch/year/semester
TimetableSchema.index(
    { branch: 1, year: 1, semester: 1, academicYear: 1 },
    { unique: true }
);

// Get timetable for a specific day
TimetableSchema.methods.getSlotsForDay = function (day) {
    return this.slots
        .filter(slot => slot.day === day)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
};

// Get all days with classes
TimetableSchema.virtual('scheduledDays').get(function () {
    const days = [...new Set(this.slots.map(slot => slot.day))];
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
});

export default mongoose.model('Timetable', TimetableSchema);
