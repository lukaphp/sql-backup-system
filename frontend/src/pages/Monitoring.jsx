import React, {
  useEffect,
  useState,
} from 'react';

import axios from 'axios';

import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';

// Status Card Component
const StatusCard = ({ title, status, details, icon, color }) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        {React.cloneElement(icon, { sx: { color, mr: 1 } })}
        <Typography variant="h6">{title}</Typography>
      </Box>
      <Typography
        variant="h5"
        sx={{ color, mb: 1 }}
      >
        {status}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {details}
      </Typography>
    </CardContent>
  </Card>
);

// Alert Status Chip Component
const StatusChip = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status.toLowerCase()) {
      case 'success':
        return { color: 'success', icon: <SuccessIcon /> };
      case 'error':
      case 'failed':
        return { color: 'error', icon: <ErrorIcon /> };
      case 'warning':
        return { color: 'warning', icon: <WarningIcon /> };
      default:
        return { color: 'default', icon: null };
    }
  };

  const config = getStatusConfig(status);
  return (
    <Chip
      icon={config.icon}
      label={status}
      color={config.color}
      size="small"
    />
  );
};

export default function Monitoring() {
  const [systemStatus, setSystemStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, metricsRes, alertsRes, logsRes] = await Promise.all([
        axios.get('/api/monitoring/status'),
        axios.get('/api/monitoring/metrics/backups'),
        axios.get('/api/monitoring/alerts'),
        axios.get('/api/monitoring/logs'),
      ]);
      setSystemStatus(statusRes.data);
      setMetrics(metricsRes.data);
      setAlerts(alertsRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      setError('Failed to fetch monitoring data');
      console.error('Monitoring data fetch error:', err);
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
          System Monitoring
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
        {/* System Status Cards */}
        <Grid item xs={12} md={6} lg={3}>
          <StatusCard
            title="Database Connection"
            status={systemStatus?.database_connection ? 'Connected' : 'Disconnected'}
            details={systemStatus?.database_connection ? 'Healthy' : 'Connection issues detected'}
            icon={systemStatus?.database_connection ? <SuccessIcon /> : <ErrorIcon />}
            color={systemStatus?.database_connection ? 'success.main' : 'error.main'}
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <StatusCard
            title="Storage Connection"
            status={systemStatus?.storage_connection ? 'Connected' : 'Disconnected'}
            details={systemStatus?.storage_connection ? 'Healthy' : 'Connection issues detected'}
            icon={systemStatus?.storage_connection ? <SuccessIcon /> : <ErrorIcon />}
            color={systemStatus?.storage_connection ? 'success.main' : 'error.main'}
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <StatusCard
            title="Scheduler Status"
            status={systemStatus?.scheduler_status}
            details={`${systemStatus?.active_backup_jobs} active jobs`}
            icon={<SuccessIcon />}
            color="primary.main"
          />
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <StatusCard
            title="Last Backup Status"
            status={systemStatus?.last_backup_status || 'N/A'}
            details={systemStatus?.last_backup_time || 'No backups performed'}
            icon={
              systemStatus?.last_backup_status === 'completed' ? (
                <SuccessIcon />
              ) : (
                <ErrorIcon />
              )
            }
            color={
              systemStatus?.last_backup_status === 'completed'
                ? 'success.main'
                : 'error.main'
            }
          />
        </Grid>

        {/* Recent Alerts */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Alerts
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        {new Date(alert.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={alert.severity} />
                      </TableCell>
                      <TableCell>{alert.message}</TableCell>
                    </TableRow>
                  ))}
                  {alerts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No alerts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* System Logs */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Logs
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Time</TableCell>
                    <TableCell>Level</TableCell>
                    <TableCell>Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusChip status={log.level} />
                      </TableCell>
                      <TableCell>{log.message}</TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No logs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            {/* Add performance metrics charts/graphs here */}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
