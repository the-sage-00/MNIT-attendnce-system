import mongoose from 'mongoose';
import { calculateAcademicState } from '../utils/identity.js';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    googleId: {
        type: String,
        sparse: true, // Allows null values while still being unique when present
        unique: true
    },
    role: {
        type: String,
        enum: ['student', 'pending_professor', 'professor', 'admin'],
        default: 'student'
    },
    // Student Specific Fields (Derived & Immutable)
    rollNo: {
        type: String,
        default: null
    },
    branch: {
        type: String,
        default: null
    },
    branchCode: {
        type: String,
        default: null
    },
    admissionYear: {
        type: Number,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Dynamic Academic State
userSchema.virtual('academicState').get(function () {
    if (this.role !== 'student' || !this.admissionYear) return null;
    return calculateAcademicState(this.admissionYear);
});

export default mongoose.model('User', userSchema);
