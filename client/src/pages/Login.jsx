import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleLoginButton from '../components/GoogleLoginButton';
import './Login.css';

/**
 * Student Login Page
 * Only MNIT emails allowed
 */
const Login = () => {
    const { user, loginAsStudent } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            if (user.role === 'student') {
                navigate('/student/dashboard');
            } else if (user.role === 'admin') {
                navigate('/admin/dashboard');
            }
        }
    }, [user, navigate]);

    const handleGoogleSuccess = async (credential) => {
        try {
            await loginAsStudent(credential);
            navigate('/student/dashboard');
        } catch (error) {
            console.error('Login Failed', error);
            alert(error.response?.data?.error || 'Login failed. Please use your MNIT email.');
        }
    };

    return (
        <div className="auth-page student-auth">
            <div className="auth-card">
                {/* Icon */}
                <div className="auth-icon">🎓</div>

                {/* Title */}
                <h1 className="auth-title">Student Portal</h1>
                <p className="auth-subtitle">QR Attendance System</p>

                {/* Instructions */}
                <div className="auth-instructions">
                    <div className="instruction-header">
                        <span className="instruction-icon">📋</span>
                        <span>How to Login</span>
                    </div>
                    <ul className="instruction-list">
                        <li>Use your official MNIT email (@mnit.ac.in)</li>
                        <li>Click Google button to sign in</li>
                        <li>Allow location for attendance</li>
                    </ul>
                </div>

                {/* Google Login */}
                <div className="auth-button-wrapper">
                    <GoogleLoginButton
                        onSuccess={handleGoogleSuccess}
                        onError={(err) => console.error(err)}
                        text="signin_with"
                    />
                </div>

                {/* Footer */}
                <div className="auth-footer">
                    <p className="auth-note">Only @mnit.ac.in emails accepted</p>
                    <Link to="/professor/login" className="auth-link">
                        👨‍🏫 Professor Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
