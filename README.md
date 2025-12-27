# 📊 QR Attendance System

A modern, full-featured classroom management and attendance tracking platform built with the MERN stack (MongoDB, Express, React, Node.js).

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![React](https://img.shields.io/badge/react-18.x-blue)

## ✨ Features

### 📱 QR-Based Attendance
- **Dynamic QR Codes** - Auto-refreshing codes for secure attendance
- **Static QR Codes** - Printable codes for offline use
- **Location Verification** - GPS-based proximity checking
- **Device Fingerprinting** - Prevents duplicate attendance

### 📚 Course Management
- Create and manage courses with semesters
- Start/stop class sessions from any course
- Track session history with attendance counts
- Auto-enrollment when students mark attendance

### 📢 Classroom Features (Google Classroom-like)
- **Materials** - Share links and upload files (PDF, DOC, images)
- **Announcements** - Post course-wide messages with pin support
- **Assignments** - Create tasks with due dates and points
- **Submissions** - Students can submit work (coming soon)

### 👥 User Management
- **Admin/Professor Portal** - Full course and session control
- **Student Dashboard** - View courses, materials, attendance
- **Student Registration** - Self-signup with email verification
- **Profile Management** - Password reset, profile updates

### 🎨 Modern UI/UX
- **Dark & Light Modes** - Toggle between themes
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Premium Aesthetics** - Glassmorphism, gradients, animations

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, React Router, Axios |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose |
| **Auth** | JWT (JSON Web Tokens) |
| **File Upload** | Multer |
| **Styling** | CSS Variables, Custom Design System |

## 📦 Project Structure

```
PROJECT 11/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── context/        # Auth contexts
│   │   ├── pages/          # Page components
│   │   │   ├── admin/      # Admin dashboard, courses, sessions
│   │   │   └── student/    # Student dashboard, profile
│   │   └── config/         # API configuration
│   └── vercel.json         # Vercel deployment config
│
├── server/                 # Express backend
│   ├── config/             # Database, app config
│   ├── middleware/         # Auth, upload middleware
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   └── uploads/            # Uploaded files
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.x
- MongoDB database (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ritehrks/qr-attendance-syste.git
   cd qr-attendance-syste
   ```

2. **Install backend dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Configure environment variables**

   Create `server/.env`:
   ```env
   MONGODB_URI=mongodb+srv://your-connection-string
   JWT_SECRET=your-secret-key
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   ```

   Create `client/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

5. **Run the application**

   Terminal 1 - Backend:
   ```bash
   cd server
   npm run dev
   ```

   Terminal 2 - Frontend:
   ```bash
   cd client
   npm run dev
   ```

6. **Open in browser**
   - Frontend: http://localhost:5173
   - API: http://localhost:5000/api/health

## 🌐 Deployment

### Backend (Render)
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set environment variables
4. Deploy from the `server` directory

### Frontend (Vercel)
1. Import project to Vercel
2. Set root directory to `client`
3. Add `VITE_API_URL` environment variable
4. Deploy

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Admin registration
- `POST /api/auth/login` - Admin login
- `POST /api/student-auth/register` - Student registration
- `POST /api/student-auth/login` - Student login

### Courses
- `GET /api/courses` - Get all courses
- `POST /api/courses` - Create course
- `POST /api/courses/:id/start-session` - Start session
- `POST /api/courses/:id/stop-session` - Stop session

### Materials & Announcements
- `POST /api/courses/:id/materials` - Add material
- `GET /api/courses/:id/announcements` - Get announcements
- `POST /api/courses/:id/assignments` - Create assignment

### Attendance
- `POST /api/attendance` - Mark attendance
- `GET /api/student-auth/attendance` - Get student attendance

## 👨‍💻 Usage

### For Professors
1. Register/Login to admin panel
2. Create a course (e.g., "CS101 - Programming")
3. Start a session → QR code is generated
4. Students scan QR to mark attendance
5. View real-time attendance in session details
6. Share materials and post announcements

### For Students
1. Register with roll number and email
2. Scan QR code or enter session ID
3. Verify location and submit attendance
4. View attendance history in dashboard
5. Access course materials and assignments

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

Built with ❤️ for modern classrooms
