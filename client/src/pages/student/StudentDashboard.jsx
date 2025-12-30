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

    const [summary, setSummary] = useState(null);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            await Promise.all([fetchSummary(), fetchCourses()]);
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

    const fetchSummary = async () => {
        try {
            const res = await axios.get(`${API_URL}/attendance/summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSummary(res.data.data);
        } catch (error) {
            console.error('Failed to fetch attendance summary:', error);
        }
    };

    const getPercentageColor = (percentage) => {
        if (percentage >= 75) return 'good';
        if (percentage >= 50) return 'warning';
        return 'danger';
    };

    return (
        <div className="student-dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>📚 My Dashboard</h1>
                    <p>Welcome, {user?.name}</p>
                </div>
                <div className="header-right">
                    <ThemeToggle />
                    <Link to="/student/scan-qr" className="btn btn-success">
                        📷 Mark Attendance
                    </Link>
                    <button className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="dashboard-content">
                {/* Profile + Overall Stats */}
                <div className="top-section">
                    {/* Profile Card */}
                    <div className="profile-card card">
                        <div className="profile-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
                        <div className="profile-info">
                            <h3>{user?.name}</h3>
                            <p className="roll-badge">{user?.rollNo || 'Student'}</p>
                            <p className="email">{user?.email}</p>
                            {user?.branch && <p className="branch-info">{user.branch} | Year {user?.academicState?.year || '?'}</p>}
                        </div>
                    </div>

                    {/* Overall Attendance Card */}
                    <div className="overall-card card">
                        <h3>📊 Overall Attendance</h3>
                        <div className="overall-percentage">
                            <div className={`percentage-circle ${getPercentageColor(summary?.overall?.overallPercentage || 0)}`}>
                                <span className="percentage-value">{summary?.overall?.overallPercentage || 0}%</span>
                            </div>
                        </div>
                        <div className="overall-stats">
                            <div className="overall-stat">
                                <span className="stat-num">{summary?.overall?.totalSessionsAttended || 0}</span>
                                <span className="stat-label">Attended</span>
                            </div>
                            <div className="overall-stat">
                                <span className="stat-num">{summary?.overall?.totalSessionsHeld || 0}</span>
                                <span className="stat-label">Total</span>
                            </div>
                            <div className="overall-stat">
                                <span className="stat-num">{summary?.overall?.totalCourses || 0}</span>
                                <span className="stat-label">Courses</span>
                            </div>
                        </div>
                        {summary?.overall?.coursesBelow75 > 0 && (
                            <div className="warning-alert">
                                ⚠️ {summary.overall.coursesBelow75} course(s) below 75% attendance
                            </div>
                        )}
                    </div>
                </div>

                {/* Course-wise Attendance */}
                <div className="card course-attendance-section">
                    <h3>📈 Course-wise Attendance</h3>
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                        </div>
                    ) : !summary?.courses || summary.courses.length === 0 ? (
                        <p className="empty-state">No attendance records yet. Mark your first attendance!</p>
                    ) : (
                        <div className="course-attendance-list">
                            {summary.courses.map((course, idx) => (
                                <div key={idx} className={`course-attendance-item ${!course.meetsMinimum ? 'below-threshold' : ''}`}>
                                    <div className="course-info">
                                        <span className="course-code">{course.course.courseCode}</span>
                                        <h4>{course.course.courseName}</h4>
                                    </div>
                                    <div className="attendance-bar-container">
                                        <div className="attendance-bar">
                                            <div
                                                className={`attendance-fill ${getPercentageColor(course.attendancePercentage)}`}
                                                style={{ width: `${course.attendancePercentage}%` }}
                                            ></div>
                                        </div>
                                        <span className="attendance-text">
                                            {course.sessionsAttended}/{course.totalSessions}
                                        </span>
                                    </div>
                                    <div className={`percentage-badge ${getPercentageColor(course.attendancePercentage)}`}>
                                        {course.attendancePercentage}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Two Column Layout */}
                <div className="bottom-section">
                    {/* Available Courses */}
                    <div className="card">
                        <h3>📚 My Courses</h3>
                        {courses.length === 0 ? (
                            <p className="empty-state">No courses found for your academic year.</p>
                        ) : (
                            <div className="simple-courses-list">
                                {courses.map(course => (
                                    <div key={course._id} className="simple-course-item">
                                        <div className="course-details">
                                            <span className="code-badge">{course.courseCode}</span>
                                            <span className="course-name">{course.courseName}</span>
                                        </div>
                                        <span className="professor-name">Prof. {course.professor?.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Activity */}
                    <div className="card">
                        <h3>📅 Recent Activity</h3>
                        {!summary?.recentHistory || summary.recentHistory.length === 0 ? (
                            <p className="empty-state">No recent attendance.</p>
                        ) : (
                            <div className="recent-list">
                                {summary.recentHistory.map((record, idx) => (
                                    <div key={idx} className="recent-item">
                                        <div className="recent-info">
                                            <span className="recent-course">{record.courseCode}</span>
                                            <span className="recent-date">
                                                {record.date ? new Date(record.date).toLocaleDateString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short'
                                                }) : 'N/A'}
                                            </span>
                                        </div>
                                        <span className={`status-badge ${record.status?.toLowerCase()}`}>
                                            {record.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StudentDashboard;
