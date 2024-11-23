import React, {
  useEffect,
  useState,
} from 'react';

import axios from 'axios';

import {
  CloudDownload as DownloadIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
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

// Storage Usage Card Component
const StorageUsageCard = ({ usage }) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Storage Usage
      </Typography>
      <Box sx={{ position: 'relative', pt: 2 }}>
        <LinearProgress
          variant="determinate"
          value={usage.usage_percentage}
          color={
            usage.usage_percentage > 90
              ? 'error'
              : usage.usage_percentage > 70
              ? 'warning'
              : 'success'
          }
          sx={{ height: 10, borderRadius: 5 }}
        />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1 }}
        >
          {usage.used_formatted} / {usage.total_formatted} (
          {Math.round(usage.usage_percentage)}%)
        </Typography>
      </Box>
      {usage.usage_percentage > 70 && (
        <Alert
          severity={usage.usage_percentage > 90 ? 'error' : 'warning'}
          sx={{ mt: 2 }}
          icon={<WarningIcon />}
        >
          Storage usage is {usage.usage_percentage > 90 ? 'critically' : ''} high
        </Alert>
      )}
    </CardContent>
  </Card>
);

export default function Storage() {
  const [storageData, setStorageData] = useState(null);
  const [backupFiles, setBackupFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usageRes, filesRes] = await Promise.all([
        axios.get('/api/storage/usage'),
        axios.get('/api/storage/files'),
      ]);
      setStorageData(usageRes.data);
      setBackupFiles(filesRes.data);
    } catch (err) {
      setError('Failed to fetch storage data');
      console.error('Storage data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (path) => {
    if (window.confirm('Are you sure you want to delete this backup file?')) {
      try {
        await axios.delete(`/api/storage/files`, { data: { path } });
        await fetchData();
      } catch (err) {
        setError('Failed to delete backup file');
      }
    }
  };

  const handleDownload = async (path) => {
    try {
      const response = await axios.get(`/api/storage/files/download`, {
        params: { path },
      });
      window.open(response.data.url, '_blank');
    } catch (err) {
      setError('Failed to generate download link');
    }
  };

  const handleCleanup = async () => {
    if (window.confirm('Are you sure you want to run storage cleanup?')) {
      try {
        await axios.post('/api/storage/cleanup');
        await fetchData();
      } catch (err) {
        setError('Failed to run storage cleanup');
      }
    }
  };

  if (loading && !storageData) {
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
          Storage Management
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            onClick={handleCleanup}
            color="secondary"
          >
            Run Cleanup
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Storage Usage Overview */}
        <Grid item xs={12}>
          <StorageUsageCard usage={storageData} />
        </Grid>

        {/* Backup Files List */}
        <Grid item xs={12}>
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>File Name</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Modified</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {backupFiles.map((file) => (
                    <TableRow key={file.path}>
                      <TableCell>{file.name}</TableCell>
                      <TableCell>{file.size_formatted}</TableCell>
                      <TableCell>
                        {new Date(file.modified).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Download">
                          <IconButton
                            onClick={() => handleDownload(file.path)}
                            size="small"
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            onClick={() => handleDelete(file.path)}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {backupFiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No backup files found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Storage Metrics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Storage Metrics
            </Typography>
            {/* Add storage metrics charts/graphs here */}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
