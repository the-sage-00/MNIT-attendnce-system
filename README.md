# QR Attendance System 🎓

A modern, **highly secure** QR-based attendance management system for educational institutions. Built with React, Node.js, MongoDB, and Redis.

## 🌟 Features

### For Students
- **Google OAuth Login** - Secure authentication using institutional email (@mnit.ac.in)
- **Auto-enrollment** - Courses automatically matched based on branch and year
- **QR Code Scanning** - Mark attendance by scanning dynamic QR codes
- **Geolocation Verification** - Ensures physical presence in classroom
- **Attendance Dashboard** - View attendance history and statistics
- **75% Criteria Tracking** - Monitor attendance percentage per subject

### For Professors
- **Google OAuth Login** - Any Google account (requires admin approval)
- **Course Management** - Create courses with branch, year, and semester binding
- **Live Sessions** - Start sessions with dynamic QR codes that rotate every 30 seconds
- **Security Levels** - Choose standard, strict, or paranoid mode
- **Real-time Attendance** - View students marking attendance live
- **Geofencing** - Define classroom radius for attendance validation

### For Administrators
- **Professor Approval** - Review and approve professor registration requests
- **Security Dashboard** - View suspicious activity and audit logs
- **Secure Access** - Email/password authentication stored in environment variables

## 🔐 Security Features (v4.0)

This system implements **enterprise-grade security** to prevent cheating:

| Feature | Description |
|---------|-------------|
| **HMAC-Signed Tokens** | QR tokens are cryptographically signed |
| **Rotating QR (30s)** | QR codes change every 30 seconds |
| **Student-Bound Tokens** | Tokens are bound to specific student + device + time |
| **Device Fingerprinting** | Max 3 devices per student |
| **Replay Protection** | Each token can only be used once |
| **GPS Spoofing Detection** | Multiple heuristics detect fake locations |
| **Rate Limiting** | Prevents brute-force attacks |
| **Comprehensive Audit** | Every action is logged for review |

> 📖 See [SECURITY.md](./SECURITY.md) for complete security documentation

## 🏗️ Tech Stack

### Frontend
- **React 18** with Vite
- **React Router v6** for navigation
- **Axios** for API calls
- **html5-qrcode** for QR scanning
- **CSS3** with CSS variables for theming

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Redis** for caching & security features
- **JWT** for authentication
- **Google OAuth 2.0** for social login
- **QRCode** for dynamic QR generation

## 📁 Project Structure

```
qr-attendance-syste/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React contexts (Auth, Theme)
│   │   ├── pages/          # Page components
│   │   │   ├── admin/      # Admin pages
│   │   │   ├── professor/  # Professor pages
│   │   │   └── student/    # Student pages
│   │   └── config/         # API configuration
│   └── public/             # Static assets
│
├── server/                 # Node.js backend
│   ├── controllers/        # Route handlers
│   ├── models/             # Mongoose schemas
│   │   ├── User.js         # User model
│   │   ├── Course.js       # Course model
│   │   ├── Session.js      # Session model (enhanced)
│   │   ├── Attendance.js   # Attendance model (enhanced)
│   │   ├── AuditLog.js     # Security audit logging
│   │   └── DeviceRegistry.js # Device fingerprinting
│   ├── routes/             # API routes
│   ├── middleware/         # Auth & rate limiting
│   ├── utils/              # Security & geolocation helpers
│   ├── config/             # Configuration & Redis
│   └── scripts/            # Utility scripts
│
├── SECURITY.md             # Complete security documentation
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or cloud) - **Required for full security**
- Google Cloud Console project with OAuth credentials

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/qr-attendance-system.git
cd qr-attendance-system
```

2. **Setup Backend**
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

3. **Setup Frontend**
```bash
cd client
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

4. **Setup Redis (Required for security features)**
```bash
# Using Docker (recommended)
docker run -d --name redis -p 6379:6379 redis:alpine

