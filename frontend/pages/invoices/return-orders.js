import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import { useSnackbar } from 'notistack';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';

import MainLayout from '../../components/Layout/MainLayout';
import DataTable from '../../components/Common/DataTable';
import PageHeader from '../../components/Common/PageHeader';
import FormDialog from '../../components/Common/FormDialog';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import api, {
  getPurchaseOrders,
  createPO,
  updatePO,
  deletePO,
  approvePO,
  rejectPO,
  getInventory,
} from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const fmt = (n) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_COLORS = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

const EMPTY_FORM = {
  supplierId: '',
  warehouseId: '',
  employeeId: '',
  notes: '',
  items: [],
  vatType: 'exclusive',
};

const vatRate = 0.12;

export default function ReturnOrdersPage() {
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.isAdmin;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [invSearch, setInvSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [adminOpen, setAdminOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionTargetId, setActionTargetId] = useState(null);

  const fetchLookups = useCallback(async () => {
    try {
      const [sRes, wRes, eRes] = await Promise.all([
        api.get('/suppliers').catch(() => ({ data: [] })),
        api.get('/warehouses').catch(() => ({ data: [] })),
        api.get('/employees').catch(() => ({ data: [] })),
      ]);
      const norm = (r) => { const d = r.data?.data || r.data; return Array.isArray(d) ? d : d?.items || []; };
      setSuppliers(norm(sRes));
      setWarehouses(norm(wRes));
      setEmployees(norm(eRes));
    } catch { /* silently fail */ }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await getInventory({ search: invSearch, limit: 50 });
      const d = res.data?.data || res.data;
      setInventoryItems(Array.isArray(d) ? d : d?.items || d?.inventory || []);
    } catch { /* silently fail */ }
  }, [invSearch]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPurchaseOrders({ page: page + 1, limit: rowsPerPage, search, type: 'return' });
      const d = res.data?.data || res.data;
      const items = Array.isArray(d) ? d : d?.items || d?.purchaseOrders || [];
      setRows(items);
      setTotal(res.data?.total || res.data?.pagination?.total || items.length);
    } catch {
      enqueueSnackbar('Failed to load return orders', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, search, enqueueSnackbar]);

  useEffect(() => { fetchLookups(); }, [fetchLookups]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (formOpen) fetchInventory(); }, [formOpen, fetchInventory]);

  const openAdd = () => { setFormData(EMPTY_FORM); setEditId(null); setFormOpen(true); };
  const openEdit = (row) => {
    setFormData({
      supplierId: row.supplierId || row.supplier?._id || '',
      warehouseId: row.warehouseId || row.warehouse?._id || '',
      employeeId: row.employeeId || row.employee?._id || '',
      notes: row.notes || '',
      items: (row.items || []).map((it) => ({
        inventoryId: it.inventoryId || it.inventory?._id || '',
        productName: it.productName || it.product?.name || '',
        qty: it.qty || 1,
        price: it.price || 0,
      })),
      vatType: row.vatType || 'exclusive',
    });
    setEditId(row._id || row.id);
    setFormOpen(true);
  };

  const setF = (k) => (e) => setFormData((p) => ({ ...p, [k]: e.target.value }));

  const addToCart = (inv) => {
    const id = inv._id || inv.id;
    setFormData((p) => {
      if (p.items.find((it) => it.inventoryId === id)) return p;
      return {
        ...p,
        items: [
          ...p.items,
          {
            inventoryId: id,
            productName: inv.product?.name || inv.productName || 'Unknown',
            qty: 1,
            price: inv.cost || 0,
          },
        ],
      };
    });
  };

  const updateItem = (idx, field, value) => {
    setFormData((p) => ({
      ...p,
      items: p.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    }));
  };

  const removeItem = (idx) => {
    setFormData((p) => ({ ...p, items: p.items.filter((_, i) => i !== idx) }));
  };

  const subtotal = formData.items.reduce((s, it) => s + (it.price * it.qty || 0), 0);
  const vatAmount = formData.vatType === 'exclusive' ? subtotal * vatRate : subtotal - subtotal / (1 + vatRate);
  const grandTotal = formData.vatType === 'exclusive' ? subtotal + vatAmount : subtotal;

  const handleFormSubmit = () => {
    if (!formData.supplierId) { enqueueSnackbar('Supplier is required', { variant: 'warning' }); return; }
    setPendingAction('save');
    setAdminOpen(true);
  };

  const triggerAction = (action, id) => {
    setPendingAction(action);
    setActionTargetId(id);
    setAdminOpen(true);
  };

  const handleAdminConfirm = async () => {
    if (pendingAction === 'save') {
      setFormLoading(true);
      try {
        const payload = { ...formData, subtotal, vatAmount, total: grandTotal, type: 'return' };
        if (editId) {
          await updatePO(editId, payload);
          enqueueSnackbar('Return order updated', { variant: 'success' });
        } else {
          await createPO(payload);
          enqueueSnackbar('Return order created', { variant: 'success' });
        }
        setFormOpen(false);
        fetchData();
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || 'Save failed', { variant: 'error' });
        throw err;
      } finally {
        setFormLoading(false);
      }
    } else if (pendingAction === 'delete') {
      try {
        await deletePO(actionTargetId);
        enqueueSnackbar('Return order deleted', { variant: 'success' });
        fetchData();
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
        throw err;
      }
    } else if (pendingAction === 'approve') {
      try {
        await approvePO(actionTargetId);
        enqueueSnackbar('Return order approved. Inventory decremented.', { variant: 'success' });
        fetchData();
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || 'Approve failed', { variant: 'error' });
        throw err;
      }
    } else if (pendingAction === 'reject') {
      try {
        await rejectPO(actionTargetId);
        enqueueSnackbar('Return order rejected', { variant: 'success' });
        fetchData();
      } catch (err) {
        enqueueSnackbar(err?.response?.data?.message || 'Reject failed', { variant: 'error' });
        throw err;
      }
    }
  };

  const columns = [
    { field: 'invoiceNo', headerName: 'Invoice No', renderCell: ({ row }) => row.invoiceNo || row.invoice_no || '—' },
    { field: 'supplier', headerName: 'Supplier', renderCell: ({ row }) => row.supplier?.name || row.supplierName || '—' },
    { field: 'warehouse', headerName: 'Warehouse', renderCell: ({ row }) => row.warehouse?.name || row.warehouseName || '—' },
    { field: 'employee', headerName: 'Employee', renderCell: ({ row }) => row.employee?.name || row.employeeName || '—' },
    { field: 'total', headerName: 'Total', renderCell: ({ row }) => fmt(row.total) },
    {
      field: 'status',
      headerName: 'Status',
      renderCell: ({ row }) => {
        const s = row.status || 'pending';
        return <Chip label={s} size="small" color={STATUS_COLORS[s] || 'default'} />;
      },
    },
    {
      field: 'approved',
      headerName: 'Approved',
      renderCell: ({ row }) => (
        <Chip label={row.approved ? 'Yes' : 'No'} size="small" color={row.approved ? 'success' : 'default'} />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Date',
      renderCell: ({ row }) => row.createdAt ? dayjs(row.createdAt).format('MMM DD, YYYY') : '—',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit">
            <IconButton size="small" color="warning" onClick={() => openEdit(row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {isAdmin && row.status === 'pending' && (
            <>
              <Tooltip title="Approve">
                <IconButton size="small" color="success" onClick={() => triggerAction('approve', row._id || row.id)}>
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton size="small" color="error" onClick={() => triggerAction('reject', row._id || row.id)}>
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => triggerAction('delete', row._id || row.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const returnStats = React.useMemo(() => ({
    total: total,
    pending: rows.filter(r => ['pending'].includes(r.status)).length,
    approved: rows.filter(r => ['approved'].includes(r.status)).length,
    rejected: rows.filter(r => ['rejected'].includes(r.status)).length,
  }), [rows, total]);

  return (
    <MainLayout title="Return Orders">
      <PageHeader
        title="Return Orders"
        subtitle="Manage and process product return orders"
        icon={<AssignmentReturnIcon />}
        color="#b71c1c"
        breadcrumbs={[{ label: 'Invoices' }, { label: 'Return Orders' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd} sx={{ bgcolor: '#b71c1c', '&:hover': { bgcolor: '#7f0000' } }}>
            Create Return Order
          </Button>
        }
      />

      <Grid container spacing={2} mb={2.5}>
        {[
          { label: 'Total Returns', value: returnStats.total, color: '#b71c1c' },
          { label: 'Pending', value: returnStats.pending, color: '#ed6c02' },
          { label: 'Approved', value: returnStats.approved, color: '#2e7d32' },
          { label: 'Rejected', value: returnStats.rejected, color: '#d32f2f' },
        ].map(card => (
          <Grid item xs={6} sm={3} key={card.label}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, borderLeft: `4px solid ${card.color}` }}>
              <Typography variant="h6" fontWeight={700} color={card.color}>{card.value}</Typography>
              <Typography variant="caption" color="text.secondary">{card.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        page={page}
        rowsPerPage={rowsPerPage}
        total={total}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(0); }}
      />

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? 'Edit Return Order' : 'Create Return Order'}
        onSubmit={handleFormSubmit}
        loading={formLoading}
        maxWidth="lg"
      >
        <Grid container spacing={2} mt={0.5}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Supplier</InputLabel>
              <Select value={formData.supplierId} label="Supplier" onChange={setF('supplierId')}>
                <MenuItem value=""><em>None</em></MenuItem>
                {suppliers.map((s) => (
                  <MenuItem key={s._id || s.id} value={s._id || s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Warehouse</InputLabel>
              <Select value={formData.warehouseId} label="Warehouse" onChange={setF('warehouseId')}>
                <MenuItem value=""><em>None</em></MenuItem>
                {warehouses.map((w) => (
                  <MenuItem key={w._id || w.id} value={w._id || w.id}>{w.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Employee</InputLabel>
              <Select value={formData.employeeId} label="Employee" onChange={setF('employeeId')}>
                <MenuItem value=""><em>None</em></MenuItem>
                {employees.map((e) => (
                  <MenuItem key={e._id || e.id} value={e._id || e.id}>{e.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField label="Notes" fullWidth size="small" value={formData.notes} onChange={setF('notes')} />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" fontWeight={600} mb={1}>Add Items to Return</Typography>
            <TextField
              size="small"
              placeholder="Search inventory…"
              value={invSearch}
              onChange={(e) => setInvSearch(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              }}
              sx={{ mb: 1, minWidth: 260 }}
            />
            <Box sx={{ maxHeight: 140, overflowY: 'auto', mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
              {inventoryItems.map((inv) => (
                <Box
                  key={inv._id || inv.id}
                  sx={{ p: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 0.5 }}
                  onClick={() => addToCart(inv)}
                >
                  <Typography variant="body2">
                    {inv.product?.name || inv.productName || 'Unknown'} — Cost: {fmt(inv.cost)} — Qty: {inv.quantity}
                  </Typography>
                </Box>
              ))}
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Qty</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Price</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
                        <Typography variant="body2" color="text.secondary">No items added</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    formData.items.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{it.productName}</TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={it.qty}
                            onChange={(e) => updateItem(idx, 'qty', Number(e.target.value))}
                            inputProps={{ min: 1, style: { width: 60 } }} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={it.price}
                            onChange={(e) => updateItem(idx, 'price', Number(e.target.value))}
                            inputProps={{ min: 0, style: { width: 80 } }} />
                        </TableCell>
                        <TableCell>{fmt(it.price * it.qty)}</TableCell>
                        <TableCell>
                          <IconButton size="small" color="error" onClick={() => removeItem(idx)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl size="small" sx={{ maxWidth: 200 }}>
              <InputLabel>VAT Type</InputLabel>
              <Select value={formData.vatType} label="VAT Type" onChange={setF('vatType')}>
                <MenuItem value="inclusive">Inclusive</MenuItem>
                <MenuItem value="exclusive">Exclusive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack spacing={0.75}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2">{fmt(subtotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">VAT (12%)</Typography>
                  <Typography variant="body2">{fmt(vatAmount)}</Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1" fontWeight={700}>Grand Total</Typography>
                  <Typography variant="subtitle1" fontWeight={700}>{fmt(grandTotal)}</Typography>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </FormDialog>

      <AdminConfirmDialog
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        onConfirm={handleAdminConfirm}
        title={
          pendingAction === 'delete' ? 'Delete Return Order' :
          pendingAction === 'approve' ? 'Approve Return Order' :
          pendingAction === 'reject' ? 'Reject Return Order' :
          'Admin Confirmation'
        }
        description={
          pendingAction === 'delete' ? 'Enter admin password to delete this return order.' :
          pendingAction === 'approve' ? 'Enter admin password to approve. Inventory quantities will be decremented.' :
          pendingAction === 'reject' ? 'Enter admin password to reject this return order.' :
          'Enter admin password to save.'
        }
      />
    </MainLayout>
  );
}
