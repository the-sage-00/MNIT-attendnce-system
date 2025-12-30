import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import API_URL from '../../config/api';
import './Dashboard.css';

const AdminDashboard = () => {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();

    const [analytics, setAnalytics] = useState(null);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [analyticsRes, pendingRes] = await Promise.all([
                axios.get(`${API_URL}/admin/analytics`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_URL}/admin/pending-professors`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setAnalytics(analyticsRes.data.data);
            setPendingUsers(pendingRes.data.data);
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (id, action) => {
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;
        try {
            await axios.put(`${API_URL}/admin/approve-professor/${id}`,
                { action },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`User ${action}ed successfully`);
            fetchData();
        } catch (error) {
            toast.error('Action failed');
        }
    };

    if (loading) {
        return (
            <div className="dashboard-page">
                <div className="loading-center">
                    <div className="spinner"></div>
                    <p>Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>🛡️ Admin Dashboard</h1>
                    <p>System Administration</p>
                </div>
                <div className="header-right">
                    <ThemeToggle />
                    <button className="btn btn-secondary" onClick={() => navigate('/admin/students')}>
                        Students
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/admin/courses')}>
                        Courses
                    </button>
                    <button className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="dashboard-content">
                {/* Analytics Cards */}
                <div className="analytics-grid">
                    <div className="stat-card primary">
                        <div className="stat-icon">👥</div>
                        <div className="stat-info">
                            <span className="stat-value">{analytics?.users?.totalStudents || 0}</span>
                            <span className="stat-label">Total Students</span>
                        </div>
                    </div>
                    <div className="stat-card secondary">
                        <div className="stat-icon">👨‍🏫</div>
                        <div className="stat-info">
                            <span className="stat-value">{analytics?.users?.totalProfessors || 0}</span>
                            <span className="stat-label">Professors</span>
                        </div>
                    </div>
                    <div className="stat-card success">
                        <div className="stat-icon">📚</div>
                        <div className="stat-info">
                            <span className="stat-value">{analytics?.courses?.total || 0}</span>
                            <span className="stat-label">Courses</span>
                        </div>
                    </div>
                    <div className="stat-card info">
                        <div className="stat-icon">📊</div>
                        <div className="stat-info">
                            <span className="stat-value">{analytics?.sessions?.total || 0}</span>
                            <span className="stat-label">Total Sessions</span>
                        </div>
                    </div>
                    <div className="stat-card warning">
                        <div className="stat-icon">🔴</div>
                        <div className="stat-info">
                            <span className="stat-value">{analytics?.sessions?.active || 0}</span>
                            <span className="stat-label">Active Now</span>
                        </div>
                    </div>
                    <div className="stat-card danger">
                        <div className="stat-icon">⚠️</div>
                        <div className="stat-info">
                            <span className="stat-value">{analytics?.attendance?.suspicious || 0}</span>
                            <span className="stat-label">Suspicious</span>
                        </div>
                    </div>
                </div>

                {/* Attendance Overview */}
                <div className="card attendance-overview">
                    <h2>📈 Attendance Overview</h2>
                    <div className="overview-grid">
                        <div className="overview-item">
                            <span className="overview-value">{analytics?.attendance?.total || 0}</span>
                            <span className="overview-label">Total Records</span>
                        </div>
                        <div className="overview-item">
                            <span className="overview-value">{analytics?.attendance?.today || 0}</span>
                            <span className="overview-label">Today</span>
                        </div>
                        <div className="overview-item">
                            <span className="overview-value">{analytics?.attendance?.thisWeek || 0}</span>
                            <span className="overview-label">This Week</span>
                        </div>
                        <div className="overview-item highlight">
                            <span className="overview-value">{analytics?.attendance?.averageRate || 0}%</span>
                            <span className="overview-label">Success Rate</span>
                        </div>
                    </div>
                </div>

                {/* Two column layout */}
                <div className="dashboard-columns">
                    {/* Pending Approvals */}
                    <div className="card">
                        <h2>⏳ Pending Approvals</h2>
                        <div className="pending-info">
                            <span className="pending-badge professors">
                                {analytics?.users?.pendingProfessors || 0} Professors
                            </span>
                            <span className="pending-badge students">
                                {analytics?.users?.pendingStudents || 0} Students
                            </span>
                        </div>

                        {pendingUsers.length === 0 ? (
                            <p className="empty-state">No pending professor requests.</p>
                        ) : (
                            <div className="pending-list">
                                {pendingUsers.map(u => (
                                    <div key={u._id} className="pending-item">
                                        <div className="pending-user">
                                            <strong>{u.name}</strong>
                                            <span>{u.email}</span>
                                        </div>
                                        <div className="pending-actions">
                                            <button
                                                className="btn btn-sm btn-success"
                                                onClick={() => handleApproval(u._id, 'approve')}
                                            >
                                                ✓
                                            </button>
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => handleApproval(u._id, 'reject')}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Top Courses */}
                    <div className="card">
                        <h2>🏆 Top Courses</h2>
                        {analytics?.topCourses?.length === 0 ? (
                            <p className="empty-state">No courses yet.</p>
                        ) : (
                            <div className="top-list">
                                {analytics?.topCourses?.map((course, i) => (
                                    <div key={i} className="top-item">
                                        <span className="top-rank">#{i + 1}</span>
                                        <div className="top-info">
                                            <strong>{course.courseCode}</strong>
                                            <span>{course.courseName}</span>
                                        </div>
                                        <span className="top-count">{course.sessionCount} sessions</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Suspicious Activity */}
                {analytics?.recentSuspicious?.length > 0 && (
                    <div className="card suspicious-card">
                        <h2>🚨 Recent Suspicious Activity</h2>
                        <div className="suspicious-list">
                            {analytics.recentSuspicious.map((item, i) => (
                                <div key={i} className="suspicious-item">
                                    <div className="suspicious-info">
                                        <strong>{item.rollNo || item.studentName}</strong>
                                        <span className="suspicious-flags">
                                            {item.securityFlags?.join(', ') || 'Flagged'}
                                        </span>
                                    </div>
                                    <span className="suspicious-score">Score: {item.suspicionScore}</span>
                                    <span className="suspicious-time">
                                        {new Date(item.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;
