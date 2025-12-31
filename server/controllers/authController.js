import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import config from '../config/index.js';
import { parseIdentityFromEmail } from '../utils/identity.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Helper function to generate JWT
 */
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpire }
    );
};

/**
 * @route   POST /api/auth/google/student
 * @desc    Student Login (MNIT emails only) & Implicit Signup
 * @access  Public
 */
export const studentGoogleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                success: false,
                error: 'Google credential is required'
            });
        }

        // Verify Google Token
        let ticket;
        try {
            ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });
        } catch (verifyError) {
            console.error('Token verification failed:', verifyError);
            return res.status(401).json({
                success: false,
                error: 'Invalid Google token'
            });
        }

        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        // Student MUST use MNIT email
        if (!email.endsWith('@mnit.ac.in')) {
            return res.status(403).json({
                success: false,
                error: 'Students must use institutional email (@mnit.ac.in)'
            });
        }

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Parse student identity from email
            const identity = parseIdentityFromEmail(email);

            if (!identity) {
                return res.status(403).json({
                    success: false,
                    error: 'Invalid student email format. Expected: YEAR-BRANCH-ROLL@mnit.ac.in'
                });
            }

            // Create student user
            user = await User.create({
                email,
                name,
                googleId,
                role: 'student',
                rollNo: identity.rollNo,
                branch: identity.branchName,
                branchCode: identity.branchCode,
                admissionYear: identity.admissionYear,
                pendingReview: identity.needsReview || false // Flag for admin review if non-standard branch
            });
            console.log(`New student registered: ${email}${identity.needsReview ? ' (pending review)' : ''}`);
        }

        // Verify user is a student
        if (user.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: 'This is not a student account. Please use appropriate login.'
            });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    branch: user.branch,
                    academicState: user.academicState
                },
                token
            }
        });

    } catch (error) {
        console.error('Student Login Error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

/**
 * @route   POST /api/auth/google/professor
 * @desc    Professor Login (Any Google email) & Implicit Signup
 * @access  Public
 */
export const professorGoogleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                success: false,
                error: 'Google credential is required'
            });
        }

        // Verify Google Token
        let ticket;
        try {
            ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });
        } catch (verifyError) {
            console.error('Token verification failed:', verifyError);
            return res.status(401).json({
                success: false,
                error: 'Invalid Google token'
            });
        }

        const payload = ticket.getPayload();
        const { email, name, sub: googleId } = payload;

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create professor user (pending approval)
            user = await User.create({
                email,
                name,
                googleId,
                role: 'pending_professor'
            });
            console.log(`New professor registered (pending): ${email}`);
        }

        // Check role - reject if student trying to login as professor
        if (user.role === 'student') {
            return res.status(403).json({
                success: false,
                error: 'Student accounts cannot access professor portal.'
            });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        console.error('Professor Login Error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed'
        });
    }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

/**
 * @route   POST /api/auth/admin/login
 * @desc    Admin Login with email/password from .env
 * @access  Public
 */
export const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        // Check against .env credentials
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminEmail || !adminPassword) {
            return res.status(500).json({
                success: false,
                error: 'Admin credentials not configured'
            });
        }

        if (email !== adminEmail || password !== adminPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Find or create admin user in DB
        let user = await User.findOne({ email: adminEmail, role: 'admin' });

        if (!user) {
            user = await User.create({
                email: adminEmail,
                name: 'System Admin',
                role: 'admin',
                googleId: 'env-admin'
            });
        }

        const token = generateToken(user);

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });

    } catch (error) {
        console.error('Admin Login Error:', error);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
};

/**
 * @route   PUT /api/auth/batch
 * @desc    Update student's batch
 * @access  Private (Student)
 */
export const updateBatch = async (req, res) => {
    try {
        const { batch } = req.body;

        if (!['1', '2', '3', '4', '5'].includes(batch)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid batch. Must be 1, 2, 3, 4, or 5'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { batch },
            { new: true }
        );

        res.json({
            success: true,
            message: 'Batch updated successfully',
            data: {
                batch: user.batch
            }
        });
    } catch (error) {
        console.error('Update Batch Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update batch'
        });
    }
};
