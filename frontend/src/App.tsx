import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TitleCreate from './pages/TitleCreate';
import Checklist from './pages/Checklist';
import MailTracking from './pages/MailTracking';
import UserManagement from './pages/UserManagement';
import Layout from './components/Layout';

// Guard for protected routes
interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || '';

  if (!token) {
    // Force redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Role not authorized, bounce back to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#1e293b',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
          },
        }} 
      />
      
      <Routes>
        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Dashboard/Monitoring Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/titles" 
          element={
            <ProtectedRoute>
              <TitleCreate />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/checklist" 
          element={
            <ProtectedRoute>
              <Checklist />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/mails" 
          element={
            <ProtectedRoute>
              <MailTracking />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/users" 
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <UserManagement />
            </ProtectedRoute>
          } 
        />
        
        {/* Fallbacks */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
