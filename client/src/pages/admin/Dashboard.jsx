import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import API_URL from '../../config/api';
import './Dashboard.css';

const Dashboard = () => {
    const { admin, token, logout } = useAuth();
    const navigate = useNavigate();

    const [sessions, setSessions] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // New session form state
    const [newSession, setNewSession] = useState({
        courseName: '',
        description: '',
        centerLat: '',
        centerLng: '',
        radius: 50,
        startTime: '',
        endTime: '',
        lateThreshold: 15
    });
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState('');

    useEffect(() => {
        fetchCourses();
        fetchSessions();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await axios.get(`${API_URL}/courses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch courses:', error);
        }
    };

    const fetchSessions = async () => {
        try {
            const res = await axios.get(`${API_URL}/sessions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSessions(res.data.data);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSession = async (e) => {
        e.preventDefault();
        setCreateError('');
        setCreateLoading(true);

        try {
            await axios.post(`${API_URL}/sessions`, newSession, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowCreateModal(false);
            setNewSession({
                courseName: '',
                description: '',
                centerLat: '',
                centerLng: '',
                radius: 50,
                startTime: '',
                endTime: '',
                lateThreshold: 15
            });
            fetchSessions();
        } catch (error) {
            setCreateError(error.response?.data?.error || 'Failed to create session');
        } finally {
            setCreateLoading(false);
        }
    };

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setNewSession(prev => ({
                        ...prev,
                        centerLat: position.coords.latitude.toFixed(6),
                        centerLng: position.coords.longitude.toFixed(6)
                    }));
                },
                (error) => {
                    setCreateError('Failed to get location. Please enter manually.');
                }
            );
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>📊 Dashboard</h1>
                    <p>Welcome, {admin?.name}</p>
                </div>
                <div className="header-right">
                    <ThemeToggle />
                    <Link to="/admin/courses" className="btn btn-primary">
                        📚 Courses
                    </Link>
                    <Link to="/admin/students" className="btn btn-secondary">
                        👥 Students
                    </Link>
                    <button className="btn btn-secondary" onClick={() => setShowCreateModal(true)}>
                        + Quick Session
                    </button>
                    <button className="btn btn-secondary" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">📚</div>
                        <div className="stat-info">
                            <h3>{sessions.length}</h3>
                            <p>Total Sessions</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                            <h3>{sessions.filter(s => s.isActive).length}</h3>
                            <p>Active Sessions</p>
                        </div>
                    </div>
                </div>

                {/* Your Courses Section */}
                <div className="courses-section">
                    <div className="section-header">
                        <h2>📚 Your Courses</h2>
                        <Link to="/admin/courses" className="btn btn-sm btn-secondary">View All</Link>
                    </div>
                    {courses.length === 0 ? (
                        <div className="empty-state-small">
                            <p>No courses yet. <Link to="/admin/courses">Create your first course</Link></p>
                        </div>
                    ) : (
                        <div className="courses-grid">
                            {courses.slice(0, 4).map(course => (
                                <Link key={course._id} to={`/admin/courses/${course._id}`} className="course-card">
                                    <div className="course-badge">{course.courseCode}</div>
                                    <h3>{course.courseName}</h3>
                                    <div className="course-meta">
                                        <span>📅 {course.totalSessions} sessions</span>
                                        {course.activeSession && <span className="live-badge">🔴 LIVE</span>}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="sessions-section">
                    <h2>Your Sessions</h2>

                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading sessions...</p>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📭</div>
                            <h3>No Sessions Yet</h3>
                            <p>Create your first session to start tracking attendance</p>
                            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                Create Session
                            </button>
                        </div>
                    ) : (
                        <div className="sessions-grid">
                            {sessions.map(session => (
                                <Link
                                    key={session._id}
                                    to={`/admin/session/${session._id}`}
                                    className="session-card"
                                >
                                    <div className="session-header">
                                        <h3>{session.courseName}</h3>
                                        <span className={`status-dot ${session.isActive ? 'active' : 'inactive'}`}></span>
                                    </div>
                                    <p className="session-desc">{session.description || 'No description'}</p>
                                    <div className="session-meta">
                                        <span>📍 {session.radius}m radius</span>
                                        <span>⏰ {new Date(session.startTime).toLocaleDateString()}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Create Session Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Session</h2>
                            <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>

                        <form onSubmit={handleCreateSession} className="modal-form">
                            <div className="form-group">
                                <label className="form-label">Course Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g., CS101 - Introduction to Programming"
                                    value={newSession.courseName}
                                    onChange={e => setNewSession({ ...newSession, courseName: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Optional description"
                                    value={newSession.description}
                                    onChange={e => setNewSession({ ...newSession, description: e.target.value })}
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Center Latitude *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="form-input"
                                        placeholder="28.6139"
                                        value={newSession.centerLat}
                                        onChange={e => setNewSession({ ...newSession, centerLat: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Center Longitude *</label>
                                    <input
                                        type="number"
                                        step="any"
                                        className="form-input"
                                        placeholder="77.2090"
                                        value={newSession.centerLng}
                                        onChange={e => setNewSession({ ...newSession, centerLng: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="button" className="btn btn-secondary location-btn" onClick={getCurrentLocation}>
                                📍 Use My Current Location
                            </button>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Radius (meters)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={newSession.radius}
                                        onChange={e => setNewSession({ ...newSession, radius: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Late Threshold (min)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={newSession.lateThreshold}
                                        onChange={e => setNewSession({ ...newSession, lateThreshold: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Start Time *</label>
                                    <input
                                        type="datetime-local"
                                        className="form-input"
                                        value={newSession.startTime}
                                        onChange={e => setNewSession({ ...newSession, startTime: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Time *</label>
                                    <input
                                        type="datetime-local"
                                        className="form-input"
                                        value={newSession.endTime}
                                        onChange={e => setNewSession({ ...newSession, endTime: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            {createError && <div className="alert alert-error">{createError}</div>}

                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                                    {createLoading ? 'Creating...' : 'Create Session'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
