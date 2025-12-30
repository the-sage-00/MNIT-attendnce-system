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
    const [pendingProfessors, setPendingProfessors] = useState([]);
    const [claimRequests, setClaimRequests] = useState([]);
    const [electiveRequests, setElectiveRequests] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('professors');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const [analyticsRes, profRes, claimRes, electiveRes, usersRes] = await Promise.all([
                axios.get(`${API_URL}/admin/analytics`, { headers }),
                axios.get(`${API_URL}/admin/pending-professors`, { headers }),
                axios.get(`${API_URL}/admin/claim-requests?status=pending`, { headers }).catch(() => ({ data: { data: [] } })),
                axios.get(`${API_URL}/admin/elective-requests?status=pending`, { headers }).catch(() => ({ data: { data: [] } })),
                axios.get(`${API_URL}/admin/pending-users`, { headers }).catch(() => ({ data: { data: [] } }))
            ]);
            setAnalytics(analyticsRes.data.data);
            setPendingProfessors(profRes.data.data);
            setClaimRequests(claimRes.data.data || []);
            setElectiveRequests(electiveRes.data.data || []);
            setPendingUsers(usersRes.data.data || []);
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const handleProfessorApproval = async (id, action) => {
        if (!confirm(`Are you sure you want to ${action} this professor?`)) return;
        try {
            await axios.put(`${API_URL}/admin/approve-professor/${id}`,
                { action },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`Professor ${action}ed successfully`);
            fetchData();
        } catch (error) {
            toast.error('Action failed');
        }
    };

    const handleClaimRequest = async (id, action) => {
        try {
            await axios.put(`${API_URL}/admin/claim-requests/${id}`,
                { action },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`Claim request ${action}ed`);
            fetchData();
        } catch (error) {
            toast.error('Action failed');
        }
    };

    const handleElectiveRequest = async (id, action) => {
        try {
            await axios.put(`${API_URL}/admin/elective-requests/${id}`,
                { action },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            toast.success(`Elective request ${action}ed`);
            fetchData();
        } catch (error) {
            toast.error('Action failed');
        }
    };

    const totalPending = pendingProfessors.length + claimRequests.length + electiveRequests.length + pendingUsers.length;

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
                    <button className="btn btn-primary" onClick={() => navigate('/admin/courses')}>
                        📚 Manage Courses
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/admin/students')}>
                        Students
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
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                            <span className="stat-value">{analytics?.courses?.claimed || 0}</span>
                            <span className="stat-label">Claimed</span>
                        </div>
                    </div>
                    <div className="stat-card warning">
                        <div className="stat-icon">⏳</div>
                        <div className="stat-info">
                            <span className="stat-value">{totalPending}</span>
                            <span className="stat-label">Pending</span>
                        </div>
                    </div>
                    <div className="stat-card danger">
                        <div className="stat-icon">🔴</div>
                        <div className="stat-info">
                            <span className="stat-value">{analytics?.sessions?.active || 0}</span>
                            <span className="stat-label">Active Sessions</span>
                        </div>
                    </div>
                </div>

                {/* Approval Queue Tabs */}
                <div className="card approval-card">
                    <div className="approval-header">
                        <h2>📋 Approval Queue</h2>
                        <div className="tab-buttons">
                            <button
                                className={`tab-btn ${activeTab === 'professors' ? 'active' : ''}`}
                                onClick={() => setActiveTab('professors')}
                            >
                                Professors {pendingProfessors.length > 0 && <span className="badge">{pendingProfessors.length}</span>}
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'claims' ? 'active' : ''}`}
                                onClick={() => setActiveTab('claims')}
                            >
                                Course Claims {claimRequests.length > 0 && <span className="badge">{claimRequests.length}</span>}
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'electives' ? 'active' : ''}`}
                                onClick={() => setActiveTab('electives')}
                            >
                                Electives {electiveRequests.length > 0 && <span className="badge">{electiveRequests.length}</span>}
                            </button>
                            <button
                                className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                                onClick={() => setActiveTab('users')}
                            >
                                Pending Users {pendingUsers.length > 0 && <span className="badge">{pendingUsers.length}</span>}
                            </button>
                        </div>
                    </div>

                    <div className="approval-content">
                        {/* Pending Professors Tab */}
                        {activeTab === 'professors' && (
                            <div className="approval-list">
                                {pendingProfessors.length === 0 ? (
                                    <p className="empty-state">No pending professor requests.</p>
                                ) : (
                                    pendingProfessors.map(u => (
                                        <div key={u._id} className="approval-item">
                                            <div className="approval-info">
                                                <strong>{u.name}</strong>
                                                <span>{u.email}</span>
                                            </div>
                                            <div className="approval-actions">
                                                <button className="btn btn-sm btn-success" onClick={() => handleProfessorApproval(u._id, 'approve')}>
                                                    ✓ Approve
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleProfessorApproval(u._id, 'reject')}>
                                                    ✕ Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Course Claims Tab */}
                        {activeTab === 'claims' && (
                            <div className="approval-list">
                                {claimRequests.length === 0 ? (
                                    <p className="empty-state">No pending course claim requests.</p>
                                ) : (
                                    claimRequests.map(req => (
                                        <div key={req._id} className="approval-item">
                                            <div className="approval-info">
                                                <strong>{req.professor?.name || 'Professor'}</strong>
                                                <span>wants to {req.type} <strong>{req.course?.courseCode}</strong> - {req.course?.courseName}</span>
                                                {req.message && <small className="request-message">"{req.message}"</small>}
                                            </div>
                                            <div className="approval-actions">
                                                <button className="btn btn-sm btn-success" onClick={() => handleClaimRequest(req._id, 'approve')}>
                                                    ✓ Approve
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleClaimRequest(req._id, 'reject')}>
                                                    ✕ Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Elective Requests Tab */}
                        {activeTab === 'electives' && (
                            <div className="approval-list">
                                {electiveRequests.length === 0 ? (
                                    <p className="empty-state">No pending elective requests.</p>
                                ) : (
                                    electiveRequests.map(req => (
                                        <div key={req._id} className="approval-item">
                                            <div className="approval-info">
                                                <strong>{req.student?.name || 'Student'}</strong>
                                                <span>({req.student?.rollNo}) wants <strong>{req.course?.courseCode}</strong></span>
                                                {req.reason && <small className="request-message">Reason: "{req.reason}"</small>}
                                            </div>
                                            <div className="approval-actions">
                                                <button className="btn btn-sm btn-success" onClick={() => handleElectiveRequest(req._id, 'approve')}>
                                                    ✓ Approve
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleElectiveRequest(req._id, 'reject')}>
                                                    ✕ Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Pending Users Tab */}
                        {activeTab === 'users' && (
                            <div className="approval-list">
                                {pendingUsers.length === 0 ? (
                                    <p className="empty-state">No pending users with non-standard emails.</p>
                                ) : (
                                    pendingUsers.map(u => (
                                        <div key={u._id} className="approval-item">
                                            <div className="approval-info">
                                                <strong>{u.name}</strong>
                                                <span>{u.email}</span>
                                                <small>Needs branch assignment</small>
                                            </div>
                                            <div className="approval-actions">
                                                <button className="btn btn-sm btn-primary" onClick={() => navigate(`/admin/users/${u._id}`)}>
                                                    📝 Review
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
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
                            <span className="overview-value">{analytics?.sessions?.today || 0}</span>
                            <span className="overview-label">Sessions Today</span>
                        </div>
                        <div className="overview-item highlight">
                            <span className="overview-value">{analytics?.attendance?.averageRate || 0}%</span>
                            <span className="overview-label">Success Rate</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
