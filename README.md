# QR Attendance System 📱

> A modern classroom management app where professors create QR codes and students scan them to mark attendance. Simple as that!

<p align="center">
  <a href="https://qr-attendance-syste.vercel.app/">
    <img src="https://img.shields.io/badge/🚀_Live_Demo-Visit_App-6366f1?style=for-the-badge" alt="Live Demo">
  </a>
</p>

---

## 🎯 Try It Out

**Live App:** [https://qr-attendance-syste.vercel.app/](https://qr-attendance-syste.vercel.app/)

### Quick Demo:
1. **As a Professor:** Register → Create a course → Start a session → Share the QR
2. **As a Student:** Register → Scan the QR → Done! Attendance marked ✅

---

## What Can You Do?

### 👨‍🏫 If You're a Professor
- Create courses and organize them by semester
- Start a class session with one click - a QR code appears instantly
- Watch attendance roll in live as students scan
- Share study materials (PDFs, links, documents)
- Post announcements for your class
- Create assignments with due dates
- View detailed attendance reports

### 👨‍🎓 If You're a Student  
- Scan QR code to mark attendance (takes 3 seconds!)
- See all your enrolled courses in one place
- Track your attendance percentage per course
- Access materials shared by professors
- View upcoming assignments

### 📱 Install as App (PWA)
- **Works on any device** - Install ClassCheck on your phone's home screen
- **Android:** Open the app → tap menu (⋮) → "Install app" or "Add to Home Screen"
- **iOS:** Open in Safari → tap Share → "Add to Home Screen"
- **Feels like a native app** - Full screen, fast, and works offline!

### 🔒 How Attendance Works
- **Location Check:** Makes sure you're actually in class
- **Device Tracking:** Prevents marking from multiple devices
- **Time Window:** Can't mark attendance after class ends
- **Real-time:** Professor sees who's present instantly

---

## Tech Stack

Built with the **MERN Stack:**
- **M**ongoDB - Database
- **E**xpress.js - Backend API
- **R**eact - Frontend
- **N**ode.js - Server

Plus: JWT auth, Multer for file uploads, GPS verification

---

## Run It Locally

### What You Need
- Node.js (v18+)
- MongoDB database

### Setup

```bash
# Clone the repo
git clone https://github.com/ritehrks/qr-attendance-syste.git
cd qr-attendance-syste

# Setup backend
cd server
npm install
# Create .env with your MongoDB URI and JWT secret

# Setup frontend  
cd ../client
npm install
# Create .env with VITE_API_URL=http://localhost:5000/api

# Run both
# Terminal 1: cd server && npm run dev
# Terminal 2: cd client && npm run dev
```

Open http://localhost:5173 and you're good to go!

---

## Project Structure

```
├── client/          # React frontend (pages, components)
├── server/          # Node.js backend (routes, models)
└── README.md
```

---

## Deployment

- **Frontend:** Deployed on [Vercel](https://vercel.com)
- **Backend:** Deployed on [Render](https://render.com)
- **Database:** MongoDB Atlas

---

## Screenshots

*Coming soon!*

---

## License

MIT - Use it however you like!

---

<p align="center">
  Made with ☕ and late nights
</p>
