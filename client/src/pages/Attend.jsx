import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config/api';
import { useAuth } from '../context/AuthContext';
import './Attend.css';

const Attend = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, token } = useAuth();

    const sessionId = searchParams.get('session');
    const qrToken = searchParams.get('token');

    const [step, setStep] = useState('init'); // init, location, confirm, success, error
    const [statusMsg, setStatusMsg] = useState('Initializing...');
    const [sessionInfo, setSessionInfo] = useState(null);
    const [location, setLocation] = useState(null);

    useEffect(() => {
        if (!sessionId || !qrToken) {
            navigate('/student/scan-qr');
            return;
        }
        fetchSessionInfo();
    }, [sessionId, qrToken]);

    const fetchSessionInfo = async () => {
        try {
            setStep('init');
            setStatusMsg('Verifying Session...');
            const res = await axios.get(`${API_URL}/sessions/${sessionId}/info`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSessionInfo(res.data.data);
            setStep('location');
        } catch (error) {
            setStep('error');
            setStatusMsg(error.response?.data?.error || 'Invalid Session');
        }
    };

    const requestLocation = () => {
        setStatusMsg('Acquiring GPS Location...');
        if (!navigator.geolocation) {
            setStep('error');
            setStatusMsg('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                setStep('confirm');
            },
            (error) => {
                setStep('error');
                setStatusMsg('Location permission denied or unavailable. You must enable GPS.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const getFingerprint = () => {
        // Simple persistent ID
        let id = localStorage.getItem('device_fp');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('device_fp', id);
        }
        return id;
    };

    const handleSubmit = async () => {
        try {
            setStep('Process');
            setStatusMsg('Marking Attendance...');

            const deviceFingerprint = getFingerprint();

            await axios.post(`${API_URL}/attendance/mark`, {
                sessionId,
                token: qrToken,
                latitude: location.latitude,
                longitude: location.longitude,
                deviceFingerprint
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStep('success');
            setStatusMsg('Attendance Marked Successfully! ✅');
        } catch (error) {
            setStep('error');
            setStatusMsg(error.response?.data?.error || 'Failed to mark attendance.');
        }
    };

    return (
        <div className="attend-page">
            <div className="attend-card">
                <h1>Attendance</h1>

                {sessionInfo && (
                    <div className="session-info">
                        <h3>{sessionInfo.courseName}</h3>
                        <p>{sessionInfo.courseCode}</p>
                    </div>
                )}

                <div className="status-box">
                    {step === 'location' && (
                        <button className="btn btn-primary" onClick={requestLocation}>
                            📍 Share Location to Verify
                        </button>
                    )}

                    {step === 'confirm' && (
                        <div>
                            <p>Location Acquired</p>
                            <button className="btn btn-success" onClick={handleSubmit}>
                                Confirm Attendance
                            </button>
                        </div>
                    )}

                    {(step === 'init' || step === 'Process') && (
                        <div className="spinner"></div>
                    )}

                    {step === 'success' && (
                        <div className="success-message">
                            <h2>✅ Success</h2>
                            <button className="btn btn-secondary" onClick={() => navigate('/student/dashboard')}>
                                Back to Dashboard
                            </button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="error-message">
                            ❌ {statusMsg}
                            <div style={{ marginTop: '1rem' }}>
                                <button className="btn btn-secondary" onClick={() => navigate('/student/dashboard')}>
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {step !== 'success' && step !== 'error' && <p className="status-text">{statusMsg}</p>}
            </div>
        </div>
    );
};

export default Attend;
