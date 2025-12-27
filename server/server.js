import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import config from './config/index.js';

// Load env vars
dotenv.config();

// Route imports
import authRoutes from './routes/auth.js';
import sessionRoutes from './routes/sessions.js';
import attendanceRoutes from './routes/attendance.js';
import studentRoutes from './routes/students.js';
import studentAuthRoutes from './routes/studentAuth.js';
import courseRoutes from './routes/courses.js';

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/student-auth', studentAuthRoutes);
app.use('/api/courses', courseRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'QR Attendance API is running' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: err.message || 'Server Error'
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

export default app;
