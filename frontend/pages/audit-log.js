import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import DownloadIcon from '@mui/icons-material/Download';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useSnackbar } from 'notistack';

import MainLayout from '../components/Layout/MainLayout';
import AdminConfirmDialog from '../components/Common/AdminConfirmDialog';
import { getAuditLogs } from '../utils/api';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ACTION_COLORS = {
  CREATE: 'success',
  UPDATE: 'primary',
  DELETE: 'error',
  LOGIN: 'info',
  APPROVE: 'success',
  REJECT: 'warning',
  EXPORT: 'secondary',
  IMPORT: 'info',
  LOGIN_FAILED: 'error',
  LOGOUT: 'default',
};

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'APPROVE', 'REJECT', 'EXPORT', 'IMPORT', 'LOGIN_FAILED', 'LOGOUT'];

const PAGE_SIZE = 20;

export default function AuditLogPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState({ action: '', module: '', dateFrom: '', dateTo: '' });
  const [clearOpen, setClearOpen] = useState(false);
  const [clearBefore, setClearBefore] = useState('');
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        limit: PAGE_SIZE,
        ...(filters.action && { action: filters.action }),
        ...(filters.module && { module: filters.module }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
      };
      const res = await getAuditLogs(params);
      const data = res.data.data || res.data;
      setLogs(Array.isArray(data) ? data : data.logs || data.items || []);
      setTotal(res.data.total || res.data.count || (Array.isArray(data) ? data.length : 0));
    } catch (_) {
      enqueueSnackbar('Failed to load audit logs', { variant: 'error' });
    } finally { setLoading(false); }
  }, [page, filters, enqueueSnackbar]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {
        limit: 10000,
        ...(filters.action && { action: filters.action }),
        ...(filters.module && { module: filters.module }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
      };
      const res = await getAuditLogs(params);
      const data = res.data.data || res.data;
      const all = Array.isArray(data) ? data : data.logs || data.items || [];

      const rows = all.map((log) => ({
        Timestamp: log.createdAt ? dayjs(log.createdAt).format('MMM DD, YYYY HH:mm:ss') : '',
        User: log.user?.name || log.userName || log.user || '',
        Action: log.action || '',
        Module: log.module || '',
        Description: log.description || log.message || '',
        IP: log.ip || log.ipAddress || '',
        Status: log.status || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 40 }, { wch: 16 }, { wch: 12 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `audit-logs-${dayjs().format('YYYY-MM-DD')}.xlsx`);
      enqueueSnackbar('Audit logs exported', { variant: 'success' });
    } catch (_) {
      enqueueSnackbar('Export failed', { variant: 'error' });
    } finally { setExporting(false); }
  };

  const handleClearLogs = async () => {
    if (!clearBefore) { enqueueSnackbar('Select a date', { variant: 'warning' }); return; }
    setClearing(true);
    try {
      await api.delete('/audit-logs', { data: { before: clearBefore } });
      enqueueSnackbar('Audit logs cleared', { variant: 'success' });
      setClearOpen(false);
      setClearBefore('');
      fetchLogs();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to clear logs', { variant: 'error' });
    } finally { setClearing(false); }
  };

  if (!isAdmin) {
    return (
      <MainLayout title="Audit Log">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
            gap: 2.5,
            textAlign: 'center',
            px: 3,
          }}
        >
          <Box
            sx={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              bgcolor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 1,
            }}
          >
            <LockIcon sx={{ fontSize: 52, color: '#bdbdbd' }} />
          </Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 360 }}>
            This page is restricted to administrators only. Please contact your system administrator if you need access.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => router.push('/dashboard')}
            sx={{
              mt: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              py: 1.2,
              bgcolor: '#1565c0',
              '&:hover': { bgcolor: '#0d47a1' },
            }}
          >
            Back to Dashboard
          </Button>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Audit Log">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Audit Log</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={exporting ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleExport}
            disabled={exporting}
          >
            Export Excel
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteSweepIcon />}
            onClick={() => setClearOpen(true)}
          >
            Clear Logs
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper elevation={2} sx={{ borderRadius: 2, p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <FilterListIcon fontSize="small" color="action" />
          <Typography variant="subtitle2" fontWeight={700}>Filters</Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Action</InputLabel>
              <Select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                label="Action"
              >
                <MenuItem value="">All Actions</MenuItem>
                {ACTIONS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Module"
              size="small"
              fullWidth
              value={filters.module}
              onChange={(e) => handleFilterChange('module', e.target.value)}
              InputProps={{ endAdornment: <SearchIcon fontSize="small" color="action" /> }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Date From"
              type="date"
              size="small"
              fullWidth
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Date To"
              type="date"
              size="small"
              fullWidth
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <Paper elevation={2} sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Module</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>IP</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                        <Typography variant="body2" color="text.secondary">No audit logs found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log, idx) => (
                      <TableRow key={log._id || log.id || idx} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                          {log.createdAt ? dayjs(log.createdAt).format('MMM DD, YYYY HH:mm') : '—'}
                        </TableCell>
                        <TableCell>{log.user?.name || log.userName || log.user || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={log.action || '—'}
                            size="small"
                            color={ACTION_COLORS[log.action] || 'default'}
                          />
                        </TableCell>
                        <TableCell>{log.module || '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 300 }}>
                          <Typography variant="caption" noWrap title={log.description || log.message}>
                            {log.description || log.message || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{log.ip || log.ipAddress || '—'}</TableCell>
                        <TableCell>
                          {log.status ? (
                            <Chip
                              label={log.status}
                              size="small"
                              color={log.status === 'success' ? 'success' : log.status === 'failed' ? 'error' : 'default'}
                            />
                          ) : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={PAGE_SIZE}
              rowsPerPageOptions={[PAGE_SIZE]}
            />
          </>
        )}
      </Paper>

      {/* Clear Logs Dialog */}
      <Dialog open={clearOpen} onClose={() => setClearOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Clear Audit Logs</DialogTitle>
        <Divider />
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Select a date. All logs before this date will be permanently deleted.
          </Typography>
          <TextField
            label="Clear logs before"
            type="date"
            size="small"
            fullWidth
            value={clearBefore}
            onChange={(e) => setClearBefore(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setClearOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleClearLogs}
            disabled={clearing || !clearBefore}
            startIcon={clearing ? <CircularProgress size={16} color="inherit" /> : <DeleteSweepIcon />}
          >
            Clear Logs
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
