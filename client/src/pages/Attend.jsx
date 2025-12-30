import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL from '../config/api';
import { useAuth } from '../context/AuthContext';
import {
    generateDeviceFingerprint,
    collectFingerprintComponents,
    detectDeviceType,
    getBrowserName,
    getOSName
} from '../utils/deviceFingerprint';
import './Attend.css';

/**
 * Attendance Marking Component (v4.0 - Enhanced Security)
 * 
 * Collects and sends:
 * - Session ID & Token (from QR)
 * - Nonce & Timestamp (from QR - for replay protection)
 * - Full location data (lat, lng, accuracy, altitude, etc.)
 * - Device fingerprint & components
 * - Device metadata
 */

const Attend = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, token } = useAuth();

    // QR Data
    const sessionId = searchParams.get('session');
    const qrToken = searchParams.get('token');
    const qrNonce = searchParams.get('nonce');
    const qrTimestamp = searchParams.get('ts');

    // State
    const [step, setStep] = useState('init'); // init, location, confirm, processing, success, error
    const [statusMsg, setStatusMsg] = useState('Initializing...');
    const [sessionInfo, setSessionInfo] = useState(null);
    const [location, setLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState('');
    const [distance, setDistance] = useState(null);

    // Redirect if no QR data
    useEffect(() => {
        if (!sessionId || !qrToken) {
            navigate('/student/scan-qr');
            return;
        }
        fetchSessionInfo();
    }, [sessionId, qrToken]);

    // Fetch session info
    const fetchSessionInfo = async () => {
        try {
            setStep('init');
            setStatusMsg('Verifying session...');

            const res = await axios.get(`${API_URL}/sessions/${sessionId}/info`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSessionInfo(res.data.data);
            setStep('location');
            setStatusMsg('Session verified. Please share your location.');

        } catch (error) {
            setStep('error');
            const errMsg = error.response?.data?.error || 'Invalid or expired session';
            setStatusMsg(errMsg);

            // Show eligibility details if available
            if (error.response?.data?.details) {
                console.log('Eligibility check failed:', error.response.data.details);
            }
        }
    };

    // Calculate distance between two points
    const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return Math.round(R * c);
    }, []);

    // Request location with enhanced data
    const requestLocation = () => {
        setLocationStatus('Acquiring GPS location...');

        if (!navigator.geolocation) {
            setStep('error');
            setStatusMsg('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { coords } = position;

                // Collect ALL available location data
                const locationData = {
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    accuracy: coords.accuracy,
                    altitude: coords.altitude,
                    altitudeAccuracy: coords.altitudeAccuracy,
                    heading: coords.heading,
                    speed: coords.speed,
                    timestamp: position.timestamp
                };

                setLocation(locationData);

                // Calculate distance if session info available
                if (sessionInfo?.centerLat && sessionInfo?.centerLng) {
                    const dist = calculateDistance(
                        coords.latitude,
                        coords.longitude,
                        sessionInfo.centerLat,
                        sessionInfo.centerLng
                    );
                    setDistance(dist);

                    // Pre-check distance (informational only)
                    if (dist > sessionInfo.radius) {
                        setLocationStatus(`⚠️ You appear to be ${dist}m away. Allowed: ${sessionInfo.radius}m`);
                    } else {
                        setLocationStatus(`✓ Location verified (${dist}m from center)`);
                    }
                } else {
                    setLocationStatus('✓ Location acquired');
                }

                setStep('confirm');
            },
            (error) => {
                setStep('error');
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        setStatusMsg('Location permission denied. You must enable GPS to mark attendance.');
                        break;
                    case error.POSITION_UNAVAILABLE:
                        setStatusMsg('Location information unavailable. Please check your GPS.');
                        break;
                    case error.TIMEOUT:
                        setStatusMsg('Location request timed out. Please try again.');
                        break;
                    default:
                        setStatusMsg('Unable to get your location.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0  // Force fresh location
            }
        );
    };

    // Submit attendance with enhanced security data
    const handleSubmit = async () => {
        try {
            setStep('processing');
            setStatusMsg('Marking your attendance...');

            // Generate device fingerprint
            const { fingerprint, components } = generateDeviceFingerprint();

            // Build complete request payload
            const payload = {
                // Session identification
                sessionId,
                token: qrToken,

                // Enhanced security (nonce & timestamp for replay protection)
                ...(qrNonce && { nonce: qrNonce }),
                ...(qrTimestamp && { timestamp: parseInt(qrTimestamp) }),

                // Full location data
                latitude: location.latitude,
                longitude: location.longitude,
                accuracy: location.accuracy,
                altitude: location.altitude,
                altitudeAccuracy: location.altitudeAccuracy,
                heading: location.heading,
                speed: location.speed,

                // Device fingerprint
                deviceFingerprint: fingerprint,
                fingerprintComponents: components,

                // Device metadata (for audit)
                deviceType: detectDeviceType(),
                browser: getBrowserName(),
                os: getOSName()
            };

            console.log('Submitting attendance with security data...');

            const response = await axios.post(`${API_URL}/attendance/mark`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStep('success');
            setStatusMsg(response.data.message || 'Attendance marked successfully! ✅');

        } catch (error) {
            setStep('error');
            const errData = error.response?.data;

            // Format error message
            let errMsg = errData?.error || 'Failed to mark attendance.';

            // Add distance info if available
            if (errData?.distance && errData?.allowedRadius) {
                errMsg += ` (${errData.distance}m away, max ${errData.allowedRadius}m)`;
            }

            // Add retry info if rate limited
            if (errData?.retryAfter) {
                errMsg += ` Try again in ${errData.retryAfter}s.`;
            }

            setStatusMsg(errMsg);
        }
    };

    // Render session info card
    const renderSessionInfo = () => {
        if (!sessionInfo) return null;

        return (
            <div className="session-info">
                <h3>{sessionInfo.courseName}</h3>
                <p className="course-code">{sessionInfo.courseCode}</p>
                <div className="session-details">
                    <span className="detail">
                        📍 Radius: {sessionInfo.radius}m
                    </span>
                    <span className={`detail ${sessionInfo.isActive ? 'active' : 'inactive'}`}>
                        {sessionInfo.isActive ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                </div>
                {sessionInfo.securityLevel && sessionInfo.securityLevel !== 'standard' && (
                    <span className="security-badge">
                        🔒 {sessionInfo.securityLevel.toUpperCase()} Security
                    </span>
                )}
            </div>
        );
    };

    // Render location info
    const renderLocationInfo = () => {
        if (!location) return null;

        return (
            <div className="location-info">
                <p>📍 Lat: {location.latitude.toFixed(6)}</p>
                <p>📍 Lng: {location.longitude.toFixed(6)}</p>
                {location.accuracy && (
                    <p>🎯 Accuracy: ±{Math.round(location.accuracy)}m</p>
                )}
                {distance !== null && (
                    <p className={distance <= (sessionInfo?.radius || 50) ? 'within-range' : 'out-of-range'}>
                        📏 Distance: {distance}m {distance <= (sessionInfo?.radius || 50) ? '✓' : '⚠️'}
                    </p>
                )}
            </div>
        );
    };

    return (
        <div className="attend-page">
            <div className="attend-card">
                <h1>📋 Mark Attendance</h1>

                {renderSessionInfo()}

                <div className="status-box">
                    {/* Location Request Step */}
                    {step === 'location' && (
                        <div className="location-step">
                            <p>Share your location to verify you're in the classroom</p>
                            <button className="btn btn-primary" onClick={requestLocation}>
                                📍 Share My Location
                            </button>
                        </div>
                    )}

                    {/* Confirm Step */}
                    {step === 'confirm' && (
                        <div className="confirm-step">
                            <div className="location-confirmed">
                                <span className="check-icon">✓</span>
                                <p>Location Acquired</p>
                            </div>
                            {renderLocationInfo()}
                            {locationStatus && <p className="location-status">{locationStatus}</p>}
                            <button className="btn btn-success" onClick={handleSubmit}>
                                ✓ Confirm Attendance
                            </button>
                        </div>
                    )}

                    {/* Loading States */}
                    {(step === 'init' || step === 'processing') && (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>{statusMsg}</p>
                        </div>
                    )}

                    {/* Success State */}
                    {step === 'success' && (
                        <div className="success-message">
                            <div className="success-icon">✅</div>
                            <h2>Success!</h2>
                            <p>{statusMsg}</p>
                            <button
                                className="btn btn-secondary"
                                onClick={() => navigate('/student/dashboard')}
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    )}

                    {/* Error State */}
                    {step === 'error' && (
                        <div className="error-message">
                            <div className="error-icon">❌</div>
                            <p>{statusMsg}</p>
                            <div className="error-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => navigate('/student/scan-qr')}
                                >
                                    Try Again
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => navigate('/student/dashboard')}
                                >
                                    Dashboard
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status message for non-terminal states */}
                {step !== 'success' && step !== 'error' && step !== 'processing' && step !== 'init' && (
                    <p className="status-text">{statusMsg}</p>
                )}

                {/* Security indicator */}
                <div className="security-footer">
                    <small>🔒 Secured with device binding & location verification</small>
                </div>
            </div>
        </div>
    );
};

export default Attend;
