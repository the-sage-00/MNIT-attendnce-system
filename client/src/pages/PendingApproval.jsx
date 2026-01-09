import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import API_URL from '../config/api';
import './PendingApproval.css';

const PendingApproval = () => {
    const { logout, user, token } = useAuth();
    const navigate = useNavigate();
    const [dots, setDots] = useState('');
    const [checking, setChecking] = useState(false);

    // Animated dots effect
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Auto-check approval status every 10 seconds
    useEffect(() => {
        const checkApprovalStatus = async () => {
            if (!token || checking) return;

            try {
                setChecking(true);
                // Try to fetch user profile - if approved, this will succeed
                const res = await axios.get(`${API_URL}/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // If user is approved, redirect to dashboard
                if (res.data.data.isApproved) {
                    window.location.href = '/professor/dashboard';
                }
            } catch (error) {
                // Still pending, do nothing
            } finally {
                setChecking(false);
            }
        };

        // Check immediately
        checkApprovalStatus();

        // Then check every 10 seconds
        const interval = setInterval(checkApprovalStatus, 10000);
        return () => clearInterval(interval);
    }, [token, navigate, checking]);

    const handleRefresh = async () => {
        setChecking(true);
        try {
            const res = await axios.get(`${API_URL}/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.data.isApproved) {
                window.location.href = '/professor/dashboard';
            } else {
                alert('Still pending approval. Please wait for admin to approve.');
            }
        } catch (error) {
            alert('Error checking status. Please try again.');
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="pending-container">
            <div className="pending-bg-animation">
                <div className="pending-circle pending-circle-1"></div>
                <div className="pending-circle pending-circle-2"></div>
            </div>

            <div className="pending-content">
                {/* Icon */}
                <div className="pending-icon-wrapper">
                    <div className="pending-icon-pulse"></div>
                    <div className="pending-icon">⏳</div>
                </div>

                {/* Header */}
                <h1 className="pending-title">Approval Pending</h1>
                <p className="pending-subtitle">Your request is being reviewed</p>

                {/* Status */}
                <div className="pending-status-card">
                    <h3>Waiting for Admin Approval{dots}</h3>
                    <p>Your request for Professor access is under review.</p>
                </div>

                {/* User Info */}
                {user && (
                    <div className="pending-user-info">
                        <div className="pending-user-avatar">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p className="pending-user-name">{user.name}</p>
                            <p className="pending-user-email">{user.email}</p>
                        </div>
                    </div>
                )}

                {/* Timeline */}
                <div className="pending-timeline">
                    <div className="pending-timeline-item completed">
                        <div className="pending-timeline-dot"></div>
                        <div>
                            <h4>Registration Submitted</h4>
                            <p>Account created</p>
                        </div>
                    </div>
                    <div className="pending-timeline-item active">
                        <div className="pending-timeline-dot"></div>
                        <div>
                            <h4>Admin Review</h4>
                            <p>Waiting for approval</p>
                        </div>
                    </div>
                    <div className="pending-timeline-item">
                        <div className="pending-timeline-dot"></div>
                        <div>
                            <h4>Access Granted</h4>
                            <p>You'll be redirected</p>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="pending-info-box">
                    <div className="pending-info-icon">💡</div>
                    <div>
                        <h4>What happens next?</h4>
                        <ul>
                            <li>Admin will review your request</li>
                            <li>You'll be auto-redirected when approved</li>
                            <li>Or click "Check Status" to refresh</li>
                        </ul>
                    </div>
                </div>

                {/* Actions */}
                <div className="pending-actions">
                    <button onClick={handleRefresh} className="pending-btn-refresh" disabled={checking}>
                        {checking ? 'Checking...' : '🔄 Check Status'}
                    </button>
                    <button onClick={logout} className="pending-btn-logout">
                        🚪 Logout
                    </button>
                </div>

                {/* Auto-refresh notice */}
                <p className="pending-footer">
                    Auto-checking every 10 seconds...
                </p>
            </div>
        </div>
    );
};

export default PendingApproval;
