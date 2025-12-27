import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import './CourseDetail.css';

const CourseDetail = () => {
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [activeTab, setActiveTab] = useState('sessions');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const { token, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchCourse();
    }, [id]);

    const fetchCourse = async () => {
        try {
            const res = await axios.get(`${API_URL}/courses/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourse(res.data.data);
            setSessions(res.data.data.sessions || []);

            // Fetch enrollments
            const enrollRes = await axios.get(`${API_URL}/courses/${id}/enrollments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEnrollments(enrollRes.data.data || []);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate('/login');
            } else {
                setError('Failed to fetch course details');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStartSession = async () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const res = await axios.post(
                        `${API_URL}/courses/${id}/start-session`,
                        {
                            centerLat: position.coords.latitude,
                            centerLng: position.coords.longitude,
                            radius: course?.defaultLocation?.radius || 50,
                            duration: course?.defaultDuration || 60
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    navigate(`/admin/session/${res.data.data.session._id}`);
                } catch (err) {
                    setError(err.response?.data?.error || 'Failed to start session');
                }
            },
            () => {
                setError('Please enable location to start a session');
            },
            { enableHighAccuracy: true }
        );
    };

    const handleStopSession = async () => {
        try {
            await axios.post(
                `${API_URL}/courses/${id}/stop-session`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchCourse();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to stop session');
        }
    };

    if (loading) {
        return (
            <div className="course-detail-page">
                <div className="loading-container">
                    <div className="spinner spinner-lg"></div>
                    <p>Loading course...</p>
                </div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="course-detail-page">
                <div className="error-container">
                    <h2>Course not found</h2>
                    <button className="btn btn-primary" onClick={() => navigate('/admin/courses')}>
                        Back to Courses
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="course-detail-page">
            <header className="course-detail-header">
                <button className="back-btn" onClick={() => navigate('/admin/courses')}>
                    ← Back
                </button>
                <div className="header-info">
                    <div className="course-badge">{course.courseCode}</div>
                    <h1>{course.courseName}</h1>
                    {course.semester && <span className="semester">{course.semester}</span>}
                </div>
                <div className="header-actions">
                    {course.activeSession ? (
                        <>
                            <button className="btn btn-danger" onClick={handleStopSession}>
                                ⏹ Stop Session
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate(`/admin/session/${course.activeSession._id || course.activeSession}`)}
                            >
                                📺 View Live
                            </button>
                        </>
                    ) : (
                        <button className="btn btn-success" onClick={handleStartSession}>
                            ▶ Start Session {course.totalSessions + 1}
                        </button>
                    )}
                </div>
            </header>

            {error && (
                <div className="alert alert-error" style={{ margin: 'var(--space-4) var(--space-6)' }}>
                    {error}
                    <button onClick={() => setError('')}>×</button>
                </div>
            )}

            <div className="stats-bar">
                <div className="stat-item">
                    <span className="stat-value">{course.totalSessions}</span>
                    <span className="stat-label">Total Sessions</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{enrollments.length}</span>
                    <span className="stat-label">Enrolled Students</span>
                </div>
                <div className="stat-item">
                    <span className="stat-value">{course.defaultLocation?.radius || 50}m</span>
                    <span className="stat-label">Default Radius</span>
                </div>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sessions')}
                >
                    📅 Sessions ({sessions.length})
                </button>
                <button
                    className={`tab ${activeTab === 'students' ? 'active' : ''}`}
                    onClick={() => setActiveTab('students')}
                >
                    👥 Enrolled Students ({enrollments.length})
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'sessions' && (
                    <div className="sessions-list">
                        {sessions.length === 0 ? (
                            <div className="empty-state">
                                <p>No sessions yet. Start your first session!</p>
                            </div>
                        ) : (
                            sessions.map(session => (
                                <div
                                    key={session._id}
                                    className={`session-row ${session.isActive ? 'active' : ''}`}
                                    onClick={() => navigate(`/admin/session/${session._id}`)}
                                >
                                    <div className="session-number">
                                        #{session.sessionNumber}
                                    </div>
                                    <div className="session-info">
                                        <div className="session-date">
                                            {new Date(session.startTime).toLocaleDateString('en-IN', {
                                                weekday: 'short',
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric'
                                            })}
                                        </div>
                                        <div className="session-time">
                                            {new Date(session.startTime).toLocaleTimeString('en-IN', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                    <div className="session-status">
                                        {session.isActive ? (
                                            <span className="badge badge-live">🔴 LIVE</span>
                                        ) : (
                                            <span className="badge badge-done">✓ Completed</span>
                                        )}
                                    </div>
                                    <div className="session-arrow">→</div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="students-list">
                        {enrollments.length === 0 ? (
                            <div className="empty-state">
                                <p>No students enrolled yet. Students will be auto-enrolled when they mark attendance.</p>
                            </div>
                        ) : (
                            <table className="students-table">
                                <thead>
                                    <tr>
                                        <th>Roll No</th>
                                        <th>Name</th>
                                        <th>Attendance</th>
                                        <th>Percentage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {enrollments.map(enrollment => (
                                        <tr key={enrollment._id}>
                                            <td className="roll-no">{enrollment.studentId}</td>
                                            <td>{enrollment.studentName}</td>
                                            <td>{enrollment.attendanceCount} / {course.totalSessions}</td>
                                            <td>
                                                <div className="percentage-bar">
                                                    <div
                                                        className="percentage-fill"
                                                        style={{ width: `${enrollment.attendancePercentage || 0}%` }}
                                                    ></div>
                                                    <span>{enrollment.attendancePercentage || 0}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CourseDetail;
