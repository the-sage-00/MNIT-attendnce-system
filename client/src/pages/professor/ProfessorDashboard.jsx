import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import API_URL from '../../config/api';
import './ProfessorDashboard.css';

const ProfessorDashboard = () => {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();

    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

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

    useEffect(() => {
        fetchCourses();
        // Get location for session creation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                pos => setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude // Fixed: was "position"
                }),
                err => console.error('Location error:', err)
            );
        }
    }, []);

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

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/courses`, newCourse, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowCourseModal(false);
            setNewCourse({ courseCode: '', courseName: '', branch: 'CSE', year: 1, semester: 1 });
            fetchCourses();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to create course');
        }
    };

    const handleStartSession = async (e) => {
        e.preventDefault();
        if (!location) {
            alert('Location not available. Please allow GPS.');
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
            navigate(`/professor/session/${res.data.data._id}`);
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to start session');
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
                                        <span className="location-ok">📍 Location acquired</span>
                                    ) : (
                                        <span className="location-pending">📍 Getting location...</span>
                                    )}
                                </div>
                                <div className="modal-actions">
                                    <button type="submit" className="btn btn-success" disabled={!location}>Start Class</button>
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
