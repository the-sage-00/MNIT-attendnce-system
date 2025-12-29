import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import GoogleLoginButton from '../../components/GoogleLoginButton';
import './ProfessorLogin.css';

/**
 * Professor Login Page
 * Any Google email allowed
 */
const ProfessorLogin = () => {
    const { user, loginAsProfessor } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            if (user.role === 'professor') {
                navigate('/professor/dashboard');
            } else if (user.role === 'pending_professor') {
                navigate('/pending-approval');
            }
        }
    }, [user, navigate]);

    const handleGoogleSuccess = async (credential) => {
        try {
            const userData = await loginAsProfessor(credential);
            if (userData.role === 'pending_professor') {
                navigate('/pending-approval');
            } else {
                navigate('/professor/dashboard');
            }
        } catch (error) {
            console.error('Login Failed', error);
            alert(error.response?.data?.error || 'Login failed.');
        }
    };

    return (
        <div className="professor-login-container">
            <div className="login-card">
                <div className="login-icon">👨‍🏫</div>
                <h1>Professor Portal</h1>
                <p>QR Attendance Management</p>

                <div className="login-actions">
                    <GoogleLoginButton
                        onSuccess={handleGoogleSuccess}
                        onError={(err) => console.error(err)}
                        text="signin_with"
                    />
                </div>

                <div className="login-footer">
                    <p>Use any Google account</p>
                    <div className="login-links">
                        <Link to="/">← Student Login</Link>
                        <span> | </span>
                        <Link to="/admin/login">Admin Login</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfessorLogin;
