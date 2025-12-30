import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import API_URL from '../../config/api';
import './ProfessorDashboard.css';

const ProfessorDashboard = () => {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();

    const [courses, setCourses] = useState([]);
    const [pastSessions, setPastSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sessionsLoading, setSessionsLoading] = useState(true);

    // Modal State
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [newCourse, setNewCourse] = useState({
        courseCode: '', courseName: '', branch: '', year: 1, semester: 1
    });
    const [newSession, setNewSession] = useState({
        courseId: '', duration: 60, radius: 50
    });
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState('');
    const [gettingLocation, setGettingLocation] = useState(false);

    // Function to get location
    const getLocation = useCallback(() => {
        setGettingLocation(true);
        setLocationError('');

        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            setGettingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            pos => {
                setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
                setGettingLocation(false);
            },
            err => {
                console.error('Location error:', err);
                let errorMsg = 'Unable to get location';
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        errorMsg = 'Location permission denied. Please allow GPS access.';
                        break;
                    case err.POSITION_UNAVAILABLE:
                        errorMsg = 'Location unavailable. Please check your GPS.';
                        break;
                    case err.TIMEOUT:
                        errorMsg = 'Location request timed out. Try again.';
                        break;
                }
                setLocationError(errorMsg);
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }, []);

    useEffect(() => {
        fetchCourses();
        fetchSessions();
        // Try to get location on load
        getLocation();
    }, []);

    // Retry getting location when session modal opens
    useEffect(() => {
        if (showSessionModal && !location) {
            getLocation();
        }
    }, [showSessionModal, location, getLocation]);

    const fetchCourses = async () => {
        try {
            const res = await axios.get(`${API_URL}/courses`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(res.data.data || []);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessions = async () => {
        try {
            setSessionsLoading(true);
            const res = await axios.get(`${API_URL}/sessions/professor/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPastSessions(res.data.data || []);
        } catch (error) {
            console.error('Fetch sessions error:', error);
        } finally {
            setSessionsLoading(false);
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/courses`, newCourse, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowCourseModal(false);
            setNewCourse({ courseCode: '', courseName: '', branch: 'CSE', year: 1, semester: 1 });
            fetchCourses();
            toast.success('Course created successfully!');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create course');
        }
    };

    const handleStartSession = async (e) => {
        e.preventDefault();
        if (!location) {
            toast.error('Location not available. Please allow GPS.');
            return;
        }
        try {
            const res = await axios.post(`${API_URL}/sessions`, {
                courseId: newSession.courseId,
                duration: newSession.duration,
                radius: newSession.radius,
                centerLat: location.lat,
                centerLng: location.lng
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowSessionModal(false);
            toast.success('Session started successfully!');
            navigate(`/professor/session/${res.data.data._id}`);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to start session');
        }
    };

    const handleDeleteCourse = async (courseId, courseName) => {
        const confirmMsg = `Delete "${courseName}"?\n\nThis will:\n- Permanently delete if no sessions exist\n- Archive if sessions exist (can be restored later)\n\nContinue?`;

        if (!confirm(confirmMsg)) return;

        try {
            // Try permanent delete first
            const res = await axios.delete(`${API_URL}/courses/${courseId}?permanent=true`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(res.data.message);
            fetchCourses();
        } catch (error) {
            if (error.response?.status === 400 && error.response?.data?.sessionCount) {
                // Has sessions - archive instead
                const archiveConfirm = confirm(
                    `This course has ${error.response.data.sessionCount} session(s).\n\nWould you like to archive it instead?`
                );

                if (archiveConfirm) {
                    try {
                        const archiveRes = await axios.delete(`${API_URL}/courses/${courseId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        toast.success(archiveRes.data.message);
                        fetchCourses();
                    } catch (archiveError) {
                        toast.error(archiveError.response?.data?.error || 'Failed to archive course');
                    }
                }
            } else {
                toast.error(error.response?.data?.error || 'Failed to delete course');
            }
        }
    };

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>Professor Dashboard</h1>
                    <p>Welcome, {user?.name}</p>
                </div>
                <div className="header-right">
                    <ThemeToggle />
                    <button className="btn btn-primary" onClick={() => setShowSessionModal(true)}>
                        + Start Session
                    </button>
                    <button className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>Logout</button>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="courses-section card">
                    <div className="section-header">
                        <h2>My Courses</h2>
                        <button className="btn btn-sm btn-secondary" onClick={() => setShowCourseModal(true)}>+ New Course</button>
                    </div>

                    {loading ? (
                        <div className="spinner"></div>
                    ) : courses.length === 0 ? (
                        <p className="empty-state">No courses yet. Create your first course!</p>
                    ) : (
                        <div className="courses-grid">
                            {courses.map(course => (
                                <div key={course._id} className="course-card">
                                    <span className="course-code">{course.courseCode}</span>
                                    <h3>{course.courseName}</h3>
                                    <p>{course.branch} - Year {course.year}, Sem {course.semester}</p>
                                    <div className="course-actions">
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => {
                                                setNewSession({ ...newSession, courseId: course._id });
                                                setShowSessionModal(true);
                                            }}
                                        >
                                            ▶ Start Session
                                        </button>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => navigate(`/professor/course/${course._id}/attendance`)}
                                        >
                                            📊 Attendance
                                        </button>
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => handleDeleteCourse(course._id, course.courseName)}
                                            title="Delete course"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Session History Section */}
                <div className="sessions-section card" style={{ marginTop: '2rem' }}>
                    <div className="section-header">
                        <h2>📜 Recent Sessions</h2>
                        <button className="btn btn-sm btn-ghost" onClick={fetchSessions}>Refresh</button>
                    </div>

                    {sessionsLoading ? (
                        <div className="spinner"></div>
                    ) : pastSessions.length === 0 ? (
                        <p className="empty-state">No past sessions found.</p>
                    ) : (
                        <div className="sessions-list">
                            {pastSessions.map(session => (
                                <div key={session._id} className="session-item" onClick={() => navigate(`/professor/session/${session._id}`)}>
                                    <div className="session-info">
                                        <h4>{session.course?.courseName || 'Unknown Course'}</h4>
                                        <p className="session-date">
                                            {new Date(session.startTime).toLocaleDateString()} • {new Date(session.startTime).toLocaleTimeString()}
                                        </p>
                                    </div>
                                    <div className="session-stats">
                                        <span className={`status-badge ${session.isActive ? 'active' : 'ended'}`}>
                                            {session.isActive ? 'LIVE' : 'ENDED'}
                                        </span>
                                        <span className="attendance-count">
                                            👥 {session.attendanceCount || 0}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Course Modal */}
            {showCourseModal && (
                <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Create Course</h2>
                        <form onSubmit={handleCreateCourse}>
                            <input
                                placeholder="Course Code (e.g. CS101)"
                                value={newCourse.courseCode}
                                onChange={e => setNewCourse({ ...newCourse, courseCode: e.target.value })}
                                required
                                className="form-input"
                            />
                            <input
                                placeholder="Course Name"
                                value={newCourse.courseName}
                                onChange={e => setNewCourse({ ...newCourse, courseName: e.target.value })}
                                required
                                className="form-input"
                            />
                            <select
                                value={newCourse.branch}
                                onChange={e => setNewCourse({ ...newCourse, branch: e.target.value })}
                                className="form-input"
                                required
                            >
                                <option value="">Select Branch</option>
                                <option value="UCP">UCP - Computer Science</option>
                                <option value="UEC">UEC - Electronics & Comm</option>
                                <option value="UEE">UEE - Electrical</option>
                                <option value="UME">UME - Mechanical</option>
                                <option value="UCE">UCE - Civil</option>
                            </select>
                            <div className="form-row">
                                <input
                                    type="number"
                                    placeholder="Year"
                                    value={newCourse.year}
                                    onChange={e => setNewCourse({ ...newCourse, year: parseInt(e.target.value) })}
                                    min="1" max="4"
                                    className="form-input"
                                />
                                <input
                                    type="number"
                                    placeholder="Semester"
                                    value={newCourse.semester}
                                    onChange={e => setNewCourse({ ...newCourse, semester: parseInt(e.target.value) })}
                                    min="1" max="8"
                                    className="form-input"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary">Create</button>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowCourseModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Session Modal */}
            {showSessionModal && (
                <div className="modal-overlay" onClick={() => setShowSessionModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Start Live Session</h2>
                        {courses.length === 0 ? (
                            <div>
                                <p>You need to create a course first.</p>
                                <button className="btn btn-primary" onClick={() => {
                                    setShowSessionModal(false);
                                    setShowCourseModal(true);
                                }}>Create Course</button>
                            </div>
                        ) : (
                            <form onSubmit={handleStartSession}>
                                <select
                                    value={newSession.courseId}
                                    onChange={e => setNewSession({ ...newSession, courseId: e.target.value })}
                                    required
                                    className="form-input"
                                >
                                    <option value="">Select Course</option>
                                    {courses.map(c => (
                                        <option key={c._id} value={c._id}>{c.courseName}</option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    placeholder="Duration (mins)"
                                    value={newSession.duration}
                                    onChange={e => setNewSession({ ...newSession, duration: parseInt(e.target.value) })}
                                    className="form-input"
                                />
                                <div className="location-status">
                                    {location ? (
                                        <span className="location-ok">📍 Location acquired ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})</span>
                                    ) : gettingLocation ? (
                                        <span className="location-pending">📍 Getting location...</span>
                                    ) : locationError ? (
                                        <div className="location-error">
                                            <span>❌ {locationError}</span>
                                            <button type="button" className="btn btn-sm" onClick={getLocation}>Retry</button>
                                        </div>
                                    ) : (
                                        <button type="button" className="btn btn-secondary" onClick={getLocation}>
                                            📍 Get Location
                                        </button>
                                    )}
                                </div>
                                <div className="modal-actions">
                                    <button type="submit" className="btn btn-success" disabled={!location || gettingLocation}>
                                        {gettingLocation ? 'Getting Location...' : 'Start Class'}
                                    </button>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowSessionModal(false)}>Cancel</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfessorDashboard;
