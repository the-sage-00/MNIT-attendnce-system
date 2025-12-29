import { useEffect, useRef, useState, useCallback } from 'react';
import './GoogleLoginButton.css';

const GoogleLoginButton = ({
    onSuccess,
    onError,
    text = 'signin_with'
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const googleButtonId = useRef(`google-btn-${Date.now()}`);

    const handleGoogleResponse = useCallback((response) => {
        if (response.credential) {
            onSuccess?.(response.credential);
        } else {
            onError?.('No credential received from Google');
        }
    }, [onSuccess, onError]);

    useEffect(() => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId || clientId === 'your_google_client_id_here') {
            console.warn('Google Client ID not configured.');
            setLoadError(true);
            return;
        }

        let mounted = true;

        const initializeGoogle = () => {
            if (!mounted) return;

            const container = document.getElementById(googleButtonId.current);
            if (!container) return;

            try {
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: handleGoogleResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                    ux_mode: 'popup'
                });

                // Clear any existing content first
                container.innerHTML = '';

                window.google.accounts.id.renderButton(container, {
                    theme: 'filled_blue',
                    size: 'large',
                    width: 280,
                    text: text,
                    shape: 'rectangular',
                    logo_alignment: 'left'
                });

                if (mounted) {
                    setIsLoaded(true);
                    setLoadError(false);
                }
            } catch (error) {
                console.error('Google initialization error:', error);
                if (mounted) {
                    setLoadError(true);
                }
            }
        };

        if (window.google?.accounts?.id) {
            initializeGoogle();
            return;
        }

        // Check if script already exists
        let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');

        if (!script) {
            script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }

        script.addEventListener('load', initializeGoogle);
        script.addEventListener('error', () => {
            if (mounted) setLoadError(true);
        });

        return () => {
            mounted = false;
        };
    }, [handleGoogleResponse, text]);

    if (loadError) {
        return (
            <div className="google-login-wrapper">
                <button
                    className="google-button-fallback"
                    disabled
                    style={{
                        padding: '12px 24px',
                        borderRadius: '8px',
                        background: '#333',
                        color: '#888',
                        border: 'none',
                        cursor: 'not-allowed'
                    }}
                >
                    Google Sign-In Unavailable
                </button>
            </div>
        );
    }

    // KEY FIX: Separate loading indicator from Google's container
    return (
        <div className="google-login-wrapper">
            {/* Loading state - shown until Google renders */}
            {!isLoaded && (
                <div style={{
                    padding: '12px 24px',
                    background: '#4285f4',
                    color: 'white',
                    borderRadius: '8px',
                    textAlign: 'center',
                    minWidth: '280px'
                }}>
                    Loading...
                </div>
            )}
            {/* Google's container - React doesn't manage children here */}
            <div
                id={googleButtonId.current}
                style={{
                    display: isLoaded ? 'block' : 'none',
                    minHeight: '44px',
                    minWidth: '280px'
                }}
            />
        </div>
    );
};

export default GoogleLoginButton;
