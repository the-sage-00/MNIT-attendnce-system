import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login'; // Student Login (main page)
import PendingApproval from './pages/PendingApproval';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/Dashboard';
import AdminCourses from './pages/admin/Courses';
import AdminStudents from './pages/admin/Students';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import Attend from './pages/Attend';
import Scan from './pages/Scan';

// Professor Pages
import ProfessorLogin from './pages/professor/ProfessorLogin';
import ProfessorDashboard from './pages/professor/ProfessorDashboard';
import SessionLive from './pages/professor/SessionLive';

import './index.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Login Pages */}
            <Route path="/" element={<Login />} />
            <Route path="/professor/login" element={<ProfessorLogin />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/pending-approval" element={<PendingApproval />} />

            {/* Student Routes */}
            <Route path="/student/dashboard" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student/scan" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Attend />
              </ProtectedRoute>
            } />
            <Route path="/student/attend" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Attend />
              </ProtectedRoute>
            } />
            <Route path="/student/scan-qr" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Scan />
              </ProtectedRoute>
            } />

            {/* Professor Routes */}
            <Route path="/professor/dashboard" element={
              <ProtectedRoute allowedRoles={['professor']}>
                <ProfessorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/professor/session/:id" element={
              <ProtectedRoute allowedRoles={['professor']}>
                <SessionLive />
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/students" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminStudents />
              </ProtectedRoute>
            } />
            <Route path="/admin/courses" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminCourses />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
