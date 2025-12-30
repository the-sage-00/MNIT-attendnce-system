# 🎓 QR Attendance System v5.0

A secure, mobile-first attendance management system for educational institutions using QR codes, geolocation, and device fingerprinting.

## 🚀 Features

- **QR-Based Attendance**: Rotating QR codes with HMAC-signed tokens
- **Geolocation Verification**: Adaptive geo-fencing based on GPS accuracy
- **Device Binding**: Prevents proxy attendance through device fingerprinting
- **Multi-Sample GPS**: Collects multiple location samples for accuracy
- **Mobile-First UI**: Optimized for phone screens with haptic feedback
- **Security Monitoring**: Suspicious activity detection and logging

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- Redis (optional, for production rate limiting)
- Google Cloud Console account (for OAuth)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/qr-attendance-system.git
cd qr-attendance-system
```

### 2. Setup Backend

```bash
cd server
cp .env.example .env
# Edit .env with your configuration
npm install
```

### 3. Setup Frontend

```bash
cd ../client
cp .env.example .env
# Edit .env with your configuration
npm install
```

### 4. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API" and "Google Identity"
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials (Web application)
6. Add authorized JavaScript origins:
   - Development: `http://localhost:5173`
   - Production: `https://your-frontend-url.vercel.app`
7. Copy Client ID to both `.env` files

## 🔧 Environment Configuration

### Server (.env)

```env
# Required
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-super-secret-key
FRONTEND_URL=https://your-frontend.vercel.app
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Optional (for email features)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Optional (for production)
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password
```

### Client (.env)

```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

## 🚢 Deployment

### Backend (Render)

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Add environment variables from `.env.example`

### Frontend (Vercel)

1. Import project on [Vercel](https://vercel.com)
2. Configure:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite
3. Add environment variables:
   - `VITE_API_URL`: Your Render backend URL + `/api`
   - `VITE_GOOGLE_CLIENT_ID`: Your Google Client ID

## 📱 Local Development

### Start Backend

```bash
cd server
npm run dev
```

### Start Frontend

```bash
cd client
npm run dev
```

Access at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

## 🔐 Security Features

| Feature | Description |
|---------|-------------|
| **HMAC-Signed Tokens** | QR tokens are cryptographically signed |
| **Device Binding** | Each student can use max 3 devices |
| **Replay Protection** | One-time token usage with Redis |
| **Geolocation** | Adaptive radius based on GPS accuracy |
| **Rate Limiting** | Max 10 attempts per student per hour |
| **Audit Logging** | All activities logged for review |

## 📊 v5.0 Changelog

### New Features
- Adaptive geo-fencing (50-200m based on GPS accuracy)
- Extended QR visibility (2 min display, 30s crypto window)
- Multi-sample GPS collection (3-5 samples)
- Cross-session device sharing detection
- Mobile-first UI redesign
- Haptic feedback on mobile

### Security Improvements
- Teleportation detection for GPS spoofing
- Future timestamp rejection
- Device ownership conflict detection
- Enhanced suspicious activity logging

## 🧪 API Endpoints

### Authentication
- `POST /api/auth/google/verify` - Google OAuth login
- `POST /api/auth/logout` - Logout

### Attendance
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance/history` - Get student's history

### Sessions
- `GET /api/sessions/active` - Get active sessions
- `POST /api/sessions/create` - Create session (professor)
- `GET /api/sessions/:id/qr` - Get QR data

## 📁 Project Structure

```
qr-attendance-system/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Route pages
│   │   ├── context/       # Auth context
│   │   ├── utils/         # Device fingerprint, etc.
│   │   └── config/        # API configuration
│   └── .env.example
│
├── server/                 # Express backend
│   ├── controllers/       # Route handlers
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API routes
│   ├── middleware/        # Auth, validation
│   ├── utils/             # Security, geolocation
│   ├── config/            # App configuration
│   └── .env.example
│
└── README.md
```

## 🐛 Troubleshooting

### CORS Issues
Ensure `FRONTEND_URL` in server `.env` matches your frontend URL exactly.

### Google OAuth Not Working
1. Check Client ID is correct in both `.env` files
2. Verify authorized origins in Google Console
3. Clear browser cache and cookies

### Location Not Working
1. Ensure HTTPS is used (required for geolocation)
2. Check browser permissions
3. Try moving to a location with better GPS signal

## 📄 License

MIT License - See LICENSE file for details.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Open a Pull Request

---

Built with ❤️ for educational institutions
