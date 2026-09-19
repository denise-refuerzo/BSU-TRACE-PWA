import React, { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { PWAProvider } from './views/shared/context/PWAContext';

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

  const handleLogout = () => {
    // Only fire if the user actually has an active session
    if (localStorage.getItem('token')) {
      localStorage.clear();
      sessionStorage.removeItem('bsu_pwa_banner_dismissed');
      
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
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    // 30 minutes = 30 * 60 * 1000 milliseconds = 1800000
    timerRef.current = setTimeout(handleLogout, 1800000);
  };

  useEffect(() => {
    // Do not run the idle timer on the login screen or companion scanner
    if (location.pathname === '/login' || location.pathname === '/companion') {
      if (timerRef.current) clearTimeout(timerRef.current);
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
      events.forEach(event => document.removeEventListener(event, handleActivity));
    };
  }, [location.pathname]);

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