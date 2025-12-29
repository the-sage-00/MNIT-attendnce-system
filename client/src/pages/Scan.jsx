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
                    qrbox: { width: 250, height: 250 },
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

            console.log('Scanned Data:', data);

            let sessionId, token;

            // 1. Try JSON Format (New Standard)
            try {
                const parsed = JSON.parse(data);
                if (parsed.s && parsed.t) {
                    sessionId = parsed.s;
                    token = parsed.t;
                }
            } catch (e) {
                // Not JSON
            }

            // 2. Try URL Format (Fallback)
            if (!sessionId) {
                try {
                    const url = new URL(data);
                    const params = new URLSearchParams(url.search);
                    sessionId = params.get('session');
                    token = params.get('token');
                } catch (e) {
                    // Not URL
                }
            }

            // 3. Try Pipe Format (Legacy)
            if (!sessionId) {
                const parts = data.split('|');
                if (parts.length >= 2) {
                    sessionId = parts[0];
                    token = parts[1];
                }
            }

            if (sessionId && token) {
                navigate(`/student/attend?session=${sessionId}&token=${token}`);
            } else {
                setError('Invalid QR code format. Please scan a valid Class QR.');
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
                    <h1>Scan QR Code</h1>
                    <p>Point your camera at the Professor's Screen</p>
                </div>

                <div className="scanner-wrapper">
                    <div id="qr-reader"></div>

                    {!scanning && (
                        <div className="scanner-placeholder">
                            <div className="camera-icon">📷</div>
                            <p>Camera not active</p>
                        </div>
                    )}
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <div className="scan-actions">
                    {!scanning ? (
                        <button className="btn btn-primary" onClick={startScanner}>
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
            </div>
        </div>
    );
};

export default Scan;
