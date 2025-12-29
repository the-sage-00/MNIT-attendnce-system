import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import API_URL from '../../config/api';
import './SessionLive.css'; // Will create

const SessionLive = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();

    const [session, setSession] = useState(null);
    const [qrCode, setQrCode] = useState('');
    const [stats, setStats] = useState({ validCount: 0, totalCount: 0 });
    const [attendees, setAttendees] = useState([]);
    const [isActive, setIsActive] = useState(true);

    const pollingRef = useRef(null);

    useEffect(() => {
        fetchSessionDetails();
        fetchQR();

        // Start polling
        pollingRef.current = setInterval(() => {
            fetchStats();
            fetchQR(); // Auto refreshes if expired
        }, 5000);

        return () => clearInterval(pollingRef.current);
    }, [id]);

    const fetchSessionDetails = async () => {
        try {
            const res = await axios.get(`${API_URL}/sessions/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSession(res.data.data);
            setIsActive(res.data.data.isActive);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchQR = async () => {
        if (!isActive) return;
        try {
            const res = await axios.get(`${API_URL}/sessions/${id}/qr`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQrCode(res.data.data.qrCode);
        } catch (error) {
            console.error('QR Fetch Error', error);
        }
    };

    const fetchStats = async () => {
        // Fetch attendees list and count
        try {
            const res = await axios.get(`${API_URL}/attendance/session/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAttendees(res.data.data);
            setStats({
                validCount: res.data.data.filter(a => a.status === 'PRESENT').length,
                totalCount: res.data.data.length
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleStopSession = async () => {
        if (!confirm('Stop this session? Students will no longer be able to mark attendance.')) return;
        try {
            await axios.put(`${API_URL}/sessions/${id}/stop`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsActive(false);
            clearInterval(pollingRef.current);
            alert('Session Stopped');
            navigate('/professor/dashboard');
        } catch (error) {
            alert('Failed to stop session');
        }
    };

    return (
        <div className="session-live-page">
            <header className="live-header">
                <div>
                    <h2>{session?.course?.courseName}</h2>
                    <span className="live-badge">🔴 LIVE SESSION</span>
                </div>
                <button className="btn btn-danger" onClick={handleStopSession}>Stop Session</button>
            </header>

            <div className="live-content">
                <div className="qr-section card">
                    <h3>Scan to Mark Attendance</h3>
                    {isActive ? (
                        <div className="qr-display">
                            {qrCode ? <img src={qrCode} alt="Session QR" /> : <div className="spinner"></div>}
                            <p className="refresh-hint">QR Code rotates automatically for security</p>
                        </div>
                    ) : (
                        <div className="session-ended">
                            <p>Session Ended</p>
                        </div>
                    )}
                </div>

                <div className="attendees-section card">
                    <div className="stats-row">
                        <div className="stat-box">
                            <span className="count">{stats.validCount}</span>
                            <span className="label">Present</span>
                        </div>
                        <div className="stat-box">
                            <span className="count">{attendees.length}</span>
                            <span className="label">Total Scans</span>
                        </div>
                    </div>

                    <h3>Live Attendees</h3>
                    <div className="attendees-list">
                        {attendees.map(a => (
                            <div key={a._id} className="attendee-item">
                                <span className="roll">{a.rollNo || a.studentId}</span>
                                <span className="name">{a.studentName}</span>
                                <span className="time">{new Date(a.timestamp).toLocaleTimeString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SessionLive;
