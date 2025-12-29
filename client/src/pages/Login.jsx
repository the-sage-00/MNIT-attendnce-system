import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GoogleLoginButton from '../components/GoogleLoginButton';
import './Login.css';

/**
 * Student Login Page (Main page at /)
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
        <div className="login-container">
            <div className="login-card">
                <div className="login-icon">🎓</div>
                <h1>Student Portal</h1>
                <p>MNIT QR Attendance System</p>

                <div className="login-actions">
                    <GoogleLoginButton
                        onSuccess={handleGoogleSuccess}
                        onError={(err) => console.error(err)}
                        text="signin_with"
                    />
                </div>

                <div className="login-footer">
                    <p>Use your @mnit.ac.in email</p>
                    <div className="login-links">
                        <Link to="/professor/login">Professor Login →</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
