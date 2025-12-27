import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import './Courses.css';

const Courses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [newCourse, setNewCourse] = useState({
        courseCode: '',
        courseName: '',
        description: '',
        semester: ''
    });
    const [creating, setCreating] = useState(false);

    const { token, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await axios.get(`${API_URL}/courses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(res.data.data);
        } catch (err) {
            if (err.response?.status === 401) {
                logout();
                navigate('/login');
            } else {
                setError('Failed to fetch courses');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await axios.post(`${API_URL}/courses`, newCourse, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses([res.data.data, ...courses]);
            setShowModal(false);
            setNewCourse({ courseCode: '', courseName: '', description: '', semester: '' });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create course');
        } finally {
            setCreating(false);
        }
    };

    const handleStartSession = async (courseId) => {
        // Get current location first
        if (!navigator.geolocation) {
            setError('Geolocation is not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const res = await axios.post(
                        `${API_URL}/courses/${courseId}/start-session`,
                        {
                            centerLat: position.coords.latitude,
                            centerLng: position.coords.longitude,
                            radius: 50,
                            duration: 60
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    // Navigate to the active session page
                    navigate(`/admin/session/${res.data.data.session._id}`);
                } catch (err) {
                    setError(err.response?.data?.error || 'Failed to start session');
                }
            },
            (err) => {
                setError('Please enable location to start a session');
            },
            { enableHighAccuracy: true }
        );
    };

    const handleStopSession = async (course) => {
        try {
            await axios.post(
                `${API_URL}/courses/${course._id}/stop-session`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchCourses(); // Refresh to update active session status
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to stop session');
        }
    };

    if (loading) {
        return (
            <div className="courses-page">
                <div className="loading-container">
                    <div className="spinner spinner-lg"></div>
                    <p>Loading courses...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="courses-page">
            <header className="courses-header">
                <div className="header-content">
                    <h1>📚 My Courses</h1>
                    <p>Manage your courses and sessions</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowModal(true)}
                    >
                        + New Course
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/admin/dashboard')}
                    >
                        Back to Dashboard
                    </button>
                </div>
            </header>

            {error && (
                <div className="alert alert-error" style={{ margin: '0 var(--space-6) var(--space-4)' }}>
                    {error}
                    <button onClick={() => setError('')} style={{ marginLeft: 'auto' }}>×</button>
                </div>
            )}

            <div className="courses-grid">
                {courses.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📚</div>
                        <h3>No courses yet</h3>
                        <p>Create your first course to start taking attendance</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowModal(true)}
                        >
                            Create Course
                        </button>
                    </div>
                ) : (
                    courses.map(course => (
                        <div key={course._id} className={`course-card ${course.activeSession ? 'active' : ''}`}>
                            <div className="course-header">
                                <div className="course-code">{course.courseCode}</div>
                                {course.activeSession && (
                                    <span className="active-badge">🔴 LIVE</span>
                                )}
                            </div>
                            <h3 className="course-name">{course.courseName}</h3>
                            {course.semester && (
                                <p className="course-semester">{course.semester}</p>
                            )}
                            <div className="course-stats">
                                <div className="stat">
                                    <span className="stat-value">{course.totalSessions}</span>
                                    <span className="stat-label">Sessions</span>
                                </div>
                            </div>
                            <div className="course-actions">
                                {course.activeSession ? (
                                    <>
                                        <button
                                            className="btn btn-danger"
                                            onClick={() => handleStopSession(course)}
                                        >
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
                                    <button
                                        className="btn btn-success"
                                        onClick={() => handleStartSession(course._id)}
                                    >
                                        ▶ Start Session
                                    </button>
                                )}
                                <button
                                    className="btn btn-ghost"
                                    onClick={() => navigate(`/admin/courses/${course._id}`)}
                                >
                                    📊 Details
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Course Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Course</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateCourse}>
                            <div className="form-group">
                                <label className="form-label">Course Code *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g., 22CH132, CS101"
                                    value={newCourse.courseCode}
                                    onChange={e => setNewCourse({ ...newCourse, courseCode: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Course Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g., Organic Chemistry"
                                    value={newCourse.courseName}
                                    onChange={e => setNewCourse({ ...newCourse, courseName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-input"
                                    placeholder="Optional description"
                                    value={newCourse.description}
                                    onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Semester</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g., Fall 2024"
                                    value={newCourse.semester}
                                    onChange={e => setNewCourse({ ...newCourse, semester: e.target.value })}
                                />
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={creating}
                                >
                                    {creating ? 'Creating...' : 'Create Course'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Courses;
