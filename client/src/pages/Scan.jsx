import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import './Scan.css';

const Scan = () => {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const scannerRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const startScanner = async () => {
        setError('');
        setScanning(true);

        try {
            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 220, height: 220 },
                    aspectRatio: 1
                },
                (decodedText) => {
                    handleScan(decodedText, scanner);
                },
                (error) => {
                    // QR not found, continue scanning
                }
            );
        } catch (err) {
            setScanning(false);
            if (err.toString().includes('Permission')) {
                setError('Camera permission denied. Please allow camera access.');
            } else {
                setError('Failed to start camera. Please try again.');
            }
        }
    };

    const handleScan = async (data, scanner) => {
        try {
            await scanner.stop();
            scannerRef.current = null;

            // Try to parse as URL first
            try {
                const url = new URL(data);
                const params = new URLSearchParams(url.search);
                const sessionId = params.get('session');
                const qrToken = params.get('token');

                if (sessionId) {
                    // Navigate to attend page with the full URL parameters
                    navigate(`/attend?session=${sessionId}${qrToken ? `&token=${qrToken}` : ''}${params.get('static') ? '&static=true' : ''}`);
                    return;
                }
            } catch (e) {
                // Not a URL, try pipe format
            }

            // Fallback: Parse QR data as sessionId|qrToken format
            const [sessionId, qrToken] = data.split('|');

            if (sessionId && qrToken) {
                navigate(`/attend?session=${sessionId}&token=${qrToken}`);
            } else {
                setError('Invalid QR code format');
                setScanning(false);
            }
        } catch (err) {
            setError('Failed to process QR code');
            setScanning(false);
        }
    };

    return (
        <div className="scan-page">
            <div className="scan-container animate-fade-in-up">
                <div className="scan-header">
                    <h1>
                        <span className="scan-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M7 7h.01M7 12h.01M7 17h.01M12 7h.01M12 12h.01M12 17h.01M17 7h.01M17 12h.01M17 17h.01" />
                            </svg>
                        </span>
                        Scan QR Code
                    </h1>
                    <p>Point your camera at the attendance QR code</p>
                </div>

                <div className="scanner-wrapper">
                    <div id="qr-reader"></div>

                    {!scanning && (
                        <div className="scanner-placeholder">
                            <div className="camera-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                    <circle cx="12" cy="13" r="4" />
                                </svg>
                            </div>
                            <p>Camera not active</p>
                        </div>
                    )}

                    {scanning && (
                        <div className="scanner-frame">
                            <div className="corner top-left"></div>
                            <div className="corner top-right"></div>
                            <div className="corner bottom-left"></div>
                            <div className="corner bottom-right"></div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
                        {error}
                    </div>
                )}

                <div className="scan-actions">
                    {!scanning ? (
                        <button className="btn btn-primary" onClick={startScanner}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                <circle cx="12" cy="13" r="4" />
                            </svg>
                            Start Camera
                        </button>
                    ) : (
                        <button className="btn btn-secondary" onClick={() => {
                            if (scannerRef.current) {
                                scannerRef.current.stop().catch(console.error);
                            }
                            setScanning(false);
                        }}>
                            Stop Scanning
                        </button>
                    )}
                </div>

                {error && error.includes('permission') && (
                    <div className="permission-help">
                        <h4>Camera Access Required</h4>
                        <p>Please enable camera permissions in your browser settings to scan QR codes.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Scan;
