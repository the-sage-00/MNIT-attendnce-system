import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config/api';
import './Attend.css';

const Attend = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const sessionId = searchParams.get('session');
    const qrToken = searchParams.get('token');
    const isStatic = searchParams.get('static') === 'true';

    const [step, setStep] = useState('location'); // location, form, submitting
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState('');
    const [distance, setDistance] = useState(null);
    const [withinRange, setWithinRange] = useState(false);

    const [studentName, setStudentName] = useState('');
    const [studentId, setStudentId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [studentFound, setStudentFound] = useState(false);

    useEffect(() => {
        // For static QR, we only need sessionId
        // For dynamic QR, we need both sessionId and qrToken
        if (!sessionId || (!isStatic && !qrToken)) {
            navigate('/scan');
            return;
        }
        requestLocation();
    }, [sessionId, qrToken, isStatic]);

    const requestLocation = () => {
        setLocationError('');

        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                setLocation({ latitude, longitude, accuracy });

                // Verify distance with server (optional pre-check)
                // For now we'll proceed to form, distance check happens on submit
                setStep('form');
            },
            (error) => {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setLocationError('Location permission denied. Please enable GPS access.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setLocationError('Location unavailable. Please ensure GPS is enabled.');
                        break;
                    case error.TIMEOUT:
                        setLocationError('Location request timed out. Please try again.');
                        break;
                    default:
                        setLocationError('Failed to get your location.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            }
        );
    };

    const getDeviceFingerprint = async () => {
        // Simple fingerprint based on available data
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);

        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            screen.width + 'x' + screen.height,
            new Date().getTimezoneOffset(),
            canvas.toDataURL()
        ].join('|');

        // Simple hash
        let hash = 0;
        for (let i = 0; i < fingerprint.length; i++) {
            hash = ((hash << 5) - hash) + fingerprint.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString(16);
    };

    // Lookup student by roll number
    const lookupStudent = async (rollNo) => {
        if (!rollNo || rollNo.length < 1) {
            setStudentName('');
            setStudentFound(false);
            return;
        }

        setLookupLoading(true);
        try {
            const res = await axios.get(`${API_URL}/attendance/lookup/${sessionId}/${rollNo}`);
            if (res.data.success) {
                setStudentName(res.data.data.name);
                setStudentFound(true);
            }
        } catch (err) {
            // Student not found - allow manual entry
            setStudentFound(false);
        } finally {
            setLookupLoading(false);
        }
    };

    // Debounce lookup
    const handleRollNoChange = (value) => {
        setStudentId(value);
        setStudentFound(false);

        // Clear previous timeout
        if (window.lookupTimeout) {
            clearTimeout(window.lookupTimeout);
        }

        // Lookup after 500ms of no typing
        window.lookupTimeout = setTimeout(() => {
            lookupStudent(value);
        }, 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const deviceFingerprint = await getDeviceFingerprint();

            const response = await axios.post(`${API_URL}/attendance`, {
                sessionId,
                qrToken,
                studentName,
                studentId,
                latitude: location.latitude,
                longitude: location.longitude,
                deviceFingerprint,
                isStatic  // Send flag so backend skips token validation
            });

            // Navigate to success page with result
            navigate('/success', {
                state: {
                    status: response.data.data.status,
                    distance: response.data.data.distance,
                    message: response.data.data.message
                }
            });
        } catch (err) {
            const message = err.response?.data?.error || 'Failed to mark attendance';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    if (!sessionId || (!isStatic && !qrToken)) {
        return null;
    }

    return (
        <div className="attend-page">
            <div className="attend-container">
                <div className="attend-header">
                    <h1>
                        <span className="attend-header-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                        </span>
                        Mark Attendance
                    </h1>
                </div>

                {step === 'location' && (
                    <div className="location-step animate-fade-in">
                        <div className={`location-icon-wrapper ${locationError ? 'error' : ''}`}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                {locationError ? (
                                    <>
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </>
                                ) : (
                                    <>
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </>
                                )}
                            </svg>
                        </div>

                        {!locationError ? (
                            <>
                                <div className="spinner spinner-lg"></div>
                                <h3>Getting your location</h3>
                                <p>Please allow GPS access when prompted</p>
                            </>
                        ) : (
                            <>
                                <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                                    {locationError}
                                </div>
                                <button className="btn btn-primary" onClick={requestLocation}>
                                    Try Again
                                </button>
                            </>
                        )}
                    </div>
                )}

                {step === 'form' && (
                    <div className="form-step animate-fade-in">
                        <div className="location-status">
                            <div className="status-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <div>
                                <p className="status-label">Location Acquired</p>
                                <p className="status-detail">
                                    Accuracy: ±{Math.round(location?.accuracy || 0)}m
                                </p>
                            </div>
                        </div>

                        {/* Debug: Show coordinates for troubleshooting */}
                        <div className="location-debug" style={{
                            background: 'var(--bg-surface)',
                            padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--space-4)',
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-muted)'
                        }}>
                            <p style={{ marginBottom: '4px' }}>
                                📍 <strong>Your Location:</strong> {location?.latitude?.toFixed(6)}, {location?.longitude?.toFixed(6)}
                            </p>
                            <a
                                href={`https://www.google.com/maps?q=${location?.latitude},${location?.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                            >
                                🗺️ View on Google Maps
                            </a>
                        </div>

                        <form onSubmit={handleSubmit} className="attend-form">
                            <div className="form-group">
                                <label className="form-label">
                                    Student ID / Roll Number
                                    {lookupLoading && <span className="lookup-indicator"> 🔍</span>}
                                    {studentFound && <span className="lookup-found"> ✓ Found</span>}
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter your roll number"
                                    value={studentId}
                                    onChange={(e) => handleRollNoChange(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">
                                    Full Name
                                    {studentFound && <span className="auto-filled"> (auto-filled)</span>}
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter your full name"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                    required
                                    disabled={loading || studentFound}
                                />
                            </div>

                            {error && (
                                <div className="alert alert-error">{error}</div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary submit-btn"
                                disabled={loading || !studentName || !studentId}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner" style={{ width: 20, height: 20 }}></span>
                                        Submitting...
                                    </>
                                ) : (
                                    <>✓ Mark Attendance</>
                                )}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Attend;
