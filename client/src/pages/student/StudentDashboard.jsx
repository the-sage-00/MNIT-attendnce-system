import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_URL from '../../config/api';
import './StudentDashboard.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const StudentDashboard = () => {
    const { user, token, logout, refreshUser } = useAuth();
    const navigate = useNavigate();

    const [summary, setSummary] = useState(null);
    const [courses, setCourses] = useState({ autoEnrolled: [], electives: [] });
    const [timetable, setTimetable] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [savingBatch, setSavingBatch] = useState(false);
    const [selectedDay, setSelectedDay] = useState(() => {
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        return DAYS.includes(today) ? today : 'Monday';
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const headers = { Authorization: `Bearer ${token}` };
        try {
            const [summaryRes, coursesRes, timetableRes] = await Promise.all([
                axios.get(`${API_URL}/attendance/summary`, { headers }).catch(() => ({ data: { data: null } })),
                axios.get(`${API_URL}/courses/my-courses`, { headers }).catch(() => ({ data: { data: { autoEnrolled: [], electives: [] } } })),
                axios.get(`${API_URL}/courses/my-timetable`, { headers }).catch(() => ({ data: { data: null } }))
            ]);
            setSummary(summaryRes.data.data);
            setCourses(coursesRes.data.data || { autoEnrolled: [], electives: [] });
            setTimetable(timetableRes.data.data);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPercentageColor = (percentage) => {
        if (percentage >= 75) return 'good';
        if (percentage >= 50) return 'warning';
        return 'danger';
    };

    const handleBatchChange = async (newBatch) => {
        if (!newBatch || savingBatch) return;
        setSavingBatch(true);
        try {
            await axios.put(`${API_URL}/auth/batch`, { batch: newBatch }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Batch updated to ${newBatch}`);
            if (refreshUser) await refreshUser();
            // Refetch timetable since batch affects it
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update batch');
        } finally {
            setSavingBatch(false);
        }
    };

    const allCourses = [...(courses.autoEnrolled || []), ...(courses.electives || [])];

    return (
        <div className="student-dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>📚 Student Dashboard</h1>
                    <p>Welcome, {user?.name}</p>
                </div>
                <div className="header-right">
                    <ThemeToggle />
                    <Link to="/student/scan-qr" className="btn btn-success">📷 Mark Attendance</Link>
                    <Link to="/student/profile" className="btn btn-secondary">👤 Profile</Link>
                    <button className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>Logout</button>
                </div>
            </header>

            <main className="dashboard-content">
                {/* Tab Navigation */}
                <div className="tab-nav">
                    <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                        📊 Overview
                    </button>
                    <button className={`tab-btn ${activeTab === 'timetable' ? 'active' : ''}`} onClick={() => setActiveTab('timetable')}>
                        📅 Weekly Timetable
                    </button>
                    <button className={`tab-btn ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
                        📚 My Courses ({allCourses.length})
                    </button>
                </div>

                {loading ? (
                    <div className="loading-state"><div className="spinner"></div></div>
                ) : (
                    <>
                        {/* Overview Tab */}
                        {activeTab === 'overview' && (
                            <>
                                {/* Profile + Overall Stats */}
                                <div className="top-section">
                                    <div className="profile-card card">
                                        <div className="profile-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
                                        <div className="profile-info">
                                            <h3>{user?.name}</h3>
                                            <p className="roll-badge">{user?.rollNo || 'Student'}</p>
                                            <p className="email">{user?.email}</p>
                                            {user?.branch && <p className="branch-info">{user.branch} | Year {user?.academicState?.year || '?'}</p>}

                                            {/* Batch Selector */}
                                            <div className="batch-selector">
                                                <label>Batch:</label>
                                                <select
                                                    value={user?.batch || ''}
                                                    onChange={(e) => handleBatchChange(e.target.value)}
                                                    disabled={savingBatch}
                                                    className={!user?.batch ? 'not-set' : ''}
                                                >
                                                    <option value="" disabled>Select Batch</option>
                                                    {['1', '2', '3', '4', '5'].map(b => (
                                                        <option key={b} value={b}>Batch {b}</option>
                                                    ))}
                                                </select>
                                                {savingBatch && <span className="batch-saving">Saving...</span>}
                                                {!user?.batch && <span className="batch-warning">⚠️ Set your batch!</span>}
                                            </div>
                                        </div>
                                    </div>

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
                                                <span className="stat-num">{allCourses.length}</span>
                                                <span className="stat-label">Courses</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Course Attendance */}
                                <div className="card course-attendance-section">
                                    <h3>📈 Course-wise Attendance</h3>
                                    {!summary?.courses || summary.courses.length === 0 ? (
                                        <p className="empty-state">No attendance records yet.</p>
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
                                                            <div className={`attendance-fill ${getPercentageColor(course.attendancePercentage)}`}
                                                                style={{ width: `${course.attendancePercentage}%` }}></div>
                                                        </div>
                                                        <span className="attendance-text">{course.sessionsAttended}/{course.totalSessions}</span>
                                                    </div>
                                                    <div className={`percentage-badge ${getPercentageColor(course.attendancePercentage)}`}>
                                                        {course.attendancePercentage}%
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Timetable Tab */}
                        {activeTab === 'timetable' && (
                            <div className="timetable-section">
                                {/* Header with batch info */}
                                <div className="timetable-header">
                                    <h3>📅 My Timetable</h3>
                                    {timetable?.academicInfo && (
                                        <div className="timetable-info">
                                            <span className="info-badge">{timetable.academicInfo.branch?.toUpperCase()}</span>
                                            <span className="info-badge">Year {timetable.academicInfo.year}</span>
                                            {timetable.academicInfo.batch && (
                                                <span className="info-badge batch">Batch {timetable.academicInfo.batch}</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {!timetable?.byDay ? (
                                    <div className="timetable-empty">
                                        <div className="empty-icon">📭</div>
                                        <p>No timetable available yet</p>
                                        {!user?.batch && <p className="empty-hint">⚠️ Set your batch first!</p>}
                                    </div>
                                ) : (
                                    <>
                                        {/* Mobile: Day selector tabs */}
                                        <div className="day-tabs-mobile">
                                            {DAYS.map(day => {
                                                const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;
                                                const hasClasses = (timetable.byDay[day] || []).length > 0;
                                                return (
                                                    <button
                                                        key={day}
                                                        className={`day-tab ${selectedDay === day ? 'active' : ''} ${isToday ? 'today' : ''} ${!hasClasses ? 'empty' : ''}`}
                                                        onClick={() => setSelectedDay(day)}
                                                    >
                                                        <span className="day-short">{day.slice(0, 3)}</span>
                                                        {isToday && <span className="today-dot"></span>}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Mobile: Selected day's classes */}
                                        <div className="day-classes-mobile">
                                            <h4 className="selected-day-title">
                                                {selectedDay}
                                                {new Date().toLocaleDateString('en-US', { weekday: 'long' }) === selectedDay && (
                                                    <span className="today-badge">Today</span>
                                                )}
                                            </h4>
                                            {(timetable.byDay[selectedDay] || []).length === 0 ? (
                                                <div className="no-classes-card">
                                                    <span className="relax-icon">🎉</span>
                                                    <p>No classes!</p>
                                                </div>
                                            ) : (
                                                <div className="classes-list">
                                                    {(timetable.byDay[selectedDay] || []).map((slot, idx) => (
                                                        <div key={idx} className="class-card">
                                                            <div className="class-time">
                                                                <span className="time-start">{slot.startTime}</span>
                                                                <span className="time-separator">-</span>
                                                                <span className="time-end">{slot.endTime}</span>
                                                            </div>
                                                            <div className="class-details">
                                                                <span className="class-code">{slot.course?.courseCode}</span>
                                                                <span className="class-name">{slot.course?.courseName}</span>
                                                                {slot.room && <span className="class-room">📍 {slot.room}</span>}
                                                                {slot.course?.batch && slot.course.batch !== 'all' && (
                                                                    <span className="class-batch">Batch {slot.course.batch}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Desktop: Full week grid */}
                                        <div className="week-grid-desktop">
                                            {DAYS.map(day => {
                                                const slots = timetable.byDay[day] || [];
                                                const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }) === day;
                                                return (
                                                    <div key={day} className={`day-column ${isToday ? 'today' : ''}`}>
                                                        <div className="day-header">
                                                            {day.slice(0, 3)}
                                                            {isToday && <span className="today-marker">●</span>}
                                                        </div>
                                                        <div className="day-slots">
                                                            {slots.length === 0 ? (
                                                                <div className="slot-empty">-</div>
                                                            ) : (
                                                                slots.map((slot, idx) => (
                                                                    <div key={idx} className="slot-card">
                                                                        <div className="slot-time">{slot.startTime}</div>
                                                                        <div className="slot-code">{slot.course?.courseCode}</div>
                                                                        {slot.room && <div className="slot-room">{slot.room}</div>}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Courses Tab */}
                        {activeTab === 'courses' && (
                            <div className="card courses-section">
                                <h3>📚 My Courses</h3>

                                {/* Auto-Enrolled Courses */}
                                <div className="courses-group">
                                    <h4>Auto-Enrolled Courses</h4>
                                    {courses.autoEnrolled?.length === 0 ? (
                                        <p className="empty-state">No courses for your branch/year.</p>
                                    ) : (
                                        <div className="courses-list">
                                            {courses.autoEnrolled?.map(course => (
                                                <div key={course._id} className="course-item">
                                                    <div className="course-info">
                                                        <span className="code-badge">{course.courseCode}</span>
                                                        <span className="course-name">{course.courseName}</span>
                                                    </div>
                                                    <div className="course-meta">
                                                        {course.schedule && (
                                                            <span className="schedule-info">
                                                                📅 {course.schedule.day} {course.schedule.startTime}
                                                            </span>
                                                        )}
                                                        {course.claimedBy?.length > 0 && (
                                                            <span className="professor-name">
                                                                👨‍🏫 {course.claimedBy.map(p => p.name).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Elective Courses */}
                                {courses.electives?.length > 0 && (
                                    <div className="courses-group">
                                        <h4>Elective Courses</h4>
                                        <div className="courses-list">
                                            {courses.electives.map(course => (
                                                <div key={course._id} className="course-item elective">
                                                    <div className="course-info">
                                                        <span className="code-badge">{course.courseCode}</span>
                                                        <span className="course-name">{course.courseName}</span>
                                                        <span className="elective-badge">Elective</span>
                                                    </div>
                                                    <div className="course-meta">
                                                        {course.claimedBy?.length > 0 && (
                                                            <span className="professor-name">
                                                                👨‍🏫 {course.claimedBy.map(p => p.name).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Recent Activity */}
                        {activeTab === 'overview' && (
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
                                                            day: '2-digit', month: 'short'
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
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default StudentDashboard;
