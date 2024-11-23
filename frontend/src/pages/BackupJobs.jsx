import React, {
  useEffect,
  useState,
} from 'react';

import axios from 'axios';

import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Pause as PauseIcon,
  PlayArrow as StartIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';

const backupTypes = [
  { value: 'full', label: 'Full Backup' },
  { value: 'differential', label: 'Differential Backup' },
];

const frequencies = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function BackupJobs() {
  const [jobs, setJobs] = useState([]);
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [formData, setFormData] = useState({
    database_id: '',
    backup_type: 'full',
    frequency: 'daily',
    retention_days: 30,
  });

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/api/backups/jobs');
      setJobs(response.data);
    } catch (err) {
      setError('Failed to fetch backup jobs');
      console.error('Error fetching jobs:', err);
    }
  };

  const fetchDatabases = async () => {
    try {
      const response = await axios.get('/api/databases');
      setDatabases(response.data);
    } catch (err) {
      setError('Failed to fetch databases');
      console.error('Error fetching databases:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchJobs(), fetchDatabases()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleOpenDialog = (job = null) => {
    setSelectedJob(job);
    setFormData(
      job
        ? {
            database_id: job.database_id,
            backup_type: job.backup_type,
            frequency: job.frequency,
            retention_days: job.retention_days,
          }
        : {
            database_id: '',
            backup_type: 'full',
            frequency: 'daily',
            retention_days: 30,
          }
    );
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedJob(null);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      if (selectedJob) {
        await axios.put(`/api/backups/jobs/${selectedJob.id}`, formData);
      } else {
        await axios.post('/api/backups/jobs', formData);
      }
      await fetchJobs();
      handleCloseDialog();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save backup job');
    }
  };

  const handleDelete = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this backup job?')) {
      try {
        await axios.delete(`/api/backups/jobs/${jobId}`);
        await fetchJobs();
      } catch (err) {
        setError('Failed to delete backup job');
      }
    }
  };

  const handleToggleJob = async (job) => {
    try {
      await axios.post(`/api/backups/jobs/${job.id}/${job.is_active ? 'pause' : 'resume'}`);
      await fetchJobs();
    } catch (err) {
      setError(`Failed to ${job.is_active ? 'pause' : 'resume'} backup job`);
    }
  };

  const handleRunNow = async (jobId) => {
    try {
      await axios.post(`/api/backups/jobs/${jobId}/run`);
      await fetchJobs();
    } catch (err) {
      setError('Failed to start backup job');
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
          Backup Jobs
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchJobs} sx={{ mr: 1 }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add Job
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Database</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Last Run</TableCell>
              <TableCell>Next Run</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>{job.database.name}</TableCell>
                <TableCell>{job.backup_type}</TableCell>
                <TableCell>{job.frequency}</TableCell>
                <TableCell>
                  {job.last_run ? new Date(job.last_run).toLocaleString() : 'Never'}
                </TableCell>
                <TableCell>
                  {job.next_run ? new Date(job.next_run).toLocaleString() : 'N/A'}
                </TableCell>
                <TableCell>{job.is_active ? 'Active' : 'Paused'}</TableCell>
                <TableCell>
                  <Tooltip title="Run Now">
                    <IconButton onClick={() => handleRunNow(job.id)} size="small">
                      <StartIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={job.is_active ? 'Pause' : 'Resume'}>
                    <IconButton onClick={() => handleToggleJob(job)} size="small">
                      {job.is_active ? <PauseIcon /> : <StartIcon />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleOpenDialog(job)} size="small">
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDelete(job.id)} size="small">
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedJob ? 'Edit Backup Job' : 'Create Backup Job'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              select
              fullWidth
              label="Database"
              value={formData.database_id}
              onChange={(e) =>
                setFormData({ ...formData, database_id: e.target.value })
              }
              margin="normal"
            >
              {databases.map((db) => (
                <MenuItem key={db.id} value={db.id}>
                  {db.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Backup Type"
              value={formData.backup_type}
              onChange={(e) =>
                setFormData({ ...formData, backup_type: e.target.value })
              }
              margin="normal"
            >
              {backupTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              fullWidth
              label="Frequency"
              value={formData.frequency}
              onChange={(e) =>
                setFormData({ ...formData, frequency: e.target.value })
              }
              margin="normal"
            >
              {frequencies.map((freq) => (
                <MenuItem key={freq.value} value={freq.value}>
                  {freq.label}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              type="number"
              label="Retention Days"
              value={formData.retention_days}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  retention_days: parseInt(e.target.value, 10),
                })
              }
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedJob ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
