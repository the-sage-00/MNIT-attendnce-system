# QR Attendance System 🎓

A modern, secure QR-based attendance management system for educational institutions. Built with React, Node.js, and MongoDB.

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
- **Real-time Attendance** - View students marking attendance live
- **Geofencing** - Define classroom radius for attendance validation

### For Administrators
- **Professor Approval** - Review and approve professor registration requests
- **Secure Access** - Email/password authentication stored in environment variables

## 🏗️ Tech Stack

### Frontend
- **React 18** with Vite
- **React Router v6** for navigation
- **Axios** for API calls
- **html5-qrcode** for QR scanning
- **CSS3** with CSS variables for theming

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose
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
└── server/                 # Node.js backend
    ├── controllers/        # Route handlers
    ├── models/             # Mongoose schemas
    ├── routes/             # API routes
    ├── middleware/         # Auth middleware
    ├── utils/              # Helper functions
    ├── config/             # Configuration
    └── scripts/            # Utility scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
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

### Environment Variables

#### Server (.env)
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173

# Admin Credentials
ADMIN_EMAIL=admin@classcheck.com
ADMIN_PASSWORD=your_secure_password

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
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

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Role-based Access Control** - Student, Professor, Admin roles
- **Domain Validation** - Only institutional emails for students
- **Geolocation Verification** - Validates physical presence
- **Device Fingerprinting** - Prevents attendance fraud
- **Dynamic QR Codes** - Rotates every 30 seconds

## 📊 Academic State Calculation

| Admission Year | Current Year (2025) | Year of Study |
|----------------|---------------------|---------------|
| 2025 | 2025 | 1st Year |
| 2024 | 2025 | 2nd Year |
| 2023 | 2025 | 3rd Year |
| 2022 | 2025 | 4th Year |

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/google/student` - Student Google login
- `POST /api/auth/google/professor` - Professor Google login
- `POST /api/auth/admin/login` - Admin email/password login
- `GET /api/auth/me` - Get current user

### Courses
- `GET /api/courses` - Get professor's courses
- `POST /api/courses` - Create course
- `GET /api/courses/my-courses` - Get student's enrolled courses

### Sessions
- `POST /api/sessions` - Start session
- `GET /api/sessions/:id/qr` - Get current QR token
- `PUT /api/sessions/:id/stop` - Stop session

### Attendance
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance/history` - Get attendance history

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
