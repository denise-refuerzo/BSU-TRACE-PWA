import { useCallback, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { PWAProvider } from './views/shared/context/PWAContext';
import { endSession, fetchWithAuth } from './api';

// Import Views
import Login from './views/auth/Login';
import OriginatorDashboard from './views/portals/originator/OriginatorDashboard';
import ProcessorDashboard from './views/portals/processor/ProcessorDashboard';
import GSOAdminDashboard from './views/portals/gso-admin/GSOAdminDashboard';
import AdminDashboard from './views/portals/ict-admin/AdminDashboard';
import ContinuousMobileScanner from './views/shared/ContinuousMobileScanner';

// --- NEW: 30-MINUTE IDLE TIMEOUT WRAPPER ---
const IdleTimer = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const warningActiveRef = useRef(false);
  const lastHeartbeatRef = useRef(0);

  const handleLogout = useCallback(async () => {
    // Only fire if the user actually has an active session
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
    // Do not run the idle timer on the login screen or companion scanner
    if (location.pathname === '/login' || location.pathname === '/companion') {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      return;
    }

    // Events that count as "activity"
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    // Reset the timer whenever an event fires
    const handleActivity = () => resetTimer();

    events.forEach(event => document.addEventListener(event, handleActivity));
    
    // Initialize the timer on mount
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
  const token = localStorage.getItem('token');
  const roleId = Number(localStorage.getItem('role'));

  if (!token) {
    return <Navigate to="/login" replace />;
  }

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
        {/* The IdleTimer sits inside BrowserRouter so it can use 'useNavigate' and 'useLocation' */}
        <IdleTimer>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />

            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />

            <Route path="/companion" element={<ContinuousMobileScanner />} />

            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={[1]}>
                  <OriginatorDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/office/dashboard" 
              element={
                <ProtectedRoute allowedRoles={[2, 3]}>
                  <ProcessorDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/gso-dashboard" 
              element={
                <ProtectedRoute allowedRoles={[4]}>
                  <GSOAdminDashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute allowedRoles={[5]}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </IdleTimer>
      </BrowserRouter>
    </PWAProvider>
  );
}
