import { useAuth } from '../context/AuthContext';
import './Login.css'; // Reusing styles

const PendingApproval = () => {
    const { logout } = useAuth();

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Approval Pending</h1>
                <p>Your requests for Professor access is under review.</p>
                <div style={{ margin: '20px 0', color: '#ffd700' }}>
                    ⚠️ Waiting for Admin Approval
                </div>
                <button onClick={logout} className="btn-secondary">
                    Logout
                </button>
            </div>
        </div>
    );
};

export default PendingApproval;
