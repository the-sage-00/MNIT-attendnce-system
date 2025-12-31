import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import API_URL from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import './Courses.css';

const BRANCH_OPTIONS = [
    { code: 'uch', name: 'Chemical Engineering' },
    { code: 'ucp', name: 'Computer Science Engineering' },
    { code: 'uce', name: 'Civil Engineering' },
    { code: 'uec', name: 'Electronics & Communication' },
    { code: 'uee', name: 'Electrical Engineering' },
    { code: 'ume', name: 'Mechanical Engineering' },
    { code: 'umt', name: 'Metallurgical Engineering' }
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SAMPLE_JSON = `{
  "courses": [
    {
      "courseCode": "CS101",
      "courseName": "Data Structures",
      "branch": "ucp",
      "year": 2,
      "semester": 3,
      "batch": "all",
      "schedules": [
        { "day": "Monday", "startTime": "09:00", "endTime": "10:00", "room": "LH-101" },
        { "day": "Wednesday", "startTime": "14:00", "endTime": "15:00", "room": "LH-101" }
      ]
    },
    {
      "courseCode": "CS102",
      "courseName": "Lab Work",
      "branch": "ucp",
      "year": 2,
      "semester": 3,
      "batch": "1",
      "schedules": [
        { "day": "Thursday", "startTime": "10:00", "endTime": "12:00", "room": "Lab-101" }
      ]
    }
  ]
}`;

const AdminCourses = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalTab, setModalTab] = useState('single'); // 'single' or 'bulk'
    const [editingCourse, setEditingCourse] = useState(null);
    const [filter, setFilter] = useState({ branch: '', year: '', claimed: '' });

    // Single course form
    const [formData, setFormData] = useState({
        courseCode: '', courseName: '', description: '', branch: '', year: 1, semester: 1,
        batch: 'all',
        schedules: [{ day: 'Monday', startTime: '09:00', endTime: '10:00', room: '' }],
        defaultDuration: 60, lateThreshold: 15
    });

    // Bulk import
    const [jsonInput, setJsonInput] = useState('');
    const [importResult, setImportResult] = useState(null);
    const [saving, setSaving] = useState(false);

    const { token, logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => { fetchCourses(); }, [filter]);

    const fetchCourses = async () => {
        try {
            const params = new URLSearchParams();
            if (filter.branch) params.append('branch', filter.branch);
            if (filter.year) params.append('year', filter.year);
            if (filter.claimed) params.append('claimed', filter.claimed);
            const res = await axios.get(`${API_URL}/admin/courses?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCourses(res.data.data);
        } catch (err) {
            if (err.response?.status === 401) { logout(); navigate('/admin/login'); }
            else toast.error('Failed to fetch courses');
        } finally { setLoading(false); }
    };

    const resetForm = () => {
        setFormData({
            courseCode: '', courseName: '', description: '', branch: '', year: 1, semester: 1,
            batch: 'all',
            schedules: [{ day: 'Monday', startTime: '09:00', endTime: '10:00', room: '' }],
            defaultDuration: 60, lateThreshold: 15
        });
        setEditingCourse(null);
        setJsonInput('');
        setImportResult(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingCourse) {
                await axios.put(`${API_URL}/admin/courses/${editingCourse._id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Course updated successfully');
            } else {
                await axios.post(`${API_URL}/admin/courses`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Course created successfully');
            }
            setShowModal(false);
            resetForm();
            fetchCourses();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to save course');
        } finally { setSaving(false); }
    };

    const handleBulkImport = async () => {
        setSaving(true);
        setImportResult(null);
        try {
            const parsed = JSON.parse(jsonInput);
            const res = await axios.post(`${API_URL}/admin/courses/bulk`, parsed, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setImportResult(res.data.data);
            toast.success(res.data.message);
            fetchCourses();
        } catch (err) {
            if (err instanceof SyntaxError) {
                toast.error('Invalid JSON format. Please check your input.');
            } else {
                toast.error(err.response?.data?.error || 'Bulk import failed');
            }
        } finally { setSaving(false); }
    };

    const handleEdit = (course) => {
        setFormData({
            courseCode: course.courseCode, courseName: course.courseName,
            description: course.description || '', branch: course.branch,
            year: course.year, semester: course.semester,
            batch: course.batch || 'all',
            schedules: course.schedules?.length > 0
                ? course.schedules
                : [{ day: 'Monday', startTime: '09:00', endTime: '10:00', room: '' }],
            defaultDuration: course.defaultDuration || 60, lateThreshold: course.lateThreshold || 15
        });
        setEditingCourse(course);
        setModalTab('single');
        setShowModal(true);
    };

    const handleDelete = async (course) => {
        if (!confirm(`Archive "${course.courseName}"?`)) return;
        try {
            await axios.delete(`${API_URL}/admin/courses/${course._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Course archived');
            fetchCourses();
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to archive'); }
    };

    const getBranchName = (code) => BRANCH_OPTIONS.find(b => b.code === code)?.name || code?.toUpperCase();

    if (loading) {
        return (
            <div className="courses-page">
                <div className="loading-container"><div className="spinner spinner-lg"></div><p>Loading courses...</p></div>
            </div>
        );
    }

    return (
        <div className="courses-page">
            <header className="courses-header">
                <div className="header-content">
                    <h1>📚 Course Management</h1>
                    <p>Create and manage courses for all branches</p>
                </div>
                <div className="header-actions">
                    <ThemeToggle />
                    <button className="btn btn-primary" onClick={() => { resetForm(); setModalTab('single'); setShowModal(true); }}>
                        + Create Course
                    </button>
                    <button className="btn btn-success" onClick={() => { resetForm(); setModalTab('bulk'); setShowModal(true); }}>
                        📥 Bulk Import
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/admin/dashboard')}>← Dashboard</button>
                </div>
            </header>

            {/* Filters */}
            <div className="filters-bar">
                <select value={filter.branch} onChange={(e) => setFilter({ ...filter, branch: e.target.value })} className="filter-select">
                    <option value="">All Branches</option>
                    {BRANCH_OPTIONS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                </select>
                <select value={filter.year} onChange={(e) => setFilter({ ...filter, year: e.target.value })} className="filter-select">
                    <option value="">All Years</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                </select>
                <select value={filter.claimed} onChange={(e) => setFilter({ ...filter, claimed: e.target.value })} className="filter-select">
                    <option value="">All Status</option>
                    <option value="true">Claimed</option>
                    <option value="false">Unclaimed</option>
                </select>
                <span className="filter-count">{courses.length} courses</span>
            </div>

            {/* Courses Grid */}
            <div className="courses-grid">
                {courses.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📚</div>
                        <h3>No courses found</h3>
                        <p>Create your first course or use bulk import</p>
                        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>Create Course</button>
                    </div>
                ) : (
                    courses.map(course => (
                        <div key={course._id} className={`course-card ${course.claimedBy?.length > 0 ? 'claimed' : 'unclaimed'}`}>
                            <div className="course-header">
                                <div className="course-code">{course.courseCode}</div>
                                {course.claimedBy?.length > 0 ? (
                                    <span className="status-badge claimed">✓ Claimed ({course.claimedBy.length})</span>
                                ) : (
                                    <span className="status-badge unclaimed">○ Unclaimed</span>
                                )}
                            </div>
                            <h3 className="course-name">{course.courseName}</h3>
                            <div className="course-meta">
                                <span className="meta-item">{getBranchName(course.branch)}</span>
                                <span className="meta-item">Year {course.year}</span>
                                <span className="meta-item">Sem {course.semester}</span>
                                <span className="meta-item batch">{course.batch === 'all' ? 'All Batches' : `Batch ${course.batch}`}</span>
                            </div>
                            {course.schedules?.length > 0 && (
                                <div className="course-schedules">
                                    {course.schedules.map((sched, idx) => (
                                        <div key={idx} className="schedule-item">
                                            📅 {sched.day} {sched.startTime}-{sched.endTime}
                                            {sched.room && <span> | 🚪 {sched.room}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {course.claimedBy?.length > 0 && (
                                <div className="claimed-by">👨‍🏫 {course.claimedBy.map(p => p.name).join(', ')}</div>
                            )}
                            <div className="course-actions">
                                <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(course)}>✏️ Edit</button>
                                <button className="btn btn-sm btn-ghost" onClick={() => navigate(`/admin/courses/${course._id}`)}>📊 Details</button>
                                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(course)}>🗑️</button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create/Edit/Bulk Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-lg modal-scrollable" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingCourse ? 'Edit Course' : 'Add Courses'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        {/* Tab Switcher (only for new courses) */}
                        {!editingCourse && (
                            <div className="modal-tabs">
                                <button className={`modal-tab ${modalTab === 'single' ? 'active' : ''}`} onClick={() => setModalTab('single')}>
                                    Single Course
                                </button>
                                <button className={`modal-tab ${modalTab === 'bulk' ? 'active' : ''}`} onClick={() => setModalTab('bulk')}>
                                    Bulk Import (JSON)
                                </button>
                            </div>
                        )}

                        <div className="modal-body">
                            {/* Single Course Form */}
                            {modalTab === 'single' && (
                                <form onSubmit={handleSubmit}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Course Code *</label>
                                            <input type="text" className="form-input" placeholder="e.g., CS101"
                                                value={formData.courseCode}
                                                onChange={e => setFormData({ ...formData, courseCode: e.target.value })}
                                                required disabled={!!editingCourse} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Course Name *</label>
                                            <input type="text" className="form-input" placeholder="e.g., Data Structures"
                                                value={formData.courseName}
                                                onChange={e => setFormData({ ...formData, courseName: e.target.value })}
                                                required />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Branch *</label>
                                            <select className="form-input" value={formData.branch}
                                                onChange={e => setFormData({ ...formData, branch: e.target.value })}
                                                required disabled={!!editingCourse}>
                                                <option value="">Select Branch</option>
                                                {BRANCH_OPTIONS.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Year *</label>
                                            <select className="form-input" value={formData.year}
                                                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                                required disabled={!!editingCourse}>
                                                {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Semester *</label>
                                            <select className="form-input" value={formData.semester}
                                                onChange={e => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                                                required>
                                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Sem {s}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Batch *</label>
                                            <select className="form-input" value={formData.batch}
                                                onChange={e => setFormData({ ...formData, batch: e.target.value })}
                                                required>
                                                <option value="all">All Batches</option>
                                                {['1', '2', '3', '4', '5'].map(b => <option key={b} value={b}>Batch {b}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Description</label>
                                        <textarea className="form-input" placeholder="Course description..." rows={2}
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                    </div>

                                    <div className="form-section">
                                        <div className="form-section-header">
                                            <h4>📅 Schedules</h4>
                                            <button type="button" className="btn btn-sm btn-success"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    schedules: [...formData.schedules, { day: 'Monday', startTime: '09:00', endTime: '10:00', room: '' }]
                                                })}>
                                                + Add Day
                                            </button>
                                        </div>
                                        {formData.schedules.map((sched, idx) => (
                                            <div key={idx} className="schedule-row">
                                                <div className="form-row">
                                                    <div className="form-group">
                                                        <label className="form-label">Day</label>
                                                        <select className="form-input" value={sched.day}
                                                            onChange={e => {
                                                                const newSchedules = [...formData.schedules];
                                                                newSchedules[idx] = { ...newSchedules[idx], day: e.target.value };
                                                                setFormData({ ...formData, schedules: newSchedules });
                                                            }}>
                                                            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">Start</label>
                                                        <input type="time" className="form-input" value={sched.startTime}
                                                            onChange={e => {
                                                                const newSchedules = [...formData.schedules];
                                                                newSchedules[idx] = { ...newSchedules[idx], startTime: e.target.value };
                                                                setFormData({ ...formData, schedules: newSchedules });
                                                            }} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">End</label>
                                                        <input type="time" className="form-input" value={sched.endTime}
                                                            onChange={e => {
                                                                const newSchedules = [...formData.schedules];
                                                                newSchedules[idx] = { ...newSchedules[idx], endTime: e.target.value };
                                                                setFormData({ ...formData, schedules: newSchedules });
                                                            }} />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">Room</label>
                                                        <input type="text" className="form-input" placeholder="LH-101"
                                                            value={sched.room}
                                                            onChange={e => {
                                                                const newSchedules = [...formData.schedules];
                                                                newSchedules[idx] = { ...newSchedules[idx], room: e.target.value };
                                                                setFormData({ ...formData, schedules: newSchedules });
                                                            }} />
                                                    </div>
                                                    {formData.schedules.length > 1 && (
                                                        <button type="button" className="btn btn-sm btn-danger remove-schedule"
                                                            onClick={() => {
                                                                const newSchedules = formData.schedules.filter((_, i) => i !== idx);
                                                                setFormData({ ...formData, schedules: newSchedules });
                                                            }}>
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="modal-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                        <button type="submit" className="btn btn-primary" disabled={saving}>
                                            {saving ? 'Saving...' : (editingCourse ? 'Update' : 'Create Course')}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Bulk Import Tab */}
                            {modalTab === 'bulk' && (
                                <div className="bulk-import-section">
                                    <div className="json-format-help">
                                        <h4>📋 JSON Format</h4>
                                        <p>Paste your timetable in this JSON format:</p>
                                        <pre className="json-example">{SAMPLE_JSON}</pre>
                                        <p className="format-note">
                                            <strong>Branch codes:</strong> uch, ucp, ucs, uce, uec, uee, ume, umt<br />
                                            <strong>Days:</strong> Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
                                        </p>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Paste your JSON here:</label>
                                        <textarea
                                            className="form-input json-textarea"
                                            placeholder='{"courses": [...]}'
                                            rows={12}
                                            value={jsonInput}
                                            onChange={e => setJsonInput(e.target.value)}
                                        />
                                    </div>

                                    {importResult && (
                                        <div className="import-result">
                                            <h4>Import Results</h4>
                                            <div className="result-stats">
                                                <span className="result-stat success">✅ Created: {importResult.created?.length || 0}</span>
                                                <span className="result-stat warning">⏭️ Skipped: {importResult.skipped?.length || 0}</span>
                                                <span className="result-stat error">❌ Failed: {importResult.failed?.length || 0}</span>
                                            </div>
                                            {importResult.failed?.length > 0 && (
                                                <div className="failed-list">
                                                    <strong>Failed items:</strong>
                                                    {importResult.failed.map((f, i) => (
                                                        <div key={i} className="failed-item">{f.courseCode}: {f.error}</div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="modal-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                        <button type="button" className="btn btn-success" onClick={handleBulkImport}
                                            disabled={saving || !jsonInput.trim()}>
                                            {saving ? 'Importing...' : '📥 Import Courses'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCourses;
