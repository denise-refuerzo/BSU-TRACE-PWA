import { useState, useCallback, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { PWAProvider } from './views/shared/context/PWAContext';
import { endSession, fetchWithAuth } from './api';

// Import Views
import Login from './views/auth/Login';
import RegistrationLinkSignup from './views/auth/RegistrationLinkSignup';
import OriginatorDashboard from './views/portals/originator/OriginatorDashboard';
import ProcessorDashboard from './views/portals/processor/ProcessorDashboard';
import GSOAdminDashboard from './views/portals/gso-admin/GSOAdminDashboard';
import AdminDashboard from './views/portals/ict-admin/AdminDashboard';
import ContinuousMobileScanner from './views/shared/ContinuousMobileScanner';

// --- NEW: THEME TOGGLE WRAPPER & BUTTON ---
const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage or fallback to system preference on initial load
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);
};

// --- EXISTING: 30-MINUTE IDLE TIMEOUT WRAPPER ---
const IdleTimer = ({ children }) => {
  /* ... keep existing IdleTimer implementation exactly as is ... */
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const warningActiveRef = useRef(false);
  const lastHeartbeatRef = useRef(0);

  const handleLogout = useCallback(async () => {
    if (localStorage.getItem('token')) {
      warningActiveRef.current = false;
      await endSession();
      Swal.fire({
        icon: 'warning',
        title: 'Session Expired',
        text: 'You have been automatically logged out due to 30 minutes of inactivity.',
        confirmButtonColor: '#800000',
        allowOutsideClick: false
      }).then(() => {
        navigate('/login', { replace: true });
      });
    }
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (warningActiveRef.current) {
      warningActiveRef.current = false;
      Swal.close();
    }
    const now = Date.now();
    if (localStorage.getItem('token') && now - lastHeartbeatRef.current >= 5 * 60 * 1000) {
      lastHeartbeatRef.current = now;
      fetchWithAuth('/api/session/activity', { method: 'POST' }).catch(() => {});
    }
    warningTimerRef.current = setTimeout(() => {
      if (!localStorage.getItem('token')) return;
      warningActiveRef.current = true;
      Swal.fire({
        icon: 'warning',
        title: 'Still there?',
        text: 'You will be signed out in one minute due to inactivity. Move the mouse or press a key to stay signed in.',
        showConfirmButton: false,
        timer: 60000,
        timerProgressBar: true,
        allowOutsideClick: false
      });
    }, 29 * 60 * 1000);
    timerRef.current = setTimeout(handleLogout, 1800000);
  }, [handleLogout]);

  useEffect(() => {
    if (location.pathname === '/login' || location.pathname === '/companion') {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      return;
    }
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    const handleActivity = () => resetTimer();
    events.forEach(event => document.addEventListener(event, handleActivity));
    resetTimer(); 
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (warningActiveRef.current) Swal.close();
      events.forEach(event => document.removeEventListener(event, handleActivity));
    };
  }, [location.pathname, resetTimer]);

  return children;
};

// 1. PUBLIC ROUTE GUARD
const PublicRoute = ({ children }) => {
  /* ... keep existing PublicRoute exactly as is ... */
  const token = localStorage.getItem('token');
  const roleId = Number(localStorage.getItem('role')); 

  if (token && roleId) {
    if (roleId === 1) return <Navigate to="/dashboard" replace />;
    if (roleId === 2 || roleId === 3) return <Navigate to="/office/dashboard" replace />;
    if (roleId === 4) return <Navigate to="/gso-dashboard" replace />;
    if (roleId === 5) return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
};

// 2. PROTECTED ROUTE GUARD
const ProtectedRoute = ({ children, allowedRoles }) => {
  /* ... keep existing ProtectedRoute exactly as is ... */
  const token = localStorage.getItem('token');
  const roleId = Number(localStorage.getItem('role'));

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(roleId)) {
    if (roleId === 1) return <Navigate to="/dashboard" replace />;
    if (roleId === 2 || roleId === 3) return <Navigate to="/office/dashboard" replace />;
    if (roleId === 4) return <Navigate to="/gso-dashboard" replace />;
    if (roleId === 5) return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default function App() {
  return (
    <PWAProvider>
      <BrowserRouter>
        <ThemeToggle /> {/* Floating Toggle rendered globally */}
        <IdleTimer>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register/:token" element={<RegistrationLinkSignup />} />
            <Route path="/companion" element={<ContinuousMobileScanner />} />
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={[1]}><OriginatorDashboard /></ProtectedRoute>} />
            <Route path="/office/dashboard" element={<ProtectedRoute allowedRoles={[2, 3]}><ProcessorDashboard /></ProtectedRoute>} />
            <Route path="/gso-dashboard" element={<ProtectedRoute allowedRoles={[4]}><GSOAdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={[5]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </IdleTimer>
      </BrowserRouter>
    </PWAProvider>
  );
}