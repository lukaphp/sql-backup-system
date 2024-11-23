import React, {
  useEffect,
  useState,
} from 'react';

import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import {
  Backup as BackupIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';

// Custom Status Card Component
const StatusCard = ({ title, value, icon, color, onClick }) => (
  <Card 
    sx={{ 
      height: '100%',
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick ? { transform: 'translateY(-4px)', transition: 'transform 0.2s' } : {}
    }}
    onClick={onClick}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {React.cloneElement(icon, { sx: { color, fontSize: 40 } })}
        <Typography variant="h6" sx={{ ml: 2 }}>
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="div" sx={{ color }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const [systemStatus, setSystemStatus] = useState(null);
  const [backupMetrics, setBackupMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, metricsRes] = await Promise.all([
        axios.get('/api/monitoring/status'),
        axios.get('/api/metrics/backups')
      ]);
      setSystemStatus(statusRes.data);
      setBackupMetrics(metricsRes.data);
    } catch (err) {
      setError('Failed to fetch dashboard data. Please try again.');
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !systemStatus) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          System Dashboard
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchData}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* System Status */}
        <Grid item xs={12} md={6} lg={3}>
          <StatusCard
            title="System Status"
            value={systemStatus?.database_connection ? 'Healthy' : 'Issues Detected'}
            icon={systemStatus?.database_connection ? <SuccessIcon /> : <ErrorIcon />}
            color={systemStatus?.database_connection ? 'success.main' : 'error.main'}
          />
        </Grid>

        {/* Active Backup Jobs */}
        <Grid item xs={12} md={6} lg={3}>
          <StatusCard
            title="Active Jobs"
            value={systemStatus?.active_backup_jobs || 0}
            icon={<BackupIcon />}
            color="primary.main"
            onClick={() => navigate('/backup-jobs')}
          />
        </Grid>

        {/* Storage Usage */}
        <Grid item xs={12} md={6} lg={3}>
          <StatusCard
            title="Storage Usage"
            value={`${Math.round(systemStatus?.storage_usage_percentage || 0)}%`}
            icon={<StorageIcon />}
            color={
              (systemStatus?.storage_usage_percentage || 0) > 90
                ? 'error.main'
                : (systemStatus?.storage_usage_percentage || 0) > 70
                ? 'warning.main'
                : 'success.main'
            }
            onClick={() => navigate('/storage')}
          />
        </Grid>

        {/* Success Rate */}
        <Grid item xs={12} md={6} lg={3}>
          <StatusCard
            title="Success Rate"
            value={`${Math.round((backupMetrics?.successful_backups / 
              (backupMetrics?.total_backups || 1)) * 100)}%`}
            icon={<SuccessIcon />}
            color="info.main"
            onClick={() => navigate('/backup-history')}
          />
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            {/* Add recent activity component here */}
          </Paper>
        </Grid>

        {/* System Metrics */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Backup Metrics
            </Typography>
            {/* Add backup metrics chart component here */}
          </Paper>
        </Grid>

        {/* Storage Trends */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Storage Trends
            </Typography>
            {/* Add storage trends chart component here */}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
