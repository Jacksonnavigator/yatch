import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { YachtProvider } from './context/YachtContext';
import { ProtectedRoute, OwnerRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import YachtPage from './pages/YachtPage';
import ProfilePage from './pages/ProfilePage';
import { LoginPage, RegisterPage } from './pages/Auth';
import BookPage from './pages/BookPage';
import MyBookings from './pages/MyBookings';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import OwnerDashboard from './pages/OwnerDashboard';
import OwnerBookings from './pages/OwnerBookings';
import OwnerCalendar from './pages/OwnerCalendar';
import OwnerYacht from './pages/OwnerYacht';

export default function App() {
  return (
    <AuthProvider>
      <YachtProvider>
        <HashRouter>
          <Navbar />
          <ErrorBoundary>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Home />} />
              <Route path="/yacht" element={<YachtPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Guest protected */}
              <Route path="/book" element={<ProtectedRoute><BookPage /></ProtectedRoute>} />
              <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

              {/* Owner only */}
              <Route path="/owner" element={<OwnerRoute><OwnerDashboard /></OwnerRoute>} />
              <Route path="/owner/bookings" element={<OwnerRoute><OwnerBookings /></OwnerRoute>} />
              <Route path="/owner/calendar" element={<OwnerRoute><OwnerCalendar /></OwnerRoute>} />
              <Route path="/owner/yacht" element={<OwnerRoute><OwnerYacht /></OwnerRoute>} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#0d1424',
                color: '#f5f0e8',
                border: '1px solid rgba(201,168,76,0.3)',
                fontFamily: "'Josefin Sans', sans-serif",
                fontSize: '12px',
                letterSpacing: '1px',
              },
              success: { iconTheme: { primary: '#c9a84c', secondary: '#0d1424' } },
              error: { iconTheme: { primary: '#c0392b', secondary: '#0d1424' } },
            }}
          />
        </HashRouter>
      </YachtProvider>
    </AuthProvider>
  );
}