# Or install locally (Linux)
sudo apt install redis-server
```

### Environment Variables

#### Server (.env)
```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=your_mongodb_connection_string

# JWT (use a strong secret!)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
JWT_EXPIRE=7d

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Redis (required for security features)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id

# Admin Credentials
ADMIN_EMAIL=admin@classcheck.com
ADMIN_PASSWORD=your_secure_password
```

#### Client (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## 📱 Usage Flow

### Student Login
1. Go to `http://localhost:5173/`
2. Sign in with Google using your `@mnit.ac.in` email
3. Email format: `2024ucp1566@mnit.ac.in` (YEAR + BRANCH + ROLL)

### Professor Login
1. Go to `http://localhost:5173/professor/login`
2. Sign in with any Google account
3. Wait for admin approval

### Admin Login
1. Go to `http://localhost:5173/admin/login`
2. Use credentials from `.env` file

### Taking Attendance
1. **Professor**: Create course → Start session → Display QR
2. **Student**: Click "Mark Attendance" → Scan QR → Allow location → Submit

## 🔒 Security Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    SECURITY CHAIN                          │
├───────────────────────────────────────────────────────────┤
│  1. Role Verification      - Is user a student?            │
│  2. Rate Limit Check       - Too many attempts?            │
│  3. Session Validation     - Is session active?            │
│  4. Token Validation       - HMAC signature valid?         │
│  5. Time Window Check      - Token expired?                │
│  6. Replay Protection      - Token already used?           │
│  7. Device Validation      - Known device? Limit OK?       │
│  8. Academic Match         - Correct branch/year?          │
│  9. Geolocation Check      - Within radius? Spoofing?      │
│                                                             │
│  ✓ ALL PASS → Attendance Marked + Audit Logged             │
│  ✗ ANY FAIL → Rejected + Logged for Review                 │
└───────────────────────────────────────────────────────────┘
```

## 📊 Academic State Calculation

| Admission Year | Current Year (2025) | Year of Study |
|----------------|---------------------|---------------|
| 2025 | 2025 | 1st Year |
| 2024 | 2025 | 2nd Year |
| 2023 | 2025 | 3rd Year |
| 2022 | 2025 | 4th Year |

## 🛠️ API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/google/student` | Student Google login |
| POST | `/api/auth/google/professor` | Professor Google login |
| POST | `/api/auth/admin/login` | Admin email/password login |
| GET | `/api/auth/me` | Get current user |

### Courses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | Get professor's courses |
| POST | `/api/courses` | Create course |
| GET | `/api/courses/my-courses` | Get student's enrolled courses |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Start session |
| GET | `/api/sessions/:id/qr` | Get current QR token |
| POST | `/api/sessions/:id/refresh-qr` | Force QR refresh |
| PUT | `/api/sessions/:id/settings` | Update security settings |
| PUT | `/api/sessions/:id/stop` | Stop session |
| GET | `/api/sessions/professor/active` | Get active sessions |
| GET | `/api/sessions/professor/history` | Get session history |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attendance/mark` | Mark attendance (rate limited) |
| GET | `/api/attendance/history` | Get attendance history |
| GET | `/api/attendance/session/:id` | Get session attendance |
| GET | `/api/attendance/suspicious` | Get flagged records (admin) |
| GET | `/api/attendance/audit/:studentId` | Get audit log (admin) |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Basic health check |
| GET | `/api/health/security` | Security feature status |

## 🧪 Testing Security

Check security status:
```bash
curl http://localhost:5000/api/health/security
```

Expected response:
```json
{
  "success": true,
  "redis": { "connected": true, "status": "operational" },
  "features": {
    "hmacTokens": true,
    "rotatingQR": true,
    "deviceFingerprinting": true,
    "replayProtection": true,
    "rateLimiting": true,
    "auditLogging": true
  },
  "degradedMode": false
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Ritesh Saini**

---

Made with ❤️ for MNIT Jaipur
