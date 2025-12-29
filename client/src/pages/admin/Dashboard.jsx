import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/ThemeToggle';
import API_URL from '../../config/api';
import './Dashboard.css';

const AdminDashboard = () => {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();

    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/pending-professors`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingUsers(res.data.data);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (id, action) => {
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;
        try {
            await axios.put(`${API_URL}/admin/approve-professor/${id}`,
                { action }, // 'approve' or 'reject'
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchPending(); // Refresh
        } catch (error) {
            alert('Action failed');
        }
    };

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>Admin Panel</h1>
                    <p>System Administration</p>
                </div>
                <div className="header-right">
                    <ThemeToggle />
                    <button className="btn btn-ghost" onClick={() => { logout(); navigate('/'); }}>Logout</button>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="card">
                    <h2>👨‍🏫 Professor Approvals</h2>
                    <p>Review requests for professor access.</p>

                    {loading ? <div className="spinner"></div> :
                        pendingUsers.length === 0 ? <p className="empty-state">No pending requests.</p> : (
                            <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid #333' }}>
                                        <th style={{ padding: '10px' }}>Name</th>
                                        <th style={{ padding: '10px' }}>Email</th>
                                        <th style={{ padding: '10px' }}>Date</th>
                                        <th style={{ padding: '10px' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingUsers.map(u => (
                                        <tr key={u._id} style={{ borderBottom: '1px solid #222' }}>
                                            <td style={{ padding: '10px' }}>{u.name}</td>
                                            <td style={{ padding: '10px' }}>{u.email}</td>
                                            <td style={{ padding: '10px' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                                            <td style={{ padding: '10px' }}>
                                                <button className="btn btn-success btn-sm" onClick={() => handleApproval(u._id, 'approve')} style={{ marginRight: '10px' }}>Approve</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleApproval(u._id, 'reject')}>Reject</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
