import React, {
  useEffect,
  useState,
} from 'react';

import axios from 'axios';

import {
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Send as TestIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Settings state
  const [userSettings, setUserSettings] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    backup_success: true,
    backup_failure: true,
    storage_warning: true,
  });

  const [systemSettings, setSystemSettings] = useState({
    smtp_host: '',
    smtp_port: '',
    smtp_username: '',
    smtp_password: '',
    dropbox_token: '',
    backup_retention_days: 30,
    max_backup_size_mb: 1000,
  });

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const [notifRes, systemRes] = await Promise.all([
        axios.get('/api/settings/notifications'),
        axios.get('/api/settings/system'),
      ]);
      setNotificationSettings(notifRes.data);
      setSystemSettings(systemRes.data);
      setUserSettings((prev) => ({ ...prev, email: user?.email || '' }));
    } catch (err) {
      setError('Failed to fetch settings');
      console.error('Settings fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const handleUserSettingsSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (userSettings.newPassword) {
        if (userSettings.newPassword !== userSettings.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        await axios.post('/api/auth/password/change', {
          current_password: userSettings.currentPassword,
          new_password: userSettings.newPassword,
        });
      }

      setSuccess('User settings updated successfully');
      setUserSettings((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSettingsSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.put('/api/settings/notifications', notificationSettings);
      setSuccess('Notification settings updated successfully');
    } catch (err) {
      setError('Failed to update notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSystemSettingsSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await axios.put('/api/settings/system', systemSettings);
      setSuccess('System settings updated successfully');
    } catch (err) {
      setError('Failed to update system settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      await axios.post('/api/monitoring/test-notification');
      setSuccess('Test notification sent successfully');
    } catch (err) {
      setError('Failed to send test notification');
    }
  };

  if (loading) {
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
          Settings
        </Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchSettings}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* User Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="User Settings" />
            <CardContent>
              <TextField
                fullWidth
                label="Email"
                value={userSettings.email}
                disabled
                margin="normal"
              />
              <TextField
                fullWidth
                label="Current Password"
                type="password"
                value={userSettings.currentPassword}
                onChange={(e) =>
                  setUserSettings({
                    ...userSettings,
                    currentPassword: e.target.value,
                  })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={userSettings.newPassword}
                onChange={(e) =>
                  setUserSettings({
                    ...userSettings,
                    newPassword: e.target.value,
                  })
                }
                margin="normal"
              />
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={userSettings.confirmPassword}
                onChange={(e) =>
                  setUserSettings({
                    ...userSettings,
                    confirmPassword: e.target.value,
                  })
                }
                margin="normal"
              />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleUserSettingsSave}
                disabled={saving}
                sx={{ mt: 2 }}
              >
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader 
              title="Notification Settings"
              action={
                <Button
                  startIcon={<TestIcon />}
                  onClick={handleTestNotification}
                  size="small"
                >
                  Test
                </Button>
              }
            />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.email_notifications}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        email_notifications: e.target.checked,
                      })
                    }
                  />
                }
                label="Enable Email Notifications"
              />
              <Divider sx={{ my: 2 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.backup_success}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        backup_success: e.target.checked,
                      })
                    }
                    disabled={!notificationSettings.email_notifications}
                  />
                }
                label="Backup Success Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.backup_failure}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        backup_failure: e.target.checked,
                      })
                    }
                    disabled={!notificationSettings.email_notifications}
                  />
                }
                label="Backup Failure Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notificationSettings.storage_warning}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        storage_warning: e.target.checked,
                      })
                    }
                    disabled={!notificationSettings.email_notifications}
                  />
                }
                label="Storage Warning Notifications"
              />
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleNotificationSettingsSave}
                disabled={saving}
                sx={{ mt: 2 }}
              >
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* System Settings */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="System Settings" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="SMTP Host"
                    value={systemSettings.smtp_host}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        smtp_host: e.target.value,
                      })
                    }
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="SMTP Port"
                    type="number"
                    value={systemSettings.smtp_port}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        smtp_port: e.target.value,
                      })
                    }
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="SMTP Username"
                    value={systemSettings.smtp_username}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        smtp_username: e.target.value,
                      })
                    }
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="SMTP Password"
                    type="password"
                    value={systemSettings.smtp_password}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        smtp_password: e.target.value,
                      })
                    }
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Dropbox Access Token"
                    type="password"
                    value={systemSettings.dropbox_token}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        dropbox_token: e.target.value,
                      })
                    }
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="Backup Retention Days"
                    type="number"
                    value={systemSettings.backup_retention_days}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        backup_retention_days: parseInt(e.target.value, 10),
                      })
                    }
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="Max Backup Size (MB)"
                    type="number"
                    value={systemSettings.max_backup_size_mb}
                    onChange={(e) =>
                      setSystemSettings({
                        ...systemSettings,
                        max_backup_size_mb: parseInt(e.target.value, 10),
                      })
                    }
                    margin="normal"
                  />
                </Grid>
              </Grid>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSystemSettingsSave}
                disabled={saving}
                sx={{ mt: 2 }}
              >
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
