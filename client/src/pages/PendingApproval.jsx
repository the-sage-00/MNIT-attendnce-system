import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './PendingApproval.css';

const PendingApproval = () => {
    const { logout, user } = useAuth();
    const [dots, setDots] = useState('');

    // Animated dots effect
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="pending-container">
            {/* Animated background */}
            <div className="pending-bg-animation">
                <div className="pending-circle pending-circle-1"></div>
                <div className="pending-circle pending-circle-2"></div>
                <div className="pending-circle pending-circle-3"></div>
            </div>

            <div className="pending-content">
                {/* Icon with pulse animation */}
                <div className="pending-icon-wrapper">
                    <div className="pending-icon-pulse"></div>
                    <div className="pending-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>

                {/* Main content */}
                <div className="pending-header">
                    <h1 className="pending-title">Approval Pending</h1>
                    <p className="pending-subtitle">Your request is being reviewed</p>
                </div>

                {/* Status card */}
                <div className="pending-status-card">
                    <div className="pending-status-icon">⏳</div>
                    <div className="pending-status-content">
                        <h3>Waiting for Admin Approval{dots}</h3>
                        <p>Your request for Professor access is currently under review by the system administrator.</p>
                    </div>
                </div>

                {/* User info */}
                {user && (
                    <div className="pending-user-info">
                        <div className="pending-user-avatar">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="pending-user-details">
                            <p className="pending-user-name">{user.name}</p>
                            <p className="pending-user-email">{user.email}</p>
                            <p className="pending-user-role">Role: Professor (Pending)</p>
                        </div>
                    </div>
                )}

                {/* Timeline */}
                <div className="pending-timeline">
                    <div className="pending-timeline-item completed">
                        <div className="pending-timeline-dot"></div>
                        <div className="pending-timeline-content">
                            <h4>Registration Submitted</h4>
                            <p>Your account has been created</p>
                        </div>
                    </div>
                    <div className="pending-timeline-item active">
                        <div className="pending-timeline-dot"></div>
                        <div className="pending-timeline-content">
                            <h4>Admin Review</h4>
                            <p>Waiting for administrator approval</p>
                        </div>
                    </div>
                    <div className="pending-timeline-item">
                        <div className="pending-timeline-dot"></div>
                        <div className="pending-timeline-content">
                            <h4>Access Granted</h4>
                            <p>You'll be able to access the system</p>
                        </div>
                    </div>
                </div>

                {/* Info box */}
                <div className="pending-info-box">
                    <div className="pending-info-icon">💡</div>
                    <div className="pending-info-content">
                        <h4>What happens next?</h4>
                        <ul>
                            <li>An administrator will review your request</li>
                            <li>You'll receive an email notification once approved</li>
                            <li>You can then log back in to access the system</li>
                        </ul>
                    </div>
                </div>

                {/* Actions */}
                <div className="pending-actions">
                    <button onClick={logout} className="pending-btn-logout">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12M21 12L16 7M21 12H9"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Logout
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        className="pending-btn-refresh"
                    >
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 4V10H7M23 20V14H17M20.49 9C19.9828 7.56678 19.1209 6.28536 17.9845 5.27542C16.8482 4.26548 15.4745 3.55976 13.9917 3.22426C12.5089 2.88875 10.9652 2.93434 9.50481 3.35677C8.04437 3.77921 6.71475 4.56471 5.64 5.64L1 10M23 14L18.36 18.36C17.2853 19.4353 15.9556 20.2208 14.4952 20.6432C13.0348 21.0657 11.4911 21.1112 10.0083 20.7757C8.52547 20.4402 7.1518 19.7345 6.01547 18.7246C4.87913 17.7146 4.01717 16.4332 3.51 15"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Refresh Status
                    </button>
                </div>

                {/* Footer */}
                <div className="pending-footer">
                    <p>Need help? Contact your system administrator</p>
                </div>
            </div>
        </div>
    );
};

export default PendingApproval;
