import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CheckIcon from '@mui/icons-material/Check';
import BlockIcon from '@mui/icons-material/Block';

import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';
import MainLayout from '../../components/Layout/MainLayout';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import PageHeader from '../../components/Common/PageHeader';
import { getTransfers, createTransfer, approveTransfer, rejectTransfer, deleteTransfer } from '../../utils/api';
import api from '../../utils/api';

const STATUS_CONFIG = {
  pending: { color: 'warning', label: 'Pending' },
  approved: { color: 'success', label: 'Approved' },
  rejected: { color: 'error', label: 'Rejected' },
  completed: { color: 'info', label: 'Completed' },
};

function TransferDialog({ open, onClose, onSave }) {
  const { enqueueSnackbar } = useSnackbar();
  const [warehouses, setWarehouses] = useState([]);
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      api.get('/warehouses').then((res) => {
        const data = res.data.data || res.data;
        setWarehouses(Array.isArray(data) ? data : data.items || []);
      }).catch(() => {});
    } else {
      setFromWarehouse(''); setToWarehouse(''); setNotes(''); setItems([]);
      setSearchTerm(''); setSearchResults([]);
    }
  }, [open]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const res = await api.get('/inventory', { params: { search: searchTerm, limit: 10 } });
      const data = res.data.data || res.data;
      setSearchResults(Array.isArray(data) ? data : data.items || data.inventory || []);
    } catch (_) {} finally { setSearching(false); }
  };

  const addItem = (inv) => {
    if (items.find((i) => i.inventoryId === (inv._id || inv.id))) return;
    setItems((prev) => [...prev, { inventoryId: inv._id || inv.id, name: inv.productName || inv.name, sku: inv.sku, quantity: 1, maxQty: inv.quantity }]);
    setSearchResults([]);
    setSearchTerm('');
  };

  const updateItemQty = (idx, qty) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, Math.min(qty, it.maxQty || 9999)) } : it));
  };

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!fromWarehouse || !toWarehouse) { enqueueSnackbar('Select both warehouses', { variant: 'warning' }); return; }
    if (fromWarehouse === toWarehouse) { enqueueSnackbar('From and To warehouses must be different', { variant: 'warning' }); return; }
    if (items.length === 0) { enqueueSnackbar('Add at least one item', { variant: 'warning' }); return; }
    setSaving(true);
    try {
      await createTransfer({ fromWarehouse, toWarehouse, items, notes });
      enqueueSnackbar('Transfer created successfully', { variant: 'success' });
      onSave();
      onClose();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Failed to create transfer', { variant: 'error' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>New Transfer Order</DialogTitle>
      <Divider />
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>From Warehouse</InputLabel>
              <Select value={fromWarehouse} onChange={(e) => setFromWarehouse(e.target.value)} label="From Warehouse">
                {warehouses.map((w) => (
                  <MenuItem key={w._id || w.id} value={w._id || w.id}>{w.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>To Warehouse</InputLabel>
              <Select value={toWarehouse} onChange={(e) => setToWarehouse(e.target.value)} label="To Warehouse">
                {warehouses.filter((w) => (w._id || w.id) !== fromWarehouse).map((w) => (
                  <MenuItem key={w._id || w.id} value={w._id || w.id}>{w.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Search Inventory</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder="Search by product name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleSearch} size="small">
                        {searching ? <CircularProgress size={18} /> : <SearchIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button variant="outlined" onClick={handleSearch} disabled={searching}>Search</Button>
            </Box>
            {searchResults.length > 0 && (
              <Paper elevation={4} sx={{ mt: 0.5, maxHeight: 200, overflowY: 'auto', zIndex: 9999 }}>
                {searchResults.map((inv) => (
                  <Box
                    key={inv._id || inv.id}
                    sx={{ px: 2, py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => addItem(inv)}
                  >
                    <Typography variant="body2" fontWeight={600}>{inv.productName || inv.name}</Typography>
                    <Typography variant="caption" color="text.secondary">SKU: {inv.sku} | Qty: {inv.quantity}</Typography>
                  </Box>
                ))}
              </Paper>
            )}
          </Grid>

          {items.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Transfer Items ({items.length})</Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Quantity</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={item.quantity}
                            onChange={(e) => updateItemQty(idx, parseInt(e.target.value) || 1)}
                            inputProps={{ min: 1, max: item.maxQty, style: { width: 70 } }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" color="error" onClick={() => removeItem(idx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              label="Notes"
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          Create Transfer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function TransfersPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [selected, setSelected] = useState(null);

  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTransfers({ limit: 50 });
      const data = res.data.data || res.data;
      setTransfers(Array.isArray(data) ? data : data.items || data.transfers || []);
    } catch (_) {
      enqueueSnackbar('Failed to load transfers', { variant: 'error' });
    } finally { setLoading(false); }
  }, [enqueueSnackbar]);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const openApprove = (transfer) => {
    setSelected(transfer);
    setConfirmAction('approve');
    setConfirmOpen(true);
  };

  const openReject = (transfer) => {
    setSelected(transfer);
    setConfirmAction('reject');
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    try {
      if (confirmAction === 'approve') {
        await approveTransfer(selected._id || selected.id);
        enqueueSnackbar('Transfer approved', { variant: 'success' });
      } else if (confirmAction === 'reject') {
        await rejectTransfer(selected._id || selected.id);
        enqueueSnackbar('Transfer rejected', { variant: 'warning' });
      }
      setConfirmOpen(false);
      setSelected(null);
      fetchTransfers();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Action failed', { variant: 'error' });
    }
  };

  const handleDelete = async (transfer) => {
    if (!window.confirm('Delete this transfer?')) return;
    try {
      await deleteTransfer(transfer._id || transfer.id);
      enqueueSnackbar('Transfer deleted', { variant: 'success' });
      fetchTransfers();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
    }
  };

  return (
    <MainLayout title="Transfer Orders">
      <PageHeader
        title="Transfer Orders"
        subtitle="Manage inventory transfers between warehouses"
        icon={<SwapHorizIcon />}
        color="#00838f"
        breadcrumbs={[{ label: 'Transfers' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
            New Transfer
          </Button>
        }
      />

      <Grid container spacing={2} mb={2.5}>
        {[
          { label: 'Pending', value: transfers.filter(t => t.status === 'pending').length, color: '#ed6c02', icon: <PendingActionsIcon /> },
          { label: 'Approved', value: transfers.filter(t => t.status === 'approved').length, color: '#1565c0', icon: <TaskAltIcon /> },
          { label: 'Completed', value: transfers.filter(t => t.status === 'completed').length, color: '#2e7d32', icon: <CheckIcon /> },
          { label: 'Rejected', value: transfers.filter(t => t.status === 'rejected').length, color: '#d32f2f', icon: <BlockIcon /> },
        ].map((card) => (
          <Grid item xs={6} sm={3} key={card.label}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, borderLeft: `4px solid ${card.color}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.color }}>
                  {card.icon}
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700}>{card.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{card.label}</Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper elevation={2} sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Transfer No</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>From</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>To</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Items</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <SwapHorizIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">No transfers found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((t) => {
                    const statusCfg = STATUS_CONFIG[t.status] || { color: 'default', label: t.status };
                    return (
                      <TableRow key={t._id || t.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{t.transferNumber || t.referenceNo || `TRF-${(t._id || t.id)?.slice(-6)}`}</TableCell>
                        <TableCell>{t.fromWarehouse?.name || t.fromWarehouse || '—'}</TableCell>
                        <TableCell>{t.toWarehouse?.name || t.toWarehouse || '—'}</TableCell>
                        <TableCell>{t.items?.length ?? 0}</TableCell>
                        <TableCell>
                          <Chip label={statusCfg.label} color={statusCfg.color} size="small" />
                        </TableCell>
                        <TableCell>{t.createdAt ? dayjs(t.createdAt).format('MMM DD, YYYY') : '—'}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {t.status === 'pending' && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton size="small" color="success" onClick={() => openApprove(t)}>
                                    <CheckCircleIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton size="small" color="error" onClick={() => openReject(t)}>
                                    <CancelIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => handleDelete(t)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <TransferDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={fetchTransfers}
      />

      <AdminConfirmDialog
        open={confirmOpen}
        title={confirmAction === 'approve' ? 'Approve Transfer' : 'Reject Transfer'}
        description={`Are you sure you want to ${confirmAction} this transfer? ${confirmAction === 'approve' ? 'Inventory will be moved automatically.' : ''}`}
        onConfirm={handleConfirm}
        onClose={() => { setConfirmOpen(false); setSelected(null); }}
      />
    </MainLayout>
  );
}
