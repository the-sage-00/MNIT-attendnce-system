import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import config from './config/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Route imports
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import courseRoutes from './routes/courses.js';
import sessionRoutes from './routes/sessions.js';
import attendanceRoutes from './routes/attendance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
connectDB();

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
app.use(cors({
    origin: config.frontendUrl,
    credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (if any needed, though "No image upload" per prompt)
// Keeping for safety if existing assets exist
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================
// API ROUTES
// ============================================

// Authentication (Google Only)
app.use('/api/auth', authRoutes);

// Admin Management
app.use('/api/admin', adminRoutes);

// Course Management (Professor)
app.use('/api/courses', courseRoutes);

// Session Management (Professor)
app.use('/api/sessions', sessionRoutes);

// Attendance Marking & Tracking
app.use('/api/attendance', attendanceRoutes);


// ============================================
// UTILITY ROUTES
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'QR Attendance API is running',
        version: '3.0.0', // Bumped version
        timestamp: new Date().toISOString()
    });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);

    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Internal Server Error'
    });
});

// ============================================
// SERVER START
// ============================================

const PORT = config.port || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════╗
║     QR Attendance System - Backend        ║
╚═══════════════════════════════════════════╝
Server running on port ${PORT}
API: http://localhost:${PORT}/api
    `);
});

export default app;
