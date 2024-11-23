import React from 'react';

import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import {
  CssBaseline,
  ThemeProvider,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import {
  AuthProvider,
  useAuth,
} from './contexts/AuthContext';
// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import BackupHistory from './pages/BackupHistory';
import BackupJobs from './pages/BackupJobs';
import Dashboard from './pages/Dashboard';
// Pages
import Login from './pages/Login';
import Monitoring from './pages/Monitoring';
import Settings from './pages/Settings';
import Storage from './pages/Storage';
import theme from './theme';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="backup-jobs" element={<BackupJobs />} />
                <Route path="backup-history" element={<BackupHistory />} />
                <Route path="storage" element={<Storage />} />
                <Route path="monitoring" element={<Monitoring />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
