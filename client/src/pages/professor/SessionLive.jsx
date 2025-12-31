import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config/api';
import './SessionLive.css';

/**
 * Live Session Management (Professor)
 * Displays rotating QR code and real-time attendance
 * 
 * Enhanced with:
 * - Manual QR refresh button
 * - Security level display
 * - Countdown timer for QR rotation
 * - Suspicious activity indicators
 * - Failed attempts with manual accept
 */

const SessionLive = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();

    const [session, setSession] = useState(null);
    const [qrCode, setQrCode] = useState('');
    const [qrExpiry, setQrExpiry] = useState(null);
    const [countdown, setCountdown] = useState(30);
    const [stats, setStats] = useState({ validCount: 0, totalCount: 0, suspicious: 0 });
    const [attendees, setAttendees] = useState([]);
    const [failedAttempts, setFailedAttempts] = useState([]);
    const [isActive, setIsActive] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [acceptingId, setAcceptingId] = useState(null);

    const pollingRef = useRef(null);
    const countdownRef = useRef(null);

    useEffect(() => {
        fetchSessionDetails();
        fetchQR();

        // Start polling for stats every 5 seconds
        pollingRef.current = setInterval(() => {
            fetchStats();
            fetchFailedAttempts();
        }, 5000);

        return () => {
            clearInterval(pollingRef.current);
            clearInterval(countdownRef.current);
        };
    }, [id]);

    // Countdown timer for QR refresh
    useEffect(() => {
        if (qrExpiry && isActive) {
            clearInterval(countdownRef.current);

            countdownRef.current = setInterval(() => {
                const remaining = Math.max(0, Math.floor((qrExpiry - Date.now()) / 1000));
                setCountdown(remaining);

                // Auto-refresh when expired
                if (remaining <= 0) {
                    fetchQR();
                }
            }, 1000);
        }

        return () => clearInterval(countdownRef.current);
    }, [qrExpiry, isActive]);

    const fetchSessionDetails = async () => {
        try {
            const res = await axios.get(`${API_URL}/sessions/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSession(res.data.data);
            setIsActive(res.data.data.isActive);
        } catch (error) {
            console.error('Session fetch error:', error);
        }
    };

    const fetchQR = useCallback(async () => {
        if (!isActive) return;

        try {
            const res = await axios.get(`${API_URL}/sessions/${id}/qr`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQrCode(res.data.data.qrCode);
            setQrExpiry(new Date(res.data.data.expiresAt).getTime());
            setCountdown(Math.floor(res.data.data.remainingMs / 1000));
        } catch (error) {
            console.error('QR Fetch Error', error);
            if (error.response?.data?.error === 'Session has ended') {
                setIsActive(false);
            }
        }
    }, [id, token, isActive]);

    const fetchStats = async () => {
        try {
            const res = await axios.get(`${API_URL}/attendance/session/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data.data || [];
            setAttendees(data);
            setStats({
                validCount: data.filter(a => a.status === 'PRESENT').length,
                lateCount: data.filter(a => a.status === 'LATE').length,
                suspicious: data.filter(a =>
                    a.status === 'SUSPICIOUS' ||
                    (a.securityFlags && a.securityFlags.length > 0)
                ).length,
                totalCount: data.length
            });
        } catch (error) {
            console.error('Stats fetch error:', error);
        }
    };

    const fetchFailedAttempts = async () => {
        try {
            const res = await axios.get(`${API_URL}/attendance/session/${id}/failed-attempts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFailedAttempts(res.data.data?.filter(a => a.status === 'PENDING') || []);
        } catch (error) {
            console.error('Failed attempts fetch error:', error);
        }
    };

    const handleAcceptStudent = async (attemptId, studentName) => {
        if (!confirm(`Accept attendance for ${studentName}?`)) return;

        setAcceptingId(attemptId);
        try {
            await axios.post(`${API_URL}/attendance/failed-attempt/${attemptId}/accept`, {
                note: 'Manually accepted during live session'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success(`Attendance marked for ${studentName}`);
            // Refresh both lists
            fetchStats();
            fetchFailedAttempts();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to accept');
        }
        setAcceptingId(null);
    };

    const handleForceRefresh = async () => {
        setIsRefreshing(true);
        try {
            const res = await axios.post(`${API_URL}/sessions/${id}/refresh-qr`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQrCode(res.data.data.qrCode);
            setQrExpiry(new Date(res.data.data.expiresAt).getTime());
            setCountdown(30);
        } catch (error) {
            console.error('Force refresh error:', error);
            alert('Failed to refresh QR');
        }
        setIsRefreshing(false);
    };

    const handleStopSession = async () => {
        if (!confirm('Stop this session? Students will no longer be able to mark attendance.')) return;
        try {
            await axios.put(`${API_URL}/sessions/${id}/stop`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsActive(false);
            clearInterval(pollingRef.current);
            clearInterval(countdownRef.current);
            toast.success('Session stopped successfully!');
            // Navigate with refresh flag
            navigate('/professor/dashboard', { state: { refresh: true } });
        } catch (error) {
            toast.error('Failed to stop session');
        }
    };

    // Get status badge color
    const getStatusBadge = (status) => {
        switch (status) {
            case 'PRESENT': return 'badge-success';
            case 'LATE': return 'badge-warning';
            case 'SUSPICIOUS': return 'badge-danger';
            default: return 'badge-default';
        }
    };

    return (
        <div className="session-live-page">
            <header className="live-header">
                <div className="header-info">
                    <h2>{session?.course?.courseName}</h2>
                    <div className="header-badges">
                        {isActive ? (
                            <span className="live-badge">🔴 LIVE SESSION</span>
                        ) : (
                            <span className="ended-badge">⏹ SESSION ENDED</span>
                        )}
                        {session?.sessionNumber && (
                            <span className="session-number-badge">
                                Session #{session.sessionNumber}
                            </span>
                        )}
                        {session?.securityLevel && session.securityLevel !== 'standard' && (
                            <span className="security-level-badge">
                                🔒 {session.securityLevel.toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>
                {isActive ? (
                    <button className="btn btn-danger" onClick={handleStopSession}>
                        ⏹ Stop Session
                    </button>
                ) : (
                    <button className="btn btn-secondary" onClick={() => navigate('/professor/dashboard')}>
                        ← Back to Dashboard
                    </button>
                )}
            </header>

            <div className="live-content">
                {/* QR Code Section */}
                <div className="qr-section card">
                    <div className="qr-header">
                        <h3>Scan to Mark Attendance</h3>
                        <div className="qr-timer">
                            <span className={`timer-count ${countdown <= 5 ? 'expiring' : ''}`}>
                                {countdown}s
                            </span>
                            <button
                                className="btn-refresh"
                                onClick={handleForceRefresh}
                                disabled={isRefreshing}
                                title="Force refresh QR"
                            >
                                {isRefreshing ? '⏳' : '🔄'}
                            </button>
                        </div>
                    </div>

                    {isActive ? (
                        <div className="qr-display">
                            {qrCode ? (
                                <>
                                    <img src={qrCode} alt="Session QR" />
                                    <div className="qr-countdown-bar">
                                        <div
                                            className="countdown-progress"
                                            style={{ width: `${(countdown / 30) * 100}%` }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="spinner"></div>
                            )}
                            <p className="refresh-hint">
                                🔐 QR rotates every 30s with HMAC security
                            </p>
                        </div>
                    ) : (
                        <div className="session-ended">
                            <p>⏹ Session Ended</p>
                        </div>
                    )}

                    <div className="session-info-row">
                        <span>📍 Radius: {session?.radius || 50}m</span>
                        <span>⏱ Started: {session?.startTime && new Date(session.startTime).toLocaleTimeString()}</span>
                    </div>
                </div>

                {/* Failed Attempts Section - NEW */}
                {failedAttempts.length > 0 && (
                    <div className="failed-attempts-section card">
                        <h3>⚠️ Students Needing Review ({failedAttempts.length})</h3>
                        <p className="section-hint">These students tried to mark attendance but were too far away</p>
                        <div className="failed-list">
                            {failedAttempts.map(attempt => (
                                <div key={attempt._id} className="failed-item">
                                    <div className="failed-info">
                                        <span className="roll">{attempt.rollNo}</span>
                                        <span className="name">{attempt.studentName}</span>
                                        <span className="distance-badge danger">
                                            {Math.round(attempt.distance || 0)}m away
                                        </span>
                                        <span className="time">
                                            {new Date(attempt.attemptedAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <button
                                        className="btn btn-success btn-accept"
                                        onClick={() => handleAcceptStudent(attempt._id, attempt.studentName)}
                                        disabled={acceptingId === attempt._id}
                                    >
                                        {acceptingId === attempt._id ? '...' : '✓ Accept'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Attendees Section */}
                <div className="attendees-section card">
                    <div className="stats-row">
                        <div className="stat-box stat-present">
                            <span className="count">{stats.validCount}</span>
                            <span className="label">Present</span>
                        </div>
                        <div className="stat-box stat-late">
                            <span className="count">{stats.lateCount || 0}</span>
                            <span className="label">Late</span>
                        </div>
                        <div className="stat-box stat-suspicious">
                            <span className="count">{stats.suspicious}</span>
                            <span className="label">Flagged</span>
                        </div>
                        <div className="stat-box stat-total">
                            <span className="count">{stats.totalCount}</span>
                            <span className="label">Total</span>
                        </div>
                    </div>

                    <h3>Live Attendees</h3>
                    <div className="attendees-list">
                        {attendees.length === 0 ? (
                            <div className="no-attendees">
                                <p>No students have marked attendance yet</p>
                            </div>
                        ) : (
                            attendees.map(a => (
                                <div
                                    key={a._id}
                                    className={`attendee-item ${a.securityFlags?.length > 0 ? 'flagged' : ''}`}
                                >
                                    <span className="roll">{a.rollNo}</span>
                                    <span className="name">{a.studentName}</span>
                                    <span className={`status-badge ${getStatusBadge(a.status)}`}>
                                        {a.status}
                                    </span>
                                    <span className="distance">{a.distance}m</span>
                                    <span className="time">
                                        {new Date(a.timestamp).toLocaleTimeString()}
                                    </span>
                                    {a.securityFlags?.length > 0 && (
                                        <span className="flags" title={a.securityFlags.join(', ')}>
                                            ⚠️
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionLive;

