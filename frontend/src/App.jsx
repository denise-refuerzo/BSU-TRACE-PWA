import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { PWAProvider } from './views/shared/context/PWAContext';
import Login from './views/auth/Login';
import AdminDashboard from './views/portals/ict-admin/AdminDashboard';
import OriginatorDashboard from './views/portals/originator/OriginatorDashboard';
import ProcessorDashboard from './views/portals/processor/ProcessorDashboard';
import SigneeDashboard from './views/portals/signee/SigneeDashboard';
import GSOAdminDashboard from './views/portals/gso-admin/GSOAdminDashboard';

function App() {
  return (
    <PWAProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/gso-dashboard" element={<GSOAdminDashboard />} />
          <Route path="/dashboard" element={<OriginatorDashboard />} />
          <Route path="/processor/dashboard" element={<ProcessorDashboard />} />
          <Route path="/signee/dashboard" element={<SigneeDashboard />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </PWAProvider>
  );
}

export default App;