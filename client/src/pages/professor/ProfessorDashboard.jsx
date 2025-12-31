import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import API_URL from '../../config/api';
import './ProfessorDashboard.css';

const BRANCH_OPTIONS = [
    { code: 'uch', name: 'Chemical' },
    { code: 'ucs', name: 'Computer Science' },
    { code: 'uce', name: 'Civil' },
    { code: 'uec', name: 'Electronics' },
    { code: 'uee', name: 'Electrical' },
    { code: 'ume', name: 'Mechanical' },
    { code: 'umt', name: 'Metallurgical' }
];

const ProfessorDashboard = () => {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const navState = useLocation();

    const [claimedCourses, setClaimedCourses] = useState([]);
    const [claimableCourses, setClaimableCourses] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [pastSessions, setPastSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('claimed');
    const [browseFilter, setBrowseFilter] = useState({ branch: '', year: '', batch: '' });

    // Session Modal State
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [newSession, setNewSession] = useState({ courseId: '', duration: 60, radius: 50 });
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState('');
    const [gettingLocation, setGettingLocation] = useState(false);

    // Claim Modal State
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [claimMessage, setClaimMessage] = useState('');

    const getLocation = useCallback(() => {
        setGettingLocation(true);
        setLocationError('');
        if (!navigator.geolocation) {
            setLocationError('Geolocation not supported');
            setGettingLocation(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => {
                setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGettingLocation(false);
            },
            err => {
                setLocationError('Location permission denied');
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    useEffect(() => {
        fetchData();
        getLocation();
    }, []);

    // Refresh data when coming back from stopped session
    useEffect(() => {
        if (navState.state?.refresh) {
            fetchData();
            // Clear the state to prevent re-refresh
            window.history.replaceState({}, document.title);
        }
    }, [navState.state]);

    useEffect(() => {
        if (showSessionModal && !location) getLocation();
    }, [showSessionModal, location, getLocation]);

    const fetchData = async () => {
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const [coursesRes, requestsRes, sessionsRes] = await Promise.all([
                axios.get(`${API_URL}/courses`, { headers }),
                axios.get(`${API_URL}/courses/my-requests`, { headers }).catch(() => ({ data: { data: [] } })),
                axios.get(`${API_URL}/sessions/professor/history`, { headers }).catch(() => ({ data: { data: [] } }))
            ]);
            setClaimedCourses(coursesRes.data.data || []);
            setMyRequests(requestsRes.data.data || []);
            setPastSessions(sessionsRes.data.data || []);
            // Fetch claimable courses with filters
            await fetchClaimableCourses();
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClaimableCourses = async () => {
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const params = new URLSearchParams();
            if (browseFilter.branch) params.append('branch', browseFilter.branch);
            if (browseFilter.year) params.append('year', browseFilter.year);
            if (browseFilter.batch) params.append('batch', browseFilter.batch);
            const res = await axios.get(`${API_URL}/courses/claimable?${params}`, { headers });
            setClaimableCourses(res.data.data || []);
        } catch (error) {
            console.error('Fetch claimable error:', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'claimable') {
            fetchClaimableCourses();
        }
    }, [browseFilter]);

    const handleClaimCourse = async () => {
        if (!selectedCourse) return;
        try {
            await axios.post(`${API_URL}/courses/${selectedCourse._id}/claim`,
                { message: claimMessage },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Claim request sent! Awaiting admin approval.');
            setShowClaimModal(false);
            setSelectedCourse(null);
            setClaimMessage('');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send claim request');
        }
    };

    const handleUnclaimCourse = async (course) => {
        if (!confirm(`Request to unclaim "${course.courseName}"?`)) return;
        try {
            await axios.post(`${API_URL}/courses/${course._id}/unclaim`,
                { message: 'Requesting to unclaim this course' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success('Unclaim request sent! Awaiting admin approval.');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send unclaim request');
        }
    };

    const handleStartSession = async (e) => {
        e.preventDefault();
        if (!location) {
            toast.error('Location not available');
            return;
        }
        try {
            const res = await axios.post(`${API_URL}/sessions`, {
                courseId: newSession.courseId,
                duration: newSession.duration,
                radius: newSession.radius,
                centerLat: location.lat,
                centerLng: location.lng
            }, { headers: { Authorization: `Bearer ${token}` } });
            setShowSessionModal(false);
            toast.success('Session started!');
            navigate(`/professor/session/${res.data.data._id}`);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to start session');
        }
    };

    const pendingRequests = myRequests.filter(r => r.status === 'pending');

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>👨‍🏫 Professor Dashboard</h1>
                    <p>Welcome, {user?.name}</p>
                </div>
                <div className="header-right">
                    <ThemeToggle />
                    <button className="btn btn-primary" onClick={() => setShowSessionModal(true)} disabled={claimedCourses.length === 0}>
                        + Start Session
                    </button>
                    <button className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>Logout</button>
                </div>
            </header>

            <main className="dashboard-content">
                {/* Tab Navigation */}
                <div className="tab-nav">
                    <button className={`tab-btn ${activeTab === 'claimed' ? 'active' : ''}`} onClick={() => setActiveTab('claimed')}>
                        My Courses ({claimedCourses.length})
                    </button>
                    <button className={`tab-btn ${activeTab === 'claimable' ? 'active' : ''}`} onClick={() => setActiveTab('claimable')}>
                        Browse Courses ({claimableCourses.length})
                    </button>
                    <button className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
                        My Requests {pendingRequests.length > 0 && <span className="badge">{pendingRequests.length}</span>}
                    </button>
                </div>

                {loading ? (
                    <div className="loading-center"><div className="spinner"></div></div>
                ) : (
                    <>
                        {/* Claimed Courses Tab */}
                        {activeTab === 'claimed' && (
                            <div className="courses-section card">
                                <h2>📚 My Claimed Courses</h2>
                                {claimedCourses.length === 0 ? (
                                    <div className="empty-state">
                                        <p>You haven't claimed any courses yet.</p>
                                        <button className="btn btn-primary" onClick={() => setActiveTab('claimable')}>
                                            Browse Courses to Claim
                                        </button>
                                    </div>
                                ) : (
                                    <div className="courses-grid">
                                        {claimedCourses.map(course => (
                                            <div key={course._id} className="course-card">
                                                <span className="course-code">{course.courseCode}</span>
                                                <h3>{course.courseName}</h3>
                                                <p className="course-meta">
                                                    {course.branch?.toUpperCase()} - Year {course.year}, Sem {course.semester}
                                                    <span className="batch-tag">{course.batch === 'all' ? 'All Batches' : `Batch ${course.batch}`}</span>
                                                </p>
                                                {course.schedules?.length > 0 && (
                                                    <div className="course-schedules">
                                                        {course.schedules.map((sched, idx) => (
                                                            <p key={idx} className="course-schedule">
                                                                📅 {sched.day} {sched.startTime}-{sched.endTime}
                                                                {sched.room && ` | 🚪 ${sched.room}`}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="course-actions">
                                                    <button className="btn btn-sm btn-primary" onClick={() => {
                                                        setNewSession({ ...newSession, courseId: course._id });
                                                        setShowSessionModal(true);
                                                    }}>
                                                        ▶ Start Session
                                                    </button>
                                                    <button className="btn btn-sm btn-secondary" onClick={() => navigate(`/professor/course/${course._id}/attendance`)}>
                                                        📊 Attendance
                                                    </button>
                                                    <button className="btn btn-sm btn-ghost" onClick={() => handleUnclaimCourse(course)}>
                                                        ✕ Unclaim
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Claimable Courses Tab */}
                        {activeTab === 'claimable' && (
                            <div className="courses-section card">
                                <div className="section-header">
                                    <h2>🔍 Browse Courses to Claim</h2>
                                    <div className="filters-inline">
                                        <select value={browseFilter.branch} onChange={e => setBrowseFilter({ ...browseFilter, branch: e.target.value })} className="filter-select">
                                            <option value="">All Branches</option>
                                            {BRANCH_OPTIONS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                                        </select>
                                        <select value={browseFilter.year} onChange={e => setBrowseFilter({ ...browseFilter, year: e.target.value })} className="filter-select">
                                            <option value="">All Years</option>
                                            <option value="1">Year 1</option>
                                            <option value="2">Year 2</option>
                                            <option value="3">Year 3</option>
                                            <option value="4">Year 4</option>
                                        </select>
                                        <select value={browseFilter.batch} onChange={e => setBrowseFilter({ ...browseFilter, batch: e.target.value })} className="filter-select">
                                            <option value="">All Batches</option>
                                            <option value="all">For All (all)</option>
                                            <option value="1">Batch 1</option>
                                            <option value="2">Batch 2</option>
                                            <option value="3">Batch 3</option>
                                            <option value="4">Batch 4</option>
                                            <option value="5">Batch 5</option>
                                        </select>
                                        <span className="filter-count">{claimableCourses.length} courses</span>
                                    </div>
                                </div>
                                {claimableCourses.length === 0 ? (
                                    <p className="empty-state">No courses found. Try changing filters.</p>
                                ) : (
                                    <div className="courses-grid">
                                        {claimableCourses.map(course => (
                                            <div key={course._id} className="course-card claimable">
                                                <span className="course-code">{course.courseCode}</span>
                                                <h3>{course.courseName}</h3>
                                                <p className="course-meta">
                                                    {course.branch?.toUpperCase()} - Year {course.year}, Sem {course.semester}
                                                    <span className="batch-tag">{course.batch === 'all' ? 'All Batches' : `Batch ${course.batch}`}</span>
                                                </p>
                                                {course.schedules?.length > 0 && (
                                                    <div className="course-schedules">
                                                        {course.schedules.map((sched, idx) => (
                                                            <p key={idx} className="course-schedule">
                                                                📅 {sched.day} {sched.startTime}-{sched.endTime}
                                                                {sched.room && ` | 🚪 ${sched.room}`}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                                {course.claimedBy?.length > 0 && (
                                                    <p className="other-professors">
                                                        Also claimed by: {course.claimedBy.map(p => p.name).join(', ')}
                                                    </p>
                                                )}
                                                <div className="course-actions">
                                                    <button className="btn btn-success" onClick={() => {
                                                        setSelectedCourse(course);
                                                        setShowClaimModal(true);
                                                    }}>
                                                        🙋 Claim
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* My Requests Tab */}
                        {activeTab === 'requests' && (
                            <div className="requests-section card">
                                <h2>📝 My Claim Requests</h2>
                                {myRequests.length === 0 ? (
                                    <p className="empty-state">No pending requests.</p>
                                ) : (
                                    <div className="requests-list">
                                        {myRequests.map(req => (
                                            <div key={req._id} className={`request-item ${req.status}`}>
                                                <div className="request-info">
                                                    <strong>{req.type === 'claim' ? '🙋 Claim' : '✕ Unclaim'}: {req.course?.courseCode}</strong>
                                                    <span>{req.course?.courseName}</span>
                                                </div>
                                                <span className={`status-badge ${req.status}`}>
                                                    {req.status.toUpperCase()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Recent Sessions */}
                        <div className="sessions-section card">
                            <h2>📜 Recent Sessions</h2>
                            {pastSessions.length === 0 ? (
                                <p className="empty-state">No past sessions.</p>
                            ) : (
                                <div className="sessions-list">
                                    {pastSessions.slice(0, 5).map(session => (
                                        <div key={session._id} className="session-item" onClick={() => navigate(`/professor/session/${session._id}`)}>
                                            <div className="session-info">
                                                <h4>{session.course?.courseName || 'Course'}</h4>
                                                <p>{new Date(session.startTime).toLocaleDateString()} • {new Date(session.startTime).toLocaleTimeString()}</p>
                                            </div>
                                            <div className="session-stats">
                                                <span className={`status-badge ${session.isActive ? 'active' : 'ended'}`}>
                                                    {session.isActive ? 'LIVE' : 'ENDED'}
                                                </span>
                                                <span>👥 {session.stats?.total || 0}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* Claim Course Modal */}
            {showClaimModal && selectedCourse && (
                <div className="modal-overlay" onClick={() => setShowClaimModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Claim Course</h2>
                        <p>Request to claim <strong>{selectedCourse.courseCode} - {selectedCourse.courseName}</strong></p>
                        <textarea
                            placeholder="Optional message for admin..."
                            value={claimMessage}
                            onChange={e => setClaimMessage(e.target.value)}
                            className="form-input"
                            rows={3}
                        />
                        <div className="modal-actions">
                            <button className="btn btn-success" onClick={handleClaimCourse}>Send Claim Request</button>
                            <button className="btn btn-ghost" onClick={() => setShowClaimModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Start Session Modal */}
            {showSessionModal && (
                <div className="modal-overlay" onClick={() => setShowSessionModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Start Live Session</h2>
                        {claimedCourses.length === 0 ? (
                            <div>
                                <p>You need to claim a course first.</p>
                                <button className="btn btn-primary" onClick={() => { setShowSessionModal(false); setActiveTab('claimable'); }}>
                                    Browse Courses
                                </button>
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
                                    {claimedCourses.map(c => (
                                        <option key={c._id} value={c._id}>{c.courseCode} - {c.courseName}</option>
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
                                    ) : gettingLocation ? (
                                        <span className="location-pending">📍 Getting location...</span>
                                    ) : (
                                        <button type="button" className="btn btn-secondary" onClick={getLocation}>📍 Get Location</button>
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
