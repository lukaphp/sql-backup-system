import React, {
  useEffect,
  useState,
} from 'react';

import axios from 'axios';

import {
  CloudDownload as DownloadIcon,
  FilterList as FilterIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
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

const statusColors = {
  completed: 'success',
  failed: 'error',
  in_progress: 'warning',
  pending: 'info',
};

const StatusChip = ({ status }) => (
  <Chip
    label={status}
    color={statusColors[status.toLowerCase()] || 'default'}
    size="small"
  />
);

export default function BackupHistory() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [openFilter, setOpenFilter] = useState(false);
  const [filters, setFilters] = useState({
    database_id: '',
    status: '',
    date_from: '',
    date_to: '',
  });

  const fetchBackups = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.database_id) params.append('database_id', filters.database_id);
      if (filters.status) params.append('status', filters.status);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const response = await axios.get('/api/backups/history', { params });
      setBackups(response.data);
    } catch (err) {
      setError('Failed to fetch backup history');
      console.error('Backup history fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleDownload = async (backup) => {
    try {
      const response = await axios.get(`/api/storage/files/${backup.id}/download`);
      window.open(response.data.url, '_blank');
    } catch (err) {
      setError('Failed to generate download link');
    }
  };

  const handleOpenDetails = (backup) => {
    setSelectedBackup(backup);
    setOpenDetails(true);
  };

  const handleCloseDetails = () => {
    setOpenDetails(false);
    setSelectedBackup(null);
  };

  const handleOpenFilter = () => {
    setOpenFilter(true);
  };

  const handleCloseFilter = () => {
    setOpenFilter(false);
  };

  const handleApplyFilter = () => {
    fetchBackups();
    handleCloseFilter();
  };

  const handleClearFilter = () => {
    setFilters({
      database_id: '',
      status: '',
      date_from: '',
      date_to: '',
    });
    fetchBackups();
    handleCloseFilter();
  };

  if (loading && backups.length === 0) {
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
          Backup History
        </Typography>
        <Box>
          <Tooltip title="Filter">
            <IconButton onClick={handleOpenFilter} sx={{ mr: 1 }}>
              <FilterIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchBackups}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
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
              <TableCell>Started</TableCell>
              <TableCell>Completed</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {backups.map((backup) => (
              <TableRow key={backup.id}>
                <TableCell>{backup.backup_job.database.name}</TableCell>
                <TableCell>{backup.backup_job.backup_type}</TableCell>
                <TableCell>
                  {backup.started_at
                    ? new Date(backup.started_at).toLocaleString()
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  {backup.completed_at
                    ? new Date(backup.completed_at).toLocaleString()
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  {backup.file_size
                    ? `${Math.round(backup.file_size / 1024 / 1024)} MB`
                    : 'N/A'}
                </TableCell>
                <TableCell>
                  <StatusChip status={backup.status} />
                </TableCell>
                <TableCell>
                  <Tooltip title="Details">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDetails(backup)}
                    >
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                  {backup.status === 'completed' && (
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={() => handleDownload(backup)}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {backups.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No backup history found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Backup Details Dialog */}
      <Dialog open={openDetails} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        <DialogTitle>Backup Details</DialogTitle>
        <DialogContent>
          {selectedBackup && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Database: {selectedBackup.backup_job.database.name}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                Backup Type: {selectedBackup.backup_job.backup_type}
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                Status: <StatusChip status={selectedBackup.status} />
              </Typography>
              <Typography variant="subtitle1" gutterBottom>
                Started: {new Date(selectedBackup.started_at).toLocaleString()}
              </Typography>
              {selectedBackup.completed_at && (
                <Typography variant="subtitle1" gutterBottom>
                  Completed: {new Date(selectedBackup.completed_at).toLocaleString()}
                </Typography>
              )}
              {selectedBackup.file_size && (
                <Typography variant="subtitle1" gutterBottom>
                  Size: {Math.round(selectedBackup.file_size / 1024 / 1024)} MB
                </Typography>
              )}
              {selectedBackup.error_message && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {selectedBackup.error_message}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Filter Dialog */}
      <Dialog open={openFilter} onClose={handleCloseFilter}>
        <DialogTitle>Filter Backup History</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Status"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            margin="normal"
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
            <MenuItem value="in_progress">In Progress</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
          </TextField>
          <TextField
            type="date"
            fullWidth
            label="From Date"
            value={filters.date_from}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            fullWidth
            label="To Date"
            value={filters.date_to}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClearFilter}>Clear</Button>
          <Button onClick={handleCloseFilter}>Cancel</Button>
          <Button onClick={handleApplyFilter} variant="contained">
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
