import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import axios from 'axios';
import API_URL from '../../config/api';
import './StudentDashboard.css';

const StudentDashboard = () => {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();

    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [stats, setStats] = useState({ present: 0, late: 0, total: 0 });
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await Promise.all([fetchHistory(), fetchCourses()]);
            setLoading(false);
        };
        fetchData();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await axios.get(`${API_URL}/courses/my-courses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(res.data.data);
        } catch (error) {
            console.error('Failed to fetch courses:', error);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${API_URL}/attendance/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data.data;
            setAttendanceHistory(data);

            // Calculate Stats
            const present = data.filter(r => r.status === 'PRESENT').length;
            const late = data.filter(r => r.status === 'LATE').length;
            setStats({
                present,
                late,
                total: data.length
            });
        } catch (error) {
            console.error('Failed to fetch attendance:', error);
        }
    };

    return (
        <div className="student-dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>My Dashboard</h1>
                    <p>Welcome, {user?.name}</p>
                </div>
                <div className="header-right">
                    <ThemeToggle />
                    <Link to="/student/scan-qr" className="btn btn-success">Mark Attendance</Link>
                    <button className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>Logout</button>
                </div>
            </header>

            <main className="dashboard-content">
                {/* Profile Card */}
                <div className="profile-card card">
                    <div className="profile-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
                    <div className="profile-info">
                        <h3>{user?.name}</h3>
                        <p className="roll-badge">{user?.academicState?.year ? `Year ${user.academicState.year}` : 'Student'}</p>
                        <p className="email">{user?.email}</p>
                        {user?.branch && <p className="branch-info">{user.branch}</p>}
                    </div>
                </div>

                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon total">📚</div>
                        <div className="stat-info">
                            <h3>{stats.total}</h3>
                            <p>Total Classes</p>
                        </div>
                    </div>
                    <div className="stat-card present">
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                            <h3>{stats.present}</h3>
                            <p>Present</p>
                        </div>
                    </div>
                    <div className="stat-card late">
                        <div className="stat-icon">⏰</div>
                        <div className="stat-info">
                            <h3>{stats.late}</h3>
                            <p>Late</p>
                        </div>
                    </div>
                </div>

                {/* Courses List */}
                <div className="courses-section card" style={{ marginBottom: '2rem' }}>
                    <h3>📚 My Enrolled Courses</h3>
                    {courses.length === 0 ? (
                        <p className="empty-state">No courses found matching your academic year/branch.</p>
                    ) : (
                        <div className="courses-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                            gap: '1rem',
                            marginTop: '1rem'
                        }}>
                            {courses.map(course => (
                                <div key={course._id} className="course-card" style={{
                                    border: '1px solid var(--border-subtle)',
                                    padding: '1rem',
                                    borderRadius: '0.5rem',
                                    backgroundColor: 'var(--bg-elevated)'
                                }}>
                                    <span style={{
                                        background: 'var(--primary-muted)',
                                        color: 'var(--primary)',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold'
                                    }}>{course.courseCode}</span>
                                    <h4 style={{ margin: '8px 0', color: 'var(--text-primary)' }}>{course.courseName}</h4>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        Prof. {course.professor?.name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent History */}
                <div className="courses-section card">
                    <h3>📅 Recent Activity</h3>
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                        </div>
                    ) : attendanceHistory.length === 0 ? (
                        <div className="empty-state">
                            <p>No attendance records found.</p>
                        </div>
                    ) : (
                        <div className="courses-list">
                            {attendanceHistory.slice(0, 5).map(record => (
                                <div key={record._id} className="course-item">
                                    <div className="course-info">
                                        <span className="course-code">
                                            {new Date(record.createdAt).toLocaleDateString()}
                                        </span>
                                        <h4>{record.session?.courseName || 'Class'}</h4>
                                        <span className="time">
                                            {new Date(record.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <div className="course-stats">
                                        <span className={`status-badge ${record.status.toLowerCase()}`}>
                                            {record.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudentDashboard;
